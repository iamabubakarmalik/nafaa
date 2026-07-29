import { MessageCircle, Mail, ArrowRight, BookOpen } from 'lucide-react';
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
  title: 'Help center — guides, tutorials & 24/7 support',
  description: 'Get help with Nafaa: setup guides, feature tutorials, troubleshooting, and 24/7 support via WhatsApp and email in English and Urdu.',
  path: '/help',
});

const categories = [
  { emoji: '🚀', title: 'Getting started', articles: ['Create your account and first shop', 'Import products from Excel', 'Make your first sale', 'Set up your receipt branding'] },
  { emoji: '🛒', title: 'POS and sales', articles: ['Barcode scanning setup', 'Split and partial payments', 'Returns and refunds', 'Offline mode explained'] },
  { emoji: '📦', title: 'Inventory', articles: ['Bulk product import', 'Batch and expiry setup', 'Low-stock alerts', 'Stock transfers between shops'] },
  { emoji: '👥', title: 'Customers and khata', articles: ['Add customers with phone numbers', 'Configure WhatsApp reminders', 'Set credit limits', 'Export khata statements'] },
  { emoji: '🏛️', title: 'FBR compliance', articles: ['Register your POS ID', 'Sandbox vs production', 'Configure submission mode', 'Read FBR reports'] },
  { emoji: '🔌', title: 'Integrations', articles: ['Connect Foodpanda', 'Connect Daraz', 'Set up JazzCash', 'Enable Raast payments'] },
  { emoji: '🏢', title: 'Multi-shop', articles: ['Open a new branch', 'Transfer stock between shops', 'Per-shop pricing', 'Manager roles and access'] },
  { emoji: '💳', title: 'Billing and plans', articles: ['Choose the right plan', 'Pay via JazzCash or bank', 'Upgrade or downgrade', '30-day refund process'] },
];

export default function HelpPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-14">
          <AuroraBackground variant="brand" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="brand" size="md" pulse>💬 Help center</Badge>
            <h1 className="mt-8 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto">
              <GradientText variant="brand">How can we help you today?</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              Guides for every feature, or talk to a real human in English or اردو — 24/7.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <a href="https://wa.me/923241772933" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-[#25d366] hover:bg-[#20b358] text-white font-bold text-sm shadow-lg transition">
                <MessageCircle className="h-4 w-4" /> WhatsApp support
              </a>
              <a href="mailto:help@nafaa.pk"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 font-bold text-sm hover:ring-brand-400 transition">
                <Mail className="h-4 w-4" /> help@nafaa.pk
              </a>
            </div>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {categories.map((cat) => (
                <div key={cat.title} className="rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:shadow-card-hover transition-all">
                  <div className="text-3xl mb-3">{cat.emoji}</div>
                  <h3 className="font-display font-bold">{cat.title}</h3>
                  <ul className="mt-4 space-y-2">
                    {cat.articles.map((a) => (
                      <li key={a}>
                        <a href="#" className="group text-sm text-ink-600 dark:text-ink-300 hover:text-brand-600 dark:hover:text-brand-400 inline-flex items-center gap-1.5 transition-colors">
                          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          {a}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
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
