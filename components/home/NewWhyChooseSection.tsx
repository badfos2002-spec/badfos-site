import { Award, Truck, ShieldCheck } from 'lucide-react'

export default function NewWhyChooseSection() {
  const benefits = [
    {
      icon: Award,
      title: 'איכות הדפסה גבוהה',
      description: 'הדפסת DTF באיכות פרימיום על חולצות ומוצרי טקסטיל',
    },
    {
      icon: Truck,
      title: 'משלוח מהיר',
      description: 'משלוח עד הבית או איסוף עצמי מהסניף',
    },
    {
      icon: ShieldCheck,
      title: 'תשלום מאובטח',
      description: 'מערכת תשלום מאובטחת ושירות לקוחות 24/7',
    },
  ]

  return (
    <section className="w-full bg-gradient-to-br from-gray-50 via-white to-gray-50 pt-4 pb-20" dir="rtl">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Video Section - Right Side */}
          <div className="relative flex justify-center lg:justify-end">
            {/* Background block with 35deg angle */}
            <div className="absolute w-96 h-[36rem] rounded-3xl bg-[#ffc32e]/20" style={{ transform: 'rotate(35deg)' }}></div>
            <div className="relative w-96 h-[36rem] rounded-3xl shadow-2xl overflow-hidden">
              <iframe
                src="https://www.youtube.com/embed/ZBnLtKpF3l8?start=64&autoplay=1&mute=1&loop=1&playlist=ZBnLtKpF3l8"
                title="למה לבחור בנו"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Text Section - Left Side */}
          <div className="text-right space-y-8" dir="rtl">
            <div className="mb-8">
              <h2 className="text-3xl lg:text-4xl font-bold text-[#1e293b] mb-4">
                למה לבחור בנו?
              </h2>
              <p className="text-xl text-[#64748b]">
                הכנסה לחשבון, עיצוב חולצה ותפוקה — כל זה מיידי ויעיל ביותר
              </p>
            </div>
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              return (
                <div key={index} className="flex items-start gap-4" dir="rtl">
                  <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg text-[#ffc32e]">
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-xl text-[#1e293b] mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-[#64748b] text-base leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
