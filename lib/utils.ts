import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Timestamp } from 'firebase/firestore'

/**
 * Merge Tailwind classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date in Hebrew
 */
export function formatDateHebrew(date: Date | Timestamp): string {
  const dateObj = date instanceof Timestamp ? date.toDate() : date

  const hebrewMonths = [
    'ינואר',
    'פברואר',
    'מרץ',
    'אפריל',
    'מאי',
    'יוני',
    'יולי',
    'אוגוסט',
    'ספטמבר',
    'אוקטובר',
    'נובמבר',
    'דצמבר',
  ]

  const day = dateObj.getDate()
  const month = hebrewMonths[dateObj.getMonth()]
  const year = dateObj.getFullYear()

  return `${day} ב${month} ${year}`
}

/**
 * Format date and time in Hebrew
 */
export function formatDateTimeHebrew(date: Date | Timestamp): string {
  const dateObj = date instanceof Timestamp ? date.toDate() : date

  const dateStr = formatDateHebrew(dateObj)
  const hours = dateObj.getHours().toString().padStart(2, '0')
  const minutes = dateObj.getMinutes().toString().padStart(2, '0')

  return `${dateStr} בשעה ${hours}:${minutes}`
}

/**
 * Format relative time in Hebrew (e.g., "לפני 5 דקות")
 */
export function formatRelativeTime(date: Date | Timestamp): string {
  const dateObj = date instanceof Timestamp ? date.toDate() : date
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return 'עכשיו'
  if (diffMinutes === 1) return 'לפני דקה'
  if (diffMinutes < 60) return `לפני ${diffMinutes} דקות`
  if (diffHours === 1) return 'לפני שעה'
  if (diffHours < 24) return `לפני ${diffHours} שעות`
  if (diffDays === 1) return 'אתמול'
  if (diffDays < 7) return `לפני ${diffDays} ימים`

  return formatDateHebrew(dateObj)
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Format phone number (Israeli format)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '')

  // Format as XXX-XXXXXXX
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
  }

  return phone
}

/**
 * Validate Israeli phone number
 */
export function isValidIsraeliPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length === 10 && cleaned.startsWith('05')
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const LEAD_STALE_DAYS = 3
/** A lead is "stale" (shown as 'לא עודכן') when it's still 'new' but older than 3 days. */
export function isLeadStale(lead: { status?: string; createdAt?: any }): boolean {
  if (lead?.status !== 'new') return false
  const ms = lead.createdAt?.toMillis?.() ?? lead.createdAt?.toDate?.()?.getTime?.()
  if (!ms) return false
  return Date.now() - ms > LEAD_STALE_DAYS * 24 * 60 * 60 * 1000
}

/**
 * Compare two phone numbers by their last 9 digits (handles 05X vs +9725X forms).
 * Returns false if either is missing or too short.
 */
export function phonesMatch(a?: string, b?: string): boolean {
  const digitsA = (a || '').replace(/\D/g, '')
  const digitsB = (b || '').replace(/\D/g, '')
  if (digitsA.length < 9 || digitsB.length < 9) return false
  return digitsA.slice(-9) === digitsB.slice(-9)
}

/**
 * Ask the user to confirm replacing an existing design in a given area.
 * Guards against silently discarding a design the user already uploaded in the
 * CURRENT designer session. Returns true only if the user explicitly confirms.
 * `multiArea` = true when the product genuinely supports separate designs per area
 * (t-shirt / sweatshirt), so the guidance can suggest uploading to another area.
 */
export function confirmDesignReplace(areaName: string, multiArea = false): boolean {
  const guidance = multiArea
    ? 'רוצה כמה עיצובים שונים? העלה לאזור אחר, או סיים והוסף לעגלה ואז התחל פריט חדש.'
    : 'רוצה עוד עיצוב? סיים והוסף לעגלה, ואז התחל פריט חדש.'
  return window.confirm(
    `כבר העלית עיצוב לאזור "${areaName}" 🎨\n` +
    `העלאה חדשה תחליף את הקיים.\n` +
    `${guidance}\n\n` +
    `להחליף את העיצוב הקיים?`
  )
}

/**
 * Escape HTML special characters to prevent HTML injection
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
