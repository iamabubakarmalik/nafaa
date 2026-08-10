'use client';

import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import type { IndustryContent } from '@/lib/data/industry-content';
import type { Industry } from '@/lib/data/industries';
import { cn } from '@/lib/cn';

export function IndustrySolutions({ industry, content }: { industry: Industry; content: IndustryContent }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  return (
    <Section variant="default" spacing="lg">
      <Container>
        <motion.div
          initial="hidden" whileInView="visible" viewport={viewport}
          variants={staggerContainer(0.06)}
          className="max-w-3xl mb-14"
        >
          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest font-bold ring-1 ring-inset"
            style={{
              color: industry.color,
              background: `${industry.color}10`,
              boxShadow: `0 0 0 1px ${industry.color}30 inset`,
            }}
          >
            {isUr ? 'خصوصیات' : 'Purpose-built features'}
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance',
              isUr && 'font-urdu leading-snug',
            )}
          >
            {isUr
              ? `ہر وہ چیز جو ${industry.nameUr} کو چاہیے`
              : `Everything a ${industry.nameEn.toLowerCase()} needs`}
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={viewport}
          variants={staggerContainer(0.05)}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {content.solutions.map((s, i) => {
            const IconComp = (Icons as any)[s.icon] ?? Icons.Sparkles;
            return (
              <motion.div
                key={i}
                variants={fadeUp}
                className={cn(
                  'group relative rounded-2xl bg-white dark:bg-ink-800 p-6 overflow-hidden',
                  'ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60',
                  'hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300',
                )}
              >
                {/* Hover gradient */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `linear-gradient(135deg, ${industry.color}08, transparent)` }}
                />
                {/* Number in corner */}
                <div className="absolute top-4 right-4 text-4xl font-display font-extrabold opacity-10" style={{ color: industry.color }}>
                  {String(i + 1).padStart(2, '0')}
                </div>

                <div className="relative">
                  <div
                    className="inline-flex h-12 w-12 rounded-xl items-center justify-center text-white shadow-lg mb-4"
                    style={{ background: `linear-gradient(135deg, ${industry.color}, ${industry.colorDark})` }}
                  >
                    <IconComp className="h-6 w-6" />
                  </div>
                  <h3 className={cn(
                    'font-display font-bold text-lg text-ink-900 dark:text-white mb-2',
                    'group-hover:text-brand-600 transition-colors',
                    isUr && 'font-urdu text-xl',
                  )}
                    style={{ ['--hover-color' as any]: industry.color }}
                  >
                    {isUr ? s.titleUr : s.titleEn}
                  </h3>
                  <p className={cn(
                    'text-ink-600 dark:text-ink-300 leading-relaxed',
                    isUr ? 'font-urdu text-lg leading-loose' : 'text-sm',
                  )}>
                    {isUr ? s.descUr : s.descEn}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </Container>
    </Section>
  );
}
