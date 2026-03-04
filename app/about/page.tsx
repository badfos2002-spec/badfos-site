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
              <div className="relative w-full h-[400px] lg:h-[500px] rounded-3xl overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                  <div className="text-center text-gray-700" dir="rtl">
                    <div className="text-6xl mb-4">👕</div>
                    <p className="text-2xl font-bold">תמונת אודות</p>
                    <p className="text-sm opacity-75 mt-2">600x500</p>
                  </div>
                </div>
              </div>

              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-6 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-2xl shadow-xl">
                <p className="text-lg font-bold">מאז 2023</p>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div className="relative w-full h-[400px] rounded-3xl overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <div className="text-center text-gray-700" dir="rtl">
                  <div className="text-6xl mb-4">⚙️</div>
                  <p className="text-2xl font-bold">תהליך העבודה</p>
                  <p className="text-sm opacity-75 mt-2">600x400</p>
                </div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
