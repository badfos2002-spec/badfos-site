/**
 * /api/admin/manual-order — רישום הזמנה ידנית (מכירה מחוץ לאתר). אדמין בלבד.
 *
 *   POST { requestId, customer, shipping, items, total, paymentMethod } → { id, orderNumber }
 *
 * אידמפוטנטי: requestId (UUID שהטופס מייצר פעם אחת לכל פתיחה) הוא מזהה המסמך
 * (manual-<uuid>). שליחה חוזרת (לחיצה כפולה, רשת שנפלה אחרי השמירה) מחזירה את
 * אותה הזמנה — מספר הזמנה מוקצה רק כשהמסמך עוד לא קיים, באותה טרנזקציה.
 *
 * ההזמנה נכתבת לאוסף orders כ-'paid' עם source:'manual', paidAt=עכשיו ומספר
 * הזמנה מהמונה הרגיל — כך היא מופיעה ב-/admin/orders ונספרת בהזמנות היומיות.
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
import { MANUAL_SOURCE, validateManualOrder } from '@/lib/manual-order'

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
