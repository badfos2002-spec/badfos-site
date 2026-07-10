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
// Mirror TEXT custom field populated by a ManyChat Rule with the WhatsApp ID
// for every new contact. Needed because WhatsApp-only contacts store the number
// as wa_id and their `phone` SYSTEM field is empty, so findBySystemField can
// never find them (known ManyChat limitation).
const WA_PHONE_FIELD_NAME = 'wa_phone'

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

/** Resolve a ManyChat custom field id by name via getCustomFields. */
async function getFieldIdByName(name: string): Promise<number | string | null> {
  const fields = await mcFetch('/fb/page/getCustomFields')
  const field = (fields?.data || []).find((f: any) => f?.name === name)
  return field?.id ?? null
}

/**
 * Look up a subscriber via the `wa_phone` mirror custom field
 * (findByCustomField), trying each phone format in order (bare '972...'
 * first — that's what the ManyChat Rule writes). Best-effort: any failure
 * (field missing, API error, no match) is a miss, never an error.
 * Response shape: { status: 'success', data: [ ...subscribers ] }.
 */
async function findSubscriberByWaPhone(variants: string[]): Promise<string | null> {
  try {
    const fieldId = await getFieldIdByName(WA_PHONE_FIELD_NAME)
    if (!fieldId) return null
    for (const variant of variants) {
      try {
        const found = await mcFetch(
          `/fb/subscriber/findByCustomField?field_id=${encodeURIComponent(String(fieldId))}&field_value=${encodeURIComponent(variant)}`
        )
        const id = found?.data?.[0]?.id
        if (id) return String(id)
      } catch {
        // miss — try next format
      }
    }
  } catch {
    // getCustomFields failed — fall back to system-field lookup
  }
  return null
}

/**
 * Try findBySystemField with each phone format in order. ManyChat stores the
 * WhatsApp wa_id WITHOUT a plus ('972...'), so bare-972 must be tried first.
 * "Not found"-style non-success responses are treated as a miss, not an error.
 * NOTE: only finds contacts whose `phone` SYSTEM field is set — WhatsApp-only
 * contacts won't match here; that's what findSubscriberByWaPhone is for.
 */
async function findSubscriberByPhone(variants: string[]): Promise<string | null> {
  for (const variant of variants) {
    try {
      const found = await mcFetch(
        `/fb/subscriber/findBySystemField?phone=${encodeURIComponent(variant)}`
      )
      const id = found?.data?.id
      if (id) return String(id)
    } catch {
      // miss (ManyChat returns non-success when not found) — try next format
    }
  }
  return null
}

/** Full lookup: wa_phone mirror custom field first, then the phone system field. */
async function findSubscriber(variants: string[]): Promise<string | null> {
  return (await findSubscriberByWaPhone(variants)) ?? (await findSubscriberByPhone(variants))
}

/**
 * Find a ManyChat subscriber by phone, or create one (with WhatsApp opt-in).
 * Returns the subscriber id.
 *
 * Lookup order: `wa_phone` mirror custom field → `phone` system field → create.
 * Searches with both '972...' (ManyChat wa_id format, no plus) and '+972...'.
 * Creation uses whatsapp_phone + WhatsApp opt-in only (account has no SMS
 * channel), and mirrors the number into `wa_phone` for future lookups.
 * If createSubscriber says the WhatsApp ID already exists, re-finds instead
 * of failing (the create error body usually carries the exact wa_id).
 */
export async function findOrCreateSubscriber(
  phone: string,
  firstName: string,
  lastName: string
): Promise<string> {
  const bare = phone.replace(/^\+/, '') // '972...' — ManyChat wa_id format
  const variants = [bare, `+${bare}`]

  const existing = await findSubscriber(variants)
  if (existing) return existing

  try {
    const created = await mcFetch('/fb/subscriber/createSubscriber', {
      method: 'POST',
      body: JSON.stringify({
        whatsapp_phone: phone,
        first_name: firstName,
        last_name: lastName,
        has_opt_in_whatsapp: true,
        consent_phrase: 'אישור תקנון בהזמנה באתר badfos.co.il',
      }),
    })
    const id = created?.data?.id
    if (!id) throw new Error('ManyChat createSubscriber returned no subscriber id')
    // Mirror the number into the wa_phone custom field so future lookups
    // (which check wa_phone first) find this contact. Non-fatal on failure —
    // the subscriber was created successfully either way.
    try {
      const waFieldId = await getFieldIdByName(WA_PHONE_FIELD_NAME)
      if (waFieldId) {
        await mcFetch('/fb/subscriber/setCustomField', {
          method: 'POST',
          body: JSON.stringify({
            subscriber_id: String(id),
            field_id: waFieldId,
            field_value: bare,
          }),
        })
      }
    } catch {
      // best-effort mirror — ignore
    }
    return String(id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)

    // Contact exists in ManyChat but the initial find missed it — retry the
    // find, preferring the exact wa_id from the error body
    // (e.g. "This WhatsApp ID already exists: 972549213258")
    if (/already exists/i.test(msg)) {
      const waId = msg.match(/already exists\D*(\d{10,15})/i)?.[1]
      const retryVariants = waId ? [waId, `+${waId}`, ...variants] : variants
      const refound = await findSubscriber(retryVariants)
      if (refound) return refound
      throw new Error(
        `ManyChat says WhatsApp ID already exists but subscriber not findable — ${msg}`
      )
    }

    // New contact blocked by ManyChat account permissions — not a code bug
    if (/permission denied to import phone/i.test(msg)) {
      throw new Error(
        `ManyChat account permission blocks importing new phone contacts ("Permission denied to import phone") — enable phone import in ManyChat settings. ${msg}`
      )
    }

    throw e
  }
}

/** Set the subscriber's `coupon_code` custom field to the given coupon. */
export async function setCouponField(subscriberId: string, coupon: string): Promise<void> {
  const fieldId = await getFieldIdByName(COUPON_FIELD_NAME)
  if (!fieldId) throw new Error(`ManyChat custom field '${COUPON_FIELD_NAME}' not found`)

  await mcFetch('/fb/subscriber/setCustomField', {
    method: 'POST',
    body: JSON.stringify({
      subscriber_id: subscriberId,
      field_id: fieldId,
      field_value: coupon,
    }),
  })
}

/** Trigger a ManyChat flow (the approved WhatsApp template) for a subscriber. */
export async function sendFlow(subscriberId: string, flowNs: string): Promise<void> {
  await mcFetch('/fb/sending/sendFlow', {
    method: 'POST',
    body: JSON.stringify({ subscriber_id: subscriberId, flow_ns: flowNs }),
  })
}

export interface PickupReadySendInput {
  phone: string
  firstName: string
  lastName: string
}

/**
 * Best-effort "order ready for pickup" WhatsApp: find/create subscriber,
 * trigger the pickup-ready flow (MANYCHAT_PICKUP_FLOW_NS). Never throws.
 */
export async function sendPickupReadyWhatsApp(
  input: PickupReadySendInput
): Promise<RecoverySendResult> {
  try {
    if (!process.env.MANYCHAT_API_TOKEN) {
      return { sent: false, reason: 'missing MANYCHAT_API_TOKEN' }
    }
    const flowNs = process.env.MANYCHAT_PICKUP_FLOW_NS
    if (!flowNs) {
      console.log('ManyChat pickup-ready skipped: MANYCHAT_PICKUP_FLOW_NS not set')
      return { sent: false, reason: 'MANYCHAT_PICKUP_FLOW_NS not set' }
    }
    const phone = normalizeIlPhone(input.phone)
    if (!phone) {
      return { sent: false, reason: `unparseable IL phone: ${input.phone}` }
    }

    const subscriberId = await findOrCreateSubscriber(phone, input.firstName, input.lastName)
    await sendFlow(subscriberId, flowNs)

    console.log(`ManyChat pickup-ready WhatsApp sent to ${phone}`)
    return { sent: true }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    console.error('ManyChat pickup-ready failed:', reason)
    return { sent: false, reason }
  }
}

export interface LeadNoAnswerSendInput {
  phone: string
  firstName: string
  lastName: string
}

/**
 * Best-effort "we called but you didn't answer" WhatsApp to a lead:
 * find/create subscriber, trigger the lead-no-answer flow
 * (MANYCHAT_LEAD_NOANSWER_FLOW_NS). Never throws.
 */
export async function sendLeadNoAnswerWhatsApp(
  input: LeadNoAnswerSendInput
): Promise<RecoverySendResult> {
  try {
    if (!process.env.MANYCHAT_API_TOKEN) {
      return { sent: false, reason: 'missing MANYCHAT_API_TOKEN' }
    }
    const flowNs = process.env.MANYCHAT_LEAD_NOANSWER_FLOW_NS
    if (!flowNs) {
      console.log('ManyChat lead-no-answer skipped: MANYCHAT_LEAD_NOANSWER_FLOW_NS not set')
      return { sent: false, reason: 'MANYCHAT_LEAD_NOANSWER_FLOW_NS not set' }
    }
    const phone = normalizeIlPhone(input.phone)
    if (!phone) {
      return { sent: false, reason: `unparseable IL phone: ${input.phone}` }
    }

    const subscriberId = await findOrCreateSubscriber(phone, input.firstName, input.lastName)
    await sendFlow(subscriberId, flowNs)

    console.log(`ManyChat lead-no-answer WhatsApp sent to ${phone}`)
    return { sent: true }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    console.error('ManyChat lead-no-answer failed:', reason)
    return { sent: false, reason }
  }
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
