'use client';

import { useState } from 'react';
import { Search, BookMarked, ArrowRight } from 'lucide-react';
import Link from 'next/link';
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
import { glossaryTerms, glossaryLetters } from '@/lib/data/glossary';
import { cn } from '@/lib/cn';

export default function GlossaryPage() {
  const [query, setQuery] = useState('');
  const [letter, setLetter] = useState<string | null>(null);

  const filtered = glossaryTerms.filter((t) => {
    const q = query.toLowerCase();
    const matchQ = !q || t.term.toLowerCase().includes(q) || t.termUr.includes(query) || t.definitionEn.toLowerCase().includes(q);
    const matchL = !letter || t.letter === letter;
    return matchQ && matchL;
  });

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-14">
          <AuroraBackground variant="brand" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Eyebrow variant="brand" icon={<BookMarked className="h-3.5 w-3.5" />}>
              Business dictionary
            </Eyebrow>
            <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight">
              <GradientText variant="brand">Every business term, explained simply</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              From khata to KOT, NTN to Raast — Pakistan\'s most complete business glossary in English and اردو.
            </p>

            <div className="mt-8 max-w-xl mx-auto relative">
              <Search className="h-5 w-5 text-ink-400 absolute left-5 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search terms — khata, FBR, IMEI, escrow..."
                className="h-14 w-full rounded-2xl bg-white dark:bg-ink-800 pl-14 pr-5 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 focus:ring-2 focus:ring-brand-500 outline-none shadow-lg transition"
              />
            </div>

            {/* Letter filter */}
            <div className="mt-6 flex flex-wrap justify-center gap-1.5">
              <button
                onClick={() => setLetter(null)}
                className={cn('px-3 h-9 rounded-lg text-sm font-bold transition',
                  !letter ? 'bg-ink-900 dark:bg-white text-white dark:text-ink-900' : 'bg-white dark:bg-ink-800 ring-1 ring-ink-200 dark:ring-ink-700')}
              >
                All
              </button>
              {glossaryLetters.map((l) => (
                <button
                  key={l}
                  onClick={() => setLetter(letter === l ? null : l)}
                  className={cn('px-3 h-9 rounded-lg text-sm font-bold transition',
                    letter === l ? 'bg-ink-900 dark:bg-white text-white dark:text-ink-900' : 'bg-white dark:bg-ink-800 ring-1 ring-ink-200 dark:ring-ink-700')}
                >
                  {l}
                </button>
              ))}
            </div>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container>
            <div className="grid md:grid-cols-2 gap-5">
              {filtered.map((t) => (
                <div key={t.slug} className="rounded-2xl bg-white dark:bg-ink-800 p-7 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:shadow-card-hover transition-all duration-300">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display font-extrabold text-xl">{t.term}</h3>
                      <div className="font-urdu text-lg text-ink-500 dark:text-ink-400 mt-0.5">{t.termUr}</div>
                    </div>
                    <Badge variant="ink" size="xs">{t.category}</Badge>
                  </div>
                  <p className="mt-4 text-ink-600 dark:text-ink-300 leading-relaxed">{t.definitionEn}</p>
                  {t.example && (
                    <div className="mt-4 rounded-xl bg-ink-50 dark:bg-ink-900 p-3.5 text-sm text-ink-600 dark:text-ink-300">
                      <span className="font-bold text-ink-900 dark:text-white">Example: </span>{t.example}
                    </div>
                  )}
                  {t.relatedFeature && (
                    <Link href={t.relatedFeature} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline">
                      See it in Nafaa <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-20 text-ink-500">
                No terms found. Try a different search.
              </div>
            )}
          </Container>
        </Section>

        <CTA />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
