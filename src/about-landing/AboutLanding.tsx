import HowItWorksSection from '@/components/how-it-works-section'
import { FAQAccordionBlock } from '@/components/ui/faq-accordion-block-shadcnui'
import EtherealBeamsHero from '@/components/ui/ethereal-beams-hero'
import './about-landing.css'

export default function AboutLanding() {
  return (
    <div className="aboutLanding min-h-screen bg-black font-sans text-white">
      <EtherealBeamsHero />
      <HowItWorksSection />
      <FAQAccordionBlock />
    </div>
  )
}
