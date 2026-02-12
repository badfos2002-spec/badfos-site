import { Card, CardContent } from '@/components/ui/card'

const benefits = [
  {
    icon: '🏆',
    title: 'איכות הדפסה גבוהה',
    description: 'טכנולוגיית DTF המתקדמת ביותר לאיכות מקצימלית',
  },
  {
    icon: '🚚',
    title: 'משלוח מהיר',
    description: '3-7 ימי עסקים לכל הארץ או איסוף עצמי חינם',
  },
  {
    icon: '🔒',
    title: 'תשלום מאובטח',
    description: 'סליקה מאובטחת ומהירה עם אפשרויות תשלום מגוונות',
  },
]

export default function BenefitsSection() {
  return (
    <section className="section-spacing bg-gray-50">
      <div className="container-rtl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="text-6xl mb-4">{benefit.icon}</div>
                <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                <p className="text-text-gray">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
