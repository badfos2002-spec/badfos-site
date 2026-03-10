'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function LionRoarSection() {
  return (
    <section className="py-10 md:py-14 bg-gradient-to-br from-blue-50 via-white to-yellow-50 overflow-hidden" dir="rtl">
      <div className="mx-auto max-w-5xl px-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 lg:gap-10 items-center">
          {/* Text Content */}
          <div className="order-2 lg:order-1 text-center lg:text-right space-y-4">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
              🇮🇱 מהדורה מיוחדת
            </div>

            <h2 className="text-2xl lg:text-4xl font-bold leading-tight text-gray-900">
              חולצת{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">
                שאגת הארי
              </span>
            </h2>

            <p className="text-base text-gray-600 leading-relaxed max-w-md mx-auto lg:mx-0">
              &quot;עם ישראל חי וקיים&quot; — חולצה איכותית עם הדפס ייחודי.
              <br />
              <strong className="text-blue-700">10% מההכנסות נתרם לעמותת &quot;האגודה למען החייל&quot;</strong>
            </p>

            <div className="flex items-center gap-3 justify-center lg:justify-start">
              <span className="text-3xl font-bold text-gray-900">₪50</span>
              <span className="text-sm text-gray-400">ליחידה</span>
            </div>

            <Link
              href="/lion-roar"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
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
