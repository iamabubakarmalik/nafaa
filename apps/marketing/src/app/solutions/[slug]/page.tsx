import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
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
import { jsonLdProduct, jsonLdBreadcrumb } from '@/lib/seo/jsonld';
import { buildMetadata } from '@/lib/seo/metadata';
import { solutions, getSolution } from '@/lib/data/solutions';
import { features } from '@/lib/data/features';
import { integrations } from '@/lib/data/integrations';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return solutions.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const sol = getSolution(slug);
  if (!sol) return buildMetadata({ title: 'Solution not found' });
  return buildMetadata({
    title: `${sol.titleEn} — Nafaa`,
    description: sol.descEn,
    path: `/solutions/${slug}`,
  });
}

export default async function SolutionPage({ params }: Props) {
  const { slug } = await params;
  const sol = getSolution(slug);
  if (!sol) notFound();

  const recFeatures = features.filter((f) => sol.recommendedFeatures.includes(f.slug));
  const recIntegrations = integrations.filter((i) => sol.recommendedIntegrations.includes(i.slug));

  return (
    <>
      <JsonLd id={`product-sol-${slug}`} data={jsonLdProduct({ name: `Nafaa for ${sol.titleEn}`, description: sol.directAnswerEn, slug: `/solutions/${slug}` })} />
      <JsonLd id={`breadcrumb-sol-${slug}`} data={jsonLdBreadcrumb([
        { name: 'Home', url: '/' },
        { name: 'Solutions', url: '/solutions' },
        { name: sol.titleEn, url: `/solutions/${slug}` },
      ])} />
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-20">
          <AuroraBackground variant="brand" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative">
            <div className="max-w-4xl">
              <nav className="mb-6 text-sm text-ink-500 dark:text-ink-400 flex items-center gap-2">
                <Link href="/" className="hover:text-ink-900 dark:hover:text-white">Home</Link>
                <span>/</span>
                <Link href="/solutions" className="hover:text-ink-900 dark:hover:text-white">Solutions</Link>
                <span>/</span>
                <span className="text-ink-900 dark:text-white font-semibold">{sol.titleEn}</span>
              </nav>
              <div className="flex items-center gap-4 mb-6">
                <div
                  className="h-16 w-16 rounded-2xl flex items-center justify-center text-4xl shadow-xl"
                  style={{ background: sol.color + '22' }}
                >
                  {sol.emoji}
                </div>
                <Badge variant="brand" size="md" pulse>{sol.titleEn}</Badge>
              </div>
              <h1 className="font-display font-extrabold tracking-tight text-balance text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05]">
                <GradientText variant="brand">{sol.headlineEn}</GradientText>
              </h1>
              <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-3xl leading-relaxed">
                {sol.descEn}
              </p>
              <div className="mt-8 p-5 rounded-2xl bg-white/70 dark:bg-ink-800/70 backdrop-blur-md ring-1 ring-inset ring-brand-200 dark:ring-brand-800/50 border-l-4 border-brand-500 max-w-3xl">
                <div className="text-eyebrow font-mono text-brand-600 dark:text-brand-400 mb-2">In short</div>
                <p className="text-ink-700 dark:text-ink-200 leading-relaxed">{sol.directAnswerEn}</p>
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button size="xl" href={`${APP_URL}/register`} rightIcon={<ArrowRight className="h-5 w-5" />}>
                  Start free trial
                </Button>
                <Button size="xl" variant="secondary" href="/contact">Talk to our team</Button>
              </div>
            </div>
          </Container>
        </section>

        <Section variant="subtle" spacing="lg">
          <Container>
            <Eyebrow variant="brand">Why it works</Eyebrow>
            <h2 className="mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight mb-12">
              Built for how you actually operate
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {sol.benefits.map((b, i) => (
                <div key={i} className="rounded-2xl bg-white dark:bg-ink-800 p-7 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center text-white shadow-lg mb-4"
                    style={{ background: `linear-gradient(135deg, ${sol.color}, ${sol.color}dd)` }}
                  >
                    <Check className="h-5 w-5" strokeWidth={3} />
                  </div>
                  <h3 className="font-display font-bold text-lg mb-2">{b.titleEn}</h3>
                  <p className="text-sm text-ink-600 dark:text-ink-300 leading-relaxed">{b.descEn}</p>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        <Section variant="default" spacing="lg">
          <Container>
            <div className="grid lg:grid-cols-2 gap-12">
              <div>
                <Eyebrow variant="aurora">Recommended stack</Eyebrow>
                <h3 className="mt-4 font-display font-extrabold text-2xl lg:text-3xl mb-6">Features for you</h3>
                <div className="grid grid-cols-2 gap-3">
                  {recFeatures.map((f) => (
                    <Link key={f.slug} href={`/product/${f.slug}`} className="group rounded-xl bg-white dark:bg-ink-800 p-4 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:ring-brand-400 transition-all">
                      <div className="font-bold text-sm group-hover:text-brand-600 transition-colors">{f.nameEn}</div>
                      <div className="text-xs text-ink-500 mt-1 line-clamp-2">{f.taglineEn}</div>
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <Eyebrow variant="gold">Perfect partners</Eyebrow>
                <h3 className="mt-4 font-display font-extrabold text-2xl lg:text-3xl mb-6">Integrations</h3>
                <div className="grid grid-cols-2 gap-3">
                  {recIntegrations.map((it) => (
                    <Link key={it.slug} href={`/integrations/${it.slug}`} className="group flex items-center gap-3 rounded-xl bg-white dark:bg-ink-800 p-4 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:ring-brand-400 transition-all">
                      <span className="text-2xl">{it.logo}</span>
                      <span className="font-bold text-sm group-hover:text-brand-600 transition-colors">{it.name}</span>
                    </Link>
                  ))}
                </div>
                <div className="mt-8">
                  <Eyebrow variant="mono">Ideal for</Eyebrow>
                  <ul className="mt-4 space-y-2">
                    {sol.idealFor.map((i) => (
                      <li key={i.en} className="flex items-center gap-2.5 text-ink-700 dark:text-ink-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                        {i.en}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
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
