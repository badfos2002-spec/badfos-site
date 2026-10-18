/**
 * הזמנה קולית: תמלול (OpenAI) + חילוץ שורות מובנות מול הקטלוג האמיתי.
 * צד שרת בלבד. האודיו לא נשמר בשום מקום — הוא עובר מהבקשה ישר ל-OpenAI.
 */
import OpenAI, { toFile } from 'openai'
import {
  catalogEnums,
  catalogForPrompt,
  colorOptions,
  itemProblem,
  normalizeItem,
  typeOptions,
  type VoiceItem,
} from './daily-orders'

export interface ExtractedItem extends VoiceItem {
  /** הקטע מהתמלול שממנו השורה חולצה */
  phrase: string
  /** בעיה שנמצאה בוולידציה מול הקטלוג (עברית) — השורה דורשת תיקון ידני */
  problem?: string
}

export interface UnclearPhrase {
  phrase: string
  reason: string
}

export interface VoiceOrderResult {
  transcript: string
  items: ExtractedItem[]
  unclear: UnclearPhrase[]
}

export class VoiceOrderError extends Error {
  constructor(public code: 'no_api_key' | 'transcription_failed' | 'extraction_failed', message: string) {
    super(message)
  }
}

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: CALL_TIMEOUT_MS, maxRetries: 0 })
  return _openai
}

/**
 * תקציב זמן. ה-route מוגבל ל-maxDuration 60s; כל השרשרת (תמלול, אולי
 * whisper כגיבוי, חילוץ) חייבת להסתיים לפני 55s כדי שתמיד תחזור תשובה
 * מסודרת ולא timeout של Vercel. כל קריאה מקבלת timeout לפי מה שנשאר,
 * ו-retry רק אם יש לו מקום בתקציב.
 */
const CALL_TIMEOUT_MS = 25_000
const TOTAL_BUDGET_MS = 55_000
/** שמור לחילוץ (gpt-4o) — תמלול לא יאכל את הזמן הזה. */
const EXTRACTION_RESERVE_MS = 15_000
const MIN_CALL_MS = 5_000

// maxRetries תמיד 0: ה-SDK מכבד retry-after עד 60s, מה שהיה מפוצץ את התקציב.
function callOptions(deadline: number, reserveMs = 0): { timeout: number; maxRetries: number } | null {
  const remaining = deadline - Date.now() - reserveMs
  if (remaining < MIN_CALL_MS) return null
  return { timeout: Math.min(CALL_TIMEOUT_MS, remaining), maxRetries: 0 }
}

/**
 * מתי לנסות whisper-1 אחרי כשל של gpt-4o-transcribe: רשת/timeout, 5xx,
 * 403/404 (אין גישה למודל), 429 (אלא אם נגמרה המכסה — whisper ייכשל גם).
 * לא על 400/413/415/401 (הבעיה בקובץ/במפתח) ולא כשנגמר תקציב הזמן.
 */
function shouldFallback(e: unknown): boolean {
  if (e instanceof VoiceOrderError) return false
  if (e instanceof OpenAI.APIConnectionError) return true // כולל APIConnectionTimeoutError
  if (!(e instanceof OpenAI.APIError) || typeof e.status !== 'number') return false
  if (e.status >= 500) return true
  if (e.status === 403 || e.status === 404) return true
  if (e.status === 429) return e.code !== 'insufficient_quota'
  return false
}

/** מילון שמכוון את התמלול למונחים של העסק. */
const TRANSCRIBE_HINT =
  'הזמנה של מוצרי הדפסה: חולצה, כותנה, דרייפיט, פולו, אוברסייז, סווטשרט, קפוצ׳ון קנגרו, פוטר, רוכסן, ' +
  'כובע טמבל, כובע רשת, תיק קנבס, תיק שרוכים, באף, סינר, בגד גוף, וסט זוהר. ' +
  'מידות: XS, S, M, L, XL, XXL, 3XL, 4XL, מידות ילדים 2 עד 18. צבעים: שחור, לבן, נייבי, אפור, בורדו, זית, בז׳.'

export async function transcribeAudio(
  buffer: Buffer,
  fileName: string,
  deadline = Date.now() + TOTAL_BUDGET_MS,
): Promise<string> {
  const openai = getOpenAI()
  if (!openai) throw new VoiceOrderError('no_api_key', 'OPENAI_API_KEY is not set')

  const attempt = async (model: 'gpt-4o-transcribe' | 'whisper-1') => {
    const opts = callOptions(deadline, EXTRACTION_RESERVE_MS)
    if (!opts) throw new VoiceOrderError('transcription_failed', 'out of time budget')
    const file = await toFile(buffer, fileName)
    const res = await openai.audio.transcriptions.create({
      file,
      model,
      language: 'he',
      prompt: TRANSCRIBE_HINT,
    }, opts)
    return (res.text ?? '').trim()
  }

  try {
    return await attempt('gpt-4o-transcribe')
  } catch (e) {
    if (!shouldFallback(e)) {
      console.error('voice-order: gpt-4o-transcribe failed (no fallback):', e)
      throw e instanceof VoiceOrderError ? e : new VoiceOrderError('transcription_failed', e instanceof Error ? e.message : String(e))
    }
    console.error('voice-order: gpt-4o-transcribe failed, falling back to whisper-1:', e)
    try {
      return await attempt('whisper-1')
    } catch (e2) {
      console.error('voice-order: whisper-1 failed too:', e2)
      throw new VoiceOrderError('transcription_failed', e2 instanceof Error ? e2.message : String(e2))
    }
  }
}

function buildSchema() {
  const { products, types, colors, sizes } = catalogEnums()
  return {
    type: 'object',
    additionalProperties: false,
    required: ['items', 'unclear'],
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['phrase', 'productType', 'fabricType', 'color', 'size', 'quantity'],
          properties: {
            phrase: { type: 'string', description: 'The exact words from the transcript this row came from' },
            productType: { type: 'string', enum: products },
            fabricType: { type: 'string', enum: types, description: 'Empty string when the product has no type' },
            color: { type: 'string', enum: colors },
            size: { type: 'string', enum: sizes },
            quantity: { type: 'integer' },
          },
        },
      },
      unclear: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['phrase', 'reason'],
          properties: {
            phrase: { type: 'string', description: 'The raw words from the transcript' },
            reason: { type: 'string', description: 'Short reason in Hebrew' },
          },
        },
      },
    },
  }
}

const SYSTEM_PROMPT = `You convert a spoken Hebrew order (a transcript) for a custom-printing shop into structured rows.
Each row = ONE product + type + color + size with its quantity. Split "שלוש M ושתיים L" into two rows (M×3, L×2).
Use ONLY ids from this catalog; a combination is valid only if listed under that product/type:

{CATALOG}

Hebrew hints: "חולצה"/"טישירט" = tshirt; "סווטשרט"/"סווטשירט" = sweatshirt; "קפוצ'ון"/"הודי" = sweatshirt kangaroo (with zipper/"רוכסן" = zip); "פוטר"/"קרו" = sweatshirt putter;
"דרייפיט"/"דריפיט" = dri-fit; "כותנה" = cotton; Hebrew numbers: אחת/אחד=1, שתיים/שניים/שני=2, שלוש/שלושה=3, ארבע=4, חמש=5, שש=6, שבע=7, שמונה=8, תשע=9, עשר=10, "תריסר"=12.
"מדיום"=M, "לארג'"/"לארג"=L, "סמול"=S, "אקסטרה לארג'"=XL, "דאבל אקס אל"/"2XL"=XXL, "3 אקס אל"=3XL. Kids sizes like "מידה 8 ילדים" = size "8".
Products with no sizes (cap, tote, buff, apron, vest) use size "ONE_SIZE". Products with no type use fabricType "".
A detail said once applies to the following items until changed (e.g. "חולצות כותנה שחורות: שתיים M, שלוש L").

STRICT RULES — never guess silently:
- If the product, color, size or quantity of an item was not said or is ambiguous, or the combination is not in the catalog, do NOT output it as an item. Put the raw phrase in "unclear" with a short Hebrew reason (e.g. "לא נאמרה מידה", "הצבע לא קיים לדרייפיט").
- If only the type/fabric was not said (e.g. "חולצה שחורה" without כותנה/דרייפיט), output the item with fabricType "" — it will be completed by hand. Never assume cotton or any other type.
- Ignore greetings, names, phone numbers, prices and chit-chat (do not put them in unclear).
- Quantities are positive integers.`

export async function extractItems(
  transcript: string,
  deadline = Date.now() + TOTAL_BUDGET_MS,
): Promise<{ items: ExtractedItem[]; unclear: UnclearPhrase[] }> {
  const openai = getOpenAI()
  if (!openai) throw new VoiceOrderError('no_api_key', 'OPENAI_API_KEY is not set')
  if (!transcript.trim()) return { items: [], unclear: [] }
  const opts = callOptions(deadline)
  if (!opts) throw new VoiceOrderError('extraction_failed', 'out of time budget')

  let parsed: { items?: unknown[]; unclear?: unknown[] }
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT.replace('{CATALOG}', catalogForPrompt()) },
        { role: 'user', content: transcript },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'voice_order', strict: true, schema: buildSchema() },
      },
    }, opts)
    parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}')
  } catch (e) {
    console.error('voice-order: extraction failed:', e)
    throw new VoiceOrderError('extraction_failed', e instanceof Error ? e.message : String(e))
  }

  const unclear: UnclearPhrase[] = (parsed.unclear ?? []).flatMap(u => {
    const r = (u ?? {}) as Record<string, unknown>
    const phrase = typeof r.phrase === 'string' ? r.phrase.trim() : ''
    return phrase ? [{ phrase, reason: typeof r.reason === 'string' ? r.reason : '' }] : []
  })

  // ולידציה שנייה מול הקטלוג: סכמת ה-enum לא יודעת אילו צירופים חוקיים
  // (למשל "khaki" קיים רק לכובעים). ערך לא חוקי מתרוקן כדי שהשורה תופיע
  // בטבלה עם בחירה ריקה ותסומן לתיקון — אף פעם לא נשמר בשקט.
  const items: ExtractedItem[] = (parsed.items ?? []).map(raw => {
    const phrase = typeof (raw as Record<string, unknown>)?.phrase === 'string' ? String((raw as Record<string, unknown>).phrase) : ''
    const item = normalizeItem(raw)
    const problem = itemProblem(item)
    if (problem) {
      if (!typeOptions(item.productType).some(t => t.id === item.fabricType)) item.fabricType = ''
      if (!colorOptions(item.productType, item.fabricType).some(c => c.id === item.color)) item.color = ''
      // מידה שזוהתה אבל לא חוקית כרגע נשארת גלויה בטבלה ("(לבדוק)") — לא מתרוקנת
    }
    return { ...item, phrase, ...(problem ? { problem } : {}) }
  })

  return { items, unclear }
}

export async function processVoiceOrder(buffer: Buffer, fileName: string): Promise<VoiceOrderResult> {
  const deadline = Date.now() + TOTAL_BUDGET_MS
  const transcript = await transcribeAudio(buffer, fileName, deadline)
  const { items, unclear } = await extractItems(transcript, deadline)
  return { transcript, items, unclear }
}
