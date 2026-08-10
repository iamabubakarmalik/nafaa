'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Flame, Star } from 'lucide-react';
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

  // Show 12 featured + hot industries on homepage
  const shown = industries.filter((i) => i.featured || i.hot).slice(0, 12);

  return (
    <Section variant="subtle" spacing="lg">
      <Container>
        <motion.div
          initial="hidden" whileInView="visible" viewport={viewport}
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
            {isUr
              ? 'قالین سے فارمیسی، کریانہ سے زیورات — بتیس صنعتوں کے لیے مخصوص ورک فلو'
              : 'From carpets to pharmacies, kiryana to jewelry — purpose-built workflows for thirty-two industries'}
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={viewport}
          variants={staggerContainer(0.03)}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4"
        >
          {shown.map((ind) => (
            <motion.div key={ind.slug} variants={fadeUp}>
              <Link
                href={`/industries/${ind.slug}`}
                className={cn(
                  'group relative block rounded-2xl overflow-hidden',
                  'bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60',
                  'transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover',
                )}
              >
                {/* Colored top strip */}
                <div className="h-1 w-full" style={{
                  background: `linear-gradient(90deg, ${ind.color}, ${ind.colorDark})`,
                }} />

                {/* Hover gradient */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `linear-gradient(135deg, ${ind.color}10, transparent 70%)` }}
                />

                <div className="relative p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl transition-transform duration-500 group-hover:scale-110 shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${ind.color}25, ${ind.color}10)` }}
                    >
                      {ind.emoji}
                    </div>
                    {ind.hot && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-sunset/15 text-sunset">
                        <Flame className="h-2.5 w-2.5" /> HOT
                      </span>
                    )}
                    {ind.featured && !ind.hot && (
                      <Star className="h-4 w-4 text-gold fill-gold" />
                    )}
                  </div>
                  <h3
                    className={cn(
                      'font-bold text-sm leading-tight text-ink-900 dark:text-white',
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
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all"
                    style={{ color: ind.color }}
                  >
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
            {isUr ? 'تمام ۳۲ صنعتیں دیکھیں' : 'View all 32 industries'}
          </Button>
        </div>
      </Container>
    </Section>
  );
}
