# בדפוס - badfos.co.il | מפרט טכני מלא לבניית האתר

## סקירה כללית

אתר מסחר אלקטרוני בעברית (RTL) להדפסת חולצות בעיצוב אישי.
הלקוח מעצב מוצר (חולצה/סווטשרט/באף), בוחר צבע/בד/מידות, מעלה עיצוב או משתמש ב-AI, ומזמין.
בעל העסק מנהל הזמנות, לידים, מלאי, ביקורות, קופונים, מחירים ותמונות דרך דשבורד אדמין.

---

## טכנולוגיות (Tech Stack)

| שכבה | טכנולוגיה |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| שפה | TypeScript |
| UI | React + Tailwind CSS + shadcn/ui |
| אייקונים | Lucide React |
| DB + Auth | Firebase (Firestore + Auth with Google) |
| Storage | Firebase Storage (תמונות, עיצובים) |
| מיילים | Resend |
| AI עיצוב | OpenAI DALL-E API |
| Hosting | Vercel (free tier) |
| אנליטיקס | Google Tag Manager + Google Ads + Meta Pixel |
| סליקה | מוכן לחיבור עתידי (PayPlus/Meshulam/Grow). כרגע → WhatsApp |

---

## מבנה פרויקט

```
badfos/
├── app/
│   ├── layout.tsx                 # Root layout (Header, Footer, WhatsApp, Accessibility)
│   ├── page.tsx                   # דף הבית
│   ├── designer/
│   │   └── page.tsx               # עמוד בחירת מוצר + מעצב
│   ├── cart/
│   │   └── page.tsx               # עגלת קניות + Checkout
│   ├── packages/
│   │   └── page.tsx               # חבילות ומבצעים
│   ├── reviews/
│   │   └── page.tsx               # ביקורות לקוחות
│   ├── faq/
│   │   └── page.tsx               # שאלות נפוצות
│   ├── about/
│   │   └── page.tsx               # אודות
│   ├── contact/
│   │   └── page.tsx               # יצירת קשר
│   ├── admin/
│   │   ├── login/page.tsx         # כניסת מנהלים (Google Auth)
│   │   ├── page.tsx               # לוח בקרה ראשי
│   │   ├── orders/page.tsx        # ניהול הזמנות
│   │   ├── leads/page.tsx         # ניהול לידים
│   │   ├── inventory/page.tsx     # ניהול מלאי
│   │   ├── reviews/page.tsx       # ניהול ביקורות
│   │   ├── coupons/page.tsx       # ניהול קופונים
│   │   ├── discounts/page.tsx     # ניהול הנחות
│   │   ├── images/page.tsx        # ניהול תמונות
│   │   ├── pricing/page.tsx       # ניהול מחירים
│   │   ├── packages/page.tsx      # ניהול חבילות
│   │   └── analytics/page.tsx     # אנליטיקות
│   └── api/
│       ├── send-email/route.ts    # Resend email API
│       ├── generate-design/route.ts # OpenAI DALL-E API
│       └── webhooks/route.ts      # Payment webhooks (future)
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── MobileMenu.tsx
│   │   ├── WhatsAppButton.tsx
│   │   └── AccessibilityWidget.tsx
│   ├── home/
│   │   ├── HeroCarousel.tsx
│   │   ├── BenefitsSection.tsx
│   │   ├── VideoSection.tsx
│   │   ├── PackagesPreview.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── LeadForm.tsx
│   │   ├── TestimonialsCarousel.tsx
│   │   └── FinalCTA.tsx
│   ├── designer/
│   │   ├── ProductSelector.tsx    # בחירת קטגוריה (חולצה/סווטשרט/באף)
│   │   ├── StepIndicator.tsx      # מחוון שלבים
│   │   ├── ShirtTypeStep.tsx      # שלב 1: סוג בד
│   │   ├── ColorStep.tsx          # שלב 2: צבע
│   │   ├── DesignStep.tsx         # שלב 3: עיצוב + העלאת קבצים
│   │   ├── SizeQuantityStep.tsx   # שלב 4: מידות וכמויות
│   │   ├── MockupPreview.tsx      # תצוגת מוקאפ
│   │   ├── AIDesignPopup.tsx      # עוזר עיצוב AI
│   │   ├── UploadZone.tsx         # אזור העלאת קבצים
│   │   └── PriceSummary.tsx       # סיכום מחיר
│   ├── cart/
│   │   ├── CartItem.tsx
│   │   ├── ContactForm.tsx
│   │   ├── ShippingForm.tsx
│   │   └── OrderSummary.tsx
│   ├── packages/
│   │   ├── PackageCard.tsx
│   │   └── PackageOrderForm.tsx
│   ├── reviews/
│   │   ├── ReviewCard.tsx
│   │   └── WriteReviewPopup.tsx
│   └── ui/                        # shadcn/ui components
├── lib/
│   ├── firebase.ts                # Firebase config & init
│   ├── db.ts                      # Firestore helpers (CRUD)
│   ├── auth.ts                    # Auth helpers
│   ├── storage.ts                 # Firebase Storage helpers
│   ├── email.ts                   # Resend email functions
│   ├── pricing.ts                 # Pricing calculation logic
│   ├── types.ts                   # TypeScript interfaces
│   └── constants.ts               # Static data (colors, sizes, etc.)
├── hooks/
│   ├── useCart.ts                 # Cart state management
│   ├── useAuth.ts                 # Auth state
│   └── usePricing.ts             # Dynamic pricing
├── public/
│   ├── mockups/                   # T-shirt & sweatshirt mockup images
│   ├── icons/                     # Social icons, etc.
│   └── logo.png
└── styles/
    └── globals.css                # Tailwind + custom styles
```

---

## Entities (מבנה DB - Firestore Collections)

### orders
```typescript
interface Order {
  id: string;
  orderNumber: number;                // #1001, #1002...
  status: 'pending_payment' | 'paid' | 'in_production' | 'shipped' | 'completed' | 'cancelled';
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneSecondary?: string;
    notes?: string;
  };
  shipping: {
    method: 'delivery' | 'pickup';    // משלוח / איסוף עצמי
    address?: {
      street: string;
      number: string;
      city: string;
      zipCode?: string;
      entrance?: string;
    };
    cost: number;                      // 35 or 0
  };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  total: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface OrderItem {
  productType: 'tshirt' | 'sweatshirt' | 'buff';
  fabricType: string;                  // כותנה, דרייפיט, פולו, אוברסייז
  color: string;
  sizes: { size: string; quantity: number }[];
  designs: {
    area: string;                      // קידמי_מלא, גב, סמל_כיס, מרכזי
    imageUrl: string;
    fileName: string;
  }[];
  pricePerUnit: number;
  totalQuantity: number;
  totalPrice: number;
}
```

### leads
```typescript
interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  subject?: string;
  message?: string;
  source: 'popup' | 'bottom_form' | 'contact_form';
  status: 'new' | 'answered' | 'called_no_answer' | 'not_relevant' | 'closed_deal';
  createdAt: Timestamp;
}
```

### inventory
```typescript
interface InventoryItem {
  id: string;
  productType: 'tshirt' | 'sweatshirt' | 'buff';
  fabricType: string;
  color: string;
  size: string;
  quantity: number;
  lowStockThreshold: number;
  updatedAt: Timestamp;
}
```

### reviews
```typescript
interface Review {
  id: string;
  name: string;
  rating: number;                      // 1-5
  product?: string;
  text: string;
  status: 'pending' | 'approved';
  featured: boolean;                   // מובלט
  createdAt: Timestamp;
}
```

### coupons
```typescript
interface Coupon {
  id: string;
  code: string;                        // SAVE10-XXXX-XXXXX
  discountPercent: number;             // 10
  isUsed: boolean;
  isActive: boolean;
  expiresAt: Timestamp;                // 3 months from creation
  orderId?: string;                    // linked to which order generated it
  createdAt: Timestamp;
}
```

### discounts
```typescript
interface Discount {
  id: string;
  name: string;
  type: 'quantity';                    // הנחת כמות
  category: 'tshirts' | 'sweatshirts';
  minQuantity: number;
  discountPercent: number;
  isActive: boolean;
}
```

### siteImages
```typescript
interface SiteImage {
  id: string;
  category: 'tshirt_mockups' | 'sweatshirt_mockups' | 'designable_products' | 'homepage_carousel' | 'logo' | 'about_main' | 'about_process' | 'video';
  name: string;
  description?: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Timestamp;
}
```

### pricing
```typescript
interface PricingRule {
  id: string;
  productType: 'tshirt' | 'sweatshirt' | 'buff';
  fabricType: string;
  basePrice: number;                   // מחיר בסיס ליחידה
  fabricSurcharge: number;             // תוספת בד (פולו/אוברסייז = 10₪)
  designAreas: {
    area: string;
    price: number;                     // קידמי מלא = 10₪, גב = 10₪, סמל כיס = 5₪
  }[];
  sizeSurcharges: {
    size: string;
    surcharge: number;                 // 3XL/4XL = 12₪
  }[];
}
```

### packages
```typescript
interface Package {
  id: string;
  name: string;
  tag: string;                         // חדש, חסכוני, הכי משתלם
  minQuantity: number;
  maxQuantity: number;
  pricePerUnit: number;
  graphicDesignerCost: number;         // 250 or 0 (free)
  isActive: boolean;
  sortOrder: number;
}
```

### packageOrders
```typescript
interface PackageOrder {
  id: string;
  packageId: string;
  customer: { /* same as Order.customer */ };
  fabricType: string;
  color: string;
  sizes: { size: string; quantity: number }[];
  totalQuantity: number;
  status: 'new' | 'in_design' | 'pending_approval' | 'approved' | 'in_production' | 'shipped' | 'completed';
  createdAt: Timestamp;
}
```

---

## עמודים - מפרט מפורט

### 1. דף הבית (/)

**Header (קבוע בכל הדפים):**
- לוגו במרכז
- עגלת קניות (שמאל) עם badge כמות
- המבורגר (ימין) → תפריט נייד

**תפריט נייד (נפתח מימין):**
- קישורים: דף הבית, מעצב חולצות, חבילות ומבצעים, ביקורות, שאלות נפוצות, אודות, צור קשר

**סקשנים מלמעלה למטה:**

1. **Hero Carousel** - 5 סליידים, אוטומטי + dots
2. **כותרת ראשית:** "הפוך את הרעיונות שלך לחולצות מדהימות"
3. **CTA צהוב:** "עצב עכשיו" → /designer
4. **3 יתרונות:** איכות הדפסה גבוהה 🏆, משלוח מהיר 🚚, תשלום מאובטח 🔒
5. **סרטון YouTube** - תהליך הדפסה
6. **חבילות קרוסלה** - תצוגה מקדימה של 3 חבילות
7. **איך זה עובד** - 3 שלבים: בחירת מוצר ← עיצוב ← הזמנה
8. **טופס ליד:** "אל תתקשרו אלינו, אנחנו נתקשר אליכם" - שם + טלפון
9. **ביקורות** - 3 כרטיסים בקרוסלה
10. **CTA סופי:** כפתור לעמוד העיצוב
11. **Footer:** לינקים, פרטי קשר, רשתות חברתיות

**פופאפים:**
- Cookie consent (ביקור ראשון)
- ליד פופאפ (מבקרים חדשים): "רוצים שנחזור אליכם?" - שם + טלפון

**כפתורים צפים:**
- WhatsApp ירוק (ימין למטה)
- נגישות כחול (ימין למטה, מעל WhatsApp)

---

### 2. מעצב מוצרים (/designer)

**בחירת קטגוריה:**
5 כרטיסים: חולצות 👕 (צהוב, הכי פופולרי), סווטשרטים (ירוק/סגול), כובעים 🧢 (כחול, "בקרוב!"), באפים (ורוד), סינרים (placeholder)

#### מעצב חולצות (4 שלבים):

**שלב 1 - סוג חולצה:**
- 4 אפשרויות: כותנה, דרייפיט, פולו (+10₪), אוברסייז (+10₪)
- מוקאפ מתעדכן דינמית
- ולידציה: "יש לבחור סוג חולצה כדי להמשיך"

**שלב 2 - צבע:**
- 8 צבעים: לבן, שחור, אפור, אדום, נייבי, בז', בורדו, זית
- מוקאפ מתעדכן לצבע הנבחר

**שלב 3 - עיצוב:**
- 3 אזורי הדפסה: קידמי מלא (+10₪), גב (+10₪, מוקאפ מתהפך), סמל כיס (+5₪)
- כל אזור: DropZone להעלאת תמונה (JPG/PNG/JPEG, max 10MB) + כפתור "עוזר עיצוב AI"
- כשאזור מקבל תמונה → נקודה ירוקה + מסגרת ירוקה
- **AI Popup:** "עוזר עיצוב חכם" ✨, שדה טקסט "תאר את הרעיון שלך", כפתור "צור עיצוב"

**שלב 4 - מידות וכמויות:**
- פופאפ הנחה בכניסה: "הזמינו 15 חולצות או יותר וקבלו 5% הנחה"
- רשת מידות 2x4: XS, S, M, L, XL, XXL, 3XL (+12₪), 4XL (+12₪)
- כפתורי +/- לכל מידה
- ולידציה: "יש לבחור לפחות חולצה אחת כדי להמשיך"
- **סיכום מחיר:** מחיר לחולצה, כמות, סך הכל (לפני הנחה), סה"כ לתשלום
- כפתורים: "הוסף לעגלה" + "הקודם"

#### מעצב סווטשרטים (3 שלבים):
- **שלב 1 - צבע:** 5 צבעים (שחור, אפור, כחול, אדום, ירוק)
- **שלב 2 - עיצוב:** 3 אזורים, אותו מנגנון
- **שלב 3 - מידות:** XS-4XL, **מחיר בסיס: 53₪**

#### מעצב באפים (3 שלבים):
- **שלב 1 - צבע:** 6 צבעים (אדום, נייבי, סגול, כתום, ירוק, טורקיז)
- **שלב 2 - עיצוב:** **אזור אחד בלבד: מרכזי (+8₪)**
- **שלב 3 - כמויות:** **חבילות קבועות בלבד: 50 או 100 יחידות. מחיר: 8₪ ליחידה**

---

### 3. עגלת קניות (/cart)

- "עגלת קניות" + "העיצובים שלי (X)" + כפתור "+ הוסף עיצוב חדש"
- **כרטיס מוצר:** מוקאפ, שם, צבע, סוג בד, מידות + כמויות, מחיר, אייקון מחיקה
- **טופס פרטים:** שם פרטי*, שם משפחה*, אימייל*, טלפון*, טלפון נוסף, הערות
- **משלוח:** ⚫ משלוח עד הבית (35₪) / ⚪ איסוף עצמי (חינם - ראשון לציון)
- **כתובת (אם משלוח):** רחוב*, מספר*, עיר*, מיקוד, כניסה
- ☐ אני מאשר/ת את מדיניות הפרטיות
- **סיכום הזמנה:** סה"כ מוצרים, משלוח, סה"כ לתשלום
- כפתור צהוב "המשך לתשלום" → כרגע פותח WhatsApp עם פרטי ההזמנה

---

### 4. חבילות ומבצעים (/packages)

**3 חבילות:**

| חבילה | מחיר | גרפיקאי | תג |
|-------|------|---------|-----|
| עד 10 חולצות | 42₪/יח' | 250₪ | חדש |
| 11-20 חולצות | 40₪/יח' | 250₪ | חסכוני |
| 21-50 חולצות | 38₪/יח' | חינם | הכי משתלם |

**עמוד הזמנת חבילה (אחרי בחירה):**
- עמוד אחד (לא שלבים)
- בחירת: סוג חולצה, צבע, מידות + כמויות
- סיכום: חבילה, מחיר ליחידה, ליווי גרפיקאי, סה"כ כמות, סיכום ביניים
- מונה: "נשאר להוסיף X יחידות"

---

### 5. ביקורות (/reviews)
- דירוג כללי: 4.8 ⭐ מתוך 9 ביקורות
- כפתור כתום "כתוב ביקורת" 💬
- כרטיסי ביקורת: שם, כוכבים, תאריך, טקסט
- **פופאפ כתיבת ביקורת:** שם*, דירוג* (5 כוכבים), מוצר, טקסט*, כפתורי שלח/ביטול

---

### 6. שאלות נפוצות (/faq)
- 5 שאלות באקורדיון עם chevron
- רקע סגול/ורוד עם עיגולים דקורטיביים

---

### 7. אודות (/about)
- "קצת עלינו" + 2 פסקאות + תמונת חנות + "מאז 2023"
- 4 ערכים: איכות ללא פשרות, יצירתיות אישית, שירות מהיר, קהילה מחברת
- 3 שלבים: עיצוב דיגיטלי → הדפסה איכותית → אריזה ומשלוח
- 3 יתרונות: איכות מובטחת, משלוח מהיר (3-7 ימי עסקים), אחריות מלאה
- CTA סגול: "מוכנים להתחיל?"

---

### 8. יצירת קשר (/contact)
- טופס: שם מלא*, אימייל*, טלפון, נושא, הודעה*
- כפתור טורקיז "שלח הודעה" ✈️
- פרטי התקשרות: טלפון (050-7794277), אימייל (badfos2002@gmail.com), וואצאפ, אינסטגרם, פייסבוק

---

## דשבורד אדמין (/admin)

### כניסה (/admin/login)
- Google Sign In בלבד
- מוגבל לאימייל מורשה
- לא מאונדקס (noindex)

### לוח בקרה ראשי (/admin)
**כרטיסי סטטיסטיקה:**
- 🛒 הזמנות (סה"כ)
- 📞 לידים חדשים (+ סה"כ פניות)
- 📦 מלאי (קיים)
- ⭐ ביקורות (כולל אישור)
- 🎁 קופונים (פעילים)
- 💰 הנחות (פעילות)
- 🖼️ תמונות (פעילות)
- 💲 התמחרות (פעילים)
- 📊 אנליטיקה

**מודולי ניהול (כרטיסים עם כפתורים שחורים):**
10 מודולים: לידים, הזמנות, מלאי, ביקורות, קופונים, הנחות, תמונות, מחירים, אנליטיקות, חבילות

---

### ניהול הזמנות (/admin/orders)
- **פילטרים:** הכל / משלוח / איסוף עצמי, חיפוש, סינון סטטוסים
- **כרטיס:** מספר הזמנה, שם, תאריך, סכום, תג סטטוס, כפתור מחיקה + פירוט
- **פרטים מורחבים:** פרטי לקוח, כתובת, פרטי הזמנה, קבצי עיצוב (הורדה)
- **סטטוסים:** ממתין לתשלום → שולם → בייצור → נשלח → הושלם / בוטל

**אוטומציות מייל:**
| סטטוס | פעולה |
|-------|-------|
| שולם | מייל אישור + קופון 10% (חד פעמי, 3 חודשים) |
| בייצור | מייל "ההזמנה שלך בייצור" + הורדת מלאי אוטומטית |
| נשלח | מייל "ההזמנה נשלחה" |

---

### ניהול לידים (/admin/leads)
- פילטרים: הכל, היום, חיפוש
- כרטיס: שם, טלפון (לחיץ), תג סטטוס, מקור (popup/bottom_form/contact_form), תאריך
- **סטטוסים:** חדש, נענה, בוצע חיוג ואין מענה, לא רלוונטי, סגר עסקה
- מחובר ל-Google Ads למעקב המרות

---

### ניהול ביקורות (/admin/reviews)
- פילטרים: הכל / ממתינות / מאושרות
- כפתורים: "דחה" (מחיקה), "הפוך למובלט" (הדגשה)
- ביקורות מופיעות באתר רק אחרי אישור

---

### ניהול קופונים (/admin/coupons)
- "+ הוסף קופון חדש"
- כרטיס: קוד, אחוז הנחה, תאריך תפוגה, סטטוס פעיל
- עריכה + מחיקה
- קופונים נוצרים אוטומטית בתשלום (SAVE10-XXXX-XXXXX)

---

### ניהול הנחות (/admin/discounts)
- "+ הוסף הנחה חדשה"
- טבלה: שם, סוג (הנחת כמות), קטגוריה, כמות מינימלית
- ההנחות קופצות כפופאפ בשלב מידות וכמויות

---

### ניהול תמונות (/admin/images)
- "+ הוסף תמונה/וידאו"
- סינון לפי קטגוריה
- **קטגוריות:** מוקאפים חולצות (10), מוקאפים סווטשרטים (10), מוצרים ניתנים לעיצוב (5), קרוסלה בית (5), לוגו (1), אודות תהליך (1), אודות ראשית (1), וידאו (1)
- כל תמונה: שם, תיאור, תג "פעיל", כפתורי מחיקה/עריכה/הסתרה
- **חשוב:** כשמחליפים מוקאפ כאן, הוא מתעדכן בכל האתר

---

### ניהול מחירים (/admin/pricing)
- טאבים: חולצות / סווטשרטים / באפים / כובעים
- טבלה: אזורי עיצוב, מחיר יחידה, סוג מוצר
- כפתור "הגדר מחירי הדפסה" לכל סוג
- הערה: "המחיר שאתה מגדיר כאן הוא עבור המוצר הריק. מחירי ההדפסה מתווספים"
- כפתור "שמור שינויים"

---

### אנליטיקות (/admin/analytics)
- דוחות וגרפים על הזמנות, הכנסות, לידים
- סטטיסטיקות ביצועים

---

### ניהול חבילות (/admin/packages)
- יצירה, עריכה וסידור חבילות
- תמונות, מחירים, טווחי כמויות, סטטוס

---

## לוגיקת תמחור

```
מחיר ליחידה = מחיר בסיס + תוספת בד + סכום תוספות אזורי עיצוב + תוספת מידה

דוגמה - חולצת כותנה עם עיצוב קדמי + סמל כיס, מידה XL:
= 37₪ (בסיס) + 0₪ (כותנה) + 10₪ (קידמי) + 5₪ (סמל כיס) + 0₪ (XL)
= 52₪ ליחידה

דוגמה - חולצת פולו עם הדפסת גב, מידה 3XL:
= 37₪ + 10₪ (פולו) + 10₪ (גב) + 12₪ (3XL)
= 69₪ ליחידה
```

**הנחות כמות:** אם סה"כ ≥ 15 יחידות → 5% הנחה (ניתן לשינוי מהדשבורד)

**משלוח:** 35₪ עד הבית / חינם לאיסוף עצמי מראשון לציון

---

## אוטומציות ומיילים (Resend)

### תבניות מייל:

1. **אישור הזמנה (שולם):**
   - נושא: "✅ ההזמנה שלך אושרה! #[orderNumber]"
   - תוכן: פרטי הזמנה + קוד קופון 10% להזמנה הבאה

2. **עדכון בייצור:**
   - נושא: "🏭 ההזמנה שלך בייצור #[orderNumber]"
   - תוכן: ההזמנה בהכנה, נעדכן כשנשלח

3. **עדכון משלוח:**
   - נושא: "📦 ההזמנה שלך בדרך! #[orderNumber]"
   - תוכן: ההזמנה נשלחה, צפי הגעה 3-7 ימי עסקים

4. **ליד חדש (לבעל העסק):**
   - נושא: "📞 ליד חדש מהאתר!"
   - תוכן: שם, טלפון, מקור

---

## SEO + אנליטיקס

- Meta tags דינמיים לכל עמוד
- Open Graph tags
- Sitemap.xml
- robots.txt (noindex על /admin/*)
- Google Tag Manager
- Google Ads conversion tracking (על לידים + הזמנות)
- Meta Pixel

---

## עיצוב

**צבעים:**
- Primary: #FDB913 (צהוב)
- Secondary: #7B2D8E (סגול)
- Accent: #2196F3 (כחול), #25D366 (ירוק WhatsApp)
- Text: #1A1A2E (כהה)
- Gray: #6B7280, Background: #F3F4F6

**פונטים:** Heebo + Rubik (Google Fonts, Hebrew optimized)

**עקרונות:**
- RTL מלא
- Mobile-first
- כפתורים מעוגלים (border-radius: 50px לCTA)
- צללים רכים
- אייקונים בסגנון emoji
- מוקאפים על רקע צבעוני + "* סקיצה להמחשה בלבד"

---

## הערות חשובות לפיתוח

1. **סליקה:** כרגע הכפתור "המשך לתשלום" שולח WhatsApp. נבנה מוכן לחיבור סליקה (PayPlus/Meshulam) בעתיד.
2. **AI Design:** OpenAI DALL-E API, צריך API key, תאר בעברית → מייצר הדפס DTF.
3. **מוקאפים:** נשלפים מ-Firebase Storage, ניתנים להחלפה מהדשבורד.
4. **דשבורד לא מאונדקס:** robots noindex + דורש Google Auth.
5. **מלאי אוטומטי:** כשסטטוס → "בייצור", מורידים כמות מהמלאי.
6. **קופון אוטומטי:** כשסטטוס → "שולם", נוצר SAVE10 קופון ונשלח במייל.
7. **לידים ל-Google Ads:** כל ליד חדש מפעיל conversion event.
