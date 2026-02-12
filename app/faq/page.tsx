import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'שאלות נפוצות | בדפוס',
  description: 'תשובות לשאלות הנפוצות ביותר על השירות שלנו',
}

const faqs = [
  {
    q: 'איך מזמינים?',
    a: 'פשוט! בחרו את סוג המוצר, התאימו אישית (בד, צבע, עיצוב), בחרו מידות וכמויות והוסיפו לעגלה. אנחנו כרגע מקבלים הזמנות דרך WhatsApp.',
  },
  {
    q: 'כמה זמן לוקח המשלוח?',
    a: 'משלוח רגיל לוקח 3-7 ימי עסקים. ניתן גם לקבל את ההזמנה באיסוף עצמי מראשון לציון ללא עלות.',
  },
  {
    q: 'איך מעלים עיצוב?',
    a: 'במהלך תהליך העיצוב תוכלו להעלות קבצים בפורמט JPG או PNG. ניתן להעלות עיצוב שונה לכל אזור (חזית, גב, כיס). בקרוב נוסיף גם עוזר AI ליצירת עיצובים.',
  },
  {
    q: 'מה שיטות התשלום?',
    a: 'כרגע התשלום מתבצע דרך WhatsApp. בעתיד נוסיף אפשרויות תשלום מקוונות נוספות.',
  },
  {
    q: 'האם יש אחריות?',
    a: 'כן! אנחנו מעניקים אחריות מלאה על איכות ההדפסה. אם יש בעיה במוצר, ניתן לפנות אלינו ונטפל בזה מיידית.',
  },
]

export default function FAQPage() {
  return (
    <div className="container-rtl py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          שאלות נפוצות
        </h1>
        <p className="text-xl text-text-gray">
          מצאו תשובות לשאלות הנפוצות ביותר
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold mb-3 text-primary">
              {faq.q}
            </h3>
            <p className="text-text-gray leading-relaxed">
              {faq.a}
            </p>
          </div>
        ))}
      </div>

      <div className="text-center mt-12">
        <p className="text-text-gray mb-4">לא מצאתם את התשובה שחיפשתם?</p>
        <a
          href="/contact"
          className="text-primary font-bold hover:underline"
        >
          צרו איתנו קשר ←
        </a>
      </div>
    </div>
  )
}
