'use client'

import { useState, useEffect, useRef } from 'react'
import { Award, Truck, ShieldCheck, Play } from 'lucide-react'

const D = {
  why_title: 'למה לבחור בנו?',
  why_subtitle: 'הכנסה לחשבון, עיצוב חולצה ותפוקה — כל זה מיידי ויעיל ביותר',
  why_videoUrl: 'https://www.youtube.com/embed/ZBnLtKpF3l8?start=64&autoplay=1&mute=1&loop=1&playlist=ZBnLtKpF3l8',
  why_b1_title: 'איכות הדפסה גבוהה',
  why_b1_desc: 'הדפסת DTF באיכות פרימיום על חולצות ומוצרי טקסטיל',
  why_b2_title: 'משלוח מהיר',
  why_b2_desc: 'משלוח עד הבית או איסוף עצמי מהסניף',
  why_b3_title: 'תשלום מאובטח',
  why_b3_desc: 'מערכת תשלום מאובטחת ושירות לקוחות 24/7',
}

const ICONS = [Award, Truck, ShieldCheck]

/** Lazy YouTube — shows thumbnail, loads iframe ONLY on user click (not on scroll).
 *  This saves ~1MB of YouTube player JS until the user actually wants to watch. */
function LazyYouTube({ videoUrl }: { videoUrl: string }) {
  const [loaded, setLoaded] = useState(false)
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Extract video ID for thumbnail
  const videoId = videoUrl.match(/embed\/([^?]+)/)?.[1] || 'ZBnLtKpF3l8'

  // Preload the thumbnail when it comes into view (lightweight, ~20KB)
  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setThumbnailLoaded(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px' }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="relative flex justify-center lg:justify-end">
      <div className="absolute w-full sm:w-80 md:w-96 h-[28rem] sm:h-[32rem] md:h-[36rem] rounded-3xl bg-[#ffc32e]/20" style={{ transform: 'rotate(35deg)' }}></div>
      <div
        ref={ref}
        className="relative w-full sm:w-80 md:w-96 h-[28rem] sm:h-[32rem] md:h-[36rem] rounded-3xl shadow-2xl overflow-hidden cursor-pointer group"
        onClick={() => setLoaded(true)}
      >
        {loaded ? (
          <iframe
            src={videoUrl}
            title="למה לבחור בנו"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
            loading="lazy"
          />
        ) : (
          <>
            {/* Solid background before thumbnail loads to avoid flash */}
            <div className="w-full h-full bg-gray-900" />
            {thumbnailLoaded && (
              <img
                src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                alt="למה לבחור בנו — לחצו לצפייה בסרטון"
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </div>
              <span className="sr-only">הפעל סרטון</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function NewWhyChooseSection() {
  const [c, setC] = useState(D)

  useEffect(() => {
    import('@/lib/db').then(({ getDocument }) => {
      getDocument<Record<string, string>>('settings', 'homepage')
        .then((data) => { if (data) setC({ ...D, ...data }) })
        .catch(() => {})
    })
  }, [])

  const benefits = [1, 2, 3].map((i) => ({
    icon: ICONS[i - 1],
    title: c[`why_b${i}_title` as keyof typeof c],
    description: c[`why_b${i}_desc` as keyof typeof c],
  }))

  return (
    <section className="w-full bg-gradient-to-br from-gray-50 via-white to-gray-50 pt-4 pb-20" dir="rtl">
      <div className="mx-auto max-w-[1536px] px-4 md:px-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Video Section — lazy-loaded YouTube (saves ~900KB + 960ms CPU) */}
          <LazyYouTube videoUrl={c.why_videoUrl?.startsWith('https://www.youtube.com/') ? c.why_videoUrl : D.why_videoUrl} />

          {/* Text Section */}
          <div className="text-right space-y-8" dir="rtl">
            <div className="mb-8">
              <h2 className="text-3xl lg:text-4xl font-bold text-[#1e293b] mb-4">{c.why_title}</h2>
              <p className="text-xl text-[#64748b]">{c.why_subtitle}</p>
            </div>
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              return (
                <div key={index} className="flex items-start gap-4" dir="rtl">
                  <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg text-[#ffc32e]">
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-xl text-[#1e293b] mb-1">{benefit.title}</h3>
                    <p className="text-[#64748b] text-base leading-relaxed">{benefit.description}</p>
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
