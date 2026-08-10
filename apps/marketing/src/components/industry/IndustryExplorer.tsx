'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import { industries, industryCategories, type IndustryCategory } from '@/lib/data/industries';
import type { Industry } from '@/lib/data/industries';
import { cn } from '@/lib/cn';

export function IndustryExplorer({ current }: { current: Industry }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  // Same-category industries (excluding current)
  const sameCategory = industries.filter((i) => i.category === current.category && i.slug !== current.slug);
  // Hot industries from other categories
  const hotOthers = industries.filter((i) => i.hot && i.category !== current.category).slice(0, 4);

  return (
    <Section variant="subtle" spacing="lg">
      <Container>
        <motion.div
          initial="hidden" whileInView="visible" viewport={viewport}
          variants={staggerContainer(0.06)}
          className="max-w-3xl mb-10"
        >
          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest font-bold ring-1 ring-inset"
            style={{
              color: current.color,
              background: `${current.color}10`,
              boxShadow: `0 0 0 1px ${current.color}30 inset`,
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isUr ? 'مزید صنعتیں دیکھیں' : 'Explore more'}
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-4xl tracking-tight text-balance',
              isUr && 'font-urdu leading-snug',
            )}
          >
            {isUr
              ? `${industryCategories[current.category].ur} کیٹیگری میں دیگر صنعتیں`
              : `Other industries in ${industryCategories[current.category].en}`}
          </motion.h2>
        </motion.div>

        {/* Same category */}
        {sameCategory.length > 0 && (
          <motion.div
            initial="hidden" whileInView="visible" viewport={viewport}
            variants={staggerContainer(0.04)}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-14"
          >
            {sameCategory.map((ind) => (
              <motion.div key={ind.slug} variants={fadeUp}>
                <Link
                  href={`/industries/${ind.slug}`}
                  className="group relative block rounded-2xl overflow-hidden bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300"
                >
                  <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${ind.color}, ${ind.colorDark})` }} />
                  <div className="p-5">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl mb-3 shadow-sm group-hover:scale-110 transition-transform"
                      style={{ background: `linear-gradient(135deg, ${ind.color}25, ${ind.color}10)` }}
                    >
                      {ind.emoji}
                    </div>
                    <h3 className={cn(
                      'font-bold text-sm leading-tight mb-1',
                      'group-hover:text-brand-600 transition-colors',
                      isUr && 'font-urdu text-base',
                    )}>
                      {isUr ? ind.nameUr : ind.nameEn}
                    </h3>
                    <p className={cn('text-xs text-ink-500 line-clamp-2', isUr && 'font-urdu text-sm')}>
                      {isUr ? ind.tagUr : ind.tagEn}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Hot industries from other categories */}
        <motion.div variants={fadeUp} className="mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-sunset" />
            <span className={cn('text-eyebrow font-mono text-sunset', isUr && 'font-urdu text-sm')}>
              {isUr ? 'دوسری مقبول صنعتیں' : 'Hot in other categories'}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={viewport}
          variants={staggerContainer(0.04)}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {hotOthers.map((ind) => (
            <motion.div key={ind.slug} variants={fadeUp}>
              <Link
                href={`/industries/${ind.slug}`}
                className="group flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:ring-brand-400 transition-all"
              >
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                  style={{ background: `${ind.color}15` }}
                >
                  {ind.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn('font-bold text-sm truncate group-hover:text-brand-600', isUr && 'font-urdu text-base')}>
                    {isUr ? ind.nameUr : ind.nameEn}
                  </div>
                  <div className="text-[10px] text-ink-500">{industryCategories[ind.category][isUr ? 'ur' : 'en']}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-ink-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* View all */}
        <div className="text-center mt-12">
          <Link
            href="/industries"
            className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl font-bold ring-1 ring-inset ring-ink-200 dark:ring-ink-700 hover:bg-white dark:hover:bg-ink-800 hover:shadow-lg transition-all"
          >
            {isUr ? 'تمام ۳۲ صنعتیں دیکھیں' : 'View all 32 industries'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Container>
    </Section>
  );
}
