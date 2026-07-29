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
import { cn } from '@/lib/cn';

export function IndustriesGrid() {
  const { t, locale } = useLocale();
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
            <Eyebrow variant="aurora">{t('industries.eyebrow')}</Eyebrow>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance',
              isUr && 'font-urdu leading-snug',
            )}
          >
            {t('industries.title')}
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className={cn(
              'mt-4 text-lg lg:text-xl text-ink-600 dark:text-ink-300',
              isUr && 'font-urdu text-xl leading-loose',
            )}
          >
            {t('industries.subtitle')}
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.03)}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4"
        >
          {industries.map((ind) => (
            <motion.div key={ind.slug} variants={fadeUp}>
              <Link
                href={`/industries/${ind.slug}`}
                className={cn(
                  'group relative block rounded-2xl overflow-hidden',
                  'bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60',
                  'p-5 transition-all duration-300 ease-out-expo',
                  'hover:-translate-y-1 hover:shadow-card-hover',
                )}
              >
                {/* Gradient overlay on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(135deg, ${ind.color}12 0%, ${ind.color}05 100%)`,
                  }}
                />
                <div className="relative">
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center text-2xl transition-transform duration-500 group-hover:scale-110"
                    style={{ background: ind.color + '18' }}
                  >
                    {ind.emoji}
                  </div>
                  <h3
                    className={cn(
                      'mt-3 font-bold text-sm leading-tight text-ink-900 dark:text-white',
                      'group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors',
                      isUr && 'font-urdu text-base leading-snug',
                    )}
                  >
                    {isUr ? ind.nameUr : ind.nameEn}
                  </h3>
                  <p className={cn(
                    'mt-1 text-xs text-ink-500 dark:text-ink-400 line-clamp-2 leading-relaxed',
                    isUr && 'font-urdu text-sm',
                  )}>
                    {isUr ? ind.tagUr : ind.tagEn}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all">
                    {isUr ? 'دیکھیں' : 'Explore'}
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-10 text-center">
          <Button href="/industries" variant="secondary" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
            {t('industries.viewAll')}
          </Button>
        </div>
      </Container>
    </Section>
  );
}
