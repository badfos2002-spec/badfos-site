import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { Resend } from 'resend'
import { escapeHtml } from '@/lib/utils'

const CRON_SECRET = process.env.CRON_SECRET
const STALE_MINUTES = 60 // pending_payment older than this → cart_abandoned
const MAX_AGE_DAYS = 14 // don't email about orders older than this (avoid first-run flood)

// Lazy-init Resend to avoid build-time errors when API key is missing
let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

interface AbandonedOrderRow {
  orderNumber: number
  customerName: string
  phone: string
  total: number
  createdAt: Date
}

/**
 * Auto-mark stale pending_payment orders as cart_abandoned and email the
 * business owner a summary so he can send the WhatsApp recovery coupon.
 *
 * Triggered by Vercel Cron hourly, or manually with the CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || req.nextUrl.searchParams.get('secret')
  if (!CRON_SECRET || (auth !== CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Timestamp.now()
  const staleCutoff = Date.now() - STALE_MINUTES * 60 * 1000
  const floodCutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000

  let marked = 0
  let notified = 0
  const recentRows: AbandonedOrderRow[] = []

  try {
    // ── 1. Stale pending_payment → cart_abandoned ───────────────────────
    const pendingSnap = await adminDb
      .collection('orders')
      .where('status', '==', 'pending_payment')
      .limit(200)
      .get()

    for (const doc of pendingSnap.docs) {
      const data = doc.data()
      const createdAt: Date = data.createdAt?.toDate?.() ?? new Date(0)
      if (createdAt.getTime() >= staleCutoff) continue

      await doc.ref.update({
        status: 'cart_abandoned',
        abandonNotifiedAt: now,
        updatedAt: now,
      })
      marked++
      if (createdAt.getTime() >= floodCutoff) {
        recentRows.push(toRow(data, createdAt))
      }
    }

    // ── 2. cart_abandoned (marked by client/admin) never notified ───────
    const abandonedSnap = await adminDb
      .collection('orders')
      .where('status', '==', 'cart_abandoned')
      .limit(200)
      .get()

    for (const doc of abandonedSnap.docs) {
      const data = doc.data()
      if (data.abandonNotifiedAt) continue

      await doc.ref.update({ abandonNotifiedAt: now })
      notified++
      const createdAt: Date = data.createdAt?.toDate?.() ?? new Date(0)
      if (createdAt.getTime() >= floodCutoff) {
        recentRows.push(toRow(data, createdAt))
      }
    }

    // ── 3. One summary email for all recent abandoned carts ─────────────
    let emailed = false
    if (recentRows.length > 0) {
      emailed = await sendSummaryEmail(recentRows)
    }

    return NextResponse.json({ success: true, marked, notified, emailed })
  } catch (e) {
    console.error('Notify-abandoned endpoint error:', e)
    return NextResponse.json({ error: 'Notify-abandoned failed' }, { status: 500 })
  }
}

function toRow(data: FirebaseFirestore.DocumentData, createdAt: Date): AbandonedOrderRow {
  return {
    orderNumber: data.orderNumber ?? 0,
    customerName: `${data.customer?.firstName || ''} ${data.customer?.lastName || ''}`.trim() || '—',
    phone: data.customer?.phone || '—',
    total: data.total ?? 0,
    createdAt,
  }
}

async function sendSummaryEmail(rows: AbandonedOrderRow[]): Promise<boolean> {
  const resend = getResend()
  const to = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  if (!resend || !to) {
    console.warn('⚠️ Resend or admin email not configured. Abandoned-cart alert not sent.')
    return false
  }

  const tableRows = rows
    .map(
      (r) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">#${r.orderNumber}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${escapeHtml(r.customerName)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(r.phone)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #f59e0b;">₪${r.total}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${r.createdAt.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' })}</td>
        </tr>`
    )
    .join('')

  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff;">
      <div style="background: #fbbf24; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
        <h1 style="margin: 0; color: #1e293b; font-size: 24px;">🛒 ${rows.length} עגלות נטושות ממתינות להחזרה</h1>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: right;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 8px; border-bottom: 2px solid #e2e8f0; text-align: right;">מספר הזמנה</th>
            <th style="padding: 8px; border-bottom: 2px solid #e2e8f0; text-align: right;">שם הלקוח</th>
            <th style="padding: 8px; border-bottom: 2px solid #e2e8f0; text-align: right;">טלפון</th>
            <th style="padding: 8px; border-bottom: 2px solid #e2e8f0; text-align: right;">סכום</th>
            <th style="padding: 8px; border-bottom: 2px solid #e2e8f0; text-align: right;">שעת יצירה</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      <p style="color: #64748b; font-size: 14px;">לחצו באדמין על 'קופון 5% החזרת לקוח' לשליחת וואטסאפ עם קופון.</p>
      <div style="text-align: center; margin-top: 24px;">
        <a href="https://badfos.co.il/admin/orders" style="background: #fbbf24; color: #1e293b; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">📋 לניהול ההזמנות</a>
      </div>
    </div>
  `

  const { error } = await resend.emails.send({
    from: 'בדפוס <no-reply@badfos.co.il>',
    to,
    subject: `🛒 ${rows.length} עגלות נטושות ממתינות להחזרה`,
    html,
  })

  if (error) {
    console.error('Abandoned-cart alert Resend error:', error)
    return false
  }
  return true
}
