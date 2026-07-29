import { Code2, Key, Zap, Book, Terminal, ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'API documentation — build with Nafaa',
  description: 'REST API and webhooks for Nafaa. Build custom integrations, automate workflows, and extend Pakistan\'s business platform.',
  path: '/api-docs',
});

const code = `curl -X POST https://api.nafaa.pk/v1/sales \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "shopId": "shop_8f2k1",
    "items": [
      { "productId": "prod_4x91", "quantity": 2, "price": 250 }
    ],
    "paymentMethod": "JAZZCASH",
    "customerId": "cust_77dm"
  }'`;

const pillars = [
  { icon: Key, title: 'Bearer auth', desc: 'Scoped API keys with per-permission control' },
  { icon: Zap, title: 'REST + webhooks', desc: 'JSON over HTTPS, real-time event push' },
  { icon: Terminal, title: 'Sandbox environment', desc: 'Full test mode with seed data' },
];

export default function ApiDocsPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-14">
          <AuroraBackground variant="aurora" intensity="base" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="aurora" size="md">🔌 Developer platform</Badge>
            <h1 className="mt-8 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto">
              <GradientText variant="aurora">Build on top of Nafaa</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              REST API, webhooks, and sandbox — extend Pakistan\'s business platform with your own integrations.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Button size="lg" variant="aurora" href="mailto:api@nafaa.pk?subject=API%20Access%20Request" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Request API access
              </Button>
              <Button size="lg" variant="secondary" href="/contact">Talk to developer relations</Button>
            </div>
          </Container>
        </section>

        <Section variant="default" spacing="md">
          <Container>
            <div className="grid md:grid-cols-3 gap-5 mb-10">
              {pillars.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.title} className="rounded-2xl bg-white dark:bg-ink-800 p-6 text-center ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
                    <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-aurora flex items-center justify-center text-white shadow-lg">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-display font-bold">{p.title}</h3>
                    <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{p.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl overflow-hidden bg-ink-950 shadow-2xl ring-1 ring-inset ring-ink-800 max-w-3xl mx-auto">
              <div className="flex items-center gap-2 px-5 py-3 bg-ink-900 border-b border-ink-800">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/70" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/70" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
                </div>
                <span className="ml-3 text-xs font-mono text-ink-400">Example: create a sale</span>
              </div>
              <pre className="p-6 overflow-x-auto text-sm leading-relaxed">
                <code className="text-ink-100 font-mono whitespace-pre">{code}</code>
              </pre>
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
