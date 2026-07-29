'use client';

import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import type { IndustryContent } from '@/lib/data/industry-content';
import { cn } from '@/lib/cn';

export function IndustryPainsSolutions({ content }: { content: IndustryContent }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  return (
    <Section variant="subtle" spacing="lg">
      <Container>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.06)}
          className="max-w-3xl mb-14"
        >
          <motion.div variants={fadeUp}>
            <Eyebrow variant="brand">
              {isUr ? 'مسئلہ اور حل' : 'Problem and solution'}
            </Eyebrow>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance',
              isUr && 'font-urdu leading-snug',
            )}
          >
            {isUr ? 'ہر مسئلے کا ذہین حل' : 'Every problem, intelligently solved'}
          </motion.h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Pains */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={staggerContainer(0.04)}
            className="rounded-3xl bg-white dark:bg-ink-800 p-8 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60"
          >
            <div className={cn('text-eyebrow font-mono text-red-600 dark:text-red-400 mb-4', isUr && 'font-urdu text-sm')}>
              {isUr ? 'موجودہ چیلنجز' : 'Current challenges'}
            </div>
            <h3 className={cn('font-display font-bold text-xl mb-6', isUr && 'font-urdu text-2xl')}>
              {isUr ? 'یہ روزانہ کی مشکلات جانی پہچانی ہیں' : 'These daily struggles sound familiar'}
            </h3>
            <ul className="space-y-3">
              {content.pains.map((p, i) => (
                <motion.li
                  key={i}
                  variants={fadeUp}
                  className="flex items-start gap-3"
                >
                  <span className="mt-0.5 h-6 w-6 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center shrink-0">
                    <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" strokeWidth={3} />
                  </span>
                  <span className={cn('text-ink-700 dark:text-ink-200 leading-relaxed', isUr && 'font-urdu text-lg leading-loose')}>
                    {isUr ? p.ur : p.en}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Solutions summary */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={staggerContainer(0.04)}
            className="rounded-3xl bg-gradient-to-br from-brand-600 to-emerald-700 p-8 text-white shadow-brand-glow"
          >
            <div className={cn('text-eyebrow font-mono text-white/80 mb-4', isUr && 'font-urdu text-sm')}>
              {isUr ? 'نفع کے ساتھ' : 'With Nafaa'}
            </div>
            <h3 className={cn('font-display font-bold text-xl mb-6', isUr && 'font-urdu text-2xl')}>
              {isUr ? 'خودکار، تیز، اور بغیر غلطیوں کے' : 'Automated, fast, and error-free'}
            </h3>
            <ul className="space-y-3">
              {content.pains.map((p, i) => (
                <motion.li
                  key={i}
                  variants={fadeUp}
                  className="flex items-start gap-3"
                >
                  <span className="mt-0.5 h-6 w-6 rounded-full bg-white/25 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                  </span>
                  <span className={cn('text-white/95 leading-relaxed', isUr && 'font-urdu text-lg leading-loose')}>
                    {isUr ? content.solutions[i]?.titleUr ?? p.ur : content.solutions[i]?.titleEn ?? p.en}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </Container>
    </Section>
  );
}
