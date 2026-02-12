import { Palette, Shirt, ShoppingBag } from 'lucide-react'

const steps = [
  {
    number: 1,
    icon: Shirt,
    title: 'בחרו מוצר',
    description: 'חולצה, סווטשרט או באף - הבחירה שלכם',
  },
  {
    number: 2,
    icon: Palette,
    title: 'עצבו',
    description: 'העלו עיצוב משלכם או השתמשו בעוזר AI החכם',
  },
  {
    number: 3,
    icon: ShoppingBag,
    title: 'הזמינו',
    description: 'השלימו פרטים ותקבלו את המוצר תוך ימים ספורים',
  },
]

export default function HowItWorks() {
  return (
    <section className="section-spacing bg-gradient-to-b from-primary/5 to-secondary/5">
      <div className="container-rtl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          איך זה עובד?
        </h2>
        <p className="text-center text-text-gray mb-12 max-w-2xl mx-auto">
          תהליך פשוט ומהיר - מרעיון למוצר מוגמר בשלושה שלבים בלבד
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              <div className="flex flex-col items-center text-center">
                {/* Number Badge */}
                <div className="w-16 h-16 rounded-full bg-primary text-white font-bold text-2xl flex items-center justify-center mb-4">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center mb-4">
                  <step.icon className="w-10 h-10 text-primary" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-text-gray">{step.description}</p>
              </div>

              {/* Arrow (except for last item on desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 -left-1/2 w-full">
                  <svg
                    className="w-full h-8"
                    viewBox="0 0 100 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M0 10 L90 10 L85 5 M90 10 L85 15"
                      stroke="#FDB913"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
