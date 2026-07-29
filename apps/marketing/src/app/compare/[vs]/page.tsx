import { notFound } from 'next/navigation';
import { Check, X, ArrowRight, Scale } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { JsonLd } from '@/lib/seo/JsonLdScript';
import { jsonLdFAQ } from '@/lib/seo/jsonld';
import { buildMetadata } from '@/lib/seo/metadata';
import { comparisons, getComparison } from '@/lib/data/compare';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

interface Props { params: Promise<{ vs: string }> }

export async function generateStaticParams() {
  return comparisons.map((c) => ({ vs: c.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { vs } = await params;
  const c = getComparison(vs);
  if (!c) return buildMetadata({ title: 'Comparison not found' });
  return buildMetadata({
    title: c.titleEn,
    description: c.verdict,
    path: `/compare/${vs}`,
    keywords: [`nafaa vs ${c.competitor.toLowerCase()}`, `${c.competitor.toLowerCase()} alternative pakistan`],
  });
}

export default async function ComparePage({ params }: Props) {
  const { vs } = await params;
  const c = getComparison(vs);
  if (!c) notFound();

  const faqSchema = jsonLdFAQ([
    { q: `Is Nafaa better than ${c.competitor} for Pakistani businesses?`, a: c.verdict },
    { q: `Why switch from ${c.competitor} to Nafaa?`, a: c.winner },
  ]);

  return (
    <>
      <JsonLd id={`faq-compare-${vs}`} data={faqSchema} />
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-14">
          <AuroraBackground variant="brand" intensity="base" />
          <NoiseTexture />
          <Container className="relative text-center max-w-4xl mx-auto">
            <Badge variant="brand" size="md">
              <Scale className="h-3.5 w-3.5" /> Honest comparison
            </Badge>
            <h1 className="mt-8 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-balance">
              Nafaa <span className="text-ink-400">vs</span> <GradientText variant="aurora">{c.competitor}</GradientText>
            </h1>
            <div className="mt-8 p-5 rounded-2xl bg-white/70 dark:bg-ink-800/70 backdrop-blur-md ring-1 ring-inset ring-brand-200 dark:ring-brand-800/50 border-l-4 border-brand-500 text-left">
              <div className="text-eyebrow font-mono text-brand-600 dark:text-brand-400 mb-2">The verdict</div>
              <p className="text-ink-700 dark:text-ink-200 leading-relaxed">{c.verdict}</p>
              <p className="mt-3 font-bold text-brand-700 dark:text-brand-400">Our honest take: {c.winner}</p>
            </div>
          </Container>
        </section>

        <Section variant="default" spacing="md">
          <Container size="md">
            <div className="rounded-3xl overflow-hidden bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 shadow-lg">
              <div className="grid grid-cols-3 divide-x divide-ink-100 dark:divide-ink-700/60">
                <div className="p-4 text-xs font-mono uppercase tracking-widest font-bold text-ink-500">Feature</div>
                <div className="p-4 bg-gradient-brand text-white text-xs font-mono uppercase tracking-widest font-bold flex items-center gap-2">
                  Nafaa <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                </div>
                <div className="p-4 text-xs font-mono uppercase tracking-widest font-bold text-ink-500">{c.competitor}</div>
              </div>
              {c.rows.map((r, i) => (
                <div key={i} className="grid grid-cols-3 divide-x divide-ink-100 dark:divide-ink-700/60 border-t border-ink-100 dark:border-ink-700/60">
                  <div className="p-4 font-semibold text-sm text-ink-700 dark:text-ink-200">{r.feature}</div>
                  <div className="p-4 flex items-start gap-2">
                    <Check className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" strokeWidth={3} />
                    <span className="text-sm font-bold text-brand-700 dark:text-brand-400">{r.nafaa}</span>
                  </div>
                  <div className="p-4 flex items-start gap-2 text-ink-500 dark:text-ink-400">
                    <X className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={3} />
                    <span className="text-sm">{r.them}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Button size="xl" href={`${APP_URL}/register`} rightIcon={<ArrowRight className="h-5 w-5" />}>
                Try Nafaa free — no credit card
              </Button>
              <p className="mt-4 text-sm text-ink-500">
                Switching from {c.competitor}? We migrate your data free.{' '}
                <a href="/contact" className="text-brand-600 font-bold hover:underline">Talk to us</a>
              </p>
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
