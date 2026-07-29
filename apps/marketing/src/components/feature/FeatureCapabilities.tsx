'use client';

import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import type { Feature } from '@/lib/data/features';
import type { FeatureContent } from '@/lib/data/feature-content';
import { cn } from '@/lib/cn';

export function FeatureCapabilities({ feature, content }: { feature: Feature; content: FeatureContent }) {
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
              {isUr ? 'صلاحیتیں' : 'Capabilities'}
            </Eyebrow>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance',
              isUr && 'font-urdu leading-snug',
            )}
          >
            {isUr ? 'ہر وہ چیز جو آپ کو چاہیے' : 'Everything you need, nothing you don\'t'}
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.05)}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {content.capabilities.map((c, i) => {
            const IconComp = (Icons as any)[c.icon] ?? Icons.Sparkles;
            return (
              <motion.div
                key={i}
                variants={fadeUp}
                className={cn(
                  'group rounded-2xl bg-white dark:bg-ink-800 p-6',
                  'ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60',
                  'hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300',
                )}
              >
                <div
                  className="inline-flex h-12 w-12 rounded-xl items-center justify-center text-white shadow-lg mb-4"
                  style={{ background: `linear-gradient(135deg, ${feature.color}, ${feature.color}dd)` }}
                >
                  <IconComp className="h-6 w-6" />
                </div>
                <h3 className={cn(
                  'font-display font-bold text-lg text-ink-900 dark:text-white mb-2',
                  isUr && 'font-urdu text-xl',
                )}>
                  {isUr ? c.titleUr : c.titleEn}
                </h3>
                <p className={cn(
                  'text-ink-600 dark:text-ink-300 leading-relaxed',
                  isUr ? 'font-urdu text-lg leading-loose' : 'text-sm',
                )}>
                  {isUr ? c.descUr : c.descEn}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </Container>
    </Section>
  );
}
