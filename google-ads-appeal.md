# ערעור על דחיית מודעות — badfos.co.il

## פרטי האתר
- **דומיין:** https://badfos.co.il
- **עסק:** בדפוס — הדפסת חולצות מותאמות אישית
- **פלטפורמה:** Vercel (hosting), Next.js 14 (framework)
- **תאריך:** 22 במרץ 2026

---

## סיכום
האתר badfos.co.il הוא אתר מסחרי לגיטימי להדפסת חולצות מותאמות אישית. האתר נבדק במספר כלי אבטחה מוכרים ונמצא נקי לחלוטין מתוכן זדוני, malware, או כל איום אבטחתי.

---

## בדיקות אבטחה שבוצעו

### 1. Google Safe Browsing
- **תוצאה:** לא נמצא תוכן שאינו בטוח
- **קישור:** https://transparencyreport.google.com/safe-browsing/search?url=badfos.co.il

### 2. Sucuri SiteCheck
- **תוצאה:** No Malware Found
- **Blacklist:** נקי ב-9 רשימות שחורות (Google, McAfee, ESET, PhishTank, Yandex, Opera, Sucuri Labs)
- **Spam:** לא נמצא spam מוזרק
- **Defacement:** לא זוהה
- **קישור:** https://sitecheck.sucuri.net/results/badfos.co.il

---

## אמצעי אבטחה שמיושמים באתר

### Content Security Policy (CSP)
האתר מיישם CSP headers מחמירים שמגבילים טעינת סקריפטים, תמונות, ו-iframes למקורות מורשים בלבד:
- `script-src`: רק Google Tag Manager, Google Analytics, Facebook Pixel
- `frame-src`: רק YouTube, שערי תשלום מורשים (Grow, Meshulam)
- `connect-src`: רק APIs מורשים
- אין `unsafe-eval`

### HTTPS מלא
- כל התעבורה מוצפנת ב-HTTPS
- אין תוכן HTTP מעורב (mixed content)
- תעודת SSL תקפה מ-Vercel

### ולידציית URLs
- כל הפניות חיצוניות עוברות ולידציה דרך whitelist מוגדר
- שערי תשלום מאומתים: Grow, Meshulam, Cardcom
- אין הפניות לאתרים לא מורשים

### הגנת קלט
- כל קלט משתמש עובר escaping (XSS prevention)
- ולידציה בצד שרת וצד לקוח
- Rate limiting על נקודות קצה רגישות (15 בקשות/דקה)

### פרטיות
- מדיניות פרטיות מפורטת בכתובת: https://badfos.co.il/privacy
- תנאי שימוש: https://badfos.co.il/terms
- הצהרת נגישות: https://badfos.co.il/accessibility
- לינקים למדיניות פרטיות ליד כל טופס איסוף נתונים

---

## תיקונים שבוצעו

| תיקון | פירוט |
|--------|--------|
| הסרת unsafe-eval | הוסר מ-CSP script-src — לא נדרש |
| ולידציית YouTube | רק URLs מ-youtube.com מותרים |
| הסרת regex fallback | הוסר pattern matching מסוכן ב-payment API |
| הוספת לינקי פרטיות | נוספו ליד טפסי לידים בדף הבית ובפופאפ |
| דחיסת תמונות | כל התמונות עברו אופטימיזציה (46MB→29MB) |
| Enhanced Conversions | הוספת user_data לכל אירועי המרה |

---

## מידע עסקי
- **שם העסק:** בדפוס
- **תחום:** הדפסת חולצות מותאמות אישית
- **טלפון:** 050-7794277
- **אימייל:** badfos2002@gmail.com
- **כתובת:** ראשון לציון, ישראל
- **שעות פעילות:** ראשון-חמישי, 09:00-23:00

---

## סיכום
האתר עומד בכל דרישות האבטחה של Google Ads. הוא נקי מ-malware, מיישם הגנות אבטחה מתקדמות, ופועל בשקיפות מלאה עם מדיניות פרטיות ותנאי שימוש. אנא אשרו מחדש את הקמפיין.
