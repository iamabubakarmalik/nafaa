import { Lock, Shield, Database, Eye, Server, FileCheck, Mail } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Badge } from '@/components/primitives/Badge';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Security — bank-grade protection for your business data',
  description: 'How Nafaa protects Pakistani businesses: 256-bit encryption, ISO 27001 infrastructure, daily backups, audit logs, and responsible disclosure.',
  path: '/security',
});

const items = [
  { icon: Lock, title: '256-bit encryption everywhere', desc: 'Data encrypted in transit (TLS 1.3) and at rest (AES-256). Even if intercepted, it is unreadable.' },
  { icon: Database, title: 'Daily automated backups', desc: 'Point-in-time recovery across redundant regions. Export your complete data anytime — it is yours.' },
  { icon: Shield, title: 'Hardened authentication', desc: 'Bcrypt password hashing, optional 2FA, session management, and brute-force protection on every account.' },
  { icon: Server, title: 'ISO 27001 infrastructure', desc: 'Enterprise-grade cloud with redundancy, DDoS protection, and 99.99% uptime SLA.' },
  { icon: Eye, title: 'Complete audit logs', desc: 'Every action recorded with user, timestamp, and IP. Know exactly who did what, when, from where.' },
  { icon: FileCheck, title: 'PCI DSS compliant payments', desc: 'Card data never touches our servers — handled by certified payment processors only.' },
];

export default function SecurityPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-14">
          <AuroraBackground variant="brand" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="brand" size="md">🔒 Security first</Badge>
            <h1 className="mt-8 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto">
              <GradientText variant="brand">Your data, fortified like a bank</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              Your sales, your khata, your customers — protected with the same standards banks use.
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((it) => {
                const Icon = it.icon;
                return (
                  <div key={it.title} className="rounded-2xl bg-white dark:bg-ink-800 p-7 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:-translate-y-1 hover:shadow-card-hover transition-all">
                    <div className="h-12 w-12 rounded-xl bg-gradient-brand flex items-center justify-center text-white shadow-lg">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-display font-bold text-lg">{it.title}</h3>
                    <p className="mt-2 text-sm text-ink-600 dark:text-ink-300 leading-relaxed">{it.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 rounded-3xl bg-ink-950 text-white p-10 lg:p-12">
              <h2 className="font-display font-extrabold text-2xl lg:text-3xl">Found a vulnerability?</h2>
              <p className="mt-4 text-ink-300 leading-relaxed max-w-2xl">
                We appreciate responsible disclosure and reward valid reports. Email details to{' '}
                <a href="mailto:security@nafaa.pk" className="text-brand-400 font-bold hover:underline">security@nafaa.pk</a>{' '}
                — we respond within 24 hours.
              </p>
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
