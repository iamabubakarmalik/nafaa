'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Play, Sparkles, Flame } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import type { Industry } from '@/lib/data/industries';
import type { IndustryContent } from '@/lib/data/industry-content';
import { cn } from '@/lib/cn';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

interface Props {
  industry: Industry;
  content: IndustryContent;
}

export function IndustryHero({ industry, content }: Props) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  return (
    <section className="relative overflow-hidden pt-12 lg:pt-16 pb-20 lg:pb-24">
      {/* Per-industry aurora background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0" style={{
          background: `linear-gradient(135deg, ${industry.color}08 0%, transparent 40%, ${industry.colorDark}05 100%)`,
        }} />
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full blur-3xl opacity-40"
          style={{ background: `radial-gradient(circle, ${industry.auroraColors[0]}, transparent 70%)` }}
        />
        <motion.div
          animate={{ x: [0, -40, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full blur-3xl opacity-40"
          style={{ background: `radial-gradient(circle, ${industry.auroraColors[1]}, transparent 70%)` }}
        />
        <motion.div
          animate={{ x: [0, 30, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[400px] w-[400px] rounded-full blur-3xl opacity-30"
          style={{ background: `radial-gradient(circle, ${industry.auroraColors[2]}, transparent 70%)` }}
        />
      </div>
      <GridBackground className="mask-fade-bottom opacity-40" />
      <NoiseTexture />

      <Container className="relative">
        <div className="max-w-5xl">
          {/* Breadcrumb */}
          <motion.nav
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={cn('mb-6 text-sm text-ink-500 dark:text-ink-400 flex items-center gap-2', isUr && 'font-urdu text-base')}
          >
            <Link href="/" className="hover:text-ink-900 dark:hover:text-white transition-colors">
              {isUr ? 'ہوم' : 'Home'}
            </Link>
            <span>/</span>
            <Link href="/industries" className="hover:text-ink-900 dark:hover:text-white transition-colors">
              {isUr ? 'صنعتیں' : 'Industries'}
            </Link>
            <span>/</span>
            <span className="font-semibold" style={{ color: industry.color }}>
              {isUr ? industry.nameUr : industry.nameEn}
            </span>
          </motion.nav>

          {/* Icon + Badges */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-4 mb-6"
          >
            <div className="relative">
              <div
                className="absolute inset-0 rounded-3xl blur-2xl opacity-60"
                style={{ background: industry.color }}
              />
              <div
                className="relative h-20 w-20 rounded-3xl flex items-center justify-center text-5xl shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, ${industry.color}, ${industry.colorDark})`,
                }}
              >
                <span className="drop-shadow-lg">{industry.emoji}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${industry.color}, ${industry.colorDark})` }}
                >
                  <Sparkles className="h-3 w-3" />
                  {isUr ? industry.nameUr : industry.nameEn}
                </span>
                {industry.hot && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sunset/15 text-sunset ring-1 ring-inset ring-sunset/30">
                    <Flame className="h-3 w-3" /> HOT
                  </span>
                )}
              </div>
              <div className={cn('text-xs font-mono uppercase tracking-widest font-bold', isUr && 'font-urdu text-sm')} style={{ color: industry.color }}>
                {industry.category} · {industry.keyFeatures.length} {isUr ? 'خصوصیات' : 'features'}
              </div>
            </div>
          </motion.div>

          {/* Main Heading — Industry color */}
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
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(135deg, ${industry.color}, ${industry.colorDark})` }}
            >
              {isUr ? content.heroTitleUr : content.heroTitleEn}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={cn(
              'mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-3xl text-balance leading-relaxed',
              isUr && 'font-urdu text-xl leading-loose',
            )}
          >
            {isUr ? content.heroSubtitleUr : content.heroSubtitleEn}
          </motion.p>

          {/* Signature Badge — The ONE thing only Nafaa does */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 max-w-3xl"
          >
            <div
              className="relative rounded-2xl p-6 shadow-2xl overflow-hidden text-white"
              style={{ background: `linear-gradient(135deg, ${industry.color}, ${industry.colorDark})` }}
            >
              <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest font-bold text-white/80 mb-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  {isUr ? 'صرف نفع میں — کہیں اور نہیں' : 'Only in Nafaa — nowhere else'}
                </div>
                <div className={cn('font-display font-extrabold text-xl lg:text-2xl leading-tight', isUr && 'font-urdu text-2xl lg:text-3xl')}>
                  {isUr ? industry.signatureUr : industry.signature}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Direct answer for AEO */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className={cn(
              'mt-6 p-5 rounded-2xl bg-white/70 dark:bg-ink-800/70 backdrop-blur-md',
              'ring-1 ring-inset border-l-4 max-w-3xl',
            )}
            style={{
              borderLeftColor: industry.color,
              boxShadow: `0 0 0 1px ${industry.color}20 inset`,
            }}
          >
            <div className="text-eyebrow font-mono mb-2" style={{ color: industry.color }}>
              {isUr ? 'مختصر جواب' : 'In short'}
            </div>
            <p className={cn(
              'text-ink-700 dark:text-ink-200 leading-relaxed',
              isUr ? 'font-urdu text-lg leading-loose' : 'text-base',
            )}>
              {isUr ? content.directAnswerUr : content.directAnswerEn}
            </p>
          </motion.div>

          {/* Key features quick pills */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-6 flex flex-wrap gap-2 max-w-3xl"
          >
            {industry.keyFeatures.map((f, i) => (
              <span
                key={f}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ring-1 ring-inset bg-white/80 dark:bg-ink-800/80 backdrop-blur-sm"
                style={{
                  color: industry.color,
                  boxShadow: `0 0 0 1px ${industry.color}30 inset`,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: industry.color }} />
                {f}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <a
              href={`${APP_URL}/register?industry=${industry.slug}`}
              className="inline-flex items-center gap-2 h-14 px-8 rounded-2xl font-bold text-white shadow-2xl hover:-translate-y-0.5 transition-transform text-base"
              style={{ background: `linear-gradient(135deg, ${industry.color}, ${industry.colorDark})` }}
            >
              {isUr ? `${industry.nameUr} کے لیے شروع کریں` : `Start free — ${industry.nameEn.toLowerCase()}`}
              <ArrowRight className="h-5 w-5" />
            </a>
            <Button size="xl" variant="secondary" href="#demo" leftIcon={<Play className="h-4 w-4" />}>
              {isUr ? 'ڈیمو دیکھیں' : 'Watch demo'}
            </Button>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
