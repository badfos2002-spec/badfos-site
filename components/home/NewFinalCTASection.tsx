import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NewFinalCTASection() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 text-white relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-1/4 right-20 w-48 h-48 bg-purple-400/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 left-20 w-64 h-64 bg-pink-400/20 rounded-full blur-3xl"></div>

      <div className="container-rtl relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Heading */}
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            מוכן ליצור את החולצה הבאה שלך?
          </h2>

          {/* Subheading */}
          <p className="text-xl text-purple-100 mb-10 leading-relaxed">
            המערכת אינו לוקח אומרת לקנות והזרוע נמוך לפתור אורי למינימום
          </p>

          {/* CTA Button */}
          <Link href="/designer">
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary via-orange-500 to-primary hover:from-primary/90 hover:via-orange-500/90 hover:to-primary/90 text-white font-bold px-12 py-7 h-auto text-xl rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-105"
            >
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
