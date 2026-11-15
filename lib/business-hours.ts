import { BUSINESS_HOURS } from '@/lib/constants'

const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const jerusalemClock = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Jerusalem',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** האם העסק פתוח ברגע הנתון — לפי שעון ישראל, לא לפי אזור הזמן של המכונה */
export function isOpenNow(now: Date = new Date()): boolean {
  const parts = Object.fromEntries(jerusalemClock.formatToParts(now).map((p) => [p.type, p.value]))
  const day = WEEKDAYS_EN.findIndex((d) => d.startsWith(parts.weekday))
  const time = `${parts.hour}:${parts.minute}`
  return BUSINESS_HOURS.some(
    (h) => (h.days as readonly number[]).includes(day) && h.open <= time && time < h.close
  )
}

const displayTime = (t: string) => t.replace(/^0/, '')

/** שורות התצוגה לדף צור קשר, למשל «ראשון–חמישי: 9:00–21:00» */
export function hoursLines(): string[] {
  return [
    ...BUSINESS_HOURS.map((h) => `${h.label}: ${displayTime(h.open)}–${displayTime(h.close)}`),
    'שבת: סגור',
  ]
}

/** openingHoursSpecification ל-JSON-LD, נבנה מ-BUSINESS_HOURS; שבת סגורה */
export function openingHoursSpecification() {
  return [
    ...BUSINESS_HOURS.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days.map((d) => WEEKDAYS_EN[d]),
      opens: h.open,
      closes: h.close,
    })),
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday'], opens: '00:00', closes: '00:00' },
  ]
}
