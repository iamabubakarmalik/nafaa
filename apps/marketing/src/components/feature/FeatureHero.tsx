'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { ArrowRight, Play } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import type { Feature } from '@/lib/data/features';
import type { FeatureContent } from '@/lib/data/feature-content';
import { cn } from '@/lib/cn';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

export function FeatureHero({ feature, content }: { feature: Feature; content: FeatureContent }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';
  const IconComp = (Icons as any)[feature.icon] ?? Icons.Sparkles;

  return (
    <section className="relative overflow-hidden pt-12 lg:pt-16 pb-20 lg:pb-24">
      <AuroraBackground variant="brand" intensity="base" />
      <GridBackground className="mask-fade-bottom" />
      <NoiseTexture />

      <Container className="relative">
        <div className="max-w-4xl">
          <motion.nav
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={cn('mb-6 text-sm text-ink-500 dark:text-ink-400 flex items-center gap-2 flex-wrap', isUr && 'font-urdu text-base')}
          >
            <Link href="/" className="hover:text-ink-900 dark:hover:text-white transition-colors">
              {isUr ? 'ہوم' : 'Home'}
            </Link>
            <span>/</span>
            <Link href="/product/pos" className="hover:text-ink-900 dark:hover:text-white transition-colors">
              {isUr ? 'پروڈکٹ' : 'Product'}
            </Link>
            <span>/</span>
            <span className="text-ink-900 dark:text-white font-semibold">
              {isUr ? feature.nameUr : feature.nameEn}
            </span>
          </motion.nav>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-4 mb-6"
          >
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center text-white shadow-xl"
              style={{ background: `linear-gradient(135deg, ${feature.color}, ${feature.color}dd)` }}
            >
              <IconComp className="h-8 w-8" />
            </div>
            <div>
              <Badge variant="brand" size="md" pulse>
                {isUr ? feature.nameUr : feature.nameEn}
              </Badge>
              <div className={cn('mt-1 text-sm text-ink-500 dark:text-ink-400 font-mono uppercase tracking-widest font-bold', isUr && 'font-urdu text-base')}>
                {feature.category === 'core' ? (isUr ? 'بنیادی خصوصیت' : 'Core feature') :
                  feature.category === 'advanced' ? (isUr ? 'جدید خصوصیت' : 'Advanced feature') :
                  (isUr ? 'اے آئی ذہانت' : 'AI intelligence')}
              </div>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={cn(
              'font-display font-extrabold tracking-tight text-balance',
              'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05]',
              isUr && 'font-urdu leading-[1.5]',
            )}
          >
            <GradientText variant="brand">
              {isUr ? content.heroTitleUr : content.heroTitleEn}
            </GradientText>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={cn(
              'mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-3xl leading-relaxed',
              isUr && 'font-urdu text-xl leading-loose',
            )}
          >
            {isUr ? content.heroSubtitleUr : content.heroSubtitleEn}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className={cn(
              'mt-8 p-5 rounded-2xl bg-white/70 dark:bg-ink-800/70 backdrop-blur-md',
              'ring-1 ring-inset ring-brand-200 dark:ring-brand-800/50 border-l-4 border-brand-500',
              'max-w-3xl',
            )}
          >
            <div className="text-eyebrow font-mono text-brand-600 dark:text-brand-400 mb-2">
              {isUr ? 'مختصر جواب' : 'In short'}
            </div>
            <p className={cn(
              'text-ink-700 dark:text-ink-200 leading-relaxed',
              isUr ? 'font-urdu text-lg leading-loose' : 'text-base',
            )}>
              {isUr ? content.directAnswerUr : content.directAnswerEn}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <Button size="xl" href={`${APP_URL}/register`} rightIcon={<ArrowRight className="h-5 w-5" />}>
              {isUr ? 'مفت آزمائش شروع کریں' : 'Start free trial'}
            </Button>
            <Button size="xl" variant="secondary" href="#demo" leftIcon={<Play className="h-4 w-4" />}>
              {isUr ? 'ڈیمو دیکھیں' : 'See demo'}
            </Button>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
