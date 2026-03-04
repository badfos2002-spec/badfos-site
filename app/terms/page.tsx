import { FileText, Shield, AlertCircle } from 'lucide-react'

export const metadata = {
  title: 'תקנון - בדפוס',
  description: 'תנאי השימוש בשירותי בדפוס',
}

export default function TermsPage() {
  const sections = [
    {
      title: '1. כללי',
      content: 'ברוכים הבאים לאתר בדפוס. התנאים וההתניות המפורטים להלן ("התקנון") חלים על כל שימוש באתר ובשירותים המוצעים בו. השימוש באתר מהווה הסכמה מלאה לתנאי התקנון.',
    },
    {
      title: '2. הזמנות',
      content: 'כל הזמנה המתבצעת דרך האתר מהווה הצעה לרכישה. אנו שומרים לעצמנו את הזכות לדחות הזמנה מכל סיבה שהיא, לרבות מגבלות על כמויות, שגיאות במידע על המוצר או מחיר, או בעיות שזוהו על ידינו.',
    },
    {
      title: '3. מחירים',
      content: 'כל המחירים באתר מוצגים בשקלים חדשים (₪) וכוללים מע"מ. אנו שומרים לעצמנו את הזכות לשנות את המחירים בכל עת ללא הודעה מוקדמת. המחיר הסופי של ההזמנה הוא המחיר שהופיע בעת אישור ההזמנה.',
    },
    {
      title: '4. אספקה ומשלוחים',
      content: 'זמן האספקה הוא 3-7 ימי עסקים מיום אישור ההזמנה ותשלום מלא. משלוח רגיל עולה 35₪. ניתן גם לבחור באיסוף עצמי חינם מהסניף שלנו בראשון לציון. איננו אחראים לעיכובים שנגרמו מסיבות שאינן תלויות בנו.',
    },
    {
      title: '5. אחריות והחזרות',
      content: 'כל מוצר שהודפס בעיצוב אישי הוא מוצר ייחודי שאינו ניתן להחזרה, אלא במקרה של פגם בהדפסה או בבד עצמו. במקרה של פגם, יש ליצור קשר תוך 7 ימים מקבלת המוצר ואנו נדאג להחלפה מיידית או זיכוי מלא.',
    },
    {
      title: '6. ביטול עסקה',
      content: 'בהתאם לחוק הגנת הצרכן, ניתן לבטל עסקה תוך 14 יום מיום קבלת המוצר. עם זאת, מוצרים שהופקו בהתאמה אישית (כולל הדפסה בעיצוב אישי) אינם כפופים לזכות ביטול זו, בהתאם להוראות החוק.',
    },
    {
      title: '7. קניין רוחני',
      content: 'כל התוכן באתר, לרבות טקסטים, תמונות, לוגואים, עיצובים וקוד, מוגן בזכויות יוצרים ושייך לבדפוס או לצדדים שלישיים שהעניקו לנו רישיון שימוש. אין להעתיק, להפיץ או לעשות שימוש מסחרי בתוכן ללא אישור מפורש בכתב.',
    },
    {
      title: '8. אחריות משתמש',
      content: 'אתם מתחייבים שהתמונות והעיצובים שאתם מעלים לאתר אינם מפרים זכויות יוצרים, סימני מסחר או כל זכות אחרת של צד שלישי. אתם נושאים באחריות המלאה לכל תוכן שאתם מעלים ומשתמשים בו במסגרת השירות.',
    },
    {
      title: '9. שינויים בתקנון',
      content: 'אנו שומרים לעצמנו את הזכות לעדכן או לשנות את התקנון בכל עת. שינויים יכנסו לתוקף מיידית עם פרסומם באתר. המשך השימוש באתר לאחר עדכון התקנון מהווה הסכמה לשינויים.',
    },
    {
      title: '10. צור קשר',
      content: 'לכל שאלה בנוגע לתקנון זה, ניתן ליצור איתנו קשר בכתובת: badfos2002@gmail.com או בטלפון: 050-7794277.',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 py-20" dir="rtl">
      <div className="mx-auto max-w-[1536px] px-4 md:px-0">
        {/* Header */}
        <div className="text-center mb-16" dir="rtl">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-6">
            <FileText className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-medium text-slate-600">תנאי שימוש</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            תקנון האתר
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            תנאי השימוש בשירותי בדפוס
          </p>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
            <div className="space-y-8">
              {sections.map((section, index) => (
                <div
                  key={index}
                  className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6"
                  dir="rtl"
                >
                  <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-slate-600" />
                    {section.title}
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer Notice */}
            <div className="mt-12 bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6" dir="rtl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-yellow-900 mb-2">
                    הערה חשובה
                  </h3>
                  <p className="text-yellow-800 text-sm leading-relaxed">
                    תקנון זה עודכן לאחרונה בתאריך 1 בינואר 2024. אנא קראו את התנאים בעיון לפני ביצוע הזמנה.
                    המשך השימוש באתר מהווה הסכמה לתנאים אלו.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
