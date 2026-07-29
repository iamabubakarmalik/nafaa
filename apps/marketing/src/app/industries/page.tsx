import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Badge } from '@/components/primitives/Badge';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { industries } from '@/lib/data/industries';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Industries we serve',
  description: 'Nafaa is purpose-built for eighteen Pakistani industries — kiryana, bakery, restaurant, pharmacy, mobile shop, garments, salon, and more. Each with dedicated workflows.',
  path: '/industries',
});

export default function IndustriesPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-20">
          <AuroraBackground variant="aurora" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative">
            <div className="max-w-3xl">
              <Eyebrow variant="aurora">
                <Sparkles className="h-3 w-3" />
                Eighteen industries, one platform
              </Eyebrow>
              <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight text-balance">
                <span className="block text-ink-900 dark:text-white">Purpose-built for</span>
                <GradientText variant="aurora">Pakistani businesses</GradientText>
              </h1>
              <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 leading-relaxed max-w-2xl">
                Every industry has its quirks. From carpet shops selling by the square foot, to pharmacies managing DRAP compliance, to jewelry shops tracking live gold rates — we built the workflows for each one.
              </p>
            </div>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {industries.map((ind) => (
                <Link
                  key={ind.slug}
                  href={`/industries/${ind.slug}`}
                  className="group relative rounded-3xl bg-white dark:bg-ink-800 p-8 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `linear-gradient(135deg, ${ind.color}12 0%, ${ind.color}05 100%)` }}
                  />
                  <div className="relative">
                    <div
                      className="h-14 w-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg mb-5 group-hover:scale-110 transition-transform"
                      style={{ background: ind.color + '22' }}
                    >
                      {ind.emoji}
                    </div>
                    <h3 className="font-display font-bold text-xl text-ink-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {ind.nameEn}
                    </h3>
                    <p className="mt-2 text-ink-600 dark:text-ink-300 leading-relaxed">
                      {ind.tagEn}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {ind.keyFeatures.slice(0, 3).map((f) => (
                        <Badge key={f} variant="ink" size="xs">{f}</Badge>
                      ))}
                    </div>
                    <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                      Explore <ArrowRight className="h-4 w-4" />
                    </div>
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
