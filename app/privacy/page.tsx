import { ShieldCheck, Lock, Eye, Database, Mail, Cookie, Server, UserCheck } from 'lucide-react'

export const metadata = {
  title: 'מדיניות פרטיות - בדפוס',
  description: 'מדיניות הפרטיות של בדפוס הדפסת חולצות - בהתאם לחוק הגנת הפרטיות, התשמ"א-1981',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  const sections = [
    {
      icon: Database,
      title: '1. איזה מידע אנו אוספים',
      content: 'אנו אוספים את המידע שאתם מוסרים בעת ביצוע הזמנה או יצירת קשר:',
      bullets: [
        'שם מלא',
        'כתובת אימייל',
        'מספר טלפון',
        'כתובת למשלוח',
        'פרטי תשלום — מועברים ישירות לספק התשלום המאובטח (Grow Payment) ואינם נשמרים אצלנו',
      ],
      extra: 'בנוסף, האתר אוסף באופן אוטומטי מידע טכני בסיסי: כתובת IP, סוג דפדפן ופעולות באתר — לצורך תפעול תקין, אבטחה ומעקב המרות (Google Ads, Meta Pixel).',
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      icon: Eye,
      title: '2. מטרות השימוש במידע',
      content: 'אנו משתמשים במידע אך ורק למטרות הבאות:',
      bullets: [
        'עיבוד הזמנות וביצוע משלוחים',
        'שירות לקוחות ומענה לפניות',
        'שיפור חוויית השימוש באתר',
        'ניתוח סטטיסטי כללי של תנועת האתר',
      ],
      extra: 'אנו לא משתמשים במידע שלכם לצורכי דיוור פרסומי ואיננו שולחים ניוזלטר ללא הסכמה.',
      gradient: 'from-green-500 to-emerald-600',
    },
    {
      icon: Server,
      title: '3. איפה המידע נשמר',
      content: 'המידע נשמר בשרתים מאובטחים:',
      bullets: [
        'Firebase / Firestore (Google Cloud) — נתוני הזמנות ולקוחות',
        'Vercel — אחסון האתר ושרת האפליקציה',
      ],
      extra: 'אנו נוקטים באמצעי אבטחה טכנולוגיים וארגוניים להגנה מפני גישה לא מורשית, אובדן או חשיפה.',
      gradient: 'from-purple-500 to-pink-600',
    },
    {
      icon: ShieldCheck,
      title: '4. למי המידע נמסר',
      content: 'אנו לא מוכרים ולא משכירים את המידע האישי שלכם לצדדים שלישיים. אנו מעבירים מידע חלקי אך ורק לספקים הבאים, לצורך מתן השירות בלבד:',
      bullets: [
        'חברת המשלוחים — שם, כתובת וטלפון לצורך ביצוע המשלוח',
        'ספק התשלום (Grow Payment) — מידע הנדרש לאישור העסקה',
      ],
      extra: 'ספקים אלו מחויבים לסודיות ואינם רשאים להשתמש במידע למטרות אחרות.',
      gradient: 'from-yellow-500 to-orange-600',
    },
    {
      icon: Cookie,
      title: '5. עוגיות (Cookies)',
      content: 'האתר משתמש בעוגיות לצורך:',
      bullets: [
        'תפעול תקין ושמירת עגלת קניות',
        'שיפור חוויית הגלישה',
        'מעקב המרות של Google Ads ו-Meta Pixel',
        'שמירת מזהה GCLID לצורך דיווח המרות אופליין',
      ],
      extra: 'ניתן לנהל או למחוק עוגיות דרך הגדרות הדפדפן. השבתת עוגיות עשויה לפגוע בחלק מפונקציות האתר.',
      gradient: 'from-red-500 to-rose-600',
    },
    {
      icon: Lock,
      title: '6. אבטחת מידע',
      content: '',
      bullets: [
        'האתר מוגן באמצעות הצפנת SSL/TLS',
        'פרטי תשלום אינם עוברים דרכנו ואינם נשמרים אצלנו — הם מועברים ישירות לספק התשלום המאובטח',
        'האתר מוגן על ידי Content Security Policy (CSP) למניעת הזרקת קוד זדוני',
      ],
      gradient: 'from-teal-500 to-cyan-600',
    },
    {
      icon: UserCheck,
      title: '7. זכויות המשתמש',
      content: 'בהתאם לחוק הגנת הפרטיות, התשמ"א-1981, יש לכם זכות:',
      bullets: [
        'לעיין במידע שנאסף עליכם',
        'לבקש תיקון או עדכון של המידע',
        'לבקש מחיקת המידע',
      ],
      extra: 'לממש זכויות אלו — פנו אלינו בפרטי ההתקשרות שלהלן. נשיב תוך 30 יום.',
      gradient: 'from-indigo-500 to-purple-600',
    },
    {
      icon: ShieldCheck,
      title: '8. שינויים במדיניות',
      content: 'אנו שומרים לעצמנו את הזכות לעדכן מדיניות זו. שינויים מהותיים יפורסמו באתר.',
      gradient: 'from-pink-500 to-rose-600',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-20" dir="rtl">
      <div className="mx-auto max-w-[1536px] px-4 md:px-0">
        {/* Header */}
        <div className="text-center mb-16" dir="rtl">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-6">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-600">הגנת הפרטיות</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            מדיניות פרטיות
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            בדפוס הדפסת חולצות
          </p>
          <p className="text-sm text-gray-500 mt-2">
            בהתאם לחוק הגנת הפרטיות, התשמ&quot;א-1981 | עדכון אחרון: מרץ 2026
          </p>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 gap-6">
            {sections.map((section, index) => {
              const Icon = section.icon
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all"
                  dir="rtl"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.gradient} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900 mb-3">
                        {section.title}
                      </h2>
                      {section.content && (
                        <p className="text-gray-700 leading-relaxed mb-3">
                          {section.content}
                        </p>
                      )}
                      {section.bullets && (
                        <ul className="space-y-1.5 mr-4 mb-3">
                          {section.bullets.map((bullet, i) => (
                            <li key={i} className="text-gray-700 leading-relaxed flex items-start gap-2">
                              <span className="text-gray-400 mt-1.5 flex-shrink-0">•</span>
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                      {section.extra && (
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {section.extra}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Contact Section */}
          <div className="mt-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-10 text-white shadow-2xl" dir="rtl">
            <h2 className="text-2xl font-bold mb-4">9. פרטי התקשרות</h2>
            <div className="space-y-2 text-emerald-50">
              <p>אימייל: badfos2002@gmail.com</p>
              <p>טלפון / וואטסאפ: 055-9885954</p>
              <p className="mt-4 text-sm opacity-90">
                לכל שאלה או בקשה הנוגעת לפרטיותכם, אנא צרו איתנו קשר והמענה יינתן תוך 30 יום.
              </p>
            </div>
          </div>

          {/* Last Updated */}
          <p className="text-center text-gray-500 text-sm mt-8">
            מדיניות זו עודכנה לאחרונה: מרץ 2026
          </p>
        </div>
      </div>
    </div>
  )
}
