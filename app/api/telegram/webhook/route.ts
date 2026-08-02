import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { sendTelegramMessage, parseSale, extractSaleFromPhoto } from '@/lib/telegram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const HELP = `👋 היי! אני העוזר של בדפוס — יומן העסקאות הידניות שלך.

📝 לרשום עסקה: שלח לי
   שם  טלפון  סכום  סוג-תשלום
   למשל: יוסי כהן 0501234567 150 ביט
   (בקבוצה — התחל עם המילה: מכירה)

📸 אפשר גם לשלוח צילום של אישור תשלום (בקבוצה — עם כיתוב "מכירה").

📊 פקודות: היום · החודש · רשימה

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

    // In groups the bot must stay silent unless explicitly addressed.
    const chatType = msg?.chat?.type
    const isGroup = chatType === 'group' || chatType === 'supergroup'
    // Strip the bot's @mention (groups deliver "@Badfos_assistant_bot ...") and a single leading slash later
    const cleanText = (text || '').replace(/@[A-Za-z0-9_]*bot\b/gi, '').trim()

    // 4. Allowlist check.
    const allowed = (process.env.TELEGRAM_ALLOWED_IDS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!allowed.includes(String(fromId))) {
      // In groups, stay silent — never announce "no permission".
      if (isGroup) {
        return NextResponse.json({ ok: true })
      }
      await sendTelegramMessage(chatId, 'אין לך הרשאה להשתמש בבוט הזה.')
      return NextResponse.json({ ok: true })
    }

    // 5. Photo → read the payment screenshot with vision AI.
    // Must run before the empty-text return, since photos carry no text.
    if (Array.isArray(msg.photo) && msg.photo.length > 0) {
      const caption = (msg.caption || '').replace(/@[A-Za-z0-9_]*bot\b/gi, '').trim()
      // In groups, only react to photos explicitly marked as a sale.
      if (isGroup && !caption.includes('מכירה')) {
        return NextResponse.json({ ok: true })
      }
      const fileId = msg.photo[msg.photo.length - 1].file_id // largest size
      await sendTelegramMessage(chatId, '📸 קורא את הצילום…')
      const sale = await extractSaleFromPhoto(fileId, caption)
      if (!sale || sale.amount <= 0) {
        await sendTelegramMessage(chatId, 'לא הצלחתי לקרוא את הסכום מהצילום 🤔 — נסה/י לשלוח את הפרטים בטקסט (שם טלפון סכום סוג-תשלום).')
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
        source: 'photo',
      })
      const phoneLine = sale.phone ? `\n📞 ${sale.phone}` : ''
      await sendTelegramMessage(chatId, `📸 נרשם מצילום: ${sale.name} · ${sale.amount}₪ · ${sale.paymentType}${phoneLine}\nנרשם ע"י ${fromName}`)
      return NextResponse.json({ ok: true })
    }

    // 6. Empty text.
    if (!cleanText) {
      return NextResponse.json({ ok: true })
    }

    // 7. Commands (both "היום" and "/היום" work).
    const cmd = cleanText.replace(/^\//, '')

    if (cmd === 'start' || cmd === 'עזרה' || cmd === 'help') {
      await sendTelegramMessage(chatId, HELP)
      return NextResponse.json({ ok: true })
    }

    if (cmd === 'chatid') {
      await sendTelegramMessage(chatId, `ה-chat_id של הצ'אט הזה:\n${chatId}`)
      return NextResponse.json({ ok: true })
    }

    if (cmd === 'היום' || cmd === 'החודש') {
      const snap = await adminDb
        .collection('manualSales')
        .orderBy('createdAt', 'desc')
        .limit(500)
        .get()

      const isToday = cmd === 'היום'
      const todayKey = jslDateKey(new Date())
      const monthKey = todayKey.slice(0, 7)

      const matched = snap.docs
        .map((d) => d.data())
        .filter((data) => {
          const key = jslDateKey(toDate(data.createdAt))
          return isToday ? key === todayKey : key.slice(0, 7) === monthKey
        })

      if (matched.length === 0) {
        await sendTelegramMessage(chatId, `📊 אין עסקאות ל${cmd}`)
        return NextResponse.json({ ok: true })
      }

      const sum = matched.reduce((acc, data) => acc + (Number(data.amount) || 0), 0)
      await sendTelegramMessage(
        chatId,
        `📊 ${cmd}: ${matched.length} עסקאות · סה"כ ${sum}₪`
      )
      return NextResponse.json({ ok: true })
    }

    if (cmd === 'רשימה') {
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

    // 8. Otherwise, treat as a sale entry.
    // In groups, require the explicit "מכירה" prefix so random chatter is ignored silently.
    let saleText: string
    if (isGroup) {
      if (!cleanText.startsWith('מכירה')) {
        return NextResponse.json({ ok: true })
      }
      saleText = cleanText.replace(/^מכירה/, '').trim()
    } else {
      saleText = cleanText
    }

    const sale = parseSale(saleText)
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
      source: 'text',
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
