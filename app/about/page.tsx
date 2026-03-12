import { Award, Heart, Zap, CheckCircle2, Shield, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'אודות - בדפוס',
  description: 'הסיפור שלנו - בדפוס היא חברה חדשה ומרגשת בתחום הדפסת חולצות',
}

export default function AboutPage() {
  const values = [
    {
      icon: Award,
      title: 'איכות ללא פשרות',
      description: 'כל חולצה צריכה להיות מושלמת',
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      icon: Heart,
      title: 'יצירתיות אישית',
      description: 'כל לקוח הוא אמן עם חזון ייחודי',
      gradient: 'from-pink-500 to-rose-600',
    },
    {
      icon: Zap,
      title: 'שירות מהיר',
      description: 'זמן יקר - אנו מבטיחים עמידה בזמנים',
      gradient: 'from-yellow-500 to-orange-600',
    },
    {
      icon: Shield,
      title: 'קהילה מחברת',
      description: 'בונים קהילה של אנשים יצירתיים',
      gradient: 'from-green-500 to-emerald-600',
    },
  ]

  const process = [
    {
      title: 'עיצוב דיגיטלי',
      description: 'אתם מעלים תמונה ורואים בדיוק איך החולצה תיראה',
    },
    {
      title: 'הדפסה איכותית',
      description: 'הדפסה בטכנולוגיה מתקדמת על בדים איכותיים',
    },
    {
      title: 'אריזה ומשלוח',
      description: 'אריזה בקופסה מעוצבת ומשלוח מהיר',
    },
  ]

  const features = [
    { icon: Award, text: 'איכות מובטחת' },
    { icon: Zap, text: 'משלוח מהיר' },
    { icon: Shield, text: 'אחריות מלאה' },
    { icon: Heart, text: 'שירות אישי' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" dir="rtl">
      {/* Hero Section */}
      <section className="py-20">
        <div className="mx-auto max-w-[1536px] px-4 md:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="space-y-6" dir="rtl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
                <Star className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-600">הסיפור שלנו</span>
              </div>

              {/* Heading */}
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900">
                קצת עלינו
              </h1>

              {/* Paragraphs */}
              <div className="space-y-4">
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm">
                  <p className="text-lg text-gray-700 leading-relaxed">
                    בדפוס היא חברה חדשה ומרגשת בתחום הדפסת חולצות ומוצרי טקסטיל בעיצוב אישי.
                    אנחנו מציעים ללקוחותינו פלטפורמה דיגיטלית פשוטה ונוחה שמאפשרת לכל אחד ואחת
                    ליצור חולצה ייחודית עם התמונה או העיצוב האישי שלהם.
                  </p>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm">
                  <p className="text-lg text-gray-700 leading-relaxed">
                    אנו שמים דגש על איכות בלתי מתפשרת ושירות לקוחות אישי ומקצועי. הטכנולוגיה
                    המתקדמת שלנו מאפשרת הדפסה עמידה ואיכותית על מגוון רחב של בדים ומוצרים,
                    תוך שמירה על צבעים חיים ומדויקים שלא דועכים או מתקלפים.
                  </p>
                </div>
              </div>
            </div>

            {/* Image */}
            <div className="relative">
              <div className="relative w-full h-[400px] lg:h-[500px] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
                <div className="text-center text-white px-8">
                  <div className="text-7xl mb-6">👕</div>
                  <h2 className="text-3xl font-bold mb-2">בדפוס</h2>
                  <p className="text-lg text-indigo-200">הדפסת חולצות בעיצוב אישי</p>
                </div>
              </div>

              {/* Floating Badges */}
              <div className="absolute -bottom-6 -left-6 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-2xl shadow-xl">
                <p className="text-lg font-bold">מאז 2023</p>
              </div>
              <div className="absolute -top-4 -right-4 bg-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                <span className="text-lg font-bold text-gray-900">5.0</span>
                <span className="text-sm text-gray-500">(51)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white/50">
        <div className="mx-auto max-w-[1536px] px-4 md:px-0">
          <div className="text-center mb-12" dir="rtl">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              הערכים שלנו
            </h2>
            <p className="text-xl text-gray-600">
              מה שמנחה אותנו בכל יום
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => {
              const Icon = value.icon
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
                  dir="rtl"
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${value.gradient} flex items-center justify-center mb-4`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className={`w-12 h-1 rounded-full bg-gradient-to-r ${value.gradient} mb-4`}></div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20">
        <div className="mx-auto max-w-[1536px] px-4 md:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-center">
            {/* Image */}
            <div className="relative w-full h-[400px] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-blue-600 to-cyan-700 flex items-center justify-center">
              <div className="text-center text-white px-8">
                <div className="text-7xl mb-6">⚙️</div>
                <h2 className="text-3xl font-bold mb-2">תהליך העבודה</h2>
                <p className="text-lg text-blue-200">עיצוב, הדפסה, משלוח</p>
              </div>
            </div>

            {/* Process Steps */}
            <div className="space-y-6" dir="rtl">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                איך אנחנו עובדים
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                תהליך מתקדם שמבטיח תוצאה מושלמת
              </p>

              {process.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50">
        <div className="mx-auto max-w-[1536px] px-4 md:px-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 shadow-md text-center hover:shadow-lg transition-all"
                  dir="rtl"
                >
                  <Icon className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
                  <p className="font-bold text-gray-900">{feature.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="mx-auto max-w-[1536px] px-4 md:px-0">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-12 text-center shadow-2xl" dir="rtl">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              מוכנים להתחיל?
            </h2>
            <p className="text-xl text-indigo-100 mb-8">
              הצטרפו אלינו והפכו את הרעיונות שלכם למציאות
            </p>
            <Link href="/designer">
              <Button className="bg-white text-indigo-600 hover:bg-gray-100 font-bold px-10 py-6 text-lg rounded-full shadow-xl hover:shadow-2xl transition-all">
                צור עיצוב עכשיו
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
