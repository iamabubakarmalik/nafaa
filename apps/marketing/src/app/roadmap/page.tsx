'use client';

import { useState } from 'react';
import { ChevronUp, CheckCircle2, Zap, Sparkles, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';
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
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

const items = {
  shipped: [
    { title: 'Nafaa Bazaar launch', desc: 'Marketplace with bargaining, group buys, live shopping', date: 'July 2026' },
    { title: 'AI Assistant bilingual voice', desc: 'Voice input in Urdu and English', date: 'June 2026' },
    { title: 'Raast payments integration', desc: 'Zero-fee instant payments', date: 'April 2026' },
    { title: 'Jewelry industry module', desc: 'Live gold rates, karat calculator, hallmarks', date: 'May 2026' },
  ],
  building: [
    { title: 'Franchise mode for chains', desc: 'Royalty tracking and brand controls', votes: 342, date: 'Q3 2026' },
    { title: 'Kitchen Display System (KDS)', desc: 'Dedicated KDS app for restaurant kitchens', votes: 289, date: 'Q3 2026' },
    { title: 'Multi-currency for exports', desc: 'USD, EUR, GBP support for exporters', votes: 156, date: 'Q4 2026' },
  ],
  planned: [
    { title: 'Auto customer segmentation', desc: 'AI-powered customer groups for marketing', votes: 421 },
    { title: 'Voice-to-invoice', desc: 'Speak the invoice, Nafaa creates it', votes: 378 },
    { title: 'Loyalty tier automation', desc: 'Dynamic tiers based on customer behavior', votes: 267 },
    { title: 'Suppliers marketplace', desc: 'Order supplies directly through Nafaa', votes: 512 },
    { title: 'Business credit scoring', desc: 'Your Nafaa data unlocks working capital loans', votes: 634 },
    { title: 'Advanced BI dashboards', desc: 'Custom dashboards with drag-and-drop widgets', votes: 198 },
  ],
};

export default function RoadmapPage() {
  const [votes, setVotes] = useState<Record<string, number>>({});

  const vote = (title: string) => {
    if (votes[title]) return;
    setVotes({ ...votes, [title]: 1 });
    toast.success('Vote recorded — thank you!');
  };

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-14">
          <AuroraBackground variant="brand" intensity="base" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="brand" size="md" pulse>🗺️ Public roadmap</Badge>
            <h1 className="mt-8 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto text-balance">
              <GradientText variant="brand">You vote. We build. Every quarter.</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              Nafaa is built by its community. Upvote features you want, we ship the top-voted every quarter.
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container size="md" className="space-y-10">
            {/* Shipped */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <Eyebrow variant="brand">Shipped</Eyebrow>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {items.shipped.map((i) => (
                  <div key={i.title} className="rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-800/50 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display font-bold">{i.title}</h3>
                        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{i.desc}</p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    </div>
                    <div className="mt-3 text-xs text-emerald-700 dark:text-emerald-400 font-mono font-bold">{i.date}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Building */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                <Zap className="h-5 w-5 text-amber-600" />
                <Eyebrow variant="gold">Building now</Eyebrow>
              </div>
              <div className="space-y-3">
                {items.building.map((i) => (
                  <div key={i.title} className="rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-inset ring-amber-200 dark:ring-amber-800/50 p-5 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold">{i.title}</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold">{i.date}</span>
                      </div>
                      <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{i.desc}</p>
                    </div>
                    <div className="text-center shrink-0">
                      <div className="font-display font-extrabold text-2xl text-amber-700 dark:text-amber-400 tabular-nums">{i.votes}</div>
                      <div className="text-[10px] text-amber-700/70 dark:text-amber-400/70">votes</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Planned */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="h-5 w-5 text-aurora-purple" />
                <Eyebrow variant="aurora">Planned — vote for what matters</Eyebrow>
              </div>
              <div className="space-y-3">
                {items.planned.sort((a, b) => (b.votes + (votes[b.title] || 0)) - (a.votes + (votes[a.title] || 0))).map((i) => (
                  <div key={i.title} className="rounded-2xl bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 p-5 flex items-center gap-4 hover:ring-brand-400 transition">
                    <button
                      onClick={() => vote(i.title)}
                      disabled={!!votes[i.title]}
                      className={cn(
                        'flex flex-col items-center justify-center h-16 w-14 rounded-xl transition',
                        votes[i.title]
                          ? 'bg-gradient-brand text-white shadow-brand-glow'
                          : 'bg-ink-100 dark:bg-ink-900 hover:bg-brand-100 dark:hover:bg-brand-950/40',
                      )}
                    >
                      <ChevronUp className="h-5 w-5" strokeWidth={3} />
                      <span className="text-xs font-extrabold tabular-nums">{i.votes + (votes[i.title] || 0)}</span>
                    </button>
                    <div className="flex-1">
                      <h3 className="font-display font-bold">{i.title}</h3>
                      <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{i.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggest */}
            <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-emerald-800 p-8 text-white text-center shadow-brand-glow">
              <Rocket className="h-10 w-10 mx-auto mb-3" />
              <h3 className="font-display font-extrabold text-2xl">Missing something?</h3>
              <p className="mt-2 text-white/90">Every great feature started as a suggestion from a Pakistani business owner.</p>
              <a href="mailto:roadmap@nafaa.pk?subject=Feature%20Suggestion" className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-white text-brand-700 font-bold hover:scale-105 transition">
                Suggest a feature
              </a>
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
