import { Heart, Target, Users, Award, Sparkles, MapPin, Rocket, ShieldCheck } from 'lucide-react';
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
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'About Nafaa — built in Pakistan, for Pakistan',
  description: 'Nafaa is built by Pakistanis who understand Pakistani business. From a Gujranwala startup to the country\'s most complete business platform.',
  path: '/about',
});

const values = [
  { icon: Heart, title: 'Made with love', desc: 'Built by Pakistanis who have stood behind real shop counters and felt every pain firsthand.', color: '#ec4899' },
  { icon: Target, title: 'Customer first', desc: 'Every feature exists because a real shopkeeper asked for it. Not because a roadmap said so.', color: '#12b76a' },
  { icon: ShieldCheck, title: 'Trust above all', desc: 'Your data is sacred. Bank-grade security, radical transparency, and zero dark patterns.', color: '#0284c7' },
  { icon: Rocket, title: 'Speed as respect', desc: 'Slow software wastes shopkeepers\' time. Every millisecond we save is respect for their work.', color: '#f97316' },
];

const milestones = [
  { year: '2024', title: 'The idea', desc: 'Watching a cousin spend four hours nightly on manual hisaab in a paper register. There had to be a better way.' },
  { year: '2025', title: 'First 100 shops', desc: 'Launched from Gujranwala. Word spread through WhatsApp groups faster than any marketing could.' },
  { year: '2025', title: 'FBR certification', desc: 'Became an approved FBR POS integration partner — compliance made effortless for thousands.' },
  { year: '2026', title: 'Nafaa Bazaar', desc: 'Launched Pakistan\'s first smart marketplace with bargaining, group buys, and live shopping.' },
  { year: '2026', title: 'Today', desc: 'Eighteen industries, thirty-plus integrations, and businesses across 47 cities. Just getting started.' },
];

const stats = [
  { value: '47', label: 'Cities served' },
  { value: '18', label: 'Industries covered' },
  { value: '30+', label: 'Live integrations' },
  { value: '24/7', label: 'Support in Urdu and English' },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-20">
          <AuroraBackground variant="pk" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="pk" size="md">🇵🇰 Made in Pakistan</Badge>
            <h1 className="mt-8 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight text-balance max-w-4xl mx-auto">
              <span className="block text-ink-900 dark:text-white">Technology that speaks</span>
              <GradientText variant="pk">the language of Pakistani business</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto leading-relaxed">
              We are not a foreign tool translated for Pakistan. We are a Pakistani platform, built from day one for khata, udhaar, FBR, JazzCash, and the way business actually works here.
            </p>
          </Container>
        </section>

        {/* Story */}
        <Section variant="default" spacing="lg">
          <Container size="md">
            <Eyebrow variant="brand">Our story</Eyebrow>
            <h2 className="mt-4 font-display font-extrabold text-3xl lg:text-4xl mb-8">
              From a paper register in Gujranwala to a nationwide platform
            </h2>
            <div className="prose-nafaa">
              <p>
                In 2024, our founder watched his cousin spend four hours every night after closing his bakery — hunched over a paper register, reconciling the day\'s sales, trying to remember who owed what, which cakes were still in stock, and whether the day was actually profitable.
              </p>
              <p>
                The existing solutions were either built for American retail chains (expensive, English-only, no JazzCash) or ancient desktop software that required a computer science degree to operate. Neither understood that a Pakistani shopkeeper needs <strong>khata</strong>, needs <strong>WhatsApp</strong>, needs <strong>Urdu</strong>, needs to work when the internet goes down, and needs FBR compliance without an accounting degree.
              </p>
              <p>
                So we built Nafaa — the platform we wished existed. Today it powers businesses across 47 cities, from a one-person kiryana store in Sukkur to restaurant chains in Karachi. And in 2026, we launched Nafaa Bazaar — because selling online should be as natural as selling across the counter.
              </p>
            </div>
          </Container>
        </Section>

        {/* Stats */}
        <Section variant="subtle" spacing="sm">
          <Container>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {stats.map((s) => (
                <div key={s.label} className="text-center rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
                  <div className="font-display font-extrabold text-4xl text-gradient-brand">{s.value}</div>
                  <div className="mt-2 text-sm font-semibold text-ink-600 dark:text-ink-300">{s.label}</div>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        {/* Timeline */}
        <Section variant="default" spacing="lg">
          <Container size="md">
            <Eyebrow variant="aurora">The journey</Eyebrow>
            <h2 className="mt-4 font-display font-extrabold text-3xl lg:text-4xl mb-12">Milestones that matter</h2>
            <div className="relative space-y-8 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-brand-500 before:via-aurora-purple before:to-aurora-pink">
              {milestones.map((m, i) => (
                <div key={i} className="relative pl-14">
                  <div className="absolute left-0 top-0 h-10 w-10 rounded-full bg-gradient-brand text-white flex items-center justify-center font-display font-extrabold text-xs shadow-brand-glow ring-4 ring-white dark:ring-ink-900">
                    {m.year}
                  </div>
                  <h3 className="font-display font-bold text-xl">{m.title}</h3>
                  <p className="mt-1.5 text-ink-600 dark:text-ink-300 leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        {/* Values */}
        <Section variant="subtle" spacing="lg">
          <Container>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <Eyebrow variant="brand">What we believe</Eyebrow>
              <h2 className="mt-4 font-display font-extrabold text-3xl lg:text-5xl">Four values, zero compromises</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {values.map((v) => {
                const Icon = v.icon;
                return (
                  <div key={v.title} className="rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 text-center hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300">
                    <div
                      className="h-12 w-12 mx-auto rounded-xl flex items-center justify-center text-white shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${v.color}, ${v.color}dd)` }}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-display font-bold">{v.title}</h3>
                    <p className="mt-2 text-sm text-ink-600 dark:text-ink-300 leading-relaxed">{v.desc}</p>
                  </div>
                );
              })}
            </div>
          </Container>
        </Section>

        {/* Mission banner */}
        <Section variant="default" spacing="lg">
          <Container>
            <div className="relative rounded-[2rem] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-pk-green via-pk-light to-brand-600" />
              <NoiseTexture opacity={0.05} />
              <div className="relative px-8 py-16 lg:px-20 text-center text-white">
                <Sparkles className="h-10 w-10 mx-auto mb-4 text-pk-gold" />
                <h2 className="font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance">
                  Our mission
                </h2>
                <p className="mt-5 text-lg lg:text-2xl max-w-3xl mx-auto leading-relaxed text-white/95">
                  To give every Pakistani business — from the smallest kiryana to the largest chain — the same technological power that only multinational corporations could afford. At a price every Pakistani can afford.
                </p>
                <div className="mt-8 flex items-center justify-center gap-2 text-white/80 text-sm">
                  <MapPin className="h-4 w-4" />
                  Gujranwala · Lahore · Islamabad · soon, every city
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
