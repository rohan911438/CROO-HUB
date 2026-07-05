import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { WalletConnectRedirect } from '@/components/marketing/wallet-connect-redirect';
import { Hero } from '@/components/marketing/hero';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { WhyCroo } from '@/components/marketing/why-croo';
import { Features } from '@/components/marketing/features';
import { Architecture } from '@/components/marketing/architecture';
import { Testimonials } from '@/components/marketing/testimonials';
import { Pricing } from '@/components/marketing/pricing';
import { DeveloperSection } from '@/components/marketing/developer-section';
import { Integrations } from '@/components/marketing/integrations';
import { Faq } from '@/components/marketing/faq';
import { Newsletter } from '@/components/marketing/newsletter';

export default function HomePage() {
  return (
    <div className="relative">
      <WalletConnectRedirect />
      <SiteHeader />
      <main>
        <Hero />
        <HowItWorks />
        <WhyCroo />
        <Features />
        <Architecture />
        <DeveloperSection />
        <Testimonials />
        <Pricing />
        <Integrations />
        <Faq />
        <Newsletter />
      </main>
      <SiteFooter />
    </div>
  );
}
