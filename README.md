# בדפוס - אתר הדפסת חולצות בעיצוב אישי 👕

אתר מסחר אלקטרוני בעברית (RTL) להדפסת חולצות, סווטשרטים ובאפים בעיצוב אישי.

## 🚀 התקנה והפעלה

### דרישות מקדימות

- Node.js 18+ (להורדה: https://nodejs.org/)
- npm או pnpm
- חשבון Firebase
- חשבון Resend (למיילים)
- חשבון OpenAI (לעיצוב AI)

### שלבי התקנה

1. **התקנת תלויות:**
```bash
npm install
```

2. **הגדרת משתני סביבה:**
```bash
# העתק את קובץ הדוגמה
cp .env.example .env.local

# ערוך את .env.local והוסף את המפתחות שלך
```

3. **הפעלת שרת הפיתוח:**
```bash
npm run dev
```

4. **פתח את הדפדפן:**
```
http://localhost:3000
```

## 📁 מבנה הפרויקט

```
badfos/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout (RTL)
│   ├── page.tsx            # Homepage
│   ├── globals.css         # Global styles + RTL
│   ├── designer/           # Product designer
│   ├── cart/               # Shopping cart
│   ├── packages/           # Package deals
│   ├── reviews/            # Reviews
│   ├── admin/              # Admin dashboard
│   └── api/                # API routes
├── components/
│   ├── layout/             # Header, Footer, etc.
│   ├── home/               # Homepage components
│   ├── designer/           # Designer tool components
│   ├── cart/               # Cart components
│   ├── admin/              # Admin components
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── types.ts            # TypeScript interfaces
│   ├── constants.ts        # Static data (colors, sizes, etc.)
│   ├── pricing.ts          # Pricing logic
│   ├── firebase.ts         # Firebase client config
│   ├── firebase-admin.ts   # Firebase admin config
│   ├── db.ts               # Firestore CRUD helpers
│   ├── auth.ts             # Auth helpers
│   ├── storage.ts          # Firebase Storage helpers
│   └── email.ts            # Email functions (Resend)
├── hooks/
│   ├── useCart.ts          # Cart state (Zustand)
│   ├── useAuth.ts          # Auth state
│   └── usePricing.ts       # Dynamic pricing
└── public/                 # Static assets
    ├── mockups/            # Product mockups
    └── icons/              # Icons and logo
```

## 🎨 טכנולוגיות

- **Framework:** Next.js 14 (App Router)
- **שפה:** TypeScript
- **UI:** React + Tailwind CSS + shadcn/ui
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication
- **Storage:** Firebase Storage
- **Email:** Resend
- **AI:** OpenAI DALL-E
- **State:** Zustand
- **Hosting:** Vercel

## 🔑 משתני סביבה נדרשים

ראה את [`.env.example`](./.env.example) לרשימה מלאה של משתני הסביבה.

### Firebase
```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### Resend (Email)
```env
RESEND_API_KEY=
```

### OpenAI (AI Design)
```env
OPENAI_API_KEY=
```

### Admin
```env
NEXT_PUBLIC_ADMIN_EMAIL=your-email@example.com
```

## 📋 תכונות עיקריות

### צד לקוח
- ✅ מעצב מוצרים אינטראקטיבי (4 שלבים)
- ✅ העלאת עיצובים + יצירה ב-AI
- ✅ עגלת קניות + מערכת קופונים
- ✅ חבילות ומבצעים
- ✅ מערכת ביקורות
- ✅ טפסי לידים
- ✅ WhatsApp Checkout

### דשבורד אדמין
- ✅ ניהול הזמנות + אוטומציות
- ✅ ניהול לידים
- ✅ ניהול מלאי
- ✅ אישור ביקורות
- ✅ ניהול קופונים והנחות
- ✅ ניהול תמונות (mockups)
- ✅ ניהול מחירים
- ✅ אנליטיקות

## 🌐 תמיכה ב-RTL

האתר בנוי עם תמיכה מלאה בעברית ו-RTL:
- כיוון RTL גלובלי
- פונטים עבריים (Heebo + Rubik)
- Layout מותאם לעברית
- תאריכים ומספרים בפורמט עברי

## 🧪 בדיקות

```bash
# הרץ tests (לאחר הוספתם)
npm run test

# בדיקת TypeScript
npm run type-check

# בדיקת Lint
npm run lint
```

## 🚢 Deployment

### Vercel (מומלץ)

1. התחבר ל-Vercel והתחבר ל-GitHub repo
2. הגדר את כל משתני הסביבה
3. Deploy!

```bash
# או באמצעות Vercel CLI
vercel
```

### Firebase Setup

1. צור פרויקט ב-Firebase Console
2. אפשר Firestore, Authentication (Google), ו-Storage
3. הגדר Security Rules
4. הוסף admin email ל-custom claims

## 📄 רישיון

© 2024 בדפוס. כל הזכויות שמורות.

## 📞 תמיכה

- טלפון: 050-7794277
- אימייל: badfos2002@gmail.com
- WhatsApp: https://wa.me/5507794277

---

**Built with ❤️ using Next.js 14 and Claude Code**
