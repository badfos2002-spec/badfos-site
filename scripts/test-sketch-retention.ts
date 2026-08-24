/**
 * Tests for the sketch retention policy (lib/sketch-retention.ts).
 * Run: npx tsx scripts/test-sketch-retention.ts
 *
 * planSketchSweep decides which customer artwork gets PERMANENTLY deleted, so
 * these tests pin its fail-closed posture — anything malformed keeps — and the
 * exact retention boundary, to the millisecond. Pure function, no stubs.
 *
 * Covers:
 *   1. Boundary: exactly SKETCH_RETENTION_MS old keeps; one ms older sweeps.
 *   2. updatedAt restarts the clock — an edited sketch is fresh work: old
 *      createdAt + recent updatedAt keeps; updatedAt past the boundary sweeps.
 *   3. Malformed updatedAt (number / string / null / Timestamp-shaped junk /
 *      future) makes the doc UNSWEEPABLE — never sweepable — even when
 *      createdAt alone is ancient.
 *   4. Absent updatedAt behaves exactly as before the field existed.
 *   5. Regression: already-swept, malformed createdAt, missing/foreign
 *      preview, no Storage files, preview path never on the delete list.
 */
import {
  planSketchSweep,
  timestampMillis,
  SKETCH_RETENTION_MS,
} from '../lib/sketch-retention'

let passed = 0
let failed = 0

function assert(cond: boolean, name: string, extra?: unknown) {
  if (cond) {
    passed++
    console.log(`  ✅ ${name}`)
  } else {
    failed++
    console.log(`  ❌ ${name}`, extra !== undefined ? JSON.stringify(extra) : '')
  }
}

const NOW = Date.parse('2026-08-24T12:00:00.000Z')
const BUCKET = 'badfos-28b67.firebasestorage.app'

/** A real-shaped Firebase download URL for an object path. */
function url(path: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=abc-123`
}

/** A Firestore-Timestamp-shaped value for a given epoch-ms. */
function ts(ms: number): { toMillis: () => number } {
  return { toMillis: () => ms }
}

/** A sweepable-if-old-enough document. */
function doc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    productType: 'tshirt',
    color: 'white',
    previewUrl: url('designs/sketch-1755000000000/preview.jpg'),
    designs: [
      { area: 'front_full', areaName: 'קדמי', imageBase64: url('designs/sketch-1755000000000/front.png') },
      { area: 'back', areaName: 'גב', imageBase64: url('designs/sketch-1755000000000/back.png') },
    ],
    createdAt: ts(NOW - SKETCH_RETENTION_MS - 1),
    ...overrides,
  }
}

console.log('\n1. Retention boundary (createdAt only)')
{
  const exactly = planSketchSweep(doc({ createdAt: ts(NOW - SKETCH_RETENTION_MS) }), NOW)
  assert(exactly.action === 'keep' && exactly.reason === 'within-retention',
    'exactly SKETCH_RETENTION_MS old → keep (boundary is strict)', exactly)

  const older = planSketchSweep(doc({ createdAt: ts(NOW - SKETCH_RETENTION_MS - 1) }), NOW)
  assert(older.action === 'sweep', 'one ms past the boundary → sweep', older)
  assert(older.action === 'sweep' && older.deletePaths.length === 2 &&
    older.deletePaths.includes('designs/sketch-1755000000000/front.png') &&
    older.deletePaths.includes('designs/sketch-1755000000000/back.png'),
    'sweep names exactly the two artwork paths', older)
}

console.log('\n2. updatedAt restarts the retention clock')
{
  const oldCreated = NOW - 10 * 24 * 60 * 60 * 1000 // 10 days ago — way past retention

  const freshEdit = planSketchSweep(doc({ createdAt: ts(oldCreated), updatedAt: ts(NOW - 60_000) }), NOW)
  assert(freshEdit.action === 'keep' && freshEdit.reason === 'within-retention',
    'ancient createdAt + updatedAt a minute ago → keep', freshEdit)

  const atBoundary = planSketchSweep(doc({ createdAt: ts(oldCreated), updatedAt: ts(NOW - SKETCH_RETENTION_MS) }), NOW)
  assert(atBoundary.action === 'keep' && atBoundary.reason === 'within-retention',
    'updatedAt exactly SKETCH_RETENTION_MS ago → keep (same strict boundary)', atBoundary)

  const pastBoundary = planSketchSweep(doc({ createdAt: ts(oldCreated), updatedAt: ts(NOW - SKETCH_RETENTION_MS - 1) }), NOW)
  assert(pastBoundary.action === 'sweep',
    'updatedAt one ms past the boundary → sweep', pastBoundary)

  // max(createdAt, updatedAt): an updatedAt OLDER than createdAt must not age the doc.
  const young = NOW - 60_000
  const weird = planSketchSweep(doc({ createdAt: ts(young), updatedAt: ts(oldCreated) }), NOW)
  assert(weird.action === 'keep' && weird.reason === 'within-retention',
    'updatedAt older than a young createdAt → clock stays on createdAt (max wins)', weird)
}

console.log('\n3. Malformed updatedAt makes the doc UNSWEEPABLE (fail closed)')
{
  const ancient = NOW - 10 * 24 * 60 * 60 * 1000
  const malformed: [string, unknown][] = [
    ['bare number (unit is a guess)', 1755000000],
    ['numeric string', '1755000000000'],
    ['null', null],
    ['boolean', false],
    ['object without toMillis/toDate', { seconds: 1755000000 }],
    ['toMillis returning NaN', { toMillis: () => NaN }],
    ['toMillis returning a string', { toMillis: () => 'soon' }],
    ['pre-2020 (seconds read as ms)', ts(1755000000)],
  ]
  for (const [name, value] of malformed) {
    const plan = planSketchSweep(doc({ createdAt: ts(ancient), updatedAt: value }), NOW)
    assert(plan.action === 'keep' && plan.reason === 'invalid-timestamp',
      `${name} → keep invalid-timestamp, even with 10-day-old createdAt`, plan)
  }

  const future = planSketchSweep(
    doc({ createdAt: ts(ancient), updatedAt: ts(NOW + 2 * 24 * 60 * 60 * 1000) }), NOW)
  assert(future.action === 'keep' && future.reason === 'invalid-timestamp',
    'updatedAt from the future (broken clock) → keep invalid-timestamp', future)
}

console.log('\n4. Absent updatedAt = the pre-edit behaviour, exactly')
{
  const d = doc()
  delete d.updatedAt // ensure absent, not undefined-valued... (spread never set it)
  const plan = planSketchSweep(d, NOW)
  assert(plan.action === 'sweep', 'no updatedAt field + old createdAt → sweeps as before', plan)
}

console.log('\n5. Regression: the existing fail-closed gates still hold')
{
  const swept = planSketchSweep(doc({ designsDeleted: true }), NOW)
  assert(swept.action === 'keep' && swept.reason === 'already-swept', 'already swept → keep', swept)

  const noCreated = planSketchSweep(doc({ createdAt: undefined }), NOW)
  assert(noCreated.action === 'keep' && noCreated.reason === 'invalid-timestamp', 'missing createdAt → keep', noCreated)

  const badCreated = planSketchSweep(doc({ createdAt: 1755000000000 }), NOW)
  assert(badCreated.action === 'keep' && badCreated.reason === 'invalid-timestamp', 'numeric createdAt → keep', badCreated)

  const noPreview = planSketchSweep(doc({ previewUrl: undefined }), NOW)
  assert(noPreview.action === 'keep' && noPreview.reason === 'no-preview', 'no preview → keep', noPreview)

  const foreignPreview = planSketchSweep(doc({ previewUrl: 'https://evil.example.com/x.jpg' }), NOW)
  assert(foreignPreview.action === 'keep' && foreignPreview.reason === 'no-preview', 'foreign-host preview → keep', foreignPreview)

  const legacyBase64 = planSketchSweep(doc({
    designs: [{ area: 'front_full', areaName: 'קדמי', imageBase64: 'data:image/png;base64,AAAA' }],
  }), NOW)
  assert(legacyBase64.action === 'keep' && legacyBase64.reason === 'no-storage-files',
    'legacy inline-base64 sketch → keep (nothing addressable)', legacyBase64)

  // The preview must never appear on its own delete list, even when a design
  // entry points AT the preview file.
  const previewAsDesign = planSketchSweep(doc({
    designs: [
      { area: 'front_full', areaName: 'קדמי', imageBase64: url('designs/sketch-1755000000000/preview.jpg') },
      { area: 'back', areaName: 'גב', imageBase64: url('designs/sketch-1755000000000/back.png') },
    ],
  }), NOW)
  assert(previewAsDesign.action === 'sweep' &&
    !previewAsDesign.deletePaths.includes('designs/sketch-1755000000000/preview.jpg') &&
    previewAsDesign.deletePaths.length === 1,
    'preview path never lands on the delete list', previewAsDesign)

  assert(timestampMillis(new Date(NOW)) === NOW, 'timestampMillis accepts Date')
  assert(timestampMillis(NOW) === null, 'timestampMillis rejects bare numbers')
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
