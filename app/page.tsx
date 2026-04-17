import dynamic from 'next/dynamic'
import NewHeroSection from '@/components/home/NewHeroSection'
import NewWhyChooseSection from '@/components/home/NewWhyChooseSection'
import NewPackagesSection from '@/components/home/NewPackagesSection'

const SectionLoader = () => <div className="min-h-[200px]" />

const NewHowItWorksSection = dynamic(() => import('@/components/home/NewHowItWorksSection'), { loading: SectionLoader })
const NewContactFormSection = dynamic(() => import('@/components/home/NewContactFormSection'), { loading: SectionLoader })
const NewTestimonialsSection = dynamic(() => import('@/components/home/NewTestimonialsSection'), { loading: SectionLoader })
const NewFinalCTASection = dynamic(() => import('@/components/home/NewFinalCTASection'), { loading: SectionLoader })

export default function RootPage() {
  return (
    <main>
      <NewHeroSection />
      <NewWhyChooseSection />
      <NewPackagesSection />
      <NewHowItWorksSection />
      <NewContactFormSection />
      <NewTestimonialsSection />
      <NewFinalCTASection />
    </main>
  )
}
