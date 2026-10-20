/**
 * /api/admin/daily-orders — הזמנות יומיות. אדמין בלבד (Bearer ID token).
 *
 *   GET    ?date=YYYY-MM-DD → סיכום היום (אתר ששולם + קולי) + רשימת ההזמנות הקוליות
 *   DELETE ?id=…             → מחיקת הזמנה קולית
 *
 * הכול דרך Admin SDK. אוסף voiceOrders לא נפתח לקליינט כלל — כלל ה-deny
 * הכללי ב-firestore.rules חוסם אותו מכל קריאה/כתיבה מהדפדפן.
 */
import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { rejectUnlessAdmin } from '@/lib/admin-request-auth'
import { jerusalemMidnight, shiftDateKey } from '@/lib/cost-digest'
import {
  aggregateDaily,
  isDateKey,
  isOrderInDay,
  PAID_LOOKBACK_DAYS,
  VOICE_ORDERS_COLLECTION,
  type SiteOrderLike,
  type VoiceItem,
} from '@/lib/daily-orders'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: NextRequest) {
  const rejected = await rejectUnlessAdmin(request, 'daily-orders')
  if (rejected) return rejected

  const date = request.nextUrl.searchParams.get('date')
  if (!isDateKey(date)) return NextResponse.json({ error: 'bad_date' }, { status: 400 })

  try {
    const start = jerusalemMidnight(date)
    const end = jerusalemMidnight(shiftDateKey(date, 1))
    const [ordersSnap, voiceSnap] = await Promise.all([
      adminDb
        .collection('orders')
        // חלון רחב לפי createdAt, ואז סינון בזיכרון לפי יום התשלום (isOrderInDay)
        // מגבלה ידועה: הזמנה ששולמה יותר מ-14 יום אחרי שנוצרה לא תיכלל
        .where('createdAt', '>=', Timestamp.fromDate(jerusalemMidnight(shiftDateKey(date, -PAID_LOOKBACK_DAYS))))
        .where('createdAt', '<', Timestamp.fromDate(end))
        .get(),
      adminDb.collection(VOICE_ORDERS_COLLECTION).where('date', '==', date).get(),
    ])

    // סינון סטטוס בזיכרון (בתוך aggregateDaily) — כמו בדוח השבועי, בלי אינדקס מורכב.
    const toMs = (v: unknown) => (v instanceof Timestamp ? v.toMillis() : v instanceof Date ? v.getTime() : null)
    const siteOrders = ordersSnap.docs
      .map(d => d.data())
      .filter(o => isOrderInDay({ createdAtMs: toMs(o.createdAt) ?? 0, paidAtMs: toMs(o.paidAt) }, start.getTime(), end.getTime()))
      .map(o => o as SiteOrderLike)
    const voiceOrders = voiceSnap.docs
      .map(d => {
        const data = d.data()
        const created = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : 0
        return {
          id: d.id,
          items: (Array.isArray(data.items) ? data.items : []) as VoiceItem[],
          transcript: typeof data.transcript === 'string' ? data.transcript : '',
          createdAt: created,
        }
      })
      .sort((a, b) => b.createdAt - a.createdAt)

    return NextResponse.json({ date, summary: aggregateDaily(siteOrders, voiceOrders), voiceOrders })
  } catch (e) {
    console.error('daily-orders GET error:', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const rejected = await rejectUnlessAdmin(request, 'daily-orders')
  if (rejected) return rejected

  const id = request.nextUrl.searchParams.get('id') ?? ''
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return NextResponse.json({ error: 'bad_id' }, { status: 400 })

  try {
    await adminDb.collection(VOICE_ORDERS_COLLECTION).doc(id).delete()
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('daily-orders DELETE error:', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
