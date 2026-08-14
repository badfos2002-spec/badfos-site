/**
 * מדידת שימוש ב-API-ים בתשלום — הרשם. צד-שרת בלבד (Admin SDK).
 *
 * ── למה מונה יומי לכל שירות, ולא מסמך לכל אירוע ──────────────────────────
 * שתי האפשרויות עולות בדיוק אותו מספר *כתיבות* (אירוע = כתיבה אחת: או
 * יצירת מסמך, או increment על מסמך היום). ההבדל הוא בכל השאר:
 *
 *   בנפח של ~20 הזמנות בשבוע → ~30 הגדלות + ~80 מיילים ≈ 110 אירועים בשבוע.
 *   • מסמך לאירוע: 110 כתיבות, 110 מסמכים חדשים בשבוע (~5,700 בשנה),
 *     והדוח קורא 220 מסמכים (שבועיים) בכל הרצה — ובנוסף צריך ניקוי תקופתי.
 *   • מונה יומי לשירות: אותן 110 כתיבות, אבל 14 מסמכים בשבוע (2 שירותים ×
 *     7 ימים), והדוח קורא 28 מסמכים בלבד. אין מה לנקות — הנפח זניח לנצח.
 *
 * שתי האפשרויות בתוך ה-free tier של Firestore (20K כתיבות ליום), אבל היומי
 * זול פי 8 בקריאות, לא דורש cron ניקוי, ולא מתנפח. לכן יומי.
 *
 * מחיר הנתונים שאבדו: אין חותמת זמן ברמת האירוע הבודד. לדוח שבועי זה לא
 * נדרש — הרזולוציה הקטנה ביותר שהוא מציג היא יום.
 *
 * ── כלל ברזל ─────────────────────────────────────────────────────────────
 * המדידה לעולם לא שוברת את מה שהיא מודדת. כל שגיאה נבלעת ונרשמת ללוג;
 * recordUsage לא זורק לעולם.
 */
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { UNIT_COST_ILS, jerusalemDateKey, type UsageService } from '@/lib/cost-digest'

export const USAGE_COLLECTION = 'usage'

/** מזהה המסמך היומי: <service>-<YYYY-MM-DD> בזמן ישראל. */
export function usageDocId(service: UsageService, dateKey: string): string {
  return `${service}-${dateKey}`
}

/**
 * רישום שימוש בשירות בתשלום. נקרא *אחרי* שהקריאה בפועל הצליחה.
 *
 * @param service השירות שנצרך
 * @param units   כמה יחידות חויבו (חיזוי אחד, מייל אחד...). ברירת מחדל 1.
 *
 * לעולם לא זורק. עלות: כתיבת increment אחת (~30ms), על מסלולים שכבר
 * מבצעים קריאת רשת חיצונית — רעש ברמת הלטנסי.
 */
export async function recordUsage(service: UsageService, units = 1): Promise<void> {
  try {
    if (!adminDb) return
    if (!Number.isFinite(units) || units <= 0) return

    const dateKey = jerusalemDateKey()
    const unitCostIls = UNIT_COST_ILS[service] ?? 0

    await adminDb
      .collection(USAGE_COLLECTION)
      .doc(usageDocId(service, dateKey))
      .set(
        {
          service,
          date: dateKey,
          calls: FieldValue.increment(1),
          units: FieldValue.increment(units),
          costIls: FieldValue.increment(units * unitCostIls),
          // המחיר שהופעל בפועל, לתיעוד: שינוי מחיר בקוד לא משכתב היסטוריה
          unitCostIls,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
  } catch (err) {
    console.error(`⚠️ usage tracking failed for ${service} (ignored):`, err)
  }
}
