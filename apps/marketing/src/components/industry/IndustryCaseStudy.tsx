'use client';

import { motion } from 'framer-motion';
import { Quote, TrendingUp, MapPin, Store, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import { getCaseStudyForIndustry } from '@/lib/data/case-studies';
import type { Industry } from '@/lib/data/industries';
import { cn } from '@/lib/cn';

export function IndustryCaseStudy({ industry }: { industry: Industry }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';
  const cs = getCaseStudyForIndustry(industry.slug);

  if (!cs) return null;

  return (
    <Section variant="default" spacing="lg" className="relative overflow-hidden">
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ background: industry.color }}
      />

      <Container className="relative">
        <motion.div
          initial="hidden" whileInView="visible" viewport={viewport}
          variants={staggerContainer(0.06)}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest font-bold ring-1 ring-inset"
            style={{
              color: industry.color,
              background: `${industry.color}10`,
              boxShadow: `0 0 0 1px ${industry.color}30 inset`,
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isUr ? 'اصلی کہانی' : 'Real customer story'}
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance',
              isUr && 'font-urdu leading-snug',
            )}
          >
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(135deg, ${industry.color}, ${industry.colorDark})` }}
            >
              {isUr ? cs.headline.ur : cs.headline.en}
            </span>
          </motion.h2>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          {/* Business card + Quote */}
          <div className="grid lg:grid-cols-5 gap-6 mb-8">
            {/* Business info */}
            <motion.div
              variants={fadeUp}
              initial="hidden" whileInView="visible" viewport={viewport}
              className="lg:col-span-2 rounded-3xl bg-white dark:bg-ink-800 p-6 lg:p-8 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 shadow-xl"
            >
              <div className="flex items-start justify-between mb-6">
                <div
                  className="h-16 w-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg text-white"
                  style={{ background: `linear-gradient(135deg, ${industry.color}, ${industry.colorDark})` }}
                >
                  {industry.emoji}
                </div>
                <div className="text-right">
                  <div className={cn('text-[10px] font-mono uppercase tracking-widest font-bold text-ink-500 mb-0.5', isUr && 'font-urdu text-xs')}>
                    {isUr ? 'استعمال میں' : 'On Nafaa since'}
                  </div>
                  <div className="font-display font-extrabold text-xl tabular-nums" style={{ color: industry.color }}>
                    {cs.yearsWithNafaa} {isUr ? 'سال' : 'yrs'}
                  </div>
                </div>
              </div>

              <div className={cn('font-display font-extrabold text-2xl mb-1', isUr && 'font-urdu text-3xl')}>
                {isUr ? cs.businessNameUr : cs.businessNameEn}
              </div>
              <div className={cn('text-ink-500 text-sm mb-4', isUr && 'font-urdu text-base')}>
                {isUr ? cs.ownerUr : cs.ownerEn} · {isUr ? 'مالک' : 'Owner'}
              </div>

              <div className="space-y-2 pt-4 border-t border-ink-100 dark:border-ink-700">
                <div className={cn('flex items-center gap-2 text-sm', isUr && 'font-urdu text-base')}>
                  <MapPin className="h-4 w-4 text-ink-400" />
                  <span className="text-ink-600 dark:text-ink-300">{isUr ? cs.cityUr : cs.city}</span>
                </div>
                <div className={cn('flex items-center gap-2 text-sm', isUr && 'font-urdu text-base')}>
                  <Store className="h-4 w-4 text-ink-400" />
                  <span className="text-ink-600 dark:text-ink-300">
                    {cs.shopCount} {isUr ? 'دکانیں' : 'locations'}
                  </span>
                </div>
                <div className={cn('flex items-center gap-2 text-sm', isUr && 'font-urdu text-base')}>
                  <Calendar className="h-4 w-4 text-ink-400" />
                  <span className="text-ink-600 dark:text-ink-300">
                    {isUr ? 'قائم' : 'Est.'} {cs.founded}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Big quote */}
            <motion.div
              variants={fadeUp}
              initial="hidden" whileInView="visible" viewport={viewport}
              className="lg:col-span-3 relative rounded-3xl p-8 lg:p-10 text-white shadow-2xl overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${industry.color}, ${industry.colorDark})` }}
            >
              <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
              <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

              <Quote className="h-12 w-12 text-white/30 mb-4" />
              <p className={cn(
                'text-xl lg:text-2xl font-display font-bold leading-relaxed relative',
                isUr && 'font-urdu text-2xl lg:text-3xl leading-loose',
              )}>
                {isUr ? cs.quote.ur : cs.quote.en}
              </p>
              <div className="mt-6 pt-6 border-t border-white/20 flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-bold">
                  {cs.ownerEn.charAt(0)}
                </div>
                <div>
                  <div className={cn('font-bold', isUr && 'font-urdu text-lg')}>
                    {isUr ? cs.ownerUr : cs.ownerEn}
                  </div>
                  <div className={cn('text-sm text-white/80', isUr && 'font-urdu text-base')}>
                    {isUr ? cs.businessNameUr : cs.businessNameEn}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Challenge → Solution */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <motion.div
              variants={fadeUp}
              initial="hidden" whileInView="visible" viewport={viewport}
              className="rounded-3xl bg-white dark:bg-ink-800 p-6 lg:p-8 ring-1 ring-inset ring-red-200 dark:ring-red-900"
            >
              <div className={cn('text-eyebrow font-mono text-red-600 mb-3', isUr && 'font-urdu text-sm')}>
                {isUr ? 'چیلنج' : 'The challenge'}
              </div>
              <p className={cn('text-ink-700 dark:text-ink-200 leading-relaxed', isUr ? 'font-urdu text-lg leading-loose' : 'text-base')}>
                {isUr ? cs.challenge.ur : cs.challenge.en}
              </p>
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden" whileInView="visible" viewport={viewport}
              className="rounded-3xl p-6 lg:p-8 ring-1 ring-inset shadow-lg"
              style={{
                background: `${industry.color}08`,
                boxShadow: `0 0 0 1px ${industry.color}30 inset`,
              }}
            >
              <div className={cn('text-eyebrow font-mono mb-3', isUr && 'font-urdu text-sm')} style={{ color: industry.color }}>
                {isUr ? 'نفع کا حل' : 'Nafaa solution'}
              </div>
              <p className={cn('text-ink-700 dark:text-ink-200 leading-relaxed', isUr ? 'font-urdu text-lg leading-loose' : 'text-base')}>
                {isUr ? cs.solution.ur : cs.solution.en}
              </p>
            </motion.div>
          </div>

          {/* Before/After grid */}
          <motion.div
            variants={fadeUp}
            initial="hidden" whileInView="visible" viewport={viewport}
            className="rounded-3xl bg-white dark:bg-ink-800 overflow-hidden shadow-xl ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 mb-8"
          >
            <div className="grid grid-cols-2">
              {/* Before */}
              <div className="p-6 lg:p-8 border-r border-ink-100 dark:border-ink-700 relative">
                <div className="absolute top-4 right-4 opacity-40">
                  <TrendingUp className="h-8 w-8 text-red-500 rotate-180" />
                </div>
                <div className={cn('text-eyebrow font-mono text-red-600 mb-1', isUr && 'font-urdu text-sm')}>
                  {isUr ? 'نفع سے پہلے' : 'Before Nafaa'}
                </div>
                <div className={cn('font-display font-bold text-lg mb-6', isUr && 'font-urdu text-xl')}>
                  {isUr ? 'مسلسل مسائل' : 'Constant struggle'}
                </div>
                <div className="space-y-3">
                  {cs.beforeMetrics.map((m) => (
                    <div key={m.labelEn} className="flex items-baseline justify-between">
                      <span className={cn('text-sm text-ink-500', isUr && 'font-urdu text-base')}>
                        {isUr ? m.labelUr : m.labelEn}
                      </span>
                      <span className="font-display font-extrabold text-xl tabular-nums text-red-600">
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* After */}
              <div
                className="p-6 lg:p-8 relative"
                style={{ background: `linear-gradient(135deg, ${industry.color}08, transparent)` }}
              >
                <div className="absolute top-4 right-4 opacity-40">
                  <TrendingUp className="h-8 w-8" style={{ color: industry.color }} />
                </div>
                <div className={cn('text-eyebrow font-mono mb-1', isUr && 'font-urdu text-sm')} style={{ color: industry.color }}>
                  {isUr ? 'نفع کے ساتھ' : 'With Nafaa'}
                </div>
                <div className={cn('font-display font-bold text-lg mb-6', isUr && 'font-urdu text-xl')}>
                  {isUr ? 'مکمل کنٹرول' : 'Full control'}
                </div>
                <div className="space-y-3">
                  {cs.afterMetrics.map((m, i) => (
                    <div key={m.labelEn} className="flex items-baseline justify-between">
                      <span className={cn('text-sm text-ink-500', isUr && 'font-urdu text-base')}>
                        {isUr ? m.labelUr : m.labelEn}
                      </span>
                      <span className="font-display font-extrabold text-xl tabular-nums" style={{ color: industry.color }}>
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Timeline */}
          <motion.div
            variants={fadeUp}
            initial="hidden" whileInView="visible" viewport={viewport}
            className="rounded-3xl bg-white dark:bg-ink-800 p-6 lg:p-8 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 shadow-xl"
          >
            <div className={cn('text-eyebrow font-mono mb-4', isUr && 'font-urdu text-sm')} style={{ color: industry.color }}>
              {isUr ? 'ترقی کی ٹائم لائن' : 'Growth timeline'}
            </div>

            <div className="relative">
              {/* Line */}
              <div className="absolute top-6 left-6 right-6 h-0.5 hidden md:block" style={{
                background: `linear-gradient(to right, transparent, ${industry.color}60, transparent)`,
              }} />

              <div className="grid md:grid-cols-4 gap-6 relative">
                {cs.timeline.map((t, i) => (
                  <motion.div
                    key={t.month}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={viewport}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="h-12 w-12 rounded-full flex items-center justify-center text-white font-display font-bold text-xs ring-4 ring-white dark:ring-ink-800 shrink-0 shadow-lg z-10"
                        style={{ background: `linear-gradient(135deg, ${industry.color}, ${industry.colorDark})` }}
                      >
                        {isUr ? t.monthUr : t.month}
                      </div>
                    </div>
                    <div className={cn('font-bold text-sm mb-1', isUr && 'font-urdu text-base')}>
                      {isUr ? t.event.ur : t.event.en}
                    </div>
                    <div className={cn('inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full', isUr && 'font-urdu text-sm')}
                      style={{
                        color: industry.color,
                        background: `${industry.color}15`,
                      }}
                    >
                      <ArrowRight className="h-2.5 w-2.5" />
                      {t.impact}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </Section>
  );
}
