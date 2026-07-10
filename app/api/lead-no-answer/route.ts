import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { sendLeadNoAnswerWhatsApp } from '@/lib/manychat'

/**
 * "We called but you didn't answer" WhatsApp via ManyChat — triggered by the
 * admin when a lead's status is set to 'called_no_answer'.
 *
 * Self-protecting:
 * - Never sends twice per lead (noAnswerSentAt stamp).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const leadId = body?.leadId

    if (typeof leadId !== 'string' || !leadId.trim()) {
      return NextResponse.json({ error: 'Invalid leadId' }, { status: 400 })
    }

    const docRef = adminDb.collection('leads').doc(leadId.trim())
    const snap = await docRef.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const data = snap.data()!

    // Idempotency: one no-answer message per lead, ever
    if (data.noAnswerSentAt) {
      return NextResponse.json({ success: true, alreadySent: true })
    }

    if (!data.phone) {
      return NextResponse.json({ success: false, reason: 'Lead has no phone' })
    }

    // Lead has a single `name` field — first word as firstName, rest as lastName
    const nameParts = String(data.name || '').trim().split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ')

    const whatsapp = await sendLeadNoAnswerWhatsApp({
      phone: data.phone,
      firstName,
      lastName,
    })

    if (whatsapp.sent) {
      await docRef.update({
        noAnswerSentAt: Timestamp.now(),
        noAnswerChannel: 'manychat_auto',
      })
      console.log(`Lead no-answer WhatsApp sent for lead ${docRef.id}`)
    } else {
      console.log(`Lead no-answer not sent for lead ${docRef.id}: ${whatsapp.reason}`)
    }

    return NextResponse.json({ success: true, whatsapp })
  } catch (e) {
    console.error('Lead no-answer endpoint error:', e)
    return NextResponse.json({ error: 'Lead no-answer failed' }, { status: 500 })
  }
}
