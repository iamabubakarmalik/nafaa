'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { testimonials } from '@/lib/data/testimonials';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import { cn } from '@/lib/cn';

export function Testimonials() {
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
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <motion.div variants={fadeUp}>
            <Eyebrow variant="gold">{t('testimonials.eyebrow')}</Eyebrow>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance',
              isUr && 'font-urdu leading-snug',
            )}
          >
            {t('testimonials.title')}
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className={cn(
              'mt-4 text-lg text-ink-600 dark:text-ink-300',
              isUr && 'font-urdu text-xl leading-loose',
            )}
          >
            {t('testimonials.subtitle')}
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.05)}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {testimonials.slice(0, 6).map((tt, i) => (
            <motion.div
              key={tt.id}
              variants={fadeUp}
              className={cn(
                'relative rounded-3xl bg-white dark:bg-ink-800 p-7',
                'ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60',
                'hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300',
              )}
            >
              <Quote className="absolute top-6 right-6 h-8 w-8 text-brand-100 dark:text-brand-900/40" />

              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: tt.rating }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 fill-gold text-gold" />
                ))}
              </div>

              <blockquote className={cn(
                'text-ink-700 dark:text-ink-200 leading-relaxed',
                isUr && 'font-urdu text-lg leading-loose',
              )}>
                &ldquo;{isUr ? tt.quoteUr : tt.quoteEn}&rdquo;
              </blockquote>

              {tt.metric && (
                <div className="mt-5 inline-flex items-baseline gap-2 rounded-full bg-brand-50 dark:bg-brand-950/40 px-3 py-1.5 ring-1 ring-inset ring-brand-200 dark:ring-brand-800/50">
                  <span className={cn(
                    'font-display font-extrabold text-brand-600 dark:text-brand-400 tabular-nums',
                    isUr && 'font-urdu',
                  )}>
                    {isUr ? tt.metric.valueUr : tt.metric.valueEn}
                  </span>
                  <span className={cn(
                    'text-xs text-brand-700 dark:text-brand-300 font-semibold',
                    isUr && 'font-urdu text-sm',
                  )}>
                    {isUr ? tt.metric.labelUr : tt.metric.labelEn}
                  </span>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-ink-100 dark:border-ink-700/60 flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand-100 to-emerald-100 dark:from-brand-950 dark:to-emerald-950 flex items-center justify-center text-xl">
                  {tt.avatar}
                </div>
                <div>
                  <div className={cn('font-bold text-sm', isUr && 'font-urdu text-base')}>
                    {isUr ? tt.nameUr : tt.nameEn}
                  </div>
                  <div className={cn('text-xs text-ink-500 dark:text-ink-400', isUr && 'font-urdu text-sm')}>
                    {isUr ? `${tt.roleUr} · ${tt.businessUr} · ${tt.cityUr}` : `${tt.roleEn} · ${tt.businessEn} · ${tt.city}`}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}
