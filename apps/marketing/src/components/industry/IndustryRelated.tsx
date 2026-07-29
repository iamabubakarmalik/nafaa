'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Button } from '@/components/primitives/Button';
import { industries } from '@/lib/data/industries';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import type { Industry } from '@/lib/data/industries';
import { cn } from '@/lib/cn';

export function IndustryRelated({ current }: { current: Industry }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  const others = industries.filter((i) => i.slug !== current.slug).slice(0, 6);

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
              {isUr ? 'دیگر صنعتیں' : 'More industries'}
            </Eyebrow>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-4xl tracking-tight',
              isUr && 'font-urdu leading-snug',
            )}
          >
            {isUr ? 'دوسری صنعتیں دیکھیں' : 'Explore other industries'}
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.04)}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          {others.map((ind) => (
            <motion.div key={ind.slug} variants={fadeUp}>
              <Link
                href={`/industries/${ind.slug}`}
                className={cn(
                  'group relative block rounded-2xl overflow-hidden',
                  'bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60',
                  'p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover',
                )}
              >
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: ind.color + '18' }}
                >
                  {ind.emoji}
                </div>
                <div className={cn(
                  'mt-3 font-bold text-sm leading-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors',
                  isUr && 'font-urdu text-base',
                )}>
                  {isUr ? ind.nameUr : ind.nameEn}
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-10 text-center">
          <Button href="/industries" variant="secondary" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
            {isUr ? 'تمام صنعتیں دیکھیں' : 'View all industries'}
          </Button>
        </div>
      </Container>
    </Section>
  );
}
