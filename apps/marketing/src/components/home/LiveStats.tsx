'use client';

import { motion } from 'framer-motion';
import { Store, MapPin, Zap, ShieldCheck, Layers, Plug } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Counter } from '@/components/primitives/Counter';
import { LiveDot } from '@/components/primitives/LiveDot';
import { liveStats } from '@/lib/data/stats';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import { cn } from '@/lib/cn';

export function LiveStats() {
  const { t, locale } = useLocale();
  const isUr = locale === 'ur';

  const stats = [
    { icon: Store, value: liveStats.activeShops, labelEn: 'Active businesses', labelUr: 'فعال کاروبار', suffix: '+', color: 'text-brand-600' },
    { icon: MapPin, value: liveStats.citiesServed, labelEn: 'Cities across Pakistan', labelUr: 'شہر پاکستان بھر میں', color: 'text-aurora-purple' },
    { icon: Zap, value: liveStats.transactionsToday, labelEn: 'Transactions today', labelUr: 'آج کے لین دین', color: 'text-sunset' },
    { icon: ShieldCheck, value: liveStats.uptime, labelEn: 'System uptime', labelUr: 'سسٹم دستیابی', suffix: '%', decimals: 2, color: 'text-emerald-500' },
    { icon: Layers, value: liveStats.industriesCovered, labelEn: 'Industries covered', labelUr: 'صنعتیں شامل', color: 'text-aurora-pink' },
    { icon: Plug, value: liveStats.integrationsLive, labelEn: 'Live integrations', labelUr: 'لائیو انضمام', color: 'text-trust' },
  ];

  return (
    <Section variant="subtle" spacing="md">
      <Container>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.06)}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <motion.div variants={fadeUp}>
            <Eyebrow variant="brand" icon={<LiveDot color="emerald" size="sm" />}>
              {isUr ? 'حقیقی وقت میں' : 'Real time'}
            </Eyebrow>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight',
              isUr && 'font-urdu leading-snug',
            )}
          >
            {t('stats.title')}
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className={cn(
              'mt-4 text-lg text-ink-600 dark:text-ink-300',
              isUr && 'font-urdu text-xl leading-loose',
            )}
          >
            {t('stats.subtitle')}
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.05)}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6"
        >
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={i}
                variants={fadeUp}
                className={cn(
                  'relative rounded-2xl bg-white dark:bg-ink-800 p-5',
                  'ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60',
                  'hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300',
                )}
              >
                <div className={cn('inline-flex h-10 w-10 rounded-xl items-center justify-center bg-ink-50 dark:bg-ink-900', s.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-3 text-3xl lg:text-4xl font-display font-extrabold tabular-nums text-ink-900 dark:text-white">
                  <Counter
                    value={s.value}
                    suffix={s.suffix ?? ''}
                    decimals={s.decimals ?? 0}
                  />
                </div>
                <div className={cn(
                  'mt-1 text-xs font-semibold text-ink-500 dark:text-ink-400',
                  isUr && 'font-urdu text-sm',
                )}>
                  {isUr ? s.labelUr : s.labelEn}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </Container>
    </Section>
  );
}
