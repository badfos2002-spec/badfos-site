import dynamic from 'next/dynamic'
import NewHeroSection from '@/components/home/NewHeroSection'
import LionRoarSection from '@/components/home/LionRoarSection'

const NewWhyChooseSection = dynamic(() => import('@/components/home/NewWhyChooseSection'))
const NewPackagesSection = dynamic(() => import('@/components/home/NewPackagesSection'))
const NewHowItWorksSection = dynamic(() => import('@/components/home/NewHowItWorksSection'))
const NewContactFormSection = dynamic(() => import('@/components/home/NewContactFormSection'))
const NewTestimonialsSection = dynamic(() => import('@/components/home/NewTestimonialsSection'))
const NewFinalCTASection = dynamic(() => import('@/components/home/NewFinalCTASection'))

export default function RootPage() {
  return (
    <main>
      <NewHeroSection />
      <LionRoarSection />
      <NewWhyChooseSection />
      <NewPackagesSection />
      <NewHowItWorksSection />
      <NewContactFormSection />
      <NewTestimonialsSection />
      <NewFinalCTASection />
    </main>
  )
}
