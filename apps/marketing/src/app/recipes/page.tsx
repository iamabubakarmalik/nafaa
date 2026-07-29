import Link from 'next/link';
import { Clock, ArrowRight, Zap, Sparkles } from 'lucide-react';
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
import { recipes } from '@/lib/data/recipes';
import { integrations } from '@/lib/data/integrations';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Integration recipes — pre-built combos for every business',
  description: 'Curated integration combinations: Bakery Starter Pack, Restaurant Delivery Machine, E-commerce Full Stack, and more. One-click activate all.',
  path: '/recipes',
});

const diffColors = {
  beginner: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  advanced: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
};

export default function RecipesPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-14">
          <AuroraBackground variant="aurora" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="aurora" size="md" pulse><Sparkles className="h-3.5 w-3.5" /> Curated combos</Badge>
            <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto text-balance">
              <GradientText variant="aurora">Integration recipes — pre-built, one-click</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              Don't build from scratch. Pick a recipe that matches your business, and every integration activates together in minutes.
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((r) => {
                const recipeInts = integrations.filter((i) => r.integrations.includes(i.slug));
                return (
                  <Link key={r.slug} href={`/integrations/${r.integrations[0]}`}
                    className="group rounded-3xl bg-white dark:bg-ink-800 p-7 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:-translate-y-1 hover:shadow-card-hover transition-all overflow-hidden relative">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(135deg, ${r.color}10, ${r.color}05)` }} />
                    <div className="relative">
                      <div className="flex items-start justify-between mb-4">
                        <div className="text-5xl">{r.emoji}</div>
                        <Badge size="xs" className={diffColors[r.difficulty]}>{r.difficulty}</Badge>
                      </div>
                      <h2 className="font-display font-bold text-xl group-hover:text-brand-600 transition-colors">{r.titleEn}</h2>
                      <p className="mt-2 text-sm text-ink-600 dark:text-ink-300 leading-relaxed line-clamp-3">{r.descEn}</p>

                      <div className="mt-4 flex items-center gap-2 text-xs text-ink-500">
                        <Clock className="h-3.5 w-3.5" /> {r.setupTime} · {r.steps.length} steps
                      </div>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {recipeInts.map((it) => (
                          <span key={it.slug} className="text-lg" title={it.name}>{it.logo}</span>
                        ))}
                      </div>

                      <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 opacity-0 group-hover:opacity-100 transition-all">
                        View recipe <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
