import Link from 'next/link';
import { ArrowRight, Plug, ShoppingBag, Truck, CreditCard, Landmark, MessageSquare, Calculator } from 'lucide-react';
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
import { integrations, type IntegrationCategory } from '@/lib/data/integrations';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Integrations — connect Nafaa with every tool you use',
  description: 'Nafaa integrates with Foodpanda, Daraz, JazzCash, Easypaisa, Raast, FBR, TCS, Leopards, WhatsApp Business, and more. Thirty-plus live integrations for Pakistani businesses.',
  path: '/integrations',
});

const categoryInfo: Record<IntegrationCategory, { icon: any; labelEn: string; labelUr: string; descEn: string; descUr: string; color: string }> = {
  sales: { icon: ShoppingBag, labelEn: 'Sales channels', labelUr: 'سیلز چینلز', descEn: 'Sell everywhere your customers shop', descUr: 'جہاں بھی گاہک ہوں، وہاں فروخت کریں', color: '#12b76a' },
  courier: { icon: Truck, labelEn: 'Couriers & delivery', labelUr: 'کوریئر و ترسیل', descEn: 'Ship anywhere in Pakistan', descUr: 'پاکستان بھر میں کہیں بھی بھیجیں', color: '#f97316' },
  payment: { icon: CreditCard, labelEn: 'Payments', labelUr: 'ادائیگیاں', descEn: 'Accept every Pakistani payment method', descUr: 'ہر پاکستانی ادائیگی طریقہ قبول کریں', color: '#8b5cf6' },
  government: { icon: Landmark, labelEn: 'Government & tax', labelUr: 'حکومتی و ٹیکس', descEn: 'Stay compliant automatically', descUr: 'خودکار طور پر تعمیل شدہ رہیں', color: '#01411c' },
  accounting: { icon: Calculator, labelEn: 'Accounting', labelUr: 'اکاؤنٹنگ', descEn: 'Sync with your accounting software', descUr: 'اپنے اکاؤنٹنگ سافٹ ویئر سے ہم آہنگ', color: '#0284c7' },
  messaging: { icon: MessageSquare, labelEn: 'Messaging', labelUr: 'پیغام رسانی', descEn: 'Talk to customers where they are', descUr: 'گاہکوں سے بات کریں جہاں وہ ہیں', color: '#25d366' },
};

export default function IntegrationsPage() {
  const categories: IntegrationCategory[] = ['sales', 'payment', 'courier', 'government', 'messaging', 'accounting'];

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-20">
          <AuroraBackground variant="aurora" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative">
            <div className="max-w-3xl">
              <Eyebrow variant="aurora" icon={<Plug className="h-3.5 w-3.5" />}>
                Thirty plus live integrations
              </Eyebrow>
              <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight text-balance">
                <span className="block text-ink-900 dark:text-white">Connect Nafaa with</span>
                <GradientText variant="aurora">everything you already use</GradientText>
              </h1>
              <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 leading-relaxed max-w-2xl">
                From Foodpanda and Daraz to JazzCash, Raast, FBR, and TCS — Nafaa speaks fluently to every tool your Pakistani business depends on. All integrations are live, tested, and supported.
              </p>
            </div>
          </Container>
        </section>

        {categories.map((cat) => {
          const items = integrations.filter((i) => i.category === cat);
          if (items.length === 0) return null;
          const info = categoryInfo[cat];
          const Icon = info.icon;

          return (
            <Section key={cat} variant={cat === 'payment' || cat === 'messaging' ? 'subtle' : 'default'} spacing="md">
              <Container>
                <div className="flex items-center gap-4 mb-8">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${info.color}, ${info.color}dd)` }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-display font-extrabold text-2xl lg:text-3xl">
                      {info.labelEn}
                    </h2>
                    <p className="text-ink-600 dark:text-ink-300 text-sm">
                      {info.descEn}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {items.map((it) => (
                    <Link
                      key={it.slug}
                      href={`/integrations/${it.slug}`}
                      className="group relative rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:ring-brand-400 dark:hover:ring-brand-600 hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300 flex flex-col items-center gap-3"
                    >
                      <div className="text-5xl">{it.logo}</div>
                      <div className="text-sm font-bold text-center">{it.name}</div>
                      {it.status === 'live' && (
                        <Badge variant="live" size="xs" pulse>LIVE</Badge>
                      )}
                      {it.status === 'beta' && <Badge variant="gold" size="xs">BETA</Badge>}
                      {it.status === 'soon' && <Badge variant="ink" size="xs">SOON</Badge>}
                      <ArrowRight className="h-4 w-4 text-ink-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  ))}
                </div>
              </Container>
            </Section>
          );
        })}

        <CTA />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
