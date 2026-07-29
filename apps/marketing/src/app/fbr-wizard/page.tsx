'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, Check, ArrowRight, ArrowLeft, AlertTriangle, FileCheck, Calculator, ShieldCheck, RotateCcw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
import { cn } from '@/lib/cn';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

interface StepOption {
  label: string;
  value: string;
  icon?: LucideIcon;
}

interface WizardStep {
  id: string;
  q: string;
  options: StepOption[];
}

const steps: WizardStep[] = [
  {
    id: 'tier',
    q: 'Are you classified as a Tier 1 retailer by FBR?',
    options: [
      { label: 'Yes, I am Tier 1', value: 'tier1', icon: Landmark },
      { label: 'Not sure', value: 'unsure', icon: AlertTriangle },
      { label: 'No, I am a smaller retailer', value: 'small', icon: ShieldCheck },
    ],
  },
  {
    id: 'ntn',
    q: 'Do you have an NTN (National Tax Number)?',
    options: [
      { label: 'Yes, I have NTN', value: 'yes' },
      { label: 'No, I need to register', value: 'no' },
    ],
  },
  {
    id: 'pos',
    q: 'Do you already have an FBR POS ID?',
    options: [
      { label: 'Yes, I have a POS ID', value: 'yes' },
      { label: 'No, I need one', value: 'no' },
    ],
  },
  {
    id: 'volume',
    q: 'What is your approximate monthly sales volume?',
    options: [
      { label: 'Under Rs 5 lakh', value: 'low' },
      { label: 'Rs 5 lakh - 50 lakh', value: 'medium' },
      { label: 'Above Rs 50 lakh', value: 'high' },
    ],
  },
];

export default function FBRWizardPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const select = (stepId: string, value: string) => {
    const next = { ...answers, [stepId]: value };
    setAnswers(next);
    if (step < steps.length - 1) setStep(step + 1);
    else setDone(true);
  };

  const verdict = () => {
    const isTier1 = answers.tier === 'tier1' || (answers.volume === 'high' && answers.tier !== 'small');
    const needsNTN = answers.ntn === 'no';
    const needsPOS = answers.pos === 'no';

    return {
      mustIntegrate: isTier1,
      needsNTN,
      needsPOS,
      penaltyRisk: isTier1 && !needsPOS ? 'high' : isTier1 ? 'medium' : 'low',
      estimatedTax: answers.volume === 'high' ? '17% on Rs 50L+ = Rs 8.5L+/mo' : answers.volume === 'medium' ? '17% on Rs 5-50L' : 'Likely below threshold',
    };
  };

  const v = done ? verdict() : null;
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-10">
          <AuroraBackground variant="pk" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="pk" size="md" pulse><Landmark className="h-3.5 w-3.5" /> FBR Compliance Wizard</Badge>
            <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto text-balance">
              <GradientText variant="pk">Find out your FBR obligations in 60 seconds</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              Answer four questions. Know exactly what FBR requires from your business, what it costs, and how Nafaa handles it automatically.
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container size="md">
            <AnimatePresence mode="wait">
              {!done ? (
                <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                  <div className="mb-8">
                    <div className="flex justify-between mb-2 text-xs font-mono uppercase tracking-widest font-bold text-ink-500">
                      <span>Step {step + 1} of {steps.length}</span>
                      <span className="text-brand-600">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                      <motion.div className="h-full bg-gradient-brand rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
                    </div>
                  </div>

                  <h2 className="font-display font-extrabold text-2xl lg:text-3xl text-center mb-10">{steps[step].q}</h2>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {steps[step].options.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button key={opt.value} onClick={() => select(steps[step].id, opt.value)}
                          className="group rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:ring-brand-400 hover:shadow-card-hover transition-all text-left">
                          <div className="flex items-center gap-4">
                            {Icon && <div className="h-12 w-12 rounded-xl bg-gradient-brand flex items-center justify-center text-white"><Icon className="h-6 w-6" /></div>}
                            <div className="flex-1 font-display font-bold text-lg">{opt.label}</div>
                            <ArrowRight className="h-5 w-5 text-ink-300 group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {step > 0 && (
                    <button onClick={() => setStep(step - 1)} className="mt-6 mx-auto flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                  )}
                </motion.div>
              ) : v && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="text-center mb-8">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                      className="inline-flex h-20 w-20 rounded-full bg-gradient-brand items-center justify-center shadow-brand-glow mb-4">
                      <FileCheck className="h-10 w-10 text-white" />
                    </motion.div>
                    <h2 className="font-display font-extrabold text-3xl">Your FBR compliance report</h2>
                  </div>

                  <div className={cn('rounded-3xl p-7 mb-6 text-white shadow-lg',
                    v.mustIntegrate ? 'bg-gradient-to-br from-red-600 to-rose-800' : 'bg-gradient-to-br from-emerald-600 to-brand-700')}>
                    <div className="text-eyebrow font-mono text-white/70 mb-2">Verdict</div>
                    <div className="font-display font-extrabold text-2xl">
                      {v.mustIntegrate ? 'FBR POS integration is mandatory for your business' : 'FBR POS integration is recommended but not mandatory yet'}
                    </div>
                    {v.penaltyRisk === 'high' && (
                      <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/15 p-3 text-sm">
                        <AlertTriangle className="h-5 w-5" /> Penalty risk: High — non-compliance fines start at Rs 500,000
                      </div>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    <div className={cn('rounded-2xl p-5 ring-1 ring-inset', v.needsNTN ? 'bg-amber-50 dark:bg-amber-950/30 ring-amber-200 dark:ring-amber-800/50' : 'bg-emerald-50 dark:bg-emerald-950/30 ring-emerald-200 dark:ring-emerald-800/50')}>
                      <div className="flex items-center gap-2 mb-2">
                        {v.needsNTN ? <AlertTriangle className="h-5 w-5 text-amber-600" /> : <Check className="h-5 w-5 text-emerald-600" />}
                        <span className="font-bold">NTN Registration</span>
                      </div>
                      <p className="text-sm text-ink-600 dark:text-ink-300">
                        {v.needsNTN ? 'You need to register for NTN at FBR IRIS portal (free, 2 days).' : 'You already have NTN — good.'}
                      </p>
                    </div>

                    <div className={cn('rounded-2xl p-5 ring-1 ring-inset', v.needsPOS ? 'bg-amber-50 dark:bg-amber-950/30 ring-amber-200 dark:ring-amber-800/50' : 'bg-emerald-50 dark:bg-emerald-950/30 ring-emerald-200 dark:ring-emerald-800/50')}>
                      <div className="flex items-center gap-2 mb-2">
                        {v.needsPOS ? <AlertTriangle className="h-5 w-5 text-amber-600" /> : <Check className="h-5 w-5 text-emerald-600" />}
                        <span className="font-bold">FBR POS ID</span>
                      </div>
                      <p className="text-sm text-ink-600 dark:text-ink-300">
                        {v.needsPOS ? 'Apply for POS ID through FBR IRIS — Nafaa guides you step by step.' : 'You have POS ID — ready to integrate.'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 mb-6">
                    <div className="flex items-center gap-2 mb-3"><Calculator className="h-5 w-5 text-brand-600" /><span className="font-bold">Estimated tax liability</span></div>
                    <div className="font-display font-extrabold text-2xl text-gradient-brand">{v.estimatedTax}</div>
                    <p className="mt-2 text-sm text-ink-500">Standard sales tax rate in Pakistan is 17%. Nafaa calculates this automatically on every invoice.</p>
                  </div>

                  <div className="flex flex-wrap gap-3 justify-center">
                    <Button size="xl" href={`${APP_URL}/register`} rightIcon={<ArrowRight className="h-5 w-5" />}>
                      Get FBR-compliant with Nafaa
                    </Button>
                    <Button size="xl" variant="secondary" onClick={() => { setStep(0); setAnswers({}); setDone(false); }} leftIcon={<RotateCcw className="h-4 w-4" />}>
                      Retake
                    </Button>
                  </div>

                  <p className="mt-6 text-center text-xs text-ink-400">
                    This wizard provides general guidance. For specific tax advice, consult a qualified tax practitioner.
                  </p>
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
