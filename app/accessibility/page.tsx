import { Card, CardContent } from '@/components/ui/card'
import { Eye, Sparkles } from 'lucide-react'

export const metadata = {
  title: 'הצהרת נגישות - בדפוס',
  description: 'מחויבותנו לנגישות דיגיטלית לכלל האוכלוסייה — בדפוס פועל בהתאם לתקנות נגישות אתרי אינטרנט.',
  alternates: { canonical: '/accessibility' },
  keywords: 'נגישות אתר, הצהרת נגישות, נגישות דיגיטלית',
  openGraph: {
    title: 'הצהרת נגישות - בדפוס',
    description: 'מחויבותנו לנגישות דיגיטלית לכלל האוכלוסייה',
    url: 'https://badfos.co.il/accessibility',
    siteName: 'בדפוס',
    locale: 'he_IL',
    type: 'website',
  },
}

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 py-12" dir="rtl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 -left-20 w-60 h-60 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-full opacity-15 animate-bounce" style={{ animationDuration: '3s' }}></div>
        <div className="absolute bottom-20 right-1/3 w-32 h-32 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-cyan-100 border border-blue-200 rounded-full text-blue-700 text-sm font-medium shadow-sm mb-6">
            <Sparkles className="w-4 h-4 ml-2" />
            נגישות לכולם
          </div>
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 text-white p-3 rounded-2xl mx-auto mb-6 shadow-2xl">
            <Eye className="w-full h-full" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">הצהרת נגישות</span>
          </h1>
          <p className="text-xl text-gray-700">מחויבותנו לנגישות דיגיטלית לכלל האוכלוסייה</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8 space-y-6">
            <p className="text-sm text-gray-500">עודכן לאחרונה: 20.07.2026</p>

            <p className="text-lg leading-relaxed bg-gradient-to-r from-blue-50/50 to-cyan-50/50 rounded-lg p-4">
              אתר זה מייחס חשיבות רבה להנגשת השימוש בו לכלל האוכלוסייה ועושה כל שביכולתו
              להבטיח שאנשים עם מוגבלות יוכלו להפיק את המיטב מהתכנים המוצגים בו. אנו פועלים
              לשיפור מתמיד של נגישות האתר ומשלבים בו כלי נגישות ועקרונות עיצוב נגישים.
            </p>

            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-lg border border-indigo-200 shadow-sm">
              <h3 className="font-bold text-lg mb-3 text-indigo-800">התקן שלפיו אנו פועלים:</h3>
              <p className="text-indigo-700">
                אנו שואפים כי האתר יעמוד בדרישות תקן ישראלי ת&quot;י 5568 חלק 1, ברמת AA
                (התואם להנחיות WCAG 2.1 ברמה AA) של ארגון התקינה הבינלאומי W3C.
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-200 shadow-sm">
              <h3 className="font-bold text-lg mb-3 text-blue-800">איך להפעיל את כלי הנגישות:</h3>
              <p className="mb-3 text-blue-700">על מנת לפתוח את כלי הנגישות יש ללחוץ על האייקון הכחול בצד ימין למטה, או להקיש <strong>Control + U</strong>.</p>
            </div>

            <div className="bg-gradient-to-r from-teal-50 to-green-50 p-6 rounded-lg border border-teal-200 shadow-sm">
              <h3 className="font-bold text-xl mb-4 text-teal-800">באמצעות כלי הנגישות תוכלו:</h3>
              <ul className="space-y-3 list-disc list-inside text-teal-700">
                <li>לשנות את גודל הטקסט באתר</li>
                <li>לשנות את ניגודיות הצבעים – ניגודיות כהה, ניגודיות בהירה, היפוך צבעים</li>
                <li>להדגיש את הקישורים באתר</li>
                <li>לשנות את ריווח האותיות</li>
                <li>לשנות את גובה השורה של הטקסט</li>
                <li>לעבור לגופן קריא יותר</li>
                <li>להגדיל את סמן העכבר (סמן גדול)</li>
                <li>לבטל הנפשות ואנימציות באתר</li>
                <li>להסתיר תמונות</li>
              </ul>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-lg border border-amber-200 shadow-sm">
              <h3 className="font-bold text-lg mb-3 text-amber-800">מגבלות ידועות:</h3>
              <p className="text-amber-700 leading-relaxed">
                אנו ממשיכים לשפר את נגישות האתר באופן שוטף. נכון למועד עדכון הצהרה זו, ייתכנו
                אזורים מסוימים שטרם הונגשו במלואם – בהם רכיבים המוטמעים מגורמי צד שלישי, וכן
                בחינה מתמשכת של ניגודיות הצבעים בחלק מרכיבי המותג. אנו פועלים לתקן ליקויים אלו,
                ונשמח לקבל מכם דיווח על כל בעיה שנתקלתם בה.
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-200 shadow-sm">
              <h3 className="font-bold text-lg mb-3 text-blue-800">פנייה בנושאי נגישות:</h3>
              <p className="text-blue-700 leading-relaxed">
                נתקלתם בבעיית נגישות באתר? נשמח שתעדכנו אותנו כדי שנוכל לטפל בכך. ניתן לפנות אלינו
                בכל אחת מהדרכים הבאות:
              </p>
              <ul className="mt-3 space-y-2 text-blue-700">
                <li>טלפון: <a href="tel:+972559885954" className="underline font-medium" dir="ltr">055-988-5954</a></li>
                <li>דוא&quot;ל: <a href="mailto:badfos2002@gmail.com" className="underline font-medium">badfos2002@gmail.com</a></li>
              </ul>
              {/* TODO owner: להוסיף שם רכז נגישות ספציפי */}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
