'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function LionRoarSection() {
  const [donationTotal, setDonationTotal] = useState<number | null>(null)
  const [animatedAmount, setAnimatedAmount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const counterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function calcDonation() {
      if (!db) return
      try {
        const paidStatuses = ['paid', 'in_production', 'shipped', 'completed']
        let total = 0
        for (const status of paidStatuses) {
          const q = query(collection(db, 'orders'), where('status', '==', status))
          const snapshot = await getDocs(q)
          for (const doc of snapshot.docs) {
            const order = doc.data()
            if (!order.items) continue
            for (const item of order.items) {
              const isLionRoar = item.designs?.some(
                (d: any) => d.areaName === 'שאגת האריה' || d.fileName === 'lion-roar.png'
              )
              if (isLionRoar) total += item.totalPrice * 0.1
            }
          }
        }
        if (total > 0) setDonationTotal(Math.round(total))
      } catch {}
    }
    calcDonation()
  }, [])

  useEffect(() => {
    if (!counterRef.current || donationTotal === null) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(counterRef.current)
    return () => observer.disconnect()
  }, [donationTotal])

  useEffect(() => {
    if (!isVisible || donationTotal === null) return
    const duration = 1500
    const steps = 50
    let step = 0
    const timer = setInterval(() => {
      step++
      const progress = step / steps
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedAmount(Math.round(eased * donationTotal))
      if (step >= steps) {
        setAnimatedAmount(donationTotal)
        clearInterval(timer)
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [isVisible, donationTotal])

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
              <strong className="text-white font-bold">10% ממחיר כל חולצה שנמכרת נתרם לעמותת &quot;האגודה למען החייל&quot;</strong>
            </p>

            {/* Donation Counter - clean single line, min-height reserved to prevent CLS */}
            <div ref={counterRef} className="flex items-center gap-2 justify-center lg:justify-start text-white/90 min-h-[36px]">
              {donationTotal !== null && (
                <>
                  <span className="text-base font-medium">נתרמו עד כה</span>
                  <span className="text-2xl font-black text-yellow-300">
                    ₪{animatedAmount.toLocaleString()}
                  </span>
                </>
              )}
            </div>

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
            <div className="relative w-[180px] h-[180px] sm:w-[240px] sm:h-[240px] lg:w-[320px] lg:h-[320px]">
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
