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
    <section className="w-full bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 py-20">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            מה הלקוחות שלנו חושבים
          </h2>
          <p className="text-xl text-gray-600">
            קראו מה אלפי לקוחות מרוצים יש לנו מהאיכות שלנו
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl hover:scale-105 hover-lift transition-all duration-200 text-right"
            >
              {/* Quote Icon */}
              <div className="w-10 h-10 text-gray-300 text-4xl leading-none mb-4">"</div>

              {/* Rating */}
              <div className="flex gap-1 mb-4 justify-end">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>

              {/* Text */}
              <p className="text-gray-600 mb-4 leading-relaxed text-base">
                {testimonial.text}
              </p>

              {/* Name */}
              <p className="font-bold text-base text-gray-900">{testimonial.name}</p>
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
