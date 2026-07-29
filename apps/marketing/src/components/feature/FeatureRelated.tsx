'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { features } from '@/lib/data/features';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import type { FeatureContent } from '@/lib/data/feature-content';
import { cn } from '@/lib/cn';

export function FeatureRelated({ content }: { content: FeatureContent }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  const related = features.filter((f) => content.relatedSlugs.includes(f.slug));

  if (related.length === 0) return null;

  return (
    <Section variant="default" spacing="lg">
      <Container>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.06)}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <motion.div variants={fadeUp}>
            <Eyebrow variant="mono">
              {isUr ? 'مزید خصوصیات' : 'More features'}
            </Eyebrow>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-4xl tracking-tight',
              isUr && 'font-urdu leading-snug',
            )}
          >
            {isUr ? 'اکٹھے استعمال کریں' : 'Better together'}
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.04)}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
        >
          {related.map((f) => {
            const IconComp = (Icons as any)[f.icon] ?? Icons.Sparkles;
            return (
              <motion.div key={f.slug} variants={fadeUp}>
                <Link
                  href={`/product/${f.slug}`}
                  className={cn(
                    'group flex flex-col items-center gap-3 p-6 rounded-2xl',
                    'bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60',
                    'hover:ring-brand-400 dark:hover:ring-brand-600 hover:-translate-y-1 transition-all duration-300',
                  )}
                >
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${f.color}, ${f.color}dd)` }}
                  >
                    <IconComp className="h-6 w-6" />
                  </div>
                  <div className={cn('text-sm font-bold text-center', isUr && 'font-urdu text-base')}>
                    {isUr ? f.nameUr : f.nameEn}
                  </div>
                  <ArrowRight className="h-4 w-4 text-ink-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </Container>
    </Section>
  );
}
