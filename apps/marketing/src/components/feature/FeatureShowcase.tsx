'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import type { Feature } from '@/lib/data/features';
import type { FeatureContent } from '@/lib/data/feature-content';
import { cn } from '@/lib/cn';

export function FeatureShowcase({ feature, content }: { feature: Feature; content: FeatureContent }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  return (
    <Section variant="default" spacing="lg" className="relative">
      <AuroraBackground variant="brand" intensity="subtle" />
      <Container className="relative">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={staggerContainer(0.06)}
          >
            <motion.div variants={fadeUp}>
              <Eyebrow variant="gold">
                {isUr ? 'گہرا نقطہ نظر' : 'A closer look'}
              </Eyebrow>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className={cn(
                'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance',
                isUr && 'font-urdu leading-snug',
              )}
            >
              {isUr ? content.showcaseTitleUr : content.showcaseTitleEn}
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className={cn(
                'mt-6 text-lg text-ink-600 dark:text-ink-300 leading-relaxed',
                isUr && 'font-urdu text-xl leading-loose',
              )}
            >
              {isUr ? content.showcaseDescUr : content.showcaseDescEn}
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={staggerContainer(0.04)}
            className={cn(
              'rounded-3xl p-8 lg:p-10 text-white shadow-2xl',
            )}
            style={{ background: `linear-gradient(135deg, ${feature.color}, ${feature.color}dd)` }}
          >
            <ul className="space-y-4">
              {content.showcasePoints.map((p, i) => (
                <motion.li key={i} variants={fadeUp} className="flex items-start gap-3">
                  <span className="mt-0.5 h-6 w-6 rounded-full bg-white/25 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                  </span>
                  <span className={cn('text-white/95 leading-relaxed', isUr ? 'font-urdu text-lg leading-loose' : 'text-base')}>
                    {isUr ? p.ur : p.en}
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
