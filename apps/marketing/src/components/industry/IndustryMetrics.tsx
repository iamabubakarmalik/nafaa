'use client';

import { motion } from 'framer-motion';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import type { IndustryContent } from '@/lib/data/industry-content';
import { cn } from '@/lib/cn';

export function IndustryMetrics({ content }: { content: IndustryContent }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  return (
    <Section variant="default" spacing="lg" className="relative">
      <AuroraBackground variant="brand" intensity="subtle" />
      <Container className="relative">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.06)}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <motion.div variants={fadeUp}>
            <Eyebrow variant="gold">
              {isUr ? 'حقیقی نتائج' : 'Real results'}
            </Eyebrow>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance',
              isUr && 'font-urdu leading-snug',
            )}
          >
            {isUr ? 'اعداد و شمار جھوٹ نہیں بولتے' : 'The numbers speak for themselves'}
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.05)}
          className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6"
        >
          {content.keyMetrics.map((m, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className={cn(
                'text-center rounded-2xl bg-white dark:bg-ink-800 p-6',
                'ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60',
                'hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300',
              )}
            >
              <div className={cn(
                'font-display font-extrabold text-4xl lg:text-5xl text-gradient-brand',
                isUr && 'font-urdu',
              )}>
                {isUr ? m.valueUr : m.valueEn}
              </div>
              <div className={cn(
                'mt-2 text-sm font-semibold text-ink-600 dark:text-ink-300',
                isUr && 'font-urdu text-base',
              )}>
                {isUr ? m.labelUr : m.labelEn}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}
