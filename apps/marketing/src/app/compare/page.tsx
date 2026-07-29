import Link from 'next/link';
import { ArrowRight, Scale } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { comparisons } from '@/lib/data/compare';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Compare Nafaa — honest comparisons with every alternative',
  description: 'Nafaa vs Tally, QuickBooks, Excel, and paper registers. Honest, feature-by-feature comparisons for Pakistani businesses choosing software.',
  path: '/compare',
});

export default function CompareIndexPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-14">
          <AuroraBackground variant="brand" intensity="base" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Eyebrow variant="brand" icon={<Scale className="h-3.5 w-3.5" />}>No marketing fluff</Eyebrow>
            <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight">
              <GradientText variant="brand">Honest comparisons, feature by feature</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              We compare fairly — including where alternatives win. You decide with real data.
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {comparisons.map((c) => (
                <Link key={c.slug} href={`/compare/${c.slug}`}
                  className="group rounded-3xl bg-white dark:bg-ink-800 p-8 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:-translate-y-1 hover:shadow-card-hover transition-all">
                  <div className="font-display font-extrabold text-2xl">
                    Nafaa <span className="text-ink-400">vs</span> <span className="text-gradient-aurora">{c.competitor}</span>
                  </div>
                  <p className="mt-3 text-sm text-ink-600 dark:text-ink-300 leading-relaxed line-clamp-3">{c.verdict}</p>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 opacity-0 group-hover:opacity-100 transition-all">
                    See full comparison <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </Section>

        <CTA />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
