/**
 * בדיקות לגיבוי הלילי (lib/backup.ts + השילוב ב-cron של cleanup-old-designs).
 *
 * הרצה (עם stub של firebase-admin דרך tsconfig paths):
 *   npx tsx --tsconfig tsconfig.backup-test.json scripts/test-backup.ts
 *
 * מכסה:
 *   1. סריאליזציה של N אוספים + round-trip מלא של Timestamp
 *   2. Retention — נמחקים רק גיבויים מעבר ל-14 האחרונים
 *   3. סדר פעולות ב-cron — הגיבוי נשמר לפני כל מחיקה
 *   4. כשל בגיבוי לא חוסם את הניקוי (והתשובה עדיין success)
 */
import { gunzipSync } from 'zlib'
import { Timestamp } from 'firebase-admin/firestore'
import { __stub } from './stubs/firebase-admin'
import {
  runBackup,
  deserializeValue,
  BACKUP_COLLECTIONS,
  BACKUP_RETENTION,
  TS_MARKER,
  BackupFile,
} from '@/lib/backup'

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

async function main() {
  // ════ Test 1: runBackup serializes all collections + Timestamp round-trip ════
  console.log('\n🧪 Test 1: serialization of all collections + Timestamp round-trip')
  __stub.reset()
  const orderTs = Timestamp.fromDate(new Date('2026-07-01T10:30:00.000Z'))
  const nestedTs = Timestamp.fromDate(new Date('2026-06-15T08:00:00.500Z'))
  __stub.collections['orders'] = [
    {
      id: 'o1',
      data: {
        customerName: 'ישראל ישראלי',
        total: 123.5,
        createdAt: orderTs,
        items: [{ addedAt: nestedTs, qty: 2 }],
        meta: { paidAt: orderTs, note: null },
      },
    },
  ]
  __stub.collections['leads'] = [{ id: 'l1', data: { phone: '0501234567' } }]
  __stub.collections['coupons'] = [{ id: 'c1', data: { code: 'SAVE10-TEST' } }]

  const summary = await runBackup(new Date('2026-07-18T03:00:00Z'))
  assert(summary.collections === BACKUP_COLLECTIONS.length, `summary.collections === ${BACKUP_COLLECTIONS.length}`, summary)
  assert(summary.docs === 3, 'summary.docs === 3', summary)
  assert(summary.file === 'backups/backup-2026-07-18.json.gz', 'file path is backups/backup-YYYY-MM-DD.json.gz', summary.file)
  assert(summary.bytes > 0 && summary.bytes === __stub.savedFiles[0]?.buf.length, 'bytes matches uploaded gz size', summary)

  const readEvents = __stub.events.filter((e) => e.startsWith('read:'))
  assert(readEvents.length === BACKUP_COLLECTIONS.length, 'every collection was read exactly once', readEvents)

  const parsed = JSON.parse(gunzipSync(__stub.savedFiles[0].buf).toString()) as BackupFile
  assert(parsed.version === 1, 'backup file has version marker')
  assert(Object.keys(parsed.collections).length === BACKUP_COLLECTIONS.length, 'all collections present in file (empty ones included)')
  const o1 = parsed.collections['orders'][0]
  const o1data = o1.data as Record<string, any>
  assert(o1.id === 'o1' && o1data.customerName === 'ישראל ישראלי', 'doc id + plain fields preserved')
  assert(o1data.createdAt?.[TS_MARKER] === '2026-07-01T10:30:00.000Z', 'Timestamp serialized as ISO with type marker', o1data.createdAt)
  assert(o1data.items[0].addedAt?.[TS_MARKER] === '2026-06-15T08:00:00.500Z', 'nested Timestamp in array serialized', o1data.items)

  // Round-trip: deserialize → Timestamp instances with identical millis
  const restored = deserializeValue(o1data) as Record<string, any>
  assert(restored.createdAt instanceof Timestamp && restored.createdAt.toMillis() === orderTs.toMillis(), 'round-trip: top-level Timestamp restored to same millis')
  assert(restored.items[0].addedAt instanceof Timestamp && restored.items[0].addedAt.toMillis() === nestedTs.toMillis(), 'round-trip: nested Timestamp restored to same millis')
  assert(restored.meta.note === null && restored.total === 123.5, 'round-trip: null + numbers untouched')

  // ════ Test 2: retention deletes only beyond 14 ════
  console.log('\n🧪 Test 2: retention keeps newest 14, deletes older')
  __stub.reset()
  // Preload 16 existing backups (day 01..16 of June) + today's run = 17 → delete 3 oldest
  for (let d = 1; d <= 16; d++) {
    __stub.storageFiles.push(`backups/backup-2026-06-${String(d).padStart(2, '0')}.json.gz`)
  }
  __stub.storageFiles.push('backups/other-file.txt') // must never be deleted
  const s2 = await runBackup(new Date('2026-07-18T03:00:00Z'))
  const deleted = __stub.events.filter((e) => e.startsWith('deleteFile:'))
  assert(s2.deletedOldBackups === 3, 'deletedOldBackups === 3 (17 backups → keep 14)', s2)
  assert(
    deleted.length === 3 &&
      deleted.includes('deleteFile:backups/backup-2026-06-01.json.gz') &&
      deleted.includes('deleteFile:backups/backup-2026-06-02.json.gz') &&
      deleted.includes('deleteFile:backups/backup-2026-06-03.json.gz'),
    'exactly the 3 OLDEST backups were deleted',
    deleted
  )
  assert(__stub.storageFiles.includes('backups/backup-2026-07-18.json.gz'), 'newest backup kept')
  assert(__stub.storageFiles.includes('backups/other-file.txt'), 'non-backup files under backups/ untouched')
  assert(BACKUP_RETENTION === 14, 'retention constant is 14')

  // Exactly 14 → nothing deleted
  __stub.reset()
  for (let d = 1; d <= 13; d++) {
    __stub.storageFiles.push(`backups/backup-2026-06-${String(d).padStart(2, '0')}.json.gz`)
  }
  const s2b = await runBackup(new Date('2026-07-18T03:00:00Z')) // 13 + today = 14
  assert(s2b.deletedOldBackups === 0 && !__stub.events.some((e) => e.startsWith('deleteFile:')), 'at exactly 14 backups nothing is deleted', s2b)

  // ════ Test 3+4: cron route — backup runs before deletions; backup failure never blocks cleanup ════
  process.env.CRON_SECRET = 'test-secret'
  const { GET } = await import('@/app/api/cleanup-old-designs/route')
  const { NextRequest } = await import('next/server')
  const makeReq = () => new NextRequest('http://localhost/api/cleanup-old-designs?secret=test-secret')

  console.log('\n🧪 Test 3: cron route runs backup BEFORE any deletion')
  __stub.reset()
  // Expired quote — the route's first deletion step will delete it
  __stub.collections['quotes'] = [{ id: 'q1', data: { createdAt: Timestamp.fromDate(new Date('2026-01-01')) } }]
  // Old order not yet cleaned — Layer 1 will delete its design files
  __stub.collections['orders'] = [{ id: 'old1', data: { createdAt: Timestamp.fromDate(new Date('2026-01-01')), status: 'completed' } }]

  const res3 = await GET(makeReq())
  const body3 = await res3.json()
  const saveIdx = __stub.events.findIndex((e) => e.startsWith('save:backups/backup-'))
  const firstDeleteIdx = __stub.events.findIndex((e) => e.startsWith('delete:') || e.startsWith('deleteFiles:'))
  assert(res3.status === 200 && body3.success === true, 'route responds success', body3)
  assert(saveIdx !== -1, 'backup file was uploaded', __stub.events)
  assert(firstDeleteIdx !== -1, 'cleanup deletions actually happened', __stub.events)
  assert(saveIdx < firstDeleteIdx, `backup upload (idx ${saveIdx}) happened BEFORE first deletion (idx ${firstDeleteIdx})`, __stub.events)
  assert(body3.backup && body3.backup.file === __stub.savedFiles[0].path, 'response includes backup summary', body3.backup)
  assert(__stub.events.includes('delete:quotes/q1'), 'expired quote deleted (cleanup intact)')

  console.log('\n🧪 Test 4: backup failure never blocks cleanup')
  __stub.reset()
  __stub.failSave = true // backup upload throws
  __stub.collections['quotes'] = [{ id: 'q9', data: { createdAt: Timestamp.fromDate(new Date('2026-01-01')) } }]
  const res4 = await GET(makeReq())
  const body4 = await res4.json()
  assert(res4.status === 200 && body4.success === true, 'route still succeeds when backup throws', body4)
  assert(typeof body4.backup?.error === 'string', 'response reports the backup error', body4.backup)
  assert(__stub.events.includes('delete:quotes/q9'), 'cleanup deletion still ran after backup failure', __stub.events)

  // ════ Summary ════
  console.log(`\n${'='.repeat(50)}`)
  console.log(`📊 ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
  console.log('✅ All backup tests passed')
}

main().catch((e) => {
  console.error('❌ Test harness crashed:', e)
  process.exit(1)
})
