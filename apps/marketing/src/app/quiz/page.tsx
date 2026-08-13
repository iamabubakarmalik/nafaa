'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, ArrowLeft, Check, Zap, RotateCcw, TrendingUp, Package, Plug } from 'lucide-react';
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
import { industries } from '@/lib/data/industries';
import { integrations } from '@/lib/data/integrations';
import { useLocale } from '@/components/providers/LocaleProvider';
import { trackEvent } from '@/lib/analytics/events';
import { cn } from '@/lib/cn';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

interface Question {
  id: string;
  qEn: string; qUr: string;
  options: Array<{ labelEn: string; labelUr: string; emoji: string; tags: string[] }>;
}

const questions: Question[] = [
  {
    id: 'type',
    qEn: 'What kind of business are you running?',
    qUr: 'آپ کس قسم کا کاروبار چلا رہے ہیں؟',
    options: [
      { labelEn: 'Retail shop / store', labelUr: 'ریٹیل دکان', emoji: '🏪', tags: ['kiryana', 'garments', 'mobile-shop', 'hardware', 'bookstore'] },
      { labelEn: 'Food & beverage', labelUr: 'کھانا اور مشروبات', emoji: '🍽️', tags: ['restaurant', 'bakery', 'hotel'] },
      { labelEn: 'Health & beauty', labelUr: 'صحت اور خوبصورتی', emoji: '💊', tags: ['pharmacy', 'salon', 'gym', 'clinic'] },
      { labelEn: 'Specialty trade', labelUr: 'خصوصی کاروبار', emoji: '💎', tags: ['jewelry', 'carpet', 'auto-parts', 'meat-shop', 'dairy'] },
    ],
  },
  {
    id: 'size',
    qEn: 'How big is your operation?',
    qUr: 'آپ کا کاروبار کتنا بڑا ہے؟',
    options: [
      { labelEn: 'Just me, one shop', labelUr: 'صرف میں، ایک دکان', emoji: '👤', tags: ['starter'] },
      { labelEn: '2-5 staff, one location', labelUr: '۲-۵ اسٹاف، ایک جگہ', emoji: '👥', tags: ['growth'] },
      { labelEn: 'Multiple branches', labelUr: 'متعدد برانچز', emoji: '🏢', tags: ['pro', 'multi-shop'] },
      { labelEn: 'Large chain / enterprise', labelUr: 'بڑی چین', emoji: '🏛️', tags: ['enterprise'] },
    ],
  },
  {
    id: 'pain',
    qEn: 'What hurts the most right now?',
    qUr: 'ابھی سب سے زیادہ کیا مسئلہ ہے؟',
    options: [
      { labelEn: 'Tracking udhaar / khata', labelUr: 'ادھار / کھاتہ', emoji: '📒', tags: ['khata'] },
      { labelEn: 'Inventory & stock management', labelUr: 'انوینٹری', emoji: '📦', tags: ['inventory'] },
      { labelEn: 'FBR / tax compliance', labelUr: 'ایف بی آر تعمیل', emoji: '🏛️', tags: ['fbr'] },
      { labelEn: 'Selling online', labelUr: 'آن لائن فروخت', emoji: '🌐', tags: ['marketplace'] },
    ],
  },
  {
    id: 'sales',
    qEn: 'Roughly, what are your daily sales?',
    qUr: 'تقریباً آپ کی روزانہ سیلز کتنی ہیں؟',
    options: [
      { labelEn: 'Under Rs 10,000', labelUr: '۱۰ ہزار سے کم', emoji: '💵', tags: ['starter'] },
      { labelEn: 'Rs 10K - 50K', labelUr: '۱۰-۵۰ ہزار', emoji: '💰', tags: ['growth'] },
      { labelEn: 'Rs 50K - 200K', labelUr: '۵۰-۲۰۰ ہزار', emoji: '🤑', tags: ['pro'] },
      { labelEn: 'Above Rs 200K', labelUr: '۲ لاکھ سے زائد', emoji: '🏦', tags: ['enterprise'] },
    ],
  },
];

export default function QuizPage() {
  const { locale } = useLocale();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<null | { industries: string[]; plan: string; features: string[]; integrations: string[]; roi: number }>(null);
  const isUr = locale === 'ur';

  const select = (tags: string[]) => {
    const next = [...answers, ...tags];
    setAnswers(next);
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      compute(next);
    }
  };

  const compute = (all: string[]) => {
    // Score industries
    const indScore: Record<string, number> = {};
    all.forEach((t) => {
      const matched = industries.filter((i) => i.slug === t || i.keyFeatures.some((k) => k.toLowerCase().includes(t)));
      matched.forEach((i) => { indScore[i.slug] = (indScore[i.slug] || 0) + 1; });
    });
    // If industry type selected, boost
    const typeAnswer = questions[0].options.find((o) => o.tags.some((t) => all.includes(t)));
    typeAnswer?.tags.forEach((t) => {
      const ind = industries.find((i) => i.slug === t);
      if (ind) indScore[ind.slug] = (indScore[ind.slug] || 0) + 3;
    });

    const topIndustries = Object.entries(indScore).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);

    // Plan
    const plan = all.includes('enterprise') ? 'Enterprise' : all.includes('pro') ? 'Pro' : all.includes('growth') ? 'Growth' : 'Starter';

    // Features
    const featureSet = new Set<string>(['pos', 'khata', 'inventory']);
    if (all.includes('fbr')) featureSet.add('fbr');
    if (all.includes('multi-shop')) featureSet.add('multi-shop');
    if (all.includes('marketplace')) { featureSet.add('marketplace-selling'); }
    featureSet.add('analytics');

    // Integrations
    const intSet = new Set<string>(['jazzcash', 'easypaisa', 'whatsapp-business']);
    if (all.includes('fbr')) intSet.add('fbr');
    if (topIndustries.some((s) => ['restaurant', 'bakery'].includes(s))) intSet.add('foodpanda');
    if (all.includes('marketplace')) intSet.add('daraz');

    // ROI estimate
    const salesAnswer = questions[3].options.find((o) => o.tags.some((t) => all.includes(t)));
    const dailyMap: Record<string, number> = { starter: 7000, growth: 28000, pro: 110000, enterprise: 300000 };
    const daily = salesAnswer ? salesAnswer.tags.reduce((s, t) => s + (dailyMap[t] || 0), 0) / salesAnswer.tags.length : 20000;
    const roi = Math.round((daily * 365 * 0.08) + (daily * 0.5 * 12 * 0.35) + 80000);

    trackEvent('quiz_complete', {
        recommended_plan: plan,
        industries_count: topIndustries.length,
        top_industry: topIndustries[0] || 'none',
        estimated_roi: roi,
        integrations_count: intSet.size,
      });
      setResult({ industries: topIndustries, plan, features: [...featureSet], integrations: [...intSet], roi });
  };

  const restart = () => { setStep(0); setAnswers([]); setResult(null); };

  const progress = ((step + 1) / questions.length) * 100;

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-10">
          <AuroraBackground variant="brand" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="aurora" size="md" pulse>
              <Sparkles className="h-3.5 w-3.5" /> 30-second personalized recommendation
            </Badge>
            <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto text-balance">
              <GradientText variant="aurora">Find your perfect Nafaa setup</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              Answer four quick questions. Get your recommended industries, plan, features, integrations, and estimated yearly savings.
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container size="md">
            <AnimatePresence mode="wait">
              {!result ? (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Progress */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono uppercase tracking-widest font-bold text-ink-500">
                        Question {step + 1} of {questions.length}
                      </span>
                      <span className="text-xs font-bold text-brand-600 tabular-nums">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-brand rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  </div>

                  {/* Question */}
                  <h2 className="font-display font-extrabold text-2xl lg:text-3xl text-center mb-10">
                    {isUr ? questions[step].qUr : questions[step].qEn}
                  </h2>

                  {/* Options */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {questions[step].options.map((opt, i) => (
                      <motion.button
                        key={i}
                        onClick={() => select(opt.tags)}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="group relative rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:ring-brand-400 hover:shadow-card-hover transition-all text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-950 dark:to-emerald-950 flex items-center justify-center text-3xl">
                            {opt.emoji}
                          </div>
                          <div className="flex-1">
                            <div className={cn('font-display font-bold text-lg', isUr && 'font-urdu text-xl')}>
                              {isUr ? opt.labelUr : opt.labelEn}
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-ink-300 group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {step > 0 && (
                    <button onClick={() => { setStep(step - 1); setAnswers(answers.slice(0, -questions[step].options[0].tags.length)); }}
                      className="mt-6 mx-auto flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600 transition">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Result */}
                  <div className="text-center mb-10">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                      className="inline-flex h-20 w-20 rounded-full bg-gradient-brand items-center justify-center shadow-brand-glow mb-6"
                    >
                      <Check className="h-10 w-10 text-white" strokeWidth={3} />
                    </motion.div>
                    <h2 className="font-display font-extrabold text-3xl lg:text-4xl">Your personalized Nafaa setup</h2>
                    <p className="mt-3 text-ink-600 dark:text-ink-300">Based on your answers, here's what we recommend.</p>
                  </div>

                  {/* ROI banner */}
                  <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-800 p-8 text-white shadow-brand-glow mb-8 text-center">
                    <div className="text-eyebrow font-mono text-white/70">Estimated yearly savings</div>
                    <div className="font-display font-extrabold text-5xl lg:text-6xl tabular-nums mt-2">
                      Rs {result.roi.toLocaleString()}
                    </div>
                    <div className="mt-3 text-white/80 text-sm">Conservative estimate — most businesses save more.</div>
                  </div>

                  {/* Recommended plan */}
                  <div className="rounded-3xl bg-white dark:bg-ink-800 p-7 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="h-5 w-5 text-brand-600" />
                      <Eyebrow variant="brand">Recommended plan</Eyebrow>
                    </div>
                    <div className="font-display font-extrabold text-3xl">{result.plan}</div>
                    <p className="mt-2 text-ink-600 dark:text-ink-300">
                      {result.plan === 'Starter' && 'Free forever — perfect for getting started.'}
                      {result.plan === 'Growth' && 'Rs 2,500/month — for shops ready to scale.'}
                      {result.plan === 'Pro' && 'Rs 5,500/month — the complete business OS.'}
                      {result.plan === 'Enterprise' && 'Custom — unlimited everything with dedicated support.'}
                    </p>
                  </div>

                  {/* Industries */}
                  {result.industries.length > 0 && (
                    <div className="rounded-3xl bg-white dark:bg-ink-800 p-7 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="h-5 w-5 text-aurora-purple" />
                        <Eyebrow variant="aurora">Best-fit industries</Eyebrow>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3">
                        {result.industries.map((slug) => {
                          const ind = industries.find((i) => i.slug === slug);
                          if (!ind) return null;
                          return (
                            <a key={slug} href={`/industries/${slug}`}
                              className="group rounded-xl bg-ink-50 dark:bg-ink-900 p-4 hover:ring-2 hover:ring-brand-400 transition">
                              <div className="text-3xl mb-2">{ind.emoji}</div>
                              <div className="font-bold text-sm group-hover:text-brand-600 transition">{ind.nameEn}</div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Features + Integrations */}
                  <div className="grid sm:grid-cols-2 gap-4 mb-8">
                    <div className="rounded-3xl bg-white dark:bg-ink-800 p-7 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
                      <div className="flex items-center gap-2 mb-4">
                        <Package className="h-5 w-5 text-emerald-600" />
                        <Eyebrow variant="brand">Features you need</Eyebrow>
                      </div>
                      <ul className="space-y-2">
                        {result.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm font-semibold">
                            <Check className="h-4 w-4 text-brand-600" strokeWidth={3} />
                            <span className="capitalize">{f.replace(/-/g, ' ')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-3xl bg-white dark:bg-ink-800 p-7 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
                      <div className="flex items-center gap-2 mb-4">
                        <Plug className="h-5 w-5 text-blue-600" />
                        <Eyebrow variant="brand">Recommended integrations</Eyebrow>
                      </div>
                      <div className="space-y-2">
                        {result.integrations.map((slug) => {
                          const it = integrations.find((i) => i.slug === slug);
                          if (!it) return null;
                          return (
                            <a key={slug} href={`/integrations/${slug}`} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-900 transition">
                              <span className="text-2xl">{it.logo}</span>
                              <span className="font-bold text-sm">{it.name}</span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex flex-wrap gap-3 justify-center">
                    <Button size="xl" href={`${APP_URL}/register`} rightIcon={<ArrowRight className="h-5 w-5" />} onClick={() => trackEvent("cta_click", { cta_label: "quiz_start_trial", cta_location: "quiz_result", plan: result?.plan })}>
                      Start with {result.plan} plan
                    </Button>
                    <Button size="xl" variant="secondary" href="/roi-calculator">
                      See detailed ROI
                    </Button>
                    <Button size="xl" variant="ghost" onClick={restart} leftIcon={<RotateCcw className="h-4 w-4" />}>
                      Retake quiz
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Container>
        </Section>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
