export default function NewWhyChooseSection() {
  const benefits = [
    {
      title: 'אתם עושים אונליין',
      description: 'הכנסת הקובץ, התאמת החולצה והזמנה מהאתר – מידי',
    },
    {
      title: 'קופון בונוס',
      description: 'בכל הזמנה אתם מקבלים קופון להזמנה הבאה בסכום משתנה',
    },
    {
      title: 'לקוח בואלקס',
      description:
        'ההזמנות שלכם רשומות במערכת, כך שתקבלו שירות טוב יותר במהלך של השנה',
    },
  ]

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="container-rtl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Right Side - Content */}
          <div className="order-2 lg:order-1">
            <h2 className="text-3xl lg:text-4xl font-bold text-text-dark mb-4">
              למה לבחור בנו?
            </h2>
            <p className="text-text-gray mb-8">
              הכנסה לחשבון, עיצוב חולצה ותפוקה — כל זה מידי ויעיל ביותר
            </p>

            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-text-dark mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-text-gray text-sm leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Left Side - Phone/Tablet Mockup */}
          <div className="order-1 lg:order-2">
            <div className="relative max-w-md mx-auto">
              {/* Phone mockup placeholder */}
              <div className="bg-gradient-to-br from-cream-100 to-orange-100 rounded-3xl shadow-2xl p-8 aspect-[3/4]">
                <div className="bg-gray-800 rounded-2xl h-full flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-5xl mb-4">📱</div>
                    <p className="text-sm opacity-75">מוקאפ טלפון/טאבלט</p>
                  </div>
                </div>
              </div>

              {/* Decorative circle */}
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-primary/5 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
