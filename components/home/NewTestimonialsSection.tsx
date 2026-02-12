import { Star } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NewTestimonialsSection() {
  const testimonials = [
    {
      name: 'רועי אבירבוך',
      text: 'אחלה חוויה! השירות מהיר, המחיר הוגן וההדפסה באיכות ברמה גבוהה. אגיע פרובוטל צמיד איזה מקוזם תולכות',
      rating: 5,
    },
    {
      name: 'אורי קארה',
      text: 'השתמשתי בשירות שעושה דברים דומה מהיר, ואז יכול להעיד שכמחבר הזה בעד סוף',
      rating: 5,
    },
    {
      name: 'דניאל שטופל',
      text: 'בהזמנה לוקח זמן מזערי כמות איתוב והמרת. את מידות בסוף קר מותג יגם אותכמו כתוכן שבאורגדולים עשר אותו מכולם',
      rating: 5,
    },
  ]

  return (
    <section className="py-16 lg:py-24 bg-background-pink">
      <div className="container-rtl">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
              מה הלקוחות שלנו חושבים
            </span>
          </h2>
          <p className="text-text-gray">
            קראו מה אלפי לקוחות מרוצים יש לנו מהאיכות שלנו
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              {/* Quote Icon */}
              <div className="text-6xl text-gray-200 leading-none mb-4">"</div>

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-primary text-primary"
                  />
                ))}
              </div>

              {/* Text */}
              <p className="text-text-gray mb-4 leading-relaxed text-sm">
                {testimonial.text}
              </p>

              {/* Name */}
              <p className="font-bold text-text-dark">{testimonial.name}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/reviews">
            <Button
              variant="outline"
              className="border-2 border-purple-500 text-purple-600 hover:bg-purple-50 font-bold px-8 py-5 h-auto rounded-full"
            >
              כל הביקורות
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
