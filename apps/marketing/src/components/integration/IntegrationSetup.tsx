'use client';

import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import type { IntegrationContent } from '@/lib/data/integration-content';
import type { Integration } from '@/lib/data/integrations';
import { cn } from '@/lib/cn';

export function IntegrationSetup({ integration, content }: { integration: Integration; content: IntegrationContent }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  return (
    <Section variant="default" spacing="lg" id="setup">
      <Container>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.06)}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <motion.div variants={fadeUp}>
            <Eyebrow variant="aurora">
              {isUr ? 'سیٹ اپ گائیڈ' : 'Setup guide'}
            </Eyebrow>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance',
              isUr && 'font-urdu leading-snug',
            )}
          >
            {isUr
              ? `${content.setupTimeMinutes} منٹ میں تیار`
              : `Live in ${content.setupTimeMinutes} minutes`}
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className={cn('mt-4 text-lg text-ink-600 dark:text-ink-300', isUr && 'font-urdu text-xl leading-loose')}
          >
            {isUr
              ? 'کوئی ڈویلپر درکار نہیں۔ کوئی پیچیدہ کوڈ نہیں۔'
              : 'No developers required. No complex code.'}
          </motion.p>
        </motion.div>

        <motion.ol
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.08)}
          className="max-w-4xl mx-auto space-y-4"
        >
          {content.setupSteps.map((step, i) => (
            <motion.li
              key={i}
              variants={fadeUp}
              className={cn(
                'group relative flex gap-5 rounded-2xl bg-white dark:bg-ink-800 p-6 lg:p-8',
                'ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60',
                'hover:shadow-card-hover transition-all duration-300',
              )}
            >
              <div className="shrink-0">
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center text-2xl font-display font-extrabold text-white shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${integration.color}, ${integration.color}dd)` }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  'font-display font-bold text-xl text-ink-900 dark:text-white mb-2',
                  isUr && 'font-urdu text-2xl',
                )}>
                  {isUr ? step.titleUr : step.titleEn}
                </h3>
                <p className={cn(
                  'text-ink-600 dark:text-ink-300 leading-relaxed',
                  isUr ? 'font-urdu text-lg leading-loose' : 'text-base',
                )}>
                  {isUr ? step.descUr : step.descEn}
                </p>
              </div>
              <div className="hidden md:flex items-center shrink-0">
                <CheckCircle2 className="h-6 w-6 text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </Container>
    </Section>
  );
}
