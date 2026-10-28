/**
 * /api/admin/manual-order — רישום הזמנה ידנית (מכירה מחוץ לאתר). אדמין בלבד.
 *
 *   POST  { requestId, customer, shipping, items, total, paymentMethod } → { id, orderNumber }
 *   PATCH { id, customer, shipping, items, total, paymentMethod } → { id, orderNumber }
 *
 * אידמפוטנטי: requestId (UUID שהטופס מייצר פעם אחת לכל פתיחה) הוא מזהה המסמך
 * (manual-<uuid>). שליחה חוזרת (לחיצה כפולה, רשת שנפלה אחרי השמירה) מחזירה את
 * אותה הזמנה — מספר הזמנה מוקצה רק כשהמסמך עוד לא קיים, באותה טרנזקציה.
 *
 * ההזמנה נכתבת לאוסף orders כ-'paid' עם source:'manual', paidAt=עכשיו ומספר
 * הזמנה מהמונה הרגיל — כך היא מופיעה ב-/admin/orders ונספרת בהזמנות היומיות.
 *
 * PATCH = עריכת הזמנה ידנית קיימת (source:'manual' בלבד — הזמנת אתר נדחית).
 * אותה ולידציה כמו ביצירה; מחליף רק את השדות הניתנים לעריכה (לקוח, משלוח,
 * פריטים, סכום, אמצעי תשלום). מספר הזמנה, סטטוס, מקור, createdAt, paidAt
 * ושאר השדות לא נגעים — ההזמנה נשארת באותו יום בסיכום היומי. עיצובים שהוסרו
 * בעריכה לא נמחקים מ-Storage. אידמפוטנטי מטבעו (אותו גוף → אותו מסמך).
 *
 * אפס תופעות לוואי, בכוונה: אין מייל ללקוח/לבעלים, אין המרת Google Ads/Meta,
 * אין Make, אין ManyChat, אין טלגרם ואין הגדלת עיצובים. מסלולים אוטומטיים
 * שסורקים הזמנות מדלגים על source:'manual' (ראו isManualOrder).
 */
import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import { rejectUnlessAdmin } from '@/lib/admin-request-auth'
import { nextOrderNumberInTx } from '@/lib/order-number'
import { MANUAL_SOURCE, isManualOrder, validateManualOrder } from '@/lib/manual-order'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const rejected = await rejectUnlessAdmin(request, 'manual-order')
  if (rejected) return rejected

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }

  const requestId = (body as { requestId?: unknown } | null)?.requestId
  if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(requestId)) {
    return NextResponse.json({ error: 'invalid', message: 'בקשה לא תקינה — רעננו את הדף ונסו שוב' }, { status: 400 })
  }

  const result = validateManualOrder(body, process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
  if (!result.ok) return NextResponse.json({ error: 'invalid', message: result.error }, { status: 400 })
  const v = result.order

  try {
    const ref = adminDb.collection('orders').doc(`manual-${requestId}`)
    const orderNumber = await adminDb.runTransaction(async (tx) => {
      // כל הקריאות לפני הכתיבות: קודם המסמך, ואז המונה (בתוך nextOrderNumberInTx)
      const existing = await tx.get(ref)
      if (existing.exists) return existing.data()?.orderNumber as number
      const n = await nextOrderNumberInTx(tx)
      const now = Timestamp.now()
      tx.set(ref, {
        orderNumber: n,
        status: 'paid',
        source: MANUAL_SOURCE,
        paymentMethod: v.paymentMethod,
        customer: v.customer,
        shipping: v.shipping,
        items: v.items,
        subtotal: v.total,
        discount: 0,
        total: v.total,
        paidAt: now,
        createdAt: now,
        updatedAt: now,
      })
      return n
    })
    return NextResponse.json({ id: ref.id, orderNumber })
  } catch (e) {
    console.error('manual-order POST error:', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const rejected = await rejectUnlessAdmin(request, 'manual-order')
  if (rejected) return rejected

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }

  const id = (body as { id?: unknown } | null)?.id
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(id)) {
    return NextResponse.json({ error: 'invalid', message: 'בקשה לא תקינה — רעננו את הדף ונסו שוב' }, { status: 400 })
  }

  const result = validateManualOrder(body, process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
  if (!result.ok) return NextResponse.json({ error: 'invalid', message: result.error }, { status: 400 })
  const v = result.order

  try {
    const ref = adminDb.collection('orders').doc(id)
    const outcome = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists) return { status: 404 as const }
      if (!isManualOrder(snap.data())) return { status: 400 as const }
      tx.update(ref, {
        customer: v.customer,
        shipping: v.shipping,
        items: v.items,
        subtotal: v.total,
        total: v.total,
        paymentMethod: v.paymentMethod,
        updatedAt: Timestamp.now(),
      })
      return { status: 200 as const, orderNumber: snap.data()?.orderNumber as number }
    })
    if (outcome.status === 404) return NextResponse.json({ error: 'not_found', message: 'ההזמנה לא נמצאה' }, { status: 404 })
    if (outcome.status === 400) {
      return NextResponse.json({ error: 'not_manual', message: 'אפשר לערוך רק הזמנות ידניות' }, { status: 400 })
    }
    return NextResponse.json({ id, orderNumber: outcome.orderNumber })
  } catch (e) {
    console.error('manual-order PATCH error:', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
