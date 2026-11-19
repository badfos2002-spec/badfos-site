import dynamic from 'next/dynamic'
import SmoothScrollProvider from '@/components/common/SmoothScrollProvider'
import IntroOverlay from '@/components/home/IntroOverlay'
import NewHeroSection from '@/components/home/NewHeroSection'
import NewWhyChooseSection from '@/components/home/NewWhyChooseSection'
import NewPackagesSection from '@/components/home/NewPackagesSection'
import EventLinksSection from '@/components/home/EventLinksSection'
import NewDealsSection from '@/components/home/NewDealsSection'
import { getLiveDeals } from '@/lib/deals-server'

// The hero follows the deal marked «בהירו» (TICKET-022 Addendum A) — read on the server, no client flash.
export const revalidate = 60

const SectionLoader = () => <div className="min-h-[200px]" />

const NewHowItWorksSection = dynamic(() => import('@/components/home/NewHowItWorksSection'), { loading: SectionLoader })
const NewContactFormSection = dynamic(() => import('@/components/home/NewContactFormSection'), { loading: SectionLoader })
const NewTestimonialsSection = dynamic(() => import('@/components/home/NewTestimonialsSection'), { loading: SectionLoader })
const NewFinalCTASection = dynamic(() => import('@/components/home/NewFinalCTASection'), { loading: SectionLoader })

export default async function RootPage() {
  // One server read feeds both the hero (Addendum A) and the deals row (max 3).
  const deals = await getLiveDeals()
  const heroDeal = deals.find((d) => d.hero?.enabled) ?? null
  return (
    <div>
      <IntroOverlay />
      <SmoothScrollProvider>
        <NewHeroSection heroDeal={heroDeal} />
        <NewWhyChooseSection />
        <NewPackagesSection />
        <NewDealsSection deals={deals.slice(0, 3)} />
        <NewHowItWorksSection />
        <EventLinksSection />
        <NewContactFormSection />
        <NewTestimonialsSection />
        <NewFinalCTASection />
      </SmoothScrollProvider>
    </div>
  )
}
