import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NewPackagesSection() {
  return (
    <section className="py-16 lg:py-24 bg-background-gray">
      <div className="container-rtl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Right Side - Content */}
          <div className="order-2 lg:order-1 text-center lg:text-right">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-6">
              <span className="text-xl">🎉</span>
              <span className="text-sm font-bold">הזול ביותר בשוק</span>
            </div>

            <h2 className="text-3xl lg:text-4xl font-bold text-text-dark mb-4">
              חבילות ומבצעים
            </h2>

            <p className="text-lg text-text-gray mb-8">
              בחרו מוצר כמות, עיצוב ומידות – והכול מוכן לקופה בהמשך
            </p>

            <div className="flex flex-wrap gap-4 justify-center lg:justify-start mb-8">
              <div className="bg-white px-6 py-3 rounded-full shadow-sm">
                <span className="text-sm font-medium">אריזה בודדת</span>
              </div>
              <div className="bg-white px-6 py-3 rounded-full shadow-sm">
                <span className="text-sm font-medium">זמני משלוחים</span>
              </div>
              <div className="bg-white px-6 py-3 rounded-full shadow-sm">
                <span className="text-sm font-medium">הזמנה במספר</span>
              </div>
            </div>

            <Link href="/packages">
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-bold px-8 py-5 h-auto text-base rounded-full shadow-lg"
              >
                👕 לצפייה בכל החבילות
              </Button>
            </Link>
          </div>

          {/* Left Side - Big Package Box */}
          <div className="order-1 lg:order-2">
            <div className="bg-white rounded-3xl shadow-xl p-8 lg:p-12 text-center relative overflow-hidden">
              {/* Decorative wavy line */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-orange-400 to-primary"></div>

              {/* Content */}
              <div className="relative z-10">
                <h3 className="text-6xl lg:text-8xl font-black mb-4 leading-none">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-primary drop-shadow-lg" style={{
                    WebkitTextStroke: '2px #FDB913',
                  }}>
                    11-20
                  </span>
                </h3>
                <h4 className="text-4xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-primary mb-6" style={{
                  WebkitTextStroke: '2px #FDB913',
                }}>
                  חולצות
                </h4>
                <p className="text-text-gray">
                  מחיר מיוחד לכמות זו
                </p>
              </div>

              {/* Decorative elements */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl"></div>
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-orange-300/20 rounded-full blur-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
