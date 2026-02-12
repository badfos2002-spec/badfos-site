import Link from 'next/link'
import { Button } from '@/components/ui/button'
import HeroCarousel from '@/components/home/HeroCarousel'
import BenefitsSection from '@/components/home/BenefitsSection'
import VideoSection from '@/components/home/VideoSection'
import HowItWorks from '@/components/home/HowItWorks'
import LeadForm from '@/components/home/LeadForm'
import FinalCTA from '@/components/home/FinalCTA'

export default function Home() {
  return (
    <div>
      {/* Hero Carousel */}
      <section className="container-rtl py-8">
        <HeroCarousel />
      </section>

      {/* Main Heading + CTA */}
      <section className="section-spacing text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-text-dark mb-6">
          הפוך את הרעיונות שלך לחולצות מדהימות
        </h1>
        <p className="text-xl text-text-gray mb-8 max-w-3xl mx-auto">
          הדפסת חולצות בעיצוב אישי עם טכנולוגיית DTF המתקדמת ביותר.
          איכות גבוהה, משלוח מהיר, מחירים משתלמים.
        </p>
        <Link href="/designer">
          <Button size="lg" className="btn-cta text-xl px-12 py-6 h-auto">
            עצב עכשיו 🎨
          </Button>
        </Link>
      </section>

      {/* Benefits */}
      <BenefitsSection />

      {/* Video Section */}
      <VideoSection />

      {/* How It Works */}
      <HowItWorks />

      {/* Lead Form */}
      <LeadForm />

      {/* Final CTA */}
      <FinalCTA />
    </div>
  )
}
