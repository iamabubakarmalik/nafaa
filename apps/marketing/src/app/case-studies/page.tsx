import Link from 'next/link';
import { ArrowRight, Clock, TrendingUp, MapPin, Quote, Store, Calendar } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Badge } from '@/components/primitives/Badge';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { caseStudies } from '@/lib/data/case-studies';
import { getIndustry } from '@/lib/data/industries';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Customer case studies — real Pakistani businesses, real results',
  description: 'Real Nafaa customers: bakeries, pharmacies, mobile shops, boutiques. Real metrics, real growth, real stories from across Pakistan.',
  path: '/case-studies',
});

const GRADIENT_MAP: Record<string, string> = {
  kiryana: 'from-emerald-500 to-emerald-800',
  jewelry: 'from-amber-500 to-yellow-700',
  pharmacy: 'from-emerald-600 to-teal-800',
  restaurant: 'from-red-500 to-orange-700',
  carpet: 'from-amber-700 to-orange-900',
  garments: 'from-pink-500 to-fuchsia-700',
  'mobile-shop': 'from-indigo-500 to-blue-800',
  salon: 'from-pink-500 to-purple-700',
  bakery: 'from-amber-500 to-orange-700',
  gym: 'from-cyan-500 to-blue-800',
};

const EMOJI_MAP: Record<string, string> = {
  kiryana: '🛒',
  jewelry: '💎',
  pharmacy: '💊',
  restaurant: '🍽️',
  carpet: '🧿',
  garments: '👕',
  'mobile-shop': '📱',
  salon: '💇',
  bakery: '🥐',
  gym: '💪',
};

export default function CaseStudiesPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-14">
          <AuroraBackground variant="aurora" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="aurora" size="md" pulse>
              <TrendingUp className="h-3.5 w-3.5" /> Real businesses, real numbers
            </Badge>
            <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto text-balance">
              <GradientText variant="aurora">Stories of Pakistani businesses transformed</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              Not testimonials. Not marketing. Real case studies with real metrics from real shops that switched to Nafaa.
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container>
            <div className="space-y-8">
              {caseStudies.map((cs, i) => {
                const industry = getIndustry(cs.industrySlug);
                const gradient = GRADIENT_MAP[cs.industrySlug] ?? 'from-brand-500 to-brand-700';
                const emoji = EMOJI_MAP[cs.industrySlug] ?? '🏪';
                const topMetrics = cs.afterMetrics.slice(0, 4);

                return (
                  <Link
                    key={cs.industrySlug}
                    href={`/industries/${cs.industrySlug}`}
                    className="group block rounded-3xl overflow-hidden bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:shadow-card-hover transition-all"
                  >
                    <div className="grid lg:grid-cols-[1fr_1.3fr]">
                      <div className={`relative bg-gradient-to-br ${gradient} p-10 flex flex-col justify-between min-h-[300px] overflow-hidden`}>
                        <div className="text-8xl">{emoji}</div>
                        <div className="text-white">
                          <div className="font-display font-extrabold text-2xl">{cs.businessNameEn}</div>
                          <div className="mt-2 flex items-center gap-2 text-sm text-white/80">
                            <MapPin className="h-3.5 w-3.5" /> {cs.city}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-sm text-white/80">
                            <Store className="h-3.5 w-3.5" /> {cs.ownerEn}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-sm text-white/80">
                            <Calendar className="h-3.5 w-3.5" /> Est. {cs.founded} · {cs.shopCount} location{cs.shopCount > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      <div className="p-8 lg:p-10">
                        <Badge variant="brand" size="xs">
                          {industry?.nameEn ?? cs.industrySlug}
                        </Badge>
                        <h2 className="mt-4 font-display font-extrabold text-2xl lg:text-3xl group-hover:text-brand-600 transition-colors">
                          {cs.headline.en}
                        </h2>

                        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {topMetrics.map((m, j) => (
                            <div key={j} className="rounded-xl bg-ink-50 dark:bg-ink-900 p-3 text-center">
                              <div className="font-display font-extrabold text-xl text-gradient-brand">
                                {m.value}
                              </div>
                              <div className="text-[10px] font-bold text-ink-500 mt-0.5">{m.labelEn}</div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-5 flex items-start gap-3">
                          <Quote className="h-6 w-6 text-brand-300 dark:text-brand-700 shrink-0" />
                          <p className="text-ink-700 dark:text-ink-200 italic leading-relaxed">
                            {cs.quote.en}
                          </p>
                        </div>

                        <div className="mt-5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs text-ink-500">
                            <Clock className="h-3.5 w-3.5" /> {cs.yearsWithNafaa} year{cs.yearsWithNafaa > 1 ? 's' : ''} on Nafaa
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 group-hover:gap-2.5 transition-all">
                            Read full story <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
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
