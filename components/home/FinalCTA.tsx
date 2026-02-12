import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function FinalCTA() {
  return (
    <section className="section-spacing bg-gradient-to-r from-primary to-secondary">
      <div className="container-rtl">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            מוכנים להפוך את הרעיון לחולצה?
          </h2>
          <p className="text-lg md:text-xl mb-8 opacity-90">
            התחילו לעצב עכשיו ותקבלו את המוצר המושלם תוך ימים ספורים
          </p>
          <Link href="/designer">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 text-xl px-12 py-6 h-auto rounded-cta"
            >
              עצב עכשיו
              <ArrowLeft className="mr-2 h-6 w-6" />
            </Button>
          </Link>
          <p className="mt-4 text-sm opacity-75">
            ללא התחייבות • תשלום רק לאחר אישור העיצוב
          </p>
        </div>
      </div>
    </section>
  )
}
