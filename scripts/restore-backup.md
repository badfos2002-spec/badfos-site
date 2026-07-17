# שחזור מגיבוי לילי

כל לילה ב-03:00 (cron של `/api/cleanup-old-designs`) נשמר גיבוי מלא של כל אוספי
Firestore כקובץ אחד דחוס ב-Firebase Storage: `backups/backup-YYYY-MM-DD.json.gz`.
נשמרים 14 הגיבויים האחרונים.

## 1. הורדת קובץ הגיבוי

**דרך Firebase Console (הכי פשוט):**
1. https://console.firebase.google.com → הפרויקט של badfos
2. Build → **Storage** → תיקיית `backups/`
3. לוחצים על `backup-YYYY-MM-DD.json.gz` של התאריך הרצוי → **Download**

**או דרך gsutil:**
```bash
gsutil cp gs://<BUCKET>/backups/backup-2026-07-18.json.gz .
```

## 2. הצצה בתוכן (אופציונלי)

```bash
gunzip -k backup-2026-07-18.json.gz   # מייצר backup-2026-07-18.json
```
מבנה הקובץ: `{ version, createdAt, collections: { orders: [{ id, data }], ... } }`.
Timestamps שמורים כ-`{ "__firestore_timestamp__": "<ISO>" }` ומשוחזרים אוטומטית.

## 3. שחזור ל-Firestore

ברירת המחדל היא **DRY RUN** — שום דבר לא נכתב עד שמוסיפים `--apply`:

```bash
# תצוגה מקדימה בלבד — מה היה משוחזר
npx tsx scripts/restore-backup.ts backup-2026-07-18.json.gz

# שחזור אוסף בודד (מומלץ להתחיל כך)
npx tsx scripts/restore-backup.ts backup-2026-07-18.json.gz --collections=orders --apply

# שחזור מלא של הכל
npx tsx scripts/restore-backup.ts backup-2026-07-18.json.gz --apply
```

דרישות: `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`,
`FIREBASE_ADMIN_PRIVATE_KEY` ב-`.env.local` (הסקריפט טוען אותו לבד).

הערות:
- השחזור עושה `set()` מלא לכל מסמך — דורס מסמך קיים באותו id, לא מוחק מסמכים
  שנוצרו אחרי הגיבוי.
- הרצה ידנית של גיבוי עכשיו (לא לחכות ללילה):
  `curl "https://badfos.co.il/api/cleanup-old-designs?secret=$CRON_SECRET"`
