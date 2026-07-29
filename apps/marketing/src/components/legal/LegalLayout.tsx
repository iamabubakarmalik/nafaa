import type { ReactNode } from 'react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { Container } from '@/components/primitives/Container';
import { Badge } from '@/components/primitives/Badge';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';

interface Props {
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalLayout({ title, subtitle, lastUpdated, children }: Props) {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-10">
          <AuroraBackground variant="brand" intensity="subtle" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="ink" size="md">⚖️ Legal</Badge>
            <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight">
              <GradientText variant="brand">{title}</GradientText>
            </h1>
            <p className="mt-4 text-lg text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">{subtitle}</p>
            <p className="mt-3 text-sm text-ink-400">Last updated: {lastUpdated}</p>
          </Container>
        </section>
        <section className="pb-20">
          <Container size="md">
            <div className="rounded-3xl bg-white dark:bg-ink-800 p-8 lg:p-12 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 prose-nafaa">
              {children}
            </div>
          </Container>
        </section>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
