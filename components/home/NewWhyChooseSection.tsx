export default function NewWhyChooseSection() {
  const benefits = [
    {
      icon: '1️⃣',
      title: 'אתם עושים אונליין',
      description: 'הכנסת הקובץ, התאמת החולצה והזמנה מהאתר – מיידי',
    },
    {
      icon: '2️⃣',
      title: 'קופון בונוס',
      description: 'בכל הזמנה אתם מקבלים קופון להזמנה הבאה בסכום משתנה',
    },
    {
      icon: '3️⃣',
      title: 'לקוח בואלקס',
      description:
        'ההזמנות שלכם רשומות במערכת, כך שתקבלו שירות טוב יותר במהלך השנה',
    },
  ]

  return (
    <section className="w-full bg-gradient-to-br from-gray-50 via-white to-gray-50 pt-4 pb-20">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-right space-y-6">
            <div className="mb-8">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                למה לבחור בנו?
              </h2>
              <p className="text-gray-600">
                הכנסה לחשבון, עיצוב חולצה ותפוקה — כל זה מיידי ויעיל ביותר
              </p>
            </div>
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl text-yellow-600">{benefit.icon}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="relative flex justify-center lg:justify-start">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-96 h-[36rem] bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl transform rotate-6" />
            </div>
            <div className="relative w-96 h-[36rem] bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="text-6xl mb-4">📱</div>
                  <p className="text-lg font-medium">סרטון הסבר</p>
                  <p className="text-sm opacity-75 mt-2">384x576 (9:16)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
