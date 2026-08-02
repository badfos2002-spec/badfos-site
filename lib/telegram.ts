// Telegram helpers for the owner-only manual sales log bot.
// See app/api/telegram/webhook/route.ts for the webhook handler.

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
