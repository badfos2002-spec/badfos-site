import { ShieldCheck, Lock, Eye, Database, Mail } from 'lucide-react'

export const metadata = {
  title: 'מדיניות פרטיות - בדפוס',
  description: 'מדיניות הפרטיות של בדפוס - בהתאם לתיקון 13 לחוק הגנת הפרטיות',
}

export default function PrivacyPage() {
  const sections = [
    {
      icon: Database,
      title: 'איזה מידע אנחנו אוספים',
      content: 'אנו אוספים מידע שאתם מוסרים בעת ביצוע הזמנה או יצירת קשר: שם מלא, כתובת אימייל, מספר טלפון, כתובת למשלוח, ופרטי תשלום (באמצעות ספקי תשלום חיצוניים מאובטחים). בנוסף, אנו אוספים מידע טכני: כתובת IP, סוג דפדפן, ופעולות באתר.',
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      icon: Eye,
      title: 'מטרות השימוש במידע',
      content: 'אנו משתמשים במידע לצורך עיבוד הזמנות, משלוח מוצרים, שירות לקוחות, שיפור חוויית המשתמש, שיווק (בכפוף לאישורכם), וניתוח סטטיסטי של השימוש באתר. לא נשתמש במידע שלכם למטרות אחרות ללא קבלת הסכמתכם המפורשת.',
      gradient: 'from-green-500 to-emerald-600',
    },
    {
      icon: Lock,
      title: 'איפה המידע נשמר',
      content: 'המידע נשמר בשרתים מאובטחים הנמצאים בישראל או בחו"ל אצל ספקי אחסון מוכרים ומאובטחים. אנו נוקטים באמצעי אבטחה פיזיים, טכנולוגיים וארגוניים כדי להגן על המידע שלכם מגישה לא מורשית, אובדן, שינוי או חשיפה.',
      gradient: 'from-purple-500 to-pink-600',
    },
    {
      icon: ShieldCheck,
      title: 'למי המידע נמסר',
      content: 'אנו לא מוכרים ולא משכירים את המידע האישי שלכם לצדדים שלישיים. אנו עשויים למסור מידע לספקי שירות חיצוניים (כמו חברות שילוח, מעבדי תשלום) אך רק במידה הנדרשת לצורך מתן השירות. ספקים אלו מחויבים לשמור על סודיות המידע ולא להשתמש בו למטרות אחרות.',
      gradient: 'from-yellow-500 to-orange-600',
    },
    {
      icon: Database,
      title: 'עוגיות (Cookies)',
      content: 'האתר משתמש בעוגיות לצורך שיפור חוויית הגלישה, ניתוח תנועה, ושמירת העדפות. אתם יכולים לנהל או למחוק עוגיות דרך הגדרות הדפדפן שלכם. חלק מהפונקציות באתר עשויות שלא לפעול כראוי ללא עוגיות.',
      gradient: 'from-red-500 to-rose-600',
    },
    {
      icon: Lock,
      title: 'אבטחת מידע',
      content: 'אנו משתמשים בטכנולוגיות הצפנה (SSL/TLS) כדי להגן על המידע שלכם בעת העברתו דרך האינטרנט. פרטי תשלום אינם נשמרים אצלנו אלא מועברים ישירות לספק התשלום המאובטח.',
      gradient: 'from-teal-500 to-cyan-600',
    },
    {
      icon: Mail,
      title: 'זכויות המשתמש',
      content: 'יש לכם זכות לעיין במידע שנאסף עליכם, לבקש תיקון, עדכון או מחיקה של המידע, ולבטל את הסכמתכם לקבלת דיוור שיווקי בכל עת. לצורך מימוש זכויות אלו, אנא פנו אלינו בפרטים המופיעים בסעיף "צור קשר".',
      gradient: 'from-indigo-500 to-purple-600',
    },
    {
      icon: ShieldCheck,
      title: 'שינויים במדיניות הפרטיות',
      content: 'אנו שומרים לעצמנו את הזכות לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו באתר, ובמקרים מסוימים גם נודיע לכם בדואר אלקטרוני.',
      gradient: 'from-pink-500 to-rose-600',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-20" dir="rtl">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6 lg:px-8">
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
            בהתאם לתיקון 13 לחוק הגנת הפרטיות, התשמ"א-1981
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
                      <p className="text-gray-700 leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Contact Section */}
          <div className="mt-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-10 text-white shadow-2xl" dir="rtl">
            <h2 className="text-2xl font-bold mb-4">פרטי התקשרות - ממונה על הפרטיות</h2>
            <div className="space-y-2 text-emerald-50">
              <p>📧 אימייל: badfos2002@gmail.com</p>
              <p>📞 טלפון: 050-7794277</p>
              <p className="mt-4 text-sm opacity-90">
                לכל שאלה או בקשה הנוגעת לפרטיותכם, אנא צרו איתנו קשר והמענה יינתן תוך 30 יום.
              </p>
            </div>
          </div>

          {/* Last Updated */}
          <p className="text-center text-gray-500 text-sm mt-8">
            מדיניות זו עודכנה לאחרונה: 1 בינואר 2024
          </p>
        </div>
      </div>
    </div>
  )
}
