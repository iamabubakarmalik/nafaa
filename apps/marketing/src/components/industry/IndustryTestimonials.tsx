'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { testimonials } from '@/lib/data/testimonials';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import type { IndustryContent } from '@/lib/data/industry-content';
import type { Industry } from '@/lib/data/industries';
import { cn } from '@/lib/cn';

export function IndustryTestimonials({ industry, content }: { industry: Industry; content: IndustryContent }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  const industryTestimonials = testimonials.filter((t) =>
    content.testimonialIds.includes(t.id) || t.industry === industry.slug,
  );

  if (industryTestimonials.length === 0) return null;

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
            <Eyebrow variant="gold">
              {isUr ? 'اصلی کہانی' : 'Customer story'}
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
              ? `${industry.nameUr} کے مالکان کیا کہتے ہیں`
              : `What ${industry.nameEn.toLowerCase()} owners say`}
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.05)}
          className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto"
        >
          {industryTestimonials.slice(0, 2).map((t) => (
            <motion.div
              key={t.id}
              variants={fadeUp}
              className={cn(
                'relative rounded-3xl bg-white dark:bg-ink-800 p-8',
                'ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 shadow-lg',
              )}
            >
              <Quote className="absolute top-6 right-6 h-10 w-10 text-brand-100 dark:text-brand-900/40" />
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-gold text-gold" />
                ))}
              </div>
              <blockquote className={cn(
                'text-ink-700 dark:text-ink-200 leading-relaxed text-lg',
                isUr && 'font-urdu text-xl leading-loose',
              )}>
                &ldquo;{isUr ? t.quoteUr : t.quoteEn}&rdquo;
              </blockquote>
              {t.metric && (
                <div className="mt-6 inline-flex items-baseline gap-2 rounded-full bg-brand-50 dark:bg-brand-950/40 px-4 py-2 ring-1 ring-inset ring-brand-200 dark:ring-brand-800/50">
                  <span className={cn('font-display font-extrabold text-brand-600 dark:text-brand-400 tabular-nums text-lg', isUr && 'font-urdu')}>
                    {isUr ? t.metric.valueUr : t.metric.valueEn}
                  </span>
                  <span className={cn('text-xs font-semibold text-brand-700 dark:text-brand-300', isUr && 'font-urdu text-sm')}>
                    {isUr ? t.metric.labelUr : t.metric.labelEn}
                  </span>
                </div>
              )}
              <div className="mt-6 pt-6 border-t border-ink-100 dark:border-ink-700/60 flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand-100 to-emerald-100 dark:from-brand-950 dark:to-emerald-950 flex items-center justify-center text-2xl">
                  {t.avatar}
                </div>
                <div>
                  <div className={cn('font-bold', isUr && 'font-urdu text-lg')}>
                    {isUr ? t.nameUr : t.nameEn}
                  </div>
                  <div className={cn('text-sm text-ink-500 dark:text-ink-400', isUr && 'font-urdu text-base')}>
                    {isUr ? `${t.roleUr} · ${t.businessUr} · ${t.cityUr}` : `${t.roleEn} · ${t.businessEn} · ${t.city}`}
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
