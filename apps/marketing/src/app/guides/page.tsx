import Link from 'next/link';
import { ArrowRight, Map } from 'lucide-react';
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
import { blogPosts } from '@/lib/data/blog';
import { industries } from '@/lib/data/industries';
import { features } from '@/lib/data/features';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Guides — step-by-step playbooks for Pakistani businesses',
  description: 'Complete guides: start a business in Pakistan, FBR compliance, digital khata, online selling, and industry-specific playbooks.',
  path: '/guides',
});

export default function GuidesPage() {
  const guides = blogPosts.filter((p) => ['business-guides', 'compliance', 'tutorials'].includes(p.category));

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-14">
          <AuroraBackground variant="brand" intensity="base" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Eyebrow variant="brand" icon={<Map className="h-3.5 w-3.5" />}>Playbooks</Eyebrow>
            <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight">
              <GradientText variant="brand">Step-by-step guides that actually work</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              No theory. Practical playbooks written from real Pakistani business experience.
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container>
            <div className="grid md:grid-cols-2 gap-6">
              {guides.map((g) => (
                <Link key={g.slug} href={`/blog/${g.slug}`}
                  className="group rounded-3xl bg-white dark:bg-ink-800 p-8 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:-translate-y-1 hover:shadow-card-hover transition-all">
                  <div className="text-3xl mb-4">{g.categoryEmoji}</div>
                  <h2 className="font-display font-extrabold text-xl leading-tight group-hover:text-brand-600 transition-colors">{g.title}</h2>
                  <p className="mt-3 text-sm text-ink-600 dark:text-ink-300 leading-relaxed line-clamp-2">{g.excerpt}</p>
                  <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600">
                    Read guide <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-16 grid lg:grid-cols-2 gap-10">
              <div>
                <h2 className="font-display font-extrabold text-2xl mb-5">Industry playbooks</h2>
                <div className="grid grid-cols-2 gap-2.5">
                  {industries.slice(0, 10).map((i) => (
                    <Link key={i.slug} href={`/industries/${i.slug}`}
                      className="flex items-center gap-2.5 rounded-xl bg-white dark:bg-ink-800 p-3.5 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:ring-brand-400 transition text-sm font-semibold">
                      <span>{i.emoji}</span> {i.nameEn}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="font-display font-extrabold text-2xl mb-5">Feature walkthroughs</h2>
                <div className="grid grid-cols-2 gap-2.5">
                  {features.slice(0, 10).map((f) => (
                    <Link key={f.slug} href={`/product/${f.slug}`}
                      className="flex items-center gap-2.5 rounded-xl bg-white dark:bg-ink-800 p-3.5 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:ring-brand-400 transition text-sm font-semibold">
                      <span className="h-2 w-2 rounded-full" style={{ background: f.color }} /> {f.nameEn}
                    </Link>
                  ))}
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
