'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp, Clock, Wallet, ArrowRight, Sparkles } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Button } from '@/components/primitives/Button';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { Counter } from '@/components/primitives/Counter';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

export default function ROICalculatorPage() {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  const [dailySales, setDailySales] = useState(30000);       // Rs per day
  const [dailyHours, setDailyHours] = useState(3);           // hours on manual work
  const [monthlyUdhaar, setMonthlyUdhaar] = useState(50000); // udhaar given monthly
  const [monthlyWaste, setMonthlyWaste] = useState(8000);    // expired/dead stock loss

  const roi = useMemo(() => {
    const hourlyRate = 300; // conservative owner-time value
    const timeSavedYearly = dailyHours * 0.85 * 365 * hourlyRate;        // 85% of manual hours saved
    const udhaarRecovery = monthlyUdhaar * 12 * 0.35;                    // 35% more recovered
    const wasteSaved = monthlyWaste * 12 * 0.7;                          // 70% waste eliminated
    const revenueLift = dailySales * 365 * 0.08;                         // 8% lift from insights/loyalty
    const total = timeSavedYearly + udhaarRecovery + wasteSaved + revenueLift;
    const nafaaCost = 5500 * 12; // Pro plan yearly
    return {
      timeSaved: Math.round(timeSavedYearly),
      udhaar: Math.round(udhaarRecovery),
      waste: Math.round(wasteSaved),
      revenue: Math.round(revenueLift),
      total: Math.round(total),
      netGain: Math.round(total - nafaaCost),
      multiple: (total / nafaaCost).toFixed(1),
    };
  }, [dailySales, dailyHours, monthlyUdhaar, monthlyWaste]);

  const fmt = (n: number) => 'Rs ' + n.toLocaleString('en-PK');

  const sliders = [
    { labelEn: 'Daily sales (Rs)', labelUr: 'روزانہ سیلز (روپے)', value: dailySales, set: setDailySales, min: 5000, max: 500000, step: 5000, fmt: (v: number) => fmt(v) },
    { labelEn: 'Hours on manual work daily', labelUr: 'دستی کام پر روزانہ گھنٹے', value: dailyHours, set: setDailyHours, min: 0, max: 8, step: 0.5, fmt: (v: number) => `${v}h` },
    { labelEn: 'Monthly udhaar given (Rs)', labelUr: 'ماہانہ ادھار (روپے)', value: monthlyUdhaar, set: setMonthlyUdhaar, min: 0, max: 500000, step: 5000, fmt: (v: number) => fmt(v) },
    { labelEn: 'Monthly waste/loss (Rs)', labelUr: 'ماہانہ نقصان (روپے)', value: monthlyWaste, set: setMonthlyWaste, min: 0, max: 100000, step: 1000, fmt: (v: number) => fmt(v) },
  ];

  const breakdown = [
    { icon: Clock, labelEn: 'Time saved (valued)', labelUr: 'وقت کی بچت', value: roi.timeSaved, color: '#0284c7' },
    { icon: Wallet, labelEn: 'Extra udhaar recovered', labelUr: 'اضافی ادھار وصولی', value: roi.udhaar, color: '#12b76a' },
    { icon: TrendingUp, labelEn: 'Waste eliminated', labelUr: 'نقصان ختم', value: roi.waste, color: '#f59e0b' },
    { icon: Sparkles, labelEn: 'Revenue lift', labelUr: 'آمدنی اضافہ', value: roi.revenue, color: '#8b5cf6' },
  ];

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-14">
          <AuroraBackground variant="brand" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Eyebrow variant="brand" icon={<Calculator className="h-3.5 w-3.5" />}>
              {isUr ? 'حقیقی نمبرز' : 'Real numbers, your business'}
            </Eyebrow>
            <h1 className={cn('mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto text-balance', isUr && 'font-urdu leading-[1.5]')}>
              <GradientText variant="brand">
                {isUr ? 'نفع آپ کو سالانہ کتنا بچائے گا؟' : 'How much will Nafaa save you this year?'}
              </GradientText>
            </h1>
            <p className={cn('mt-6 text-lg text-ink-600 dark:text-ink-300 max-w-2xl mx-auto', isUr && 'font-urdu text-xl leading-loose')}>
              {isUr ? 'سلائیڈرز حرکت کریں — اپنے اعداد کے ساتھ حقیقی حساب دیکھیں۔' : 'Move the sliders — see the real math with your own numbers.'}
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="md">
          <Container>
            <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 items-start max-w-6xl mx-auto">
              {/* Sliders */}
              <div className="rounded-3xl bg-white dark:bg-ink-800 p-8 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 space-y-8">
                {sliders.map((s) => (
                  <div key={s.labelEn}>
                    <div className="flex items-center justify-between mb-3">
                      <label className={cn('font-bold text-sm', isUr && 'font-urdu text-base')}>
                        {isUr ? s.labelUr : s.labelEn}
                      </label>
                      <span className="font-display font-extrabold text-brand-600 tabular-nums">{s.fmt(s.value)}</span>
                    </div>
                    <input
                      type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                      onChange={(e) => s.set(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none bg-ink-100 dark:bg-ink-700 accent-brand-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-ink-400 mt-1.5 tabular-nums">
                      <span>{s.fmt(s.min)}</span><span>{s.fmt(s.max)}</span>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-ink-400 leading-relaxed">
                  {isUr
                    ? '* قدامت پسند اندازے — حقیقی نتائج عام طور پر بہتر ہوتے ہیں۔'
                    : '* Conservative estimates — real-world results are typically better.'}
                </p>
              </div>

              {/* Results */}
              <div className="space-y-5">
                <motion.div
                  layout
                  className="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-800 p-8 text-white shadow-brand-glow"
                >
                  <div className="text-eyebrow font-mono text-white/70">
                    {isUr ? 'سالانہ کل بچت' : 'Total yearly savings'}
                  </div>
                  <div className="mt-2 font-display font-extrabold text-5xl lg:text-6xl tabular-nums">
                    Rs <Counter value={roi.total} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-white/10 p-3">
                      <div className="text-white/70">{isUr ? 'خالص فائدہ (لاگت کے بعد)' : 'Net gain (after cost)'}</div>
                      <div className="font-display font-extrabold text-xl tabular-nums mt-0.5">Rs <Counter value={roi.netGain} /></div>
                    </div>
                    <div className="rounded-xl bg-white/10 p-3">
                      <div className="text-white/70">{isUr ? 'سرمائے پر واپسی' : 'Return multiple'}</div>
                      <div className="font-display font-extrabold text-xl tabular-nums mt-0.5">{roi.multiple}x</div>
                    </div>
                  </div>
                </motion.div>

                <div className="grid grid-cols-2 gap-3">
                  {breakdown.map((b) => {
                    const Icon = b.icon;
                    return (
                      <div key={b.labelEn} className="rounded-2xl bg-white dark:bg-ink-800 p-5 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white shadow" style={{ background: b.color }}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="mt-3 font-display font-extrabold text-lg tabular-nums">Rs <Counter value={b.value} /></div>
                        <div className={cn('text-xs font-semibold text-ink-500 mt-0.5', isUr && 'font-urdu text-sm')}>
                          {isUr ? b.labelUr : b.labelEn}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button size="xl" fullWidth href={`${APP_URL}/register`} rightIcon={<ArrowRight className="h-5 w-5" />}>
                  {isUr ? 'مفت شروع کریں — بچت آج سے' : 'Start free — savings from day one'}
                </Button>
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
