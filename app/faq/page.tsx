'use client'

import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    {
      question: 'איך עובד תהליך עיצוב החולצה?',
      answer: 'התהליך פשוט מאוד - נכנסים למעצב, בוחרים סוג חולצה וצבע, מעלים תמונה או עיצוב, בוחרים מידות וכמויות, ומקבלים תצוגה מקדימה מדויקת של איך החולצה תיראה. אחר כך פשוט מוסיפים לעגלה ומשלמים.',
    },
    {
      question: 'באילו סוגי קבצים ניתן להשתמש?',
      answer: 'ניתן להעלות קבצי תמונה בפורמטים: JPG, PNG, GIF. המערכת תומכת בקבצים עד 10MB. מומלץ להעלות תמונות באיכות גבוהה (לפחות 300 DPI) לתוצאות הטובות ביותר.',
    },
    {
      question: 'כמה זמן לוקח למשלוח להגיע?',
      answer: 'זמן המשלוח הוא 3-7 ימי עסקים לכל הארץ. ניתן גם לבחור באיסוף עצמי חינם מהסניף שלנו בראשון לציון. לאחר ההזמנה תקבלו מייל עם פרטי המעקב.',
    },
    {
      question: 'מהי מדיניות ההחזרות?',
      answer: 'מכיוון שכל חולצה מודפסת בעיצוב אישי ייחודי, לא ניתן להחזיר מוצרים אלא אם כן יש פגם בהדפסה או בבד. במקרה של פגם, אנא צרו קשר תוך 7 ימים מקבלת המוצר ואנו נדאג להחלפה מיידית.',
    },
    {
      question: 'האם יש הנחה להזמנות גדולות?',
      answer: 'כן! החל מהזמנה של 15 חולצות ומעלה תקבלו הנחה של 5% מהמחיר הכולל. בנוסף, אנו מציעים חבילות מיוחדות להזמנות גדולות - ניתן לראות אותן בעמוד החבילות והמבצעים.',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-20" dir="rtl">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16" dir="rtl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-6">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-600">תשובות לכל השאלות</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            שאלות נפוצות
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            כל מה שרציתם לדעת במקום אחד
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border-b border-gray-200/50 last:border-b-0"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full py-6 flex items-center justify-between text-right hover:text-indigo-600 transition-colors group"
                dir="rtl"
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Number Circle */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <span className="text-white text-sm font-bold">{index + 1}</span>
                  </div>
                  
                  {/* Question */}
                  <span className="text-lg font-bold text-gray-900">
                    {faq.question}
                  </span>
                </div>

                {/* Arrow Icon */}
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Answer */}
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  openIndex === index ? 'max-h-96 pb-6' : 'max-h-0'
                }`}
              >
                <div className="pr-12 bg-gradient-to-r from-indigo-50/50 to-transparent p-4 rounded-lg" dir="rtl">
                  <p className="text-gray-700 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-16 text-center bg-white/80 backdrop-blur-sm rounded-2xl p-8 max-w-2xl mx-auto shadow-lg" dir="rtl">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            לא מצאתם את התשובה?
          </h3>
          <p className="text-gray-600 mb-6">
            אנחנו כאן כדי לעזור! צרו איתנו קשר ונשמח לענות על כל שאלה
          </p>
          <a
            href="/contact"
            className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            צור קשר
          </a>
        </div>
      </div>
    </div>
  )
}
