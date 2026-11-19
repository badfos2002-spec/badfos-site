import dynamic from 'next/dynamic'
import SmoothScrollProvider from '@/components/common/SmoothScrollProvider'
import IntroOverlay from '@/components/home/IntroOverlay'
import NewHeroSection from '@/components/home/NewHeroSection'
import NewWhyChooseSection from '@/components/home/NewWhyChooseSection'
import NewPackagesSection from '@/components/home/NewPackagesSection'
import EventLinksSection from '@/components/home/EventLinksSection'
import { getHeroDeal } from '@/lib/deals-server'

// The hero follows the deal marked «בהירו» (TICKET-022 Addendum A) — read on the server, no client flash.
export const revalidate = 60

const SectionLoader = () => <div className="min-h-[200px]" />

const NewDealsSection = dynamic(() => import('@/components/home/NewDealsSection'))
const NewHowItWorksSection = dynamic(() => import('@/components/home/NewHowItWorksSection'), { loading: SectionLoader })
const NewContactFormSection = dynamic(() => import('@/components/home/NewContactFormSection'), { loading: SectionLoader })
const NewTestimonialsSection = dynamic(() => import('@/components/home/NewTestimonialsSection'), { loading: SectionLoader })
const NewFinalCTASection = dynamic(() => import('@/components/home/NewFinalCTASection'), { loading: SectionLoader })

export default async function RootPage() {
  const heroDeal = await getHeroDeal()
  return (
    <div>
      <IntroOverlay />
      <SmoothScrollProvider>
        <NewHeroSection heroDeal={heroDeal} />
        <NewWhyChooseSection />
        <NewPackagesSection />
        <NewDealsSection />
        <NewHowItWorksSection />
        <EventLinksSection />
        <NewContactFormSection />
        <NewTestimonialsSection />
        <NewFinalCTASection />
      </SmoothScrollProvider>
    </div>
  )
}
