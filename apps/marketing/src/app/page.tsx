import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/home/Hero';
import { Stats } from '@/components/home/Stats';
import { Features } from '@/components/home/Features';
import { Industries } from '@/components/home/Industries';
import { Testimonials } from '@/components/home/Testimonials';
import { FAQ } from '@/components/home/FAQ';
import { CTA } from '@/components/home/CTA';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: "Pakistan's #1 POS & Inventory Software for Shops",
  description:
    "Run your shop smarter with Nafaa — Pakistan's all-in-one POS, inventory, and accounting software. 7-day free trial, no credit card required. Trusted by 5,000+ businesses.",
});

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Stats />
        <Features />
        <Industries />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
