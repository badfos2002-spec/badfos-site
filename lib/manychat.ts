/**
 * ManyChat API helpers (server-only) — auto WhatsApp recovery for abandoned carts.
 *
 * Requires MANYCHAT_API_TOKEN (set in Vercel; absent locally — handled gracefully).
 * Auto-send additionally requires MANYCHAT_RECOVERY_FLOW_NS (the WhatsApp template
 * flow, pending Meta approval) — until it exists, sendRecoveryWhatsApp skips silently.
 *
 * All ManyChat responses look like { status: 'success', data: ... }.
 */

const MANYCHAT_API = 'https://api.manychat.com'
const COUPON_FIELD_NAME = 'coupon_code'

/**
 * Normalize an Israeli mobile number to E.164 (+9725XXXXXXXX).
 * Accepts '05X-XXXXXXX', '9725XXXXXXXX', '+972 5X ...', '009725XXXXXXXX'.
 * Returns null if it doesn't look like an IL mobile.
 */
export function normalizeIlPhone(phone: string): string | null {
  let digits = (phone || '').replace(/\D/g, '')
  if (digits.startsWith('00972')) digits = digits.slice(2)
  if (/^05\d{8}$/.test(digits)) return `+972${digits.slice(1)}`
  if (/^9725\d{8}$/.test(digits)) return `+${digits}`
  return null
}

async function mcFetch(path: string, init?: RequestInit): Promise<any> {
  const token = process.env.MANYCHAT_API_TOKEN
  if (!token) throw new Error('MANYCHAT_API_TOKEN not configured')

  const res = await fetch(`${MANYCHAT_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const text = await res.text()
  let json: any = null
  try {
    json = JSON.parse(text)
  } catch {
    // non-JSON response — handled below
  }
  if (!res.ok || json?.status !== 'success') {
    throw new Error(`ManyChat ${path} failed (${res.status}): ${text.slice(0, 300)}`)
  }
  return json
}

/**
 * Find a ManyChat subscriber by phone, or create one (with WhatsApp opt-in).
 * Returns the subscriber id.
 */
export async function findOrCreateSubscriber(
  phone: string,
  firstName: string,
  lastName: string
): Promise<string> {
  try {
    const found = await mcFetch(
      `/fb/subscriber/findBySystemField?phone=${encodeURIComponent(phone)}`
    )
    const id = found?.data?.id
    if (id) return String(id)
  } catch {
    // not found (ManyChat returns non-success) — fall through to create
  }

  const created = await mcFetch('/fb/subscriber/createSubscriber', {
    method: 'POST',
    body: JSON.stringify({
      phone,
      whatsapp_phone: phone,
      first_name: firstName,
      last_name: lastName,
      has_opt_in_sms: true,
      consent_phrase: 'אישור תקנון בהזמנה באתר badfos.co.il',
    }),
  })
  const id = created?.data?.id
  if (!id) throw new Error('ManyChat createSubscriber returned no subscriber id')
  return String(id)
}

/** Set the subscriber's `coupon_code` custom field to the given coupon. */
export async function setCouponField(subscriberId: string, coupon: string): Promise<void> {
  const fields = await mcFetch('/fb/page/getCustomFields')
  const field = (fields?.data || []).find((f: any) => f?.name === COUPON_FIELD_NAME)
  if (!field?.id) throw new Error(`ManyChat custom field '${COUPON_FIELD_NAME}' not found`)

  await mcFetch('/fb/subscriber/setCustomField', {
    method: 'POST',
    body: JSON.stringify({
      subscriber_id: subscriberId,
      field_id: field.id,
      field_value: coupon,
    }),
  })
}

/** Trigger a ManyChat flow (the approved WhatsApp template) for a subscriber. */
export async function sendFlow(subscriberId: string, flowNs: string): Promise<void> {
  await mcFetch('/fb/subscriber/sendFlow', {
    method: 'POST',
    body: JSON.stringify({ subscriber_id: subscriberId, flow_ns: flowNs }),
  })
}

export interface RecoverySendInput {
  orderId: string
  orderNumber: number
  firstName: string
  lastName: string
  phone: string
  couponCode: string
}

export interface RecoverySendResult {
  sent: boolean
  reason?: string
}

/**
 * Best-effort auto WhatsApp recovery: find/create subscriber, set the coupon
 * custom field, trigger the recovery flow. Never throws.
 */
export async function sendRecoveryWhatsApp(input: RecoverySendInput): Promise<RecoverySendResult> {
  try {
    if (!process.env.MANYCHAT_API_TOKEN) {
      return { sent: false, reason: 'missing MANYCHAT_API_TOKEN' }
    }
    const flowNs = process.env.MANYCHAT_RECOVERY_FLOW_NS
    if (!flowNs) {
      // Flow not configured yet (pending Meta approval) — skip silently
      console.log(
        `ManyChat recovery skipped for order #${input.orderNumber}: MANYCHAT_RECOVERY_FLOW_NS not set`
      )
      return { sent: false, reason: 'missing MANYCHAT_RECOVERY_FLOW_NS' }
    }
    const phone = normalizeIlPhone(input.phone)
    if (!phone) {
      return { sent: false, reason: `unparseable IL phone: ${input.phone}` }
    }

    const subscriberId = await findOrCreateSubscriber(phone, input.firstName, input.lastName)
    await setCouponField(subscriberId, input.couponCode)
    await sendFlow(subscriberId, flowNs)

    console.log(
      `ManyChat recovery WhatsApp sent for order #${input.orderNumber} (${input.orderId}), coupon ${input.couponCode}`
    )
    return { sent: true }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    console.error(`ManyChat recovery failed for order #${input.orderNumber}:`, reason)
    return { sent: false, reason }
  }
}
