import { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Check, Palette, PrinterIcon, Package } from 'lucide-react'

export const metadata: Metadata = {
  title: 'אודות | בדפוס',
  description: 'הכירו את הסיפור שלנו והערכים שלנו',
}

export default function AboutPage() {
  return (
    <div className="py-12">
      {/* Hero */}
      <section className="container-rtl text-center mb-16">
        <div className="inline-block bg-primary text-white px-4 py-1 rounded-full text-sm font-bold mb-4">
          מאז 2023
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          קצת עלינו
        </h1>
        <div className="max-w-3xl mx-auto space-y-4 text-lg text-text-gray">
          <p>
            בדפוס היא חברת הדפסה מובילה המתמחה בהדפסת חולצות בעיצוב אישי.
            אנחנו משתמשים בטכנולוגיית DTF המתקדמת ביותר כדי להבטיח איכות מקסימלית
            ומחירים משתלמים.
          </p>
          <p>
            הצוות שלנו מורכב מאנשי מקצוע מנוסים עם אהבה לעיצוב ותשוקה לשירות.
            אנחנו מאמינים שכל חולצה צריכה לספר סיפור, וזה בדיוק מה שאנחנו עוזרים
            ללקוחות שלנו ליצור.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 py-16">
        <div className="container-rtl">
          <h2 className="text-3xl font-bold text-center mb-12">הערכים שלנו</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Check,
                title: 'איכות ללא פשרות',
                desc: 'טכנולוגיית DTF המתקדמת ביותר',
              },
              {
                icon: Palette,
                title: 'יצירתיות אישית',
                desc: 'כל עיצוב הוא ייחודי ומיוחד',
              },
              {
                icon: PrinterIcon,
                title: 'שירות מהיר',
                desc: '3-7 ימי עסקים לכל הארץ',
              },
              {
                icon: Package,
                title: 'קהילה מחברת',
                desc: 'אלפי לקוחות מרוצים',
              },
            ].map((value, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">{value.title}</h3>
                <p className="text-text-gray text-sm">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="container-rtl py-16">
        <h2 className="text-3xl font-bold text-center mb-12">התהליך שלנו</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl">
              1
            </div>
            <h3 className="font-bold text-xl mb-2">עיצוב דיגיטלי</h3>
            <p className="text-text-gray">
              העלאת העיצוב שלכם או יצירה עם עוזר ה-AI החכם שלנו
            </p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl">
              2
            </div>
            <h3 className="font-bold text-xl mb-2">הדפסה איכותית</h3>
            <p className="text-text-gray">
              הדפסה בטכנולוגיית DTF על מכונות מתקדמות
            </p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl">
              3
            </div>
            <h3 className="font-bold text-xl mb-2">אריזה ומשלוח</h3>
            <p className="text-text-gray">
              אריזה מקצועית ומשלוח מהיר לכל הארץ
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-gradient-to-r from-primary/10 to-secondary/10 py-16">
        <div className="container-rtl">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-start gap-4 bg-white p-6 rounded-xl shadow-md">
              <Check className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg mb-2">איכות מובטחת</h3>
                <p className="text-text-gray">
                  אחריות מלאה על כל הזמנה. אם יש בעיה - אנחנו מטפלים בזה מיידית
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-white p-6 rounded-xl shadow-md">
              <Check className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg mb-2">משלוח מהיר</h3>
                <p className="text-text-gray">
                  3-7 ימי עסקים לכל הארץ או איסוף עצמי חינם מראשון לציון
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-white p-6 rounded-xl shadow-md">
              <Check className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg mb-2">אחריות מלאה</h3>
                <p className="text-text-gray">
                  אחריות על איכות ההדפסה. לא מרוצים? נחזיר כסף או נדפיס מחדש
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-rtl py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">מוכנים להתחיל?</h2>
        <p className="text-xl text-text-gray mb-8">
          הפכו את הרעיון שלכם לחולצה מושלמת
        </p>
        <Link href="/designer">
          <Button size="lg" className="btn-cta-secondary text-xl px-12 py-6 h-auto">
            עצבו עכשיו
          </Button>
        </Link>
      </section>
    </div>
  )
}
