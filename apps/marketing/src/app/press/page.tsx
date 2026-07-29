import { Newspaper, Download, Mail } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Press & media — Nafaa newsroom',
  description: 'Media kit, brand assets, company facts, and press contact for journalists covering Nafaa and Pakistani commerce technology.',
  path: '/press',
});

const facts = [
  { label: 'Founded', value: '2024' },
  { label: 'Headquarters', value: 'Gujranwala, Pakistan' },
  { label: 'Cities served', value: '47' },
  { label: 'Industries', value: '18' },
  { label: 'Integrations', value: '30+' },
  { label: 'Languages', value: 'English, اردو' },
];

export default function PressPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-16">
          <AuroraBackground variant="brand" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="brand" size="md">📰 Newsroom</Badge>
            <h1 className="mt-8 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto">
              <GradientText variant="brand">Nafaa in the press</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              Resources for journalists, researchers, and partners covering Pakistan\'s commerce technology story.
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container>
            <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div className="rounded-3xl bg-gradient-brand text-white p-10 shadow-brand-glow">
                <Download className="h-10 w-10 mb-5" />
                <h2 className="font-display font-extrabold text-2xl">Media kit</h2>
                <p className="mt-3 text-white/90">Logos in every format, brand colors, product screenshots, and founder photos — print-ready.</p>
                <Button className="mt-6 !bg-white !text-brand-700 hover:!bg-white/95" href="mailto:press@nafaa.pk?subject=Media%20Kit%20Request">
                  <Download className="h-4 w-4" /> Request media kit
                </Button>
              </div>
              <div className="rounded-3xl bg-white dark:bg-ink-800 p-10 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
                <Mail className="h-10 w-10 text-brand-600 mb-5" />
                <h2 className="font-display font-extrabold text-2xl">Press contact</h2>
                <p className="mt-3 text-ink-600 dark:text-ink-300">Interviews, quotes, data requests, and exclusive stories.</p>
                <a href="mailto:press@nafaa.pk" className="mt-4 inline-flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold text-lg hover:underline">
                  press@nafaa.pk
                </a>
                <p className="mt-4 text-sm text-ink-500">Response within 24 hours, usually much faster.</p>
              </div>
            </div>

            <div className="mt-10 max-w-5xl mx-auto rounded-3xl bg-white dark:bg-ink-800 p-10 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
              <div className="flex items-center gap-2.5 mb-6">
                <Newspaper className="h-6 w-6 text-brand-600" />
                <h2 className="font-display font-extrabold text-2xl">Company facts</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {facts.map((f) => (
                  <div key={f.label}>
                    <div className="text-xs font-mono uppercase tracking-widest font-bold text-ink-500">{f.label}</div>
                    <div className="mt-1 font-display font-extrabold text-xl">{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
