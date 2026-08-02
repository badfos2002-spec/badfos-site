// Telegram helpers for the owner-only manual sales log bot.
// See app/api/telegram/webhook/route.ts for the webhook handler.

import OpenAI from 'openai'

/**
 * Send a Telegram message. Never throws — logs and swallows errors so the
 * webhook handler can always return 200 to Telegram.
 */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string
): Promise<void> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
      console.error('sendTelegramMessage: TELEGRAM_BOT_TOKEN is missing')
      return
    }
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
  } catch (err) {
    console.error('sendTelegramMessage error:', err)
  }
}

/**
 * Lenient parser for a manual sale message, e.g. "יוסי כהן 0501234567 150 ביט".
 * Returns null when a phone or an amount can't be found.
 */
export function parseSale(
  text: string
): { name: string; phone: string; amount: number; paymentType: string } | null {
  // Phone: Israeli number, optionally with dashes.
  const phoneMatch = text.match(/0\d[\d-]{7,9}\d/)
  if (!phoneMatch) return null
  const phoneRaw = phoneMatch[0]
  const phone = phoneRaw.replace(/\D/g, '')

  // Drop the phone so its digits aren't mistaken for the amount.
  const withoutPhone = text.replace(phoneRaw, ' ')

  // Amount: first integer token (<= 6 digits) that isn't part of the phone.
  const numbers = withoutPhone.match(/\d+/g)
  const amountToken = numbers?.find((n) => n.length <= 6)
  if (!amountToken) return null
  const amount = parseInt(amountToken, 10)

  // Payment type keyword, if present.
  const paymentKeywords = ['ביט', 'מזומן', 'אשראי', 'העברה']
  const paymentType = paymentKeywords.find((k) => text.includes(k)) || 'לא צוין'

  // Name: the leftover text after removing phone, amount, and payment keyword.
  let name = text.replace(phoneRaw, ' ')
  name = name.replace(new RegExp(`${amountToken}\\s*(₪|שח|ש"ח)?`), ' ')
  if (paymentType !== 'לא צוין') {
    name = name.replace(paymentType, ' ')
  }
  name = name.replace(/\s+/g, ' ').trim()
  if (!name) name = 'ללא שם'

  return { name, phone, amount, paymentType }
}

/**
 * Read a payment screenshot (usually Bit) with GPT-4o vision and extract the
 * sale details. Returns null on any failure — the caller falls back to text.
 */
export async function extractSaleFromPhoto(
  fileId: string,
  caption: string
): Promise<{ name: string; phone: string; amount: number; paymentType: string } | null> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token || !process.env.OPENAI_API_KEY) return null

    // 1. Resolve the Telegram file path
    const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`)
    const fileJson = await fileRes.json()
    const filePath = fileJson?.result?.file_path
    if (!filePath) return null

    // 2. Download the image bytes → base64 data URL
    const imgRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`)
    if (!imgRes.ok) return null
    const buf = Buffer.from(await imgRes.arrayBuffer())
    const mime = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg'
    const dataUrl = `data:${mime};base64,${buf.toString('base64')}`

    // 3. Ask GPT-4o vision to extract the sale
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const prompt = `זהו צילום מסך של תשלום שהעסק קיבל (לרוב תשלום בביט/Bit, לפעמים מזומן/אשראי/העברה).
חלץ את הפרטים והחזר JSON בלבד במבנה: {"name": string, "phone": string, "amount": number, "paymentType": string}.
- name = שם המשלם/הלקוח כפי שמופיע בצילום. אם לא ברור — מחרוזת ריקה.
- phone = ספרות בלבד אם מופיע מספר טלפון, אחרת מחרוזת ריקה.
- amount = הסכום בשקלים כמספר (בלי ₪, בלי פסיקים). אם לא נמצא — 0.
- paymentType = אחד מ: "ביט","מזומן","אשראי","העברה". אם זה צילום של ביט — "ביט". אם לא ברור — "ביט".
${caption ? `\nהערה מהמשתמש (השתמש בה כהקשר נוסף, למשל טלפון/שם): "${caption}"` : ''}
החזר אך ורק JSON תקין, בלי טקסט נוסף.`

    const resp = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      }],
      response_format: { type: 'json_object' },
      max_tokens: 300,
      temperature: 0,
    })

    const content = resp.choices?.[0]?.message?.content
    if (!content) return null
    const parsed = JSON.parse(content)
    const amount = Number(parsed.amount) || 0
    return {
      name: (parsed.name || '').toString().trim() || 'ללא שם',
      phone: (parsed.phone || '').toString().replace(/\D/g, ''),
      amount,
      paymentType: (parsed.paymentType || 'ביט').toString().trim() || 'ביט',
    }
  } catch (err) {
    console.error('extractSaleFromPhoto error:', err)
    return null
  }
}
