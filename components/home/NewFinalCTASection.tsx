import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NewFinalCTASection() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white relative overflow-hidden">
      {/* Floating animated circles */}
      <div className="absolute top-20 right-20 w-48 h-48 bg-yellow-500/40 rounded-full blur-2xl animate-pulse"></div>
      <div className="absolute bottom-20 left-20 w-64 h-64 bg-pink-500/30 rounded-full blur-2xl animate-bounce" style={{ animationDuration: '3s' }}></div>

      <div className="mx-auto max-w-[1600px] px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Heading */}
          <h2 className="text-3xl lg:text-4xl font-bold mb-6 leading-tight">
            מוכן ליצור את החולצה הבאה שלך?
          </h2>

          {/* Subheading */}
          <p className="text-xl text-purple-100 mb-10 leading-relaxed">
            צרו עיצובים ייחודיים, הזמינו בקלות, וקבלו משלוח מהיר עד הבית
          </p>

          {/* CTA Button */}
          <Link href="/designer">
            <Button className="bg-gradient-to-r from-[#ffc32e] to-[#ffd95c] hover:from-[#e6ac28] hover:to-[#ffc32e] text-white font-bold px-12 py-7 h-auto text-xl rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-105 duration-200">
              ⚡ התחל עכשיו - זה בחינם!
            </Button>
          </Link>

          <p className="text-sm text-purple-200 mt-6">
            ללא התחייבות • ללא עלות • תמיכה 24/7
          </p>
        </div>
      </div>
    </section>
  )
}
