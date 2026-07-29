'use client';

import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import type { FeatureContent } from '@/lib/data/feature-content';
import { cn } from '@/lib/cn';

export function FeatureCompare({ content }: { content: FeatureContent }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  if (!content.compareTable) return null;

  return (
    <Section variant="subtle" spacing="lg">
      <Container size="md">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.06)}
          className="text-center mb-12"
        >
          <motion.div variants={fadeUp}>
            <Eyebrow variant="aurora">
              {isUr ? 'موازنہ' : 'Comparison'}
            </Eyebrow>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight',
              isUr && 'font-urdu leading-snug',
            )}
          >
            {isUr ? content.compareTable.titleUr : content.compareTable.titleEn}
          </motion.h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ duration: 0.5 }}
          className="rounded-3xl overflow-hidden bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 shadow-lg"
        >
          <div className="grid grid-cols-3 divide-x divide-ink-100 dark:divide-ink-700/60">
            <div className={cn('p-5 text-xs font-mono uppercase tracking-widest font-bold text-ink-500', isUr && 'font-urdu text-sm')}>
              {isUr ? 'خصوصیت' : 'Feature'}
            </div>
            <div className="p-5 bg-gradient-brand text-white text-xs font-mono uppercase tracking-widest font-bold flex items-center gap-2">
              <span>Nafaa</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
            </div>
            <div className={cn('p-5 text-xs font-mono uppercase tracking-widest font-bold text-ink-500', isUr && 'font-urdu text-sm')}>
              {isUr ? 'دیگر سسٹمز' : 'Others'}
            </div>
          </div>

          {content.compareTable.rows.map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                'grid grid-cols-3 divide-x divide-ink-100 dark:divide-ink-700/60 border-t border-ink-100 dark:border-ink-700/60',
              )}
            >
              <div className={cn('p-5 font-semibold text-ink-700 dark:text-ink-200', isUr && 'font-urdu text-lg')}>
                {isUr ? row.featureUr : row.featureEn}
              </div>
              <div className="p-5 flex items-center gap-2">
                <Check className="h-4 w-4 text-brand-600 shrink-0" strokeWidth={3} />
                <span className="font-bold text-brand-700 dark:text-brand-400">{row.nafaa}</span>
              </div>
              <div className="p-5 flex items-center gap-2 text-ink-500 dark:text-ink-400">
                <X className="h-4 w-4 shrink-0" strokeWidth={3} />
                <span>{row.others}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}
