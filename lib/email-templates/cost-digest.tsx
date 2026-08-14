import { escapeHtml } from '../utils'
import { ils, ils1, type Digest } from '../cost-digest'

/**
 * דוח עלויות שבועי — מייל.
 *
 * הכלל: הדוח נקרא ב-10 שניות בטלפון. מספר כותרת אחד (עלות להזמנה),
 * ואחריו רק מה שהשתנה. אין טבלת ספקים, אין גרפים, אין "דשבורד".
 */

const NAVY = '#1A1A2E'
const YELLOW = '#FDB913'
const MUTED = '#6B7280'
const UP = '#DC2626' // התייקרות — אדום
const DOWN = '#059669' // הוזלה — ירוק

function row(label: string, value: string): string {
  return `
      <tr>
        <td style="padding: 6px 0; color: ${MUTED}; font-size: 16px;">${label}</td>
        <td style="padding: 6px 0; color: ${NAVY}; font-size: 18px; font-weight: 700; text-align: left; white-space: nowrap;">${value}</td>
      </tr>`
}

/** "(שבוע שעבר: ₪19.4  ▲18%)" — או הסבר קצר כשאין למה להשוות. */
function comparisonLine(digest: Digest): string {
  const prev = digest.previous
  if (!prev) {
    return `<div style="color: ${MUTED}; font-size: 14px; margin-top: 6px;">שבוע ראשון של המדידה — אין עדיין למה להשוות</div>`
  }
  if (prev.costPerOrder === null) {
    return `<div style="color: ${MUTED}; font-size: 14px; margin-top: 6px;">שבוע שעבר: לא היו הזמנות</div>`
  }
  const prevText = `שבוע שעבר: ${ils1(prev.costPerOrder)}`
  if (digest.deltaPercent === null || digest.deltaDirection === null || digest.deltaDirection === 'flat') {
    return `<div style="color: ${MUTED}; font-size: 14px; margin-top: 6px;">${prevText} · ללא שינוי</div>`
  }
  const up = digest.deltaDirection === 'up'
  const arrow = up ? '▲' : '▼'
  const color = up ? UP : DOWN
  const pct = Math.abs(Math.round(digest.deltaPercent))
  return `<div style="color: ${MUTED}; font-size: 14px; margin-top: 6px;">${prevText} &nbsp;<span style="color: ${color}; font-weight: 700;">${arrow}${pct}%</span></div>`
}

/** שורת החריגה — השירות היחיד שזז חזק, או שורה אחת שאומרת שהכול שקט. */
function anomalyBlock(digest: Digest): string {
  const boxOpen = `<div style="background-color: #FEF3C7; border-right: 4px solid ${YELLOW}; padding: 14px 16px; border-radius: 6px; margin-top: 22px; font-size: 15px; line-height: 1.7; color: ${NAVY};">`
  const quiet = `<div style="color: ${MUTED}; font-size: 15px; margin-top: 22px;">שאר המערכות: ללא שינוי</div>`

  const a = digest.anomaly
  if (!a) {
    if (!digest.previous) return ''
    return digest.nothingChanged
      ? `<div style="color: ${MUTED}; font-size: 15px; margin-top: 22px;">כל המערכות: ללא שינוי</div>`
      : ''
  }

  const label = escapeHtml(a.label)
  const magnitude =
    a.ratio !== null && isFinite(a.ratio)
      ? `×${a.ratio >= 10 ? Math.round(a.ratio) : a.ratio.toFixed(1).replace(/\.0$/, '')}`
      : ''
  const verb = a.direction === 'up' ? 'קפץ' : 'ירד'
  const head = magnitude ? `${label} ${verb} ${magnitude}` : `${label} ${verb}`

  return `${boxOpen}
        <strong>⚠️ ${head}</strong><br>
        <span style="color: ${MUTED};">${a.current.toLocaleString('he-IL')} קריאות מול ${a.previous.toLocaleString('he-IL')}</span>
      </div>${quiet}`
}

export function costDigestSubject(digest: Digest): string {
  const head = `📊 בדפוס — שבוע ${digest.weekNumber}`
  return digest.current.costPerOrder === null
    ? `${head} · אין הזמנות`
    : `${head} · ${ils1(digest.current.costPerOrder)} להזמנה`
}

export function CostDigestEmail(digest: Digest): string {
  const headline =
    digest.current.costPerOrder === null
      ? `<div style="font-size: 22px; font-weight: 700; color: ${NAVY};">אין הזמנות השבוע</div>
         <div style="color: ${MUTED}; font-size: 14px; margin-top: 6px;">העלות נצברה בלי הזמנה אחת מולה</div>`
      : `<div style="font-size: 26px; font-weight: 800; color: ${NAVY}; line-height: 1.3; white-space: nowrap;">👉 ${ils1(
          digest.current.costPerOrder
        )} להזמנה</div>
         ${comparisonLine(digest)}`

  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>דוח עלויות שבועי</title>
</head>
<body style="font-family: 'Heebo', Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 16px; direction: rtl;">
  <div style="max-width: 460px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

    <div style="background-color: ${NAVY}; color: #ffffff; padding: 16px 20px; border-bottom: 3px solid ${YELLOW};">
      <span style="font-size: 18px; font-weight: 700;">📊 בדפוס — שבוע ${digest.weekNumber}</span>
    </div>

    <div style="padding: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        ${row('עלות מערכות', ils(digest.current.totalIls))}
        ${row('הזמנות', String(digest.current.orders))}
      </table>

      <div style="border-top: 1px solid #e5e7eb; margin: 16px 0 18px;"></div>

      ${headline}
      ${anomalyBlock(digest)}
    </div>

    <div style="background-color: #f9fafb; padding: 12px 20px; text-align: center; font-size: 12px; color: ${MUTED};">
      <a href="https://badfos.co.il/admin/costs" style="color: ${MUTED}; text-decoration: underline;">עדכון מנויים ונמענים</a>
    </div>
  </div>
</body>
</html>
`
}
