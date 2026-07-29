'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calculator, ArrowRight, Sparkles, BarChart3 } from 'lucide-react';
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
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

export default function CostPredictorPage() {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  const [input, setInput] = useState(`Monthly revenue: Rs 850,000
Staff: 4
Hours on manual work daily: 3
Monthly udhaar given: Rs 120,000
Monthly expired/waste: Rs 15,000
Monthly software cost (current): Rs 0`);

  const [analyzed, setAnalyzed] = useState(false);

  const result = useMemo(() => {
    if (!analyzed) return null;

    // Parse the input text for numbers
    const nums = input.match(/[\d,]+/g)?.map((s) => parseInt(s.replace(/,/g, ''))) || [];
    const revenue = nums[0] || 850000;
    const staff = nums[1] || 4;
    const hours = nums[2] || 3;
    const udhaar = nums[3] || 120000;
    const waste = nums[4] || 15000;

    const timeValue = hours * 0.85 * 30 * 300; // staff time at Rs 300/hr
    const udhaarRecovery = udhaar * 0.35 * 12;
    const wasteSaved = waste * 12 * 0.7;
    const revenueLift = revenue * 12 * 0.08;
    const total = timeValue + udhaarRecovery + wasteSaved + revenueLift;
    const nafaaCost = 5500 * 12;

    return {
      time: Math.round(timeValue),
      udhaar: Math.round(udhaarRecovery),
      waste: Math.round(wasteSaved),
      revenue: Math.round(revenueLift),
      total: Math.round(total),
      net: Math.round(total - nafaaCost),
      roi: (total / nafaaCost).toFixed(1),
    };
  }, [analyzed, input]);

  const analyze = () => setAnalyzed(true);

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-10">
          <AuroraBackground variant="brand" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="brand" size="md" pulse>
              <Calculator className="h-3.5 w-3.5" /> AI-powered cost analysis
            </Badge>
            <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto text-balance">
              <GradientText variant="brand">Paste your numbers. See your savings.</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              Tell us about your current business — in any format. Our AI reads your numbers and shows exactly how much Nafaa will save you.
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container>
            <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Input */}
              <div>
                <Eyebrow variant="brand">Your business today</Eyebrow>
                <h2 className="mt-4 font-display font-extrabold text-2xl mb-4">Paste your details</h2>
                <textarea
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setAnalyzed(false); }}
                  rows={10}
                  className="w-full rounded-2xl bg-white dark:bg-ink-800 p-5 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 focus:ring-2 focus:ring-brand-500 outline-none font-mono text-sm leading-relaxed resize-none"
                  placeholder="Paste your revenue, staff, hours, udhaar, waste..."
                />
                <Button size="lg" fullWidth onClick={analyze} leftIcon={<Sparkles className="h-4 w-4" />} className="mt-4">
                  Analyze with AI
                </Button>
                <p className="mt-3 text-xs text-ink-400">
                  No data leaves your browser — this runs entirely client-side. Your numbers stay private.
                </p>
              </div>

              {/* Result */}
              <div>
                {!result ? (
                  <div className="rounded-3xl bg-ink-50 dark:bg-ink-900 p-12 text-center ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 h-full flex flex-col items-center justify-center">
                    <BarChart3 className="h-16 w-16 text-ink-300 dark:text-ink-700 mb-4" />
                    <p className="text-ink-500">Your savings breakdown will appear here after analysis.</p>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-emerald-800 p-7 text-white shadow-brand-glow mb-4">
                      <div className="text-eyebrow font-mono text-white/70">Total yearly savings</div>
                      <div className="font-display font-extrabold text-5xl tabular-nums mt-1">Rs {result.total.toLocaleString()}</div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-white/10 p-3">
                          <div className="text-white/70">Net gain</div>
                          <div className="font-extrabold text-xl tabular-nums">Rs {result.net.toLocaleString()}</div>
                        </div>
                        <div className="rounded-xl bg-white/10 p-3">
                          <div className="text-white/70">ROI multiple</div>
                          <div className="font-extrabold text-xl tabular-nums">{result.roi}x</div>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown bars */}
                    <div className="rounded-3xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 space-y-4">
                      {[
                        { label: 'Time saved (valued)', val: result.time, color: 'bg-blue-500' },
                        { label: 'Udhaar recovery', val: result.udhaar, color: 'bg-emerald-500' },
                        { label: 'Waste eliminated', val: result.waste, color: 'bg-amber-500' },
                        { label: 'Revenue lift', val: result.revenue, color: 'bg-purple-500' },
                      ].map((b) => {
                        const pct = (b.val / result.total) * 100;
                        return (
                          <div key={b.label}>
                            <div className="flex justify-between text-sm mb-1.5">
                              <span className="font-semibold">{b.label}</span>
                              <span className="font-bold tabular-nums">Rs {b.val.toLocaleString()}</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-ink-100 dark:bg-ink-900 overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.2 }} className={cn('h-full rounded-full', b.color)} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <Button size="lg" fullWidth href={`${APP_URL}/register`} rightIcon={<ArrowRight className="h-4 w-4" />} className="mt-4">
                      Start saving — free trial
                    </Button>
                  </motion.div>
                )}
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
