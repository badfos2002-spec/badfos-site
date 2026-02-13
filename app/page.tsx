import NewHeroSection from '@/components/home/NewHeroSection'
import NewWhyChooseSection from '@/components/home/NewWhyChooseSection'
import NewPackagesSection from '@/components/home/NewPackagesSection'
import NewHowItWorksSection from '@/components/home/NewHowItWorksSection'
import NewContactFormSection from '@/components/home/NewContactFormSection'
import NewTestimonialsSection from '@/components/home/NewTestimonialsSection'
import NewFinalCTASection from '@/components/home/NewFinalCTASection'
import LeadPopup from '@/components/home/LeadPopup'

export default function Home() {
  return (
    <main>
      <NewHeroSection />
      <NewWhyChooseSection />
      <NewPackagesSection />
      <NewHowItWorksSection />
      <NewContactFormSection />
      <NewTestimonialsSection />
      <NewFinalCTASection />
      <LeadPopup />
    </main>
  )
}
