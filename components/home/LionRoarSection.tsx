'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function LionRoarSection() {
  return (
    <section className="py-16 bg-gradient-to-br from-blue-50 via-white to-yellow-50 overflow-hidden" dir="rtl">
      <div className="mx-auto max-w-[1536px] px-4 md:px-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Text Content */}
          <div className="order-2 lg:order-1 text-center lg:text-right space-y-6">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium">
              מהדורה מיוחדת
            </div>

            <h2 className="text-3xl lg:text-5xl font-bold leading-tight text-gray-900">
              חולצת
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">
                שאגת הארי
              </span>
            </h2>

            <p className="text-lg text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
              &quot;עם ישראל חי וקיים&quot; — חולצה איכותית עם הדפס ייחודי.
              <br />
              <strong className="text-blue-700">10% מההכנסות נתרם לעמותת &quot;האגודה למען החייל&quot;</strong>
            </p>

            <div className="flex items-center gap-4 justify-center lg:justify-start">
              <span className="text-4xl font-bold text-gray-900">₪50</span>
              <span className="text-gray-400">ליחידה</span>
            </div>

            <Link
              href="/lion-roar"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              הזמינו עכשיו
            </Link>
          </div>

          {/* Product Image */}
          <div className="order-1 lg:order-2 flex justify-center">
            <div className="relative w-[300px] h-[300px] lg:w-[420px] lg:h-[420px]">
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
