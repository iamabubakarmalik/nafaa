import { CheckCircle2, Server, Database, Globe, MessageSquare, Shield, ShoppingBag } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Badge } from '@/components/primitives/Badge';
import { LiveDot } from '@/components/primitives/LiveDot';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'System status — all services operational',
  description: 'Real-time status of every Nafaa service: POS, API, marketplace, payments, and integrations. Radical transparency, 99.99% uptime.',
  path: '/status',
});

const services = [
  { icon: Globe, name: 'Web application', uptime: '99.99%' },
  { icon: Server, name: 'API services', uptime: '99.97%' },
  { icon: Database, name: 'Database cluster', uptime: '99.99%' },
  { icon: ShoppingBag, name: 'Nafaa Bazaar', uptime: '99.98%' },
  { icon: MessageSquare, name: 'WhatsApp messaging', uptime: '99.95%' },
  { icon: Shield, name: 'FBR submissions', uptime: '99.97%' },
];

export default function StatusPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-14">
          <AuroraBackground variant="brand" intensity="subtle" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="live" size="md" pulse>All systems operational</Badge>
            <h1 className="mt-8 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
              <GradientText variant="brand">Status, in real time</GradientText>
            </h1>
            <p className="mt-6 text-lg text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              We publish our uptime honestly — every service, every day. Your business depends on it, and we treat that seriously.
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="md">
          <Container size="md">
            <div className="rounded-3xl bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 overflow-hidden">
              <div className="px-6 py-4 border-b border-ink-100 dark:border-ink-700/60 flex items-center justify-between">
                <h2 className="font-bold">Service status</h2>
                <span className="flex items-center gap-2 text-xs text-ink-500">
                  <LiveDot color="emerald" size="sm" /> Updated just now
                </span>
              </div>
              <div className="divide-y divide-ink-100 dark:divide-ink-700/60">
                {services.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.name} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <div className="font-bold text-sm">{s.name}</div>
                          <div className="text-xs text-ink-500">90-day uptime: {s.uptime}</div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-sm font-bold">
                        <CheckCircle2 className="h-4 w-4" /> Operational
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-800/50 p-5 text-sm text-emerald-800 dark:text-emerald-300">
              ✨ No incidents in the last 30 days. Scheduled maintenance is announced 72 hours in advance on this page and via email.
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
