import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { solutions } from '@/lib/data/solutions';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Solutions — Nafaa for every business type',
  description: 'Small shops, chains, enterprises, online sellers, franchises, and wholesalers — Nafaa has a purpose-built solution for every Pakistani business type.',
  path: '/solutions',
});

export default function SolutionsPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-20">
          <AuroraBackground variant="brand" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative">
            <div className="max-w-3xl">
              <Eyebrow variant="brand" icon={<Compass className="h-3.5 w-3.5" />}>
                Find your fit
              </Eyebrow>
              <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight text-balance">
                <span className="block text-ink-900 dark:text-white">Every business type,</span>
                <GradientText variant="brand">one perfect solution</GradientText>
              </h1>
              <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 leading-relaxed max-w-2xl">
                Whether you run one shop or a nationwide franchise, sell online or wholesale — there is a Nafaa configuration designed exactly for how you work.
              </p>
            </div>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {solutions.map((sol) => (
                <Link
                  key={sol.slug}
                  href={`/solutions/${sol.slug}`}
                  className="group relative rounded-3xl bg-white dark:bg-ink-800 p-7 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `linear-gradient(135deg, ${sol.color}12, ${sol.color}05)` }}
                  />
                  <div className="relative">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                      style={{ background: sol.color + '22' }}
                    >
                      {sol.emoji}
                    </div>
                    <h3 className="font-display font-bold text-lg group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {sol.titleEn}
                    </h3>
                    <p className="mt-2 text-sm text-ink-600 dark:text-ink-300 leading-relaxed line-clamp-3">
                      {sol.descEn}
                    </p>
                    <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-600 opacity-0 group-hover:opacity-100 transition-all">
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
