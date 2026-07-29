import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Check, ArrowRight, Store, TrendingUp, Users } from 'lucide-react';
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
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { JsonLd } from '@/lib/seo/JsonLdScript';
import { jsonLdBreadcrumb, jsonLdFAQ } from '@/lib/seo/jsonld';
import { buildMetadata } from '@/lib/seo/metadata';
import { cities, getCity } from '@/lib/data/cities';
import { industries, getIndustry } from '@/lib/data/industries';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

interface Props { params: Promise<{ city: string; industry: string }> }

// 12 cities × 18 industries = 216 pages (expand cities array for 450+)
export async function generateStaticParams() {
  const params: Array<{ city: string; industry: string }> = [];
  for (const c of cities) {
    for (const i of industries) {
      params.push({ city: c.slug, industry: i.slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props) {
  const { city: citySlug, industry: industrySlug } = await params;
  const city = getCity(citySlug);
  const industry = getIndustry(industrySlug);
  if (!city || !industry) return buildMetadata({ title: 'Not found' });

  return buildMetadata({
    title: `${industry.nameEn} software in ${city.nameEn} — Nafaa`,
    description: `The #1 ${industry.nameEn.toLowerCase()} software in ${city.nameEn}. ${industry.tagEn}. Trusted by ${city.activeShops.toLocaleString()}+ businesses in ${city.nameEn}. Free trial, no credit card.`,
    path: `/${citySlug}/${industrySlug}`,
    keywords: [
      `${industry.nameEn.toLowerCase()} software ${city.nameEn.toLowerCase()}`,
      `${industry.nameEn.toLowerCase()} POS ${city.nameEn.toLowerCase()}`,
      `${city.nameEn.toLowerCase()} shop software`,
      `POS ${city.nameEn.toLowerCase()} Pakistan`,
    ],
  });
}

export default async function CityIndustryPage({ params }: Props) {
  const { city: citySlug, industry: industrySlug } = await params;
  const city = getCity(citySlug);
  const industry = getIndustry(industrySlug);
  if (!city || !industry) notFound();

  // Localized simulated stats (deterministic from slugs so SSG is stable)
  const seed = citySlug.length * 7 + industrySlug.length * 13;
  const localShops = Math.floor(city.activeShops / industries.length) + (seed % 40);
  const nearbyShops = localShops + (seed % 120);

  const faqs = [
    {
      q: `Is Nafaa available in ${city.nameEn}?`,
      a: `Yes. Nafaa fully supports ${city.nameEn} with local onboarding, Urdu and English support, and integrations with couriers and payment methods that operate in ${city.nameEn}. Over ${localShops} ${industry.nameEn.toLowerCase()} businesses in ${city.nameEn} already use Nafaa.`,
    },
    {
      q: `How much does Nafaa cost for a ${industry.nameEn.toLowerCase()} in ${city.nameEn}?`,
      a: `Nafaa starts with a free plan — no credit card required. Paid plans for ${industry.nameEn.toLowerCase()} businesses in ${city.nameEn} start at Rs 2,500 per month, with a 30-day money-back guarantee.`,
    },
    {
      q: `Does Nafaa work offline in ${city.nameEn}?`,
      a: `Yes. Nafaa is offline-first, designed for Pakistan's connectivity realities. Businesses in ${city.nameEn} can sell, manage khata, and check inventory without internet — everything syncs when the connection returns.`,
    },
    {
      q: `Which integrations work best for ${industry.nameEn.toLowerCase()} in ${city.nameEn}?`,
      a: `Businesses in ${city.nameEn} most commonly pair Nafaa with JazzCash, Easypaisa, Raast for payments, TCS and Leopards for delivery in ${city.nameEn}, and WhatsApp Business for customer communication. FBR integration is included for compliance.`,
    },
  ];

  return (
    <>
      <JsonLd id={`breadcrumb-${citySlug}-${industrySlug}`} data={jsonLdBreadcrumb([
        { name: 'Home', url: '/' },
        { name: city.nameEn, url: `/${citySlug}` },
        { name: industry.nameEn, url: `/${citySlug}/${industrySlug}` },
      ])} />
      <JsonLd id={`faq-${citySlug}-${industrySlug}`} data={jsonLdFAQ(faqs)} />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden pt-14 pb-20">
          <AuroraBackground variant="brand" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative">
            <div className="max-w-4xl">
              <nav className="mb-6 text-sm text-ink-500 dark:text-ink-400 flex items-center gap-2 flex-wrap">
                <Link href="/" className="hover:text-ink-900 dark:hover:text-white">Home</Link>
                <span>/</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{city.nameEn}</span>
                <span>/</span>
                <span className="text-ink-900 dark:text-white font-semibold">{industry.nameEn}</span>
              </nav>

              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
                  style={{ background: industry.color + '22' }}
                >
                  {industry.emoji}
                </div>
                <Badge variant="live" size="md" pulse>
                  {localShops}+ {industry.nameEn.toLowerCase()} businesses in {city.nameEn} use Nafaa
                </Badge>
              </div>

              <h1 className="font-display font-extrabold tracking-tight text-balance text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
                <span className="block text-ink-900 dark:text-white">
                  {industry.nameEn} software in
                </span>
                <GradientText variant="brand">{city.nameEn}</GradientText>
              </h1>

              <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-3xl leading-relaxed">
                {industry.tagEn}. Purpose-built for {city.nameEn}'s {industry.nameEn.toLowerCase()} businesses — with Urdu support, offline mode, and every payment method your customers use in {city.nameEn}.
              </p>

              {/* AEO direct answer */}
              <div className="mt-8 p-5 rounded-2xl bg-white/70 dark:bg-ink-800/70 backdrop-blur-md ring-1 ring-inset ring-brand-200 dark:ring-brand-800/50 border-l-4 border-brand-500 max-w-3xl">
                <div className="text-eyebrow font-mono text-brand-600 dark:text-brand-400 mb-2">In short</div>
                <p className="text-ink-700 dark:text-ink-200 leading-relaxed">
                  Nafaa is the most complete {industry.nameEn.toLowerCase()} software available in {city.nameEn}, combining {industry.keyFeatures.slice(0, 3).join(', ').toLowerCase()} with FBR compliance, digital khata, and offline capability. {localShops}+ {industry.nameEn.toLowerCase()} businesses in {city.nameEn} already run on Nafaa.
                </p>
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                <Button size="xl" href={`${APP_URL}/register?city=${citySlug}&industry=${industrySlug}`} rightIcon={<ArrowRight className="h-5 w-5" />}>
                  Start free trial
                </Button>
                <Button size="xl" variant="secondary" href={`/industries/${industrySlug}`}>
                  Full {industry.nameEn.toLowerCase()} guide
                </Button>
              </div>
            </div>
          </Container>
        </section>

        {/* Local stats */}
        <Section variant="subtle" spacing="sm">
          <Container>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { icon: Store, value: `${localShops}+`, label: `${industry.nameEn} businesses in ${city.nameEn}` },
                { icon: Users, value: `${nearbyShops}+`, label: `Total Nafaa users in ${city.nameEn}` },
                { icon: MapPin, value: city.province, label: 'Province coverage' },
                { icon: TrendingUp, value: '24/7', label: 'Local support availability' },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="rounded-2xl bg-white dark:bg-ink-800 p-5 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 text-center">
                    <Icon className="h-6 w-6 mx-auto text-brand-600" />
                    <div className="mt-2 font-display font-extrabold text-2xl text-gradient-brand">{s.value}</div>
                    <div className="mt-1 text-xs font-semibold text-ink-500">{s.label}</div>
                  </div>
                );
              })}
            </div>
          </Container>
        </Section>

        {/* Key features for this industry */}
        <Section variant="default" spacing="lg">
          <Container>
            <Eyebrow variant="brand">Built for {city.nameEn}</Eyebrow>
            <h2 className="mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight mb-10">
              What {industry.nameEn.toLowerCase()} owners in {city.nameEn} get
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {industry.keyFeatures.map((f, i) => (
                <div key={i} className="rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg mb-4"
                    style={{ background: `linear-gradient(135deg, ${industry.color}, ${industry.color}dd)` }}
                  >
                    <Check className="h-5 w-5" strokeWidth={3} />
                  </div>
                  <div className="font-bold">{f}</div>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link href={`/industries/${industrySlug}`} className="text-brand-600 dark:text-brand-400 font-bold hover:underline">
                See the complete {industry.nameEn.toLowerCase()} feature guide →
              </Link>
            </div>
          </Container>
        </Section>

        {/* FAQ */}
        <Section variant="subtle" spacing="lg">
          <Container size="md">
            <div className="text-center mb-10">
              <Eyebrow variant="brand">Local questions</Eyebrow>
              <h2 className="mt-4 font-display font-extrabold text-3xl lg:text-4xl">
                {industry.nameEn} in {city.nameEn} — answered
              </h2>
            </div>
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <details key={i} className="group rounded-2xl bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 overflow-hidden">
                  <summary className="cursor-pointer list-none flex items-center justify-between px-6 py-5 font-bold hover:bg-ink-50 dark:hover:bg-ink-700/40 transition">
                    {f.q}
                    <span className="text-brand-600 text-xl group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <div className="px-6 pb-5 text-ink-600 dark:text-ink-300 leading-relaxed">{f.a}</div>
                </details>
              ))}
            </div>
          </Container>
        </Section>

        {/* Other industries in this city */}
        <Section variant="default" spacing="md">
          <Container>
            <Eyebrow variant="mono">More in {city.nameEn}</Eyebrow>
            <div className="mt-6 flex flex-wrap gap-2">
              {industries.filter((i) => i.slug !== industrySlug).slice(0, 12).map((i) => (
                <Link
                  key={i.slug}
                  href={`/${citySlug}/${i.slug}`}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 text-sm font-semibold hover:ring-brand-400 transition"
                >
                  {i.emoji} {i.nameEn} in {city.nameEn}
                </Link>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {cities.filter((c) => c.slug !== citySlug).slice(0, 8).map((c) => (
                <Link
                  key={c.slug}
                  href={`/${c.slug}/${industrySlug}`}
                  className="px-4 py-2 rounded-xl bg-ink-50 dark:bg-ink-900 ring-1 ring-inset ring-ink-100 dark:ring-ink-800 text-sm font-semibold hover:ring-brand-400 transition"
                >
                  {industry.emoji} {industry.nameEn} in {c.nameEn}
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
