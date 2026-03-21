'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const DONATION_GOAL = 5000

export default function LionRoarSection() {
  const [donationTotal, setDonationTotal] = useState<number | null>(null)
  const [animatedAmount, setAnimatedAmount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const meterRef = useRef<HTMLDivElement>(null)

  // Fetch donation total from Firestore
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
                (d: any) =>
                  d.areaName === 'שאגת האריה' ||
                  d.fileName === 'lion-roar.png'
              )
              if (isLionRoar) {
                total += item.totalPrice * 0.1
              }
            }
          }
        }

        if (total > 0) setDonationTotal(Math.round(total))
      } catch (err) {
        console.error('Error calculating donation:', err)
      }
    }
    calcDonation()
  }, [])

  // Intersection observer - trigger animation when visible
  useEffect(() => {
    if (!meterRef.current || donationTotal === null) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(meterRef.current)
    return () => observer.disconnect()
  }, [donationTotal])

  // Animate the number counting up
  useEffect(() => {
    if (!isVisible || donationTotal === null) return
    const duration = 2000
    const steps = 60
    const increment = donationTotal / steps
    let current = 0
    let step = 0

    const timer = setInterval(() => {
      step++
      // Ease-out curve for punch meter effect
      const progress = step / steps
      const eased = 1 - Math.pow(1 - progress, 3)
      current = Math.round(eased * donationTotal)
      setAnimatedAmount(current)

      if (step >= steps) {
        setAnimatedAmount(donationTotal)
        clearInterval(timer)
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [isVisible, donationTotal])

  const percentage = donationTotal ? Math.min(100, (donationTotal / DONATION_GOAL) * 100) : 0

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

            {/* Punch Meter Donation Counter */}
            {donationTotal !== null && (
              <div ref={meterRef} className="max-w-sm mx-auto lg:mx-0">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 relative overflow-hidden">
                  {/* Title */}
                  <div className="text-center mb-3">
                    <span className="text-white/70 text-sm font-medium">תרמנו עד כה</span>
                  </div>

                  {/* Vertical Meter */}
                  <div className="flex items-end justify-center gap-4 mb-3">
                    {/* The meter bar */}
                    <div className="relative w-14 h-40 bg-white/10 rounded-xl border border-white/20 overflow-hidden">
                      {/* Fill from bottom */}
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-b-lg transition-all ease-out"
                        style={{
                          height: isVisible ? `${percentage}%` : '0%',
                          transitionDuration: '2s',
                          background: 'linear-gradient(to top, #f59e0b, #fbbf24, #fde68a)',
                        }}
                      >
                        {/* Glow effect at the top of the fill */}
                        <div className="absolute top-0 left-0 right-0 h-3 bg-white/40 blur-sm" />
                      </div>

                      {/* Level markers */}
                      {[20, 40, 60, 80].map((level) => (
                        <div
                          key={level}
                          className="absolute left-0 right-0 border-t border-white/15"
                          style={{ bottom: `${level}%` }}
                        />
                      ))}
                    </div>

                    {/* Amount display */}
                    <div className="flex flex-col items-center">
                      <span
                        className="text-3xl font-black text-white tabular-nums"
                        style={{
                          textShadow: isVisible ? '0 0 20px rgba(251, 191, 36, 0.5)' : 'none',
                          transition: 'text-shadow 2s ease-out',
                        }}
                      >
                        ₪{animatedAmount.toLocaleString()}
                      </span>
                      <span className="text-white/40 text-xs mt-1">
                        מתוך ₪{DONATION_GOAL.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Bottom label */}
                  <p className="text-white/50 text-xs text-center">
                    כל קנייה תורמת 10% לעמותת &quot;האגודה למען החייל&quot;
                  </p>
                </div>
              </div>
            )}

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
