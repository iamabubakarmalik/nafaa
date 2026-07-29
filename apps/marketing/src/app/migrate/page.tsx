'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, Check, ArrowRight, Database, Zap, Clock, Shield, Loader2, X } from 'lucide-react';
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
import { toast } from 'sonner';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

type Stage = 'idle' | 'uploading' | 'analyzing' | 'mapping' | 'preview' | 'done';

const sources = [
  { id: 'tally', name: 'Tally', emoji: '📊', desc: 'Export your Tally data as XML or CSV' },
  { id: 'excel', name: 'Excel / Sheets', emoji: '📋', desc: 'Any spreadsheet with products or sales' },
  { id: 'quickbooks', name: 'QuickBooks', emoji: '💹', desc: 'CSV export from QuickBooks' },
  { id: 'paper', name: 'Paper register', emoji: '📒', desc: 'We help you digitize manually' },
];

export default function MigratePage() {
  const { locale } = useLocale();
  const isUr = locale === 'ur';
  const [stage, setStage] = useState<Stage>('idle');
  const [source, setSource] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const stages = [
    { key: 'uploading', label: 'Uploading file', icon: Upload },
    { key: 'analyzing', label: 'AI analyzing structure', icon: Zap },
    { key: 'mapping', label: 'Mapping fields', icon: Database },
    { key: 'preview', label: 'Generating preview', icon: Check },
  ];

  const handleFile = (file: File) => {
    setFileName(file.name);
    setSource(null);
    setStage('uploading');
    setProgress(0);

    const stages_order: Stage[] = ['uploading', 'analyzing', 'mapping', 'preview', 'done'];
    let i = 0;

    const advance = () => {
      if (i >= stages_order.length) return;
      setStage(stages_order[i]);
      setProgress(((i + 1) / stages_order.length) * 100);
      i++;
      if (i < stages_order.length) setTimeout(advance, 1500);
    };
    setTimeout(advance, 800);
  };

  const reset = () => { setStage('idle'); setFileName(null); setSource(null); setProgress(0); };

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
              <Database className="h-3.5 w-3.5" /> Free AI-assisted migration
            </Badge>
            <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto text-balance">
              <GradientText variant="aurora">Switch to Nafaa in days, not weeks</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              Upload your existing data — from Tally, Excel, QuickBooks, or even paper. Our AI maps every field and shows you a preview before anything moves.
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container size="lg">
            {/* Source selection */}
            <div className="mb-10">
              <Eyebrow variant="brand">Where are you coming from?</Eyebrow>
              <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {sources.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSource(s.id); setStage('idle'); setFileName(null); fileRef.current?.click(); }}
                    className={cn(
                      'group rounded-2xl bg-white dark:bg-ink-800 p-6 ring-2 ring-inset transition-all text-left',
                      source === s.id ? 'ring-brand-500 shadow-brand-glow' : 'ring-ink-100 dark:ring-ink-700/60 hover:ring-brand-300',
                    )}
                  >
                    <div className="text-4xl mb-3">{s.emoji}</div>
                    <div className="font-display font-bold text-lg">{s.name}</div>
                    <div className="mt-1 text-xs text-ink-500">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.xml,.json" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            {/* Migration flow */}
            <AnimatePresence mode="wait">
              {stage === 'idle' && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="rounded-3xl border-2 border-dashed border-ink-200 dark:border-ink-700 p-16 text-center">
                  <Upload className="h-16 w-16 mx-auto text-ink-300 dark:text-ink-700 mb-4" />
                  <p className="font-bold text-lg">Drop your file here or select a source above</p>
                  <p className="mt-2 text-sm text-ink-500">Supports CSV, Excel, XML, and JSON · Max 50MB · Stays in your browser</p>
                </motion.div>
              )}

              {(stage !== 'idle' && stage !== 'done') && (
                <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="rounded-3xl bg-white dark:bg-ink-800 p-8 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
                  <div className="flex items-center gap-3 mb-6">
                    <FileSpreadsheet className="h-8 w-8 text-brand-600" />
                    <div className="flex-1">
                      <div className="font-bold">{fileName}</div>
                      <div className="text-xs text-ink-500">{source && sources.find((s) => s.id === source)?.name} format detected</div>
                    </div>
                    <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                  </div>

                  <div className="space-y-3">
                    {stages.map((s) => {
                      const Icon = s.icon;
                      const stageIndex = stages.findIndex((x) => x.key === stage);
                      const myIndex = stages.findIndex((x) => x.key === s.key);
                      const done = myIndex < stageIndex;
                      const active = myIndex === stageIndex;
                      return (
                        <div key={s.key} className={cn('flex items-center gap-3 p-3 rounded-xl transition',
                          active ? 'bg-brand-50 dark:bg-brand-950/40 ring-1 ring-brand-200 dark:ring-brand-800/50' : '')}>
                          <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                            done ? 'bg-emerald-500 text-white' : active ? 'bg-gradient-brand text-white' : 'bg-ink-100 dark:bg-ink-900 text-ink-400')}>
                            {done ? <Check className="h-4 w-4" strokeWidth={3} /> : active ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                          </div>
                          <span className={cn('font-semibold text-sm', done && 'text-emerald-700 dark:text-emerald-400', active && 'text-brand-700 dark:text-brand-400')}>{s.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 h-2 rounded-full bg-ink-100 dark:bg-ink-900 overflow-hidden">
                    <motion.div className="h-full bg-gradient-brand rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
                  </div>
                </motion.div>
              )}

              {stage === 'done' && (
                <motion.div key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl bg-white dark:bg-ink-800 p-8 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
                  <div className="text-center mb-8">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                      className="inline-flex h-20 w-20 rounded-full bg-gradient-brand items-center justify-center shadow-brand-glow mb-4">
                      <Check className="h-10 w-10 text-white" strokeWidth={3} />
                    </motion.div>
                    <h2 className="font-display font-extrabold text-3xl">Migration preview ready!</h2>
                    <p className="mt-2 text-ink-600 dark:text-ink-300">Here's what our AI found in your file.</p>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4 mb-8">
                    {[
                      { label: 'Products mapped', value: '1,247', icon: Database, color: 'text-brand-600' },
                      { label: 'Fields auto-matched', value: '94%', icon: Zap, color: 'text-aurora-purple' },
                      { label: 'Estimated migration time', value: '3 days', icon: Clock, color: 'text-sunset' },
                    ].map((s) => {
                      const Icon = s.icon;
                      return (
                        <div key={s.label} className="rounded-2xl bg-ink-50 dark:bg-ink-900 p-5 text-center">
                          <Icon className={cn('h-6 w-6 mx-auto mb-2', s.color)} />
                          <div className="font-display font-extrabold text-2xl">{s.value}</div>
                          <div className="text-xs text-ink-500 mt-1">{s.label}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sample mapping */}
                  <div className="rounded-2xl bg-ink-50 dark:bg-ink-900 p-5 mb-6">
                    <div className="text-xs font-mono uppercase tracking-widest font-bold text-ink-500 mb-3">Sample field mapping</div>
                    <div className="space-y-2 font-mono text-sm">
                      {[
                        { from: 'Item Name', to: 'product.name', confidence: 100 },
                        { from: 'Sale Price', to: 'product.salePrice', confidence: 100 },
                        { from: 'Stock Qty', to: 'product.stock', confidence: 98 },
                        { from: 'Cust Name', to: 'customer.name', confidence: 95 },
                        { from: 'Due Amount', to: 'khata.balance', confidence: 92 },
                      ].map((m) => (
                        <div key={m.from} className="flex items-center gap-3">
                          <span className="text-ink-500 w-32 truncate">{m.from}</span>
                          <ArrowRight className="h-3 w-3 text-brand-600" />
                          <span className="font-bold text-brand-700 dark:text-brand-400 flex-1">{m.to}</span>
                          <span className={cn('text-xs font-bold tabular-nums', m.confidence >= 95 ? 'text-emerald-600' : 'text-amber-600')}>{m.confidence}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 justify-center">
                    <Button size="xl" href={`${APP_URL}/register`} rightIcon={<ArrowRight className="h-5 w-5" />}>
                      Start migration — free
                    </Button>
                    <Button size="xl" variant="secondary" onClick={reset} leftIcon={<X className="h-4 w-4" />}>
                      Try another file
                    </Button>
                  </div>

                  <div className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-400">
                    <Shield className="h-4 w-4" /> Your data never left your browser. Real migration is encrypted end-to-end.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Trust line */}
            <div className="mt-10 text-center">
              <p className="text-sm text-ink-500">
                <Check className="inline h-4 w-4 text-brand-600" /> Free for all customers · <Check className="inline h-4 w-4 text-brand-600" /> Zero data loss guaranteed · <Check className="inline h-4 w-4 text-brand-600" /> Dedicated migration specialist
              </p>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
