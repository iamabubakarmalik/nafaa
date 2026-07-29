'use client';

import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import type { IntegrationContent } from '@/lib/data/integration-content';
import { cn } from '@/lib/cn';

export function IntegrationUseCases({ content }: { content: IntegrationContent }) {
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
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <motion.div variants={fadeUp}>
            <Eyebrow variant="gold" icon={<Target className="h-3.5 w-3.5" />}>
              {isUr ? 'کس کے لیے' : 'Who this is for'}
            </Eyebrow>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance',
              isUr && 'font-urdu leading-snug',
            )}
          >
            {isUr ? 'مثالی استعمال کے مواقع' : 'Perfect use cases'}
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.05)}
          className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto"
        >
          {content.useCases.map((u, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className={cn(
                'flex items-center gap-4 rounded-2xl bg-white dark:bg-ink-800 p-5',
                'ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60',
                'hover:shadow-card-hover transition-all duration-300',
              )}
            >
              <div className="h-10 w-10 rounded-xl bg-brand-100 dark:bg-brand-950 flex items-center justify-center shrink-0">
                <span className="font-display font-extrabold text-brand-600 dark:text-brand-400 text-sm">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <p className={cn(
                'font-semibold text-ink-700 dark:text-ink-200 leading-relaxed',
                isUr ? 'font-urdu text-lg' : 'text-base',
              )}>
                {isUr ? u.ur : u.en}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}
