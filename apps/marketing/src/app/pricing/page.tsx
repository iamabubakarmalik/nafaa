import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/Badge';
import { Container } from '@/components/ui/Container';
import { CTA } from '@/components/home/CTA';
import { PricingClient } from './PricingClient';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Pricing — Plans for Every Business Size',
  description:
    'Simple, transparent pricing for Nafaa POS. Start free, upgrade as you grow. Plans from Rs 1,500/month with 30-day money-back guarantee.',
  path: '/pricing',
});

export default function PricingPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-96 w-[800px] bg-brand-500/20 rounded-full blur-3xl" />
          <Container className="relative text-center">
            <Badge variant="gradient">💰 Pricing</Badge>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-balance">
              <span className="gradient-text">Simple Pricing, Powerful Software</span>
            </h1>
            <p className="mt-5 text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Start free. Pay only when you grow. No hidden fees, ever.
            </p>
          </Container>
        </section>

        <section className="py-12 lg:py-16">
          <PricingClient />
        </section>

        <CTA />
      </main>
      <Footer />
    </>
  );
}
