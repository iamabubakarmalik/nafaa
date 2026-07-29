import { Sparkles, Bug, Zap, Plus } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Badge } from '@/components/primitives/Badge';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Changelog — what\'s new in Nafaa',
  description: 'Every feature, improvement, and fix we ship — documented weekly. See how fast Nafaa evolves for Pakistani businesses.',
  path: '/changelog',
});

const updates = [
  {
    version: 'v3.0.0', date: 'July 15, 2026', title: 'Nafaa Bazaar launches',
    items: [
      { type: 'new', text: 'Nafaa Bazaar — Pakistan\'s first smart marketplace with bargaining, group buys, live shopping, and auctions' },
      { type: 'new', text: 'One-tap inventory publish from POS to Bazaar' },
      { type: 'new', text: 'Escrow payment protection for all marketplace orders' },
      { type: 'improvement', text: 'Checkout speed improved by 40% on 3G networks' },
    ],
  },
  {
    version: 'v2.8.0', date: 'June 22, 2026', title: 'AI Assistant bilingual voice',
    items: [
      { type: 'new', text: 'Voice input for AI Assistant in Urdu and English' },
      { type: 'new', text: 'Proactive weekly business insights delivered to dashboard' },
      { type: 'improvement', text: 'FBR submission success rate now 99.97%' },
      { type: 'fix', text: 'Fixed multi-shop transfer confirmation edge case' },
    ],
  },
  {
    version: 'v2.7.0', date: 'May 30, 2026', title: 'Jewelry and dairy industries',
    items: [
      { type: 'new', text: 'Jewelry industry: live gold rates, karat calculator, hallmark tracking' },
      { type: 'new', text: 'Dairy industry: farmer supply, fat/SNF testing, route billing' },
      { type: 'new', text: 'Qurbani booking module for meat shops' },
      { type: 'improvement', text: 'Offline sync now 3x faster on large catalogs' },
    ],
  },
  {
    version: 'v2.6.0', date: 'April 18, 2026', title: 'Raast payments live',
    items: [
      { type: 'new', text: 'Raast (State Bank) integration — zero-fee instant payments' },
      { type: 'new', text: 'Raast QR generation per sale' },
      { type: 'improvement', text: 'JazzCash settlement reconciliation automated' },
      { type: 'fix', text: 'Resolved WhatsApp receipt PDF rendering on older Android' },
    ],
  },
];

const typeCfg = {
  new: { icon: Plus, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400', label: 'NEW' },
  improvement: { icon: Zap, cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400', label: 'IMPROVED' },
  fix: { icon: Bug, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400', label: 'FIXED' },
};

export default function ChangelogPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-14">
          <AuroraBackground variant="brand" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Eyebrow variant="brand" icon={<Sparkles className="h-3.5 w-3.5" />}>Ship fast, ship often</Eyebrow>
            <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight">
              <GradientText variant="brand">What\'s new in Nafaa</GradientText>
            </h1>
            <p className="mt-6 text-lg text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              Every release, documented. We ship improvements for Pakistani businesses every single week.
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="md">
          <Container size="md">
            <div className="space-y-10">
              {updates.map((u) => (
                <div key={u.version}>
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant="brand" size="md">{u.version}</Badge>
                    <span className="text-sm text-ink-500">{u.date}</span>
                  </div>
                  <div className="rounded-3xl bg-white dark:bg-ink-800 p-8 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
                    <h2 className="font-display font-extrabold text-xl mb-5">{u.title}</h2>
                    <ul className="space-y-3">
                      {u.items.map((it, i) => {
                        const cfg = typeCfg[it.type as keyof typeof typeCfg];
                        const Icon = cfg.icon;
                        return (
                          <li key={i} className="flex items-start gap-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${cfg.cls}`}>
                              <Icon className="h-3 w-3" />{cfg.label}
                            </span>
                            <span className="text-sm text-ink-700 dark:text-ink-200 leading-relaxed">{it.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
