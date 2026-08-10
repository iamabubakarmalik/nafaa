'use client';

import { motion } from 'framer-motion';
import { Sparkles, Trophy, Zap, ArrowRight } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import type { Industry } from '@/lib/data/industries';
import { cn } from '@/lib/cn';

export function IndustrySignature({ industry }: { industry: Industry }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  return (
    <Section variant="default" spacing="lg" className="relative overflow-hidden">
      {/* Colored background */}
      <div className="absolute inset-0" style={{
        background: `linear-gradient(135deg, ${industry.color}05, transparent 60%)`,
      }} />

      <Container className="relative">
        <motion.div
          initial="hidden" whileInView="visible" viewport={viewport}
          variants={staggerContainer(0.08)}
          className="max-w-5xl mx-auto"
        >
          <motion.div variants={fadeUp} className="text-center mb-10">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono uppercase tracking-widest font-bold ring-1 ring-inset"
              style={{
                color: industry.color,
                background: `${industry.color}10`,
                boxShadow: `0 0 0 1px ${industry.color}30 inset`,
              }}
            >
              <Trophy className="h-3.5 w-3.5" />
              {isUr ? 'ہمارا امتیاز' : 'What sets us apart'}
            </div>
            <h2 className={cn(
              'mt-6 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance',
              isUr && 'font-urdu leading-snug',
            )}>
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(135deg, ${industry.color}, ${industry.colorDark})` }}
              >
                {isUr ? industry.signatureUr : industry.signature}
              </span>
            </h2>
          </motion.div>

          {/* Signature comparison */}
          <motion.div variants={fadeUp} className="grid md:grid-cols-3 gap-4">
            {/* Others */}
            <div className="rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 opacity-70">
              <div className="text-eyebrow font-mono text-ink-500 mb-3">
                {isUr ? 'دوسرے سسٹمز' : 'Other systems'}
              </div>
              <div className={cn('font-display font-bold text-lg text-ink-500', isUr && 'font-urdu text-xl')}>
                {isUr ? 'عام پی او ایس' : 'Generic POS'}
              </div>
              <p className={cn('mt-2 text-sm text-ink-400 leading-relaxed', isUr && 'font-urdu text-base')}>
                {isUr
                  ? `${industry.nameUr} کے لیے خصوصی نہیں۔ مکمل ورک فلو کے لیے ایکسل، کاغذ، یا دوسرے سافٹ ویئر کی ضرورت۔`
                  : `Not built for ${industry.nameEn.toLowerCase()}. You end up needing Excel, paper, and other apps to complete the workflow.`}
              </p>
            </div>

            {/* Nafaa — highlighted */}
            <div
              className="relative rounded-2xl p-6 shadow-2xl text-white overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${industry.color}, ${industry.colorDark})` }}
            >
              <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="text-eyebrow font-mono text-white/80 mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  {isUr ? 'نفع' : 'Nafaa'}
                </div>
                <div className={cn('font-display font-bold text-lg', isUr && 'font-urdu text-xl')}>
                  {isUr ? `پیدائشی ${industry.nameUr} کے لیے` : `Purpose-built for ${industry.nameEn.toLowerCase()}`}
                </div>
                <p className={cn('mt-2 text-sm text-white/90 leading-relaxed', isUr && 'font-urdu text-base')}>
                  {isUr ? industry.signatureUr : industry.signature}
                </p>
              </div>
            </div>

            {/* Result */}
            <div className="rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
              <div className="text-eyebrow font-mono text-emerald-600 mb-3 flex items-center gap-1.5">
                <Zap className="h-3 w-3" />
                {isUr ? 'آپ کا فائدہ' : 'Your advantage'}
              </div>
              <div className={cn('font-display font-bold text-lg', isUr && 'font-urdu text-xl')}>
                {isUr ? 'کوئی متبادل نہیں' : 'No alternatives needed'}
              </div>
              <p className={cn('mt-2 text-sm text-ink-600 dark:text-ink-300 leading-relaxed', isUr && 'font-urdu text-base')}>
                {isUr
                  ? 'ایک سسٹم، مکمل ورک فلو۔ نہ ایکسل، نہ کاغذ، نہ الگ ٹولز۔'
                  : 'One system, complete workflow. No Excel, no paper, no separate tools.'}
              </p>
            </div>
          </motion.div>
        </motion.div>
      </Container>
    </Section>
  );
}
