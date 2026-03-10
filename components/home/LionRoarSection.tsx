'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function LionRoarSection() {
  return (
    <section className="py-10 md:py-14 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 overflow-hidden" dir="rtl">
      <div className="mx-auto max-w-5xl px-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 lg:gap-10 items-center">
          {/* Text Content */}
          <div className="order-2 lg:order-1 text-center lg:text-right space-y-5">
            <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide">
              🇮🇱 מהדורה מיוחדת
            </div>

            <h2 className="text-3xl lg:text-5xl font-extrabold leading-snug text-white">
              חולצת{' '}
              <span className="text-white/90">
                שאגת הארי
              </span>
            </h2>

            <p className="text-lg lg:text-xl text-white/80 leading-relaxed max-w-md mx-auto lg:mx-0 font-medium">
              &quot;עם ישראל חי וקיים&quot; — חולצה איכותית עם הדפס ייחודי.
              <br />
              <strong className="text-white font-bold">10% מההכנסות נתרם לעמותת &quot;האגודה למען החייל&quot;</strong>
            </p>

            <div className="flex items-center gap-3 justify-center lg:justify-start">
              <span className="text-4xl font-extrabold text-white">₪50</span>
              <span className="text-base text-white/60 font-medium">ליחידה</span>
            </div>

            <Link
              href="/lion-roar"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-800 hover:bg-blue-50 font-bold text-base rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              הזמינו עכשיו
            </Link>
          </div>

          {/* Product Image */}
          <div className="order-1 lg:order-2 flex justify-center">
            <div className="relative w-[240px] h-[240px] lg:w-[320px] lg:h-[320px]">
              <Image
                src="/assets/lion-roar-shirt.png"
                alt="חולצת שאגת הארי"
                fill
                className="object-contain drop-shadow-xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
