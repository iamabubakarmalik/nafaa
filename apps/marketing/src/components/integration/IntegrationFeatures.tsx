'use client';

import { motion } from 'framer-motion';
import { Check, X, ListChecks, FileCheck } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import type { IntegrationContent } from '@/lib/data/integration-content';
import type { Integration } from '@/lib/data/integrations';
import { cn } from '@/lib/cn';

export function IntegrationFeatures({ integration, content }: { integration: Integration; content: IntegrationContent }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  return (
    <Section variant="default" spacing="lg">
      <Container>
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Supported features */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={staggerContainer(0.05)}
            className="rounded-3xl bg-white dark:bg-ink-800 p-8 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60"
          >
            <motion.div variants={fadeUp} className="flex items-center gap-2 mb-6">
              <ListChecks className="h-5 w-5 text-brand-600" />
              <Eyebrow variant="brand">
                {isUr ? 'دستیاب خصوصیات' : 'What is supported'}
              </Eyebrow>
            </motion.div>
            <motion.h3
              variants={fadeUp}
              className={cn('font-display font-bold text-2xl mb-6', isUr && 'font-urdu text-3xl')}
            >
              {isUr ? 'خصوصیات' : 'Features'}
            </motion.h3>
            <ul className="space-y-3">
              {content.supportedFeatures.map((f, i) => (
                <motion.li key={i} variants={fadeUp} className="flex items-center gap-3">
                  <span
                    className={cn(
                      'h-6 w-6 rounded-full flex items-center justify-center shrink-0',
                      f.available
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                        : 'bg-ink-100 dark:bg-ink-900 text-ink-400',
                    )}
                  >
                    {f.available ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <X className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                  <span
                    className={cn(
                      'leading-relaxed',
                      f.available ? 'text-ink-700 dark:text-ink-200' : 'text-ink-400 dark:text-ink-500 line-through',
                      isUr && 'font-urdu text-lg',
                    )}
                  >
                    {isUr ? f.ur : f.en}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Requirements */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={staggerContainer(0.05)}
            className={cn(
              'rounded-3xl p-8 text-white shadow-lg',
            )}
            style={{ background: `linear-gradient(135deg, ${integration.color}, ${integration.color}dd)` }}
          >
            <motion.div variants={fadeUp} className="flex items-center gap-2 mb-6">
              <FileCheck className="h-5 w-5" />
              <div className="text-eyebrow font-mono text-white/80">
                {isUr ? 'ضروریات' : 'Requirements'}
              </div>
            </motion.div>
            <motion.h3
              variants={fadeUp}
              className={cn('font-display font-bold text-2xl mb-6', isUr && 'font-urdu text-3xl')}
            >
              {isUr ? 'شروع کرنے کے لیے چاہیے' : 'What you need to start'}
            </motion.h3>
            <ul className="space-y-3">
              {content.requirements.map((r, i) => (
                <motion.li key={i} variants={fadeUp} className="flex items-start gap-3">
                  <span className="mt-1 h-5 w-5 rounded-full bg-white/25 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                  <span className={cn('text-white/95 leading-relaxed', isUr && 'font-urdu text-lg')}>
                    {isUr ? r.ur : r.en}
                  </span>
                </motion.li>
              ))}
            </ul>

            <div className="mt-8 pt-6 border-t border-white/20">
              <div className={cn('text-white/70 text-sm', isUr && 'font-urdu text-base')}>
                {isUr ? 'مدد چاہیے؟' : 'Need help?'}
              </div>
              <div className={cn('text-white font-bold text-lg mt-1', isUr && 'font-urdu')}>
                {isUr ? 'ہماری ٹیم آپ کو سیٹ اپ کرے گی' : 'Our team will set this up for you'}
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </Section>
  );
}
