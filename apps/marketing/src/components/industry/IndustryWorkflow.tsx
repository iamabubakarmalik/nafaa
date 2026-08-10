'use client';

import { motion } from 'framer-motion';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import type { IndustryContent } from '@/lib/data/industry-content';
import type { Industry } from '@/lib/data/industries';
import { cn } from '@/lib/cn';

export function IndustryWorkflow({ industry, content }: { industry: Industry; content: IndustryContent }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  return (
    <Section variant="subtle" spacing="lg">
      <Container>
        <motion.div
          initial="hidden" whileInView="visible" viewport={viewport}
          variants={staggerContainer(0.06)}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest font-bold ring-1 ring-inset"
            style={{
              color: industry.color,
              background: `${industry.color}10`,
              boxShadow: `0 0 0 1px ${industry.color}30 inset`,
            }}
          >
            {isUr ? 'کیسے کام کرتا ہے' : 'How it works'}
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance',
              isUr && 'font-urdu leading-snug',
            )}
          >
            {isUr ? 'چار قدموں میں شروع' : 'Live in four simple steps'}
          </motion.h2>
        </motion.div>

        <div className="relative">
          {/* Connecting line — industry color */}
          <div
            className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-0.5"
            style={{
              background: `linear-gradient(to right, transparent, ${industry.color}60, transparent)`,
            }}
            aria-hidden
          />

          <motion.div
            initial="hidden" whileInView="visible" viewport={viewport}
            variants={staggerContainer(0.08)}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative"
          >
            {content.workflowSteps.map((step, i) => (
              <motion.div key={i} variants={fadeUp} className="relative text-center">
                <div className="relative inline-flex mb-6">
                  <div
                    className="absolute inset-0 rounded-full blur-xl opacity-50"
                    style={{ background: industry.color }}
                  />
                  <div
                    className="relative h-20 w-20 rounded-full flex items-center justify-center text-3xl font-display font-extrabold text-white shadow-2xl ring-4 ring-white dark:ring-ink-900 z-10"
                    style={{ background: `linear-gradient(135deg, ${industry.color}, ${industry.colorDark})` }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>
                </div>
                <h3 className={cn(
                  'font-display font-bold text-lg text-ink-900 dark:text-white mb-2',
                  isUr && 'font-urdu text-xl',
                )}>
                  {isUr ? step.titleUr : step.titleEn}
                </h3>
                <p className={cn(
                  'text-ink-600 dark:text-ink-300 leading-relaxed',
                  isUr ? 'font-urdu text-lg leading-loose' : 'text-sm',
                )}>
                  {isUr ? step.descUr : step.descEn}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Container>
    </Section>
  );
}
