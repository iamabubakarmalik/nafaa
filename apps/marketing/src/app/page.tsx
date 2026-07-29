import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { Hero } from '@/components/home/Hero/Hero';
import { LiveActivityTicker } from '@/components/home/LiveActivityTicker';
import { TrustBar } from '@/components/features/TrustBar';
import { LiveStats } from '@/components/home/LiveStats';
import { LiveNumbersBar } from '@/components/features/LiveNumbersBar';
import { FeatureShowcase } from '@/components/home/FeatureShowcase';
import { IndustriesGrid } from '@/components/home/IndustriesGrid';
import { PakistanMap } from '@/components/features/PakistanMap';
import { IntegrationsWall } from '@/components/home/IntegrationsWall';
import { LiveBazaarPreview } from '@/components/features/LiveBazaarPreview';
import { MarketplacePreview } from '@/components/home/MarketplacePreview';
import { VideoTestimonialWall } from '@/components/features/VideoTestimonialWall';
import { Testimonials } from '@/components/home/Testimonials';
import { DeepFAQ } from '@/components/home/DeepFAQ';
import { CTA } from '@/components/home/CTA';
import { buildMetadata } from '@/lib/seo/metadata';


export const metadata = buildMetadata({
  description: "The all-in-one platform for Pakistani businesses: modern POS, unified marketplace, thirty-plus integrations, multi-shop, FBR compliance, digital khata, and AI-powered insights.",
});

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <LiveActivityTicker />
        <TrustBar />
        <LiveStats />
        <LiveNumbersBar />
        <FeatureShowcase />
        <IndustriesGrid />
        <PakistanMap />
        <IntegrationsWall />
        <LiveBazaarPreview />
        <MarketplacePreview />
        <VideoTestimonialWall />
        <Testimonials />
        <DeepFAQ />
        <CTA />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
