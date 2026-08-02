import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { sendTelegramMessage, parseSale } from '@/lib/telegram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HELP = `👋 היי! אני העוזר של בדפוס — יומן העסקאות הידניות שלך.

📝 לרשום עסקה: שלח לי
   שם  טלפון  סכום  סוג-תשלום
   למשל: יוסי כהן 0501234567 150 ביט

📊 פקודות:
   היום — סיכום היום
   החודש — סיכום החודש
   רשימה — 10 האחרונות

⚠️ זה תיעוד פרטי בלבד, לא קבלה רשמית.`

// "YYYY-MM-DD" in the Asia/Jerusalem timezone.
function jslDateKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function toDate(c: any): Date {
  return c?.toDate ? c.toDate() : new Date(c)
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify the shared secret. Fails closed if the env var is missing.
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    const headerSecret = request.headers.get('x-telegram-bot-api-secret-token')
    if (!secret || headerSecret !== secret) {
      return new NextResponse('unauthorized', { status: 401 })
    }

    // 2. Parse the update body.
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ ok: true })
    }

    const msg = body?.message
    const text = (msg?.text || '').trim()
    const fromId = msg?.from?.id
    const chatId = msg?.chat?.id
    const fromName = msg?.from?.first_name || 'לא ידוע'

    // 3. Ignore non-message updates.
    if (!msg || !chatId) {
      return NextResponse.json({ ok: true })
    }

    // 4. Allowlist check.
    const allowed = (process.env.TELEGRAM_ALLOWED_IDS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!allowed.includes(String(fromId))) {
      await sendTelegramMessage(chatId, 'אין לך הרשאה להשתמש בבוט הזה.')
      return NextResponse.json({ ok: true })
    }

    // 5. Empty text.
    if (!text) {
      return NextResponse.json({ ok: true })
    }

    // 6. Commands.
    if (text === '/start' || text === 'start' || text === 'עזרה' || text === '/help') {
      await sendTelegramMessage(chatId, HELP)
      return NextResponse.json({ ok: true })
    }

    if (text === 'היום' || text === 'החודש') {
      const snap = await adminDb
        .collection('manualSales')
        .orderBy('createdAt', 'desc')
        .limit(500)
        .get()

      const isToday = text === 'היום'
      const todayKey = jslDateKey(new Date())
      const monthKey = todayKey.slice(0, 7)

      const matched = snap.docs
        .map((d) => d.data())
        .filter((data) => {
          const key = jslDateKey(toDate(data.createdAt))
          return isToday ? key === todayKey : key.slice(0, 7) === monthKey
        })

      if (matched.length === 0) {
        await sendTelegramMessage(chatId, `📊 אין עסקאות ל${text}`)
        return NextResponse.json({ ok: true })
      }

      const sum = matched.reduce((acc, data) => acc + (Number(data.amount) || 0), 0)
      await sendTelegramMessage(
        chatId,
        `📊 ${text}: ${matched.length} עסקאות · סה"כ ${sum}₪`
      )
      return NextResponse.json({ ok: true })
    }

    if (text === 'רשימה') {
      const snap = await adminDb
        .collection('manualSales')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()

      if (snap.empty) {
        await sendTelegramMessage(chatId, '📊 אין עסקאות')
        return NextResponse.json({ ok: true })
      }

      const lines = snap.docs.map((d) => {
        const data = d.data()
        const key = jslDateKey(toDate(data.createdAt))
        const [, mm, dd] = key.split('-')
        return `• ${data.name} · ${data.amount}₪ · ${data.paymentType} · ${dd}/${mm}`
      })
      await sendTelegramMessage(chatId, lines.join('\n'))
      return NextResponse.json({ ok: true })
    }

    // 7. Otherwise, treat as a sale entry.
    const sale = parseSale(text)
    if (!sale) {
      await sendTelegramMessage(
        chatId,
        'לא הצלחתי להבין 🤔\nפורמט: שם טלפון סכום סוג-תשלום\nלמשל: יוסי כהן 0501234567 150 ביט'
      )
      return NextResponse.json({ ok: true })
    }

    await adminDb.collection('manualSales').add({
      name: sale.name,
      phone: sale.phone,
      amount: sale.amount,
      paymentType: sale.paymentType,
      enteredBy: fromName,
      enteredById: String(fromId),
      createdAt: new Date(),
      receiptIssued: false,
    })

    await sendTelegramMessage(
      chatId,
      `✅ נרשם: ${sale.name} · ${sale.amount}₪ · ${sale.paymentType}\nנרשם ע"י ${fromName}`
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('telegram webhook error:', err)
    return NextResponse.json({ ok: true })
  }
}
