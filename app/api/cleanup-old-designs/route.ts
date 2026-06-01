import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminStorage } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

const CRON_SECRET = process.env.CRON_SECRET
const CLEANUP_DAYS = 60

/**
 * Deletes design image files from Firebase Storage for orders older than 60 days.
 * The order document itself stays in Firestore — only the image files are removed.
 * Order docs get a `designsDeleted: true` flag so we don't try again.
 *
 * Triggered by Vercel Cron (daily) or manually with the CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || req.nextUrl.searchParams.get('secret')
  if (!CRON_SECRET || (auth !== CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - CLEANUP_DAYS)
  const cutoffTs = Timestamp.fromDate(cutoff)

  const bucket = adminStorage.bucket()

  let scanned = 0
  let cleaned = 0
  let errors = 0

  try {
    const snapshot = await adminDb
      .collection('orders')
      .where('createdAt', '<', cutoffTs)
      .limit(500)
      .get()

    for (const doc of snapshot.docs) {
      scanned++
      const data = doc.data()
      if (data.designsDeleted) continue

      try {
        await bucket.deleteFiles({ prefix: `designs/${doc.id}/` })
        await doc.ref.update({
          designsDeleted: true,
          designsDeletedAt: Timestamp.now(),
        })
        cleaned++
      } catch (e) {
        console.error(`Cleanup failed for order ${doc.id}:`, e)
        errors++
      }
    }

    console.log(`Cleanup complete: scanned=${scanned}, cleaned=${cleaned}, errors=${errors}`)

    return NextResponse.json({
      success: true,
      scanned,
      cleaned,
      errors,
      cutoff: cutoff.toISOString(),
    })
  } catch (e) {
    console.error('Cleanup endpoint error:', e)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
