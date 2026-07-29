'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, ArrowRight, ShieldCheck, Sparkles, Calculator } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { DeepFAQ } from '@/components/home/DeepFAQ';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { useLocale } from '@/components/providers/LocaleProvider';
import { plans } from '@/lib/data/plans';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import { cn } from '@/lib/cn';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

export default function PricingPage() {
  const { locale } = useLocale();
  const [yearly, setYearly] = useState(true);
  const isUr = locale === 'ur';

  const fmt = (n: number) => n.toLocaleString('en-PK');

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden pt-16 pb-16">
          <AuroraBackground variant="brand" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Eyebrow variant="brand" icon={<Calculator className="h-3.5 w-3.5" />}>
              {isUr ? 'سادہ شفاف قیمتیں' : 'Simple transparent pricing'}
            </Eyebrow>
            <h1 className={cn(
              'mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight text-balance max-w-4xl mx-auto',
              isUr && 'font-urdu leading-[1.5]',
            )}>
              <span className="block text-ink-900 dark:text-white">{isUr ? 'اپنے کاروبار کے لیے' : 'Pay for what you need,'}</span>
              <GradientText variant="brand" as="span" className="block">{isUr ? 'موزوں پلان چنیں' : 'grow when you\'re ready'}</GradientText>
            </h1>
            <p className={cn('mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto', isUr && 'font-urdu text-xl leading-loose')}>
              {isUr
                ? 'مفت شروع کریں۔ ترقی پر اپ گریڈ کریں۔ کسی بھی وقت منسوخ کریں۔ کوئی چھپی فیس نہیں، کبھی نہیں۔'
                : 'Start free. Upgrade when you grow. Cancel anytime. No hidden fees, ever.'}
            </p>

            {/* AEO box */}
            <div className="mt-8 p-5 rounded-2xl bg-white/70 dark:bg-ink-800/70 backdrop-blur-md ring-1 ring-inset ring-brand-200 dark:ring-brand-800/50 border-l-4 border-brand-500 max-w-2xl mx-auto text-left">
              <div className="text-eyebrow font-mono text-brand-600 dark:text-brand-400 mb-2">{isUr ? 'مختصر جواب' : 'In short'}</div>
              <p className={cn('text-ink-700 dark:text-ink-200 leading-relaxed', isUr && 'font-urdu text-lg leading-loose')}>
                {isUr
                  ? 'نفع کی قیمتیں مفت اسٹارٹر پلان سے شروع ہوتی ہیں۔ پرو پلان ۵۵۰۰ روپے ماہانہ ہے جس میں ایف بی آر، اے آئی معاون، بازار اور تین برانچز شامل ہیں۔ سالانہ ادائیگی پر ۲۰٪ بچت اور تیس دن کی رقم واپسی کی ضمانت۔'
                  : 'Nafaa pricing starts with a free Starter plan. The Pro plan costs Rs 5,500 per month and includes FBR integration, AI Assistant, Bazaar selling, and three branches. Yearly billing saves twenty percent, and every paid plan carries a thirty-day money-back guarantee.'}
              </p>
            </div>

            {/* Billing toggle */}
            <div className="mt-10 inline-flex items-center gap-3 p-1.5 rounded-2xl bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-200 dark:ring-ink-700">
              <button
                onClick={() => setYearly(false)}
                className={cn(
                  'px-5 py-2.5 rounded-xl text-sm font-bold transition-all',
                  !yearly ? 'bg-ink-900 dark:bg-white text-white dark:text-ink-900 shadow' : 'text-ink-600 dark:text-ink-300',
                )}
              >
                {isUr ? 'ماہانہ' : 'Monthly'}
              </button>
              <button
                onClick={() => setYearly(true)}
                className={cn(
                  'px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2',
                  yearly ? 'bg-gradient-brand text-white shadow-brand-glow' : 'text-ink-600 dark:text-ink-300',
                )}
              >
                {isUr ? 'سالانہ' : 'Yearly'}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/25 font-mono font-bold">-20%</span>
              </button>
            </div>
          </Container>
        </section>

        {/* Plans */}
        <Section variant="default" spacing="md">
          <Container>
            <motion.div
              initial="hidden" whileInView="visible" viewport={viewport}
              variants={staggerContainer(0.06)}
              className="grid md:grid-cols-2 xl:grid-cols-4 gap-6"
            >
              {plans.map((plan, i) => {
                const price = plan.monthly === 0 ? 0 : yearly ? Math.round(plan.yearly / 12) : plan.monthly;
                return (
                  <motion.div
                    key={plan.slug}
                    variants={fadeUp}
                    className={cn(
                      'relative rounded-3xl bg-white dark:bg-ink-800 p-7 flex flex-col',
                      'ring-2 ring-inset transition-all duration-300 hover:-translate-y-1',
                      plan.popular
                        ? 'ring-brand-500 shadow-brand-glow lg:scale-[1.03]'
                        : 'ring-ink-100 dark:ring-ink-700/60 hover:shadow-card-hover',
                    )}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <Badge variant="pk" size="sm">
                          <Sparkles className="h-3 w-3" />
                          {isUr ? 'سب سے مقبول' : 'Most popular'}
                        </Badge>
                      </div>
                    )}

                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-display font-extrabold text-lg shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}dd)` }}
                    >
                      {plan.nameEn[0]}
                    </div>
                    <h3 className={cn('mt-5 font-display font-extrabold text-2xl', isUr && 'font-urdu')}>
                      {isUr ? plan.nameUr : plan.nameEn}
                    </h3>
                    <p className={cn('mt-1 text-sm text-ink-500 dark:text-ink-400', isUr && 'font-urdu text-base')}>
                      {isUr ? plan.taglineUr : plan.taglineEn}
                    </p>

                    <div className="mt-6">
                      {price === 0 ? (
                        <div className="font-display font-extrabold text-4xl text-gradient-brand">
                          {isUr ? 'مفت' : 'Free'}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-ink-500">Rs</span>
                            <span className="font-display font-extrabold text-4xl tabular-nums">{fmt(price)}</span>
                          </div>
                          <div className={cn('text-sm text-ink-500 mt-1', isUr && 'font-urdu')}>
                            {isUr ? 'فی مہینہ' : 'per month'}
                            {yearly && plan.monthly > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-1.5">
                                {isUr ? '(سالانہ بلنگ)' : '(billed yearly)'}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <Button
                      className="mt-6 w-full"
                      variant={plan.popular ? 'primary' : 'secondary'}
                      href={`${APP_URL}/register?plan=${plan.slug}`}
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                    >
                      {plan.monthly === 0 ? (isUr ? 'مفت شروع کریں' : 'Start free') : (isUr ? 'شروع کریں' : 'Get started')}
                    </Button>

                    {/* Limits */}
                    <div className="mt-6 grid grid-cols-2 gap-2 text-center">
                      {[
                        { label: isUr ? 'دکانیں' : 'Shops', value: plan.limits.shops },
                        { label: isUr ? 'صارفین' : 'Users', value: plan.limits.users },
                        { label: isUr ? 'پروڈکٹس' : 'Products', value: plan.limits.products },
                        { label: isUr ? 'سیلز/ماہ' : 'Sales/mo', value: plan.limits.salesPerMonth },
                      ].map((l) => (
                        <div key={l.label} className="rounded-lg bg-ink-50 dark:bg-ink-900 p-2">
                          <div className="text-[10px] text-ink-500 uppercase font-bold">{l.label}</div>
                          <div className="font-bold text-sm mt-0.5 tabular-nums">{l.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Features */}
                    <ul className="mt-6 space-y-2.5 flex-1">
                      {plan.features.map((f) => (
                        <li key={f.en} className="flex items-start gap-2.5 text-sm">
                          {f.included ? (
                            <Check className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" strokeWidth={3} />
                          ) : (
                            <X className="h-4 w-4 text-ink-300 dark:text-ink-600 shrink-0 mt-0.5" strokeWidth={3} />
                          )}
                          <span className={cn(
                            f.included ? 'text-ink-700 dark:text-ink-200' : 'text-ink-400 line-through',
                            isUr && 'font-urdu text-base',
                          )}>
                            {isUr ? f.ur : f.en}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Guarantee */}
            <div className="mt-14 text-center">
              <div className={cn(
                'inline-flex items-center gap-2.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-5 py-2.5',
                'ring-1 ring-inset ring-emerald-200 dark:ring-emerald-800/50 text-sm font-bold text-emerald-700 dark:text-emerald-300',
                isUr && 'font-urdu text-base',
              )}>
                <ShieldCheck className="h-4 w-4" />
                {isUr
                  ? 'تیس دن کی رقم واپسی کی ضمانت — بغیر کسی سوال کے'
                  : '30-day money-back guarantee — no questions asked'}
              </div>
              <p className={cn('mt-4 text-sm text-ink-500', isUr && 'font-urdu text-base')}>
                {isUr ? 'کسٹم پلان چاہیے؟' : 'Need a custom plan?'}{' '}
                <a href="/contact" className="text-brand-600 font-bold hover:underline">
                  {isUr ? 'سیلز ٹیم سے بات کریں' : 'Talk to our sales team'}
                </a>
              </p>
            </div>
          </Container>
        </Section>

        <DeepFAQ />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
