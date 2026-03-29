import dynamic from 'next/dynamic'
import NewHeroSection from '@/components/home/NewHeroSection'
import LionRoarSection from '@/components/home/LionRoarSection'

const SectionLoader = () => <div className="min-h-[200px]" />

const NewWhyChooseSection = dynamic(() => import('@/components/home/NewWhyChooseSection'), { loading: SectionLoader })
const NewPackagesSection = dynamic(() => import('@/components/home/NewPackagesSection'), { loading: SectionLoader })
const NewHowItWorksSection = dynamic(() => import('@/components/home/NewHowItWorksSection'), { loading: SectionLoader })
const NewContactFormSection = dynamic(() => import('@/components/home/NewContactFormSection'), { loading: SectionLoader })
const NewTestimonialsSection = dynamic(() => import('@/components/home/NewTestimonialsSection'), { loading: SectionLoader })
const NewFinalCTASection = dynamic(() => import('@/components/home/NewFinalCTASection'), { loading: SectionLoader })

export default function Home() {
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
