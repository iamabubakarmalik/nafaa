'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Button } from '@/components/primitives/Button';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import { cn } from '@/lib/cn';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

export function CTA() {
  const { t, locale } = useLocale();
  const isUr = locale === 'ur';

  return (
    <Section variant="default" spacing="lg">
      <Container>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.08)}
          className="relative rounded-[2rem] overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-800" />
          <AuroraBackground variant="brand" intensity="intense" className="mix-blend-overlay opacity-40" />
          <NoiseTexture opacity={0.05} />

          <div className="relative px-8 py-16 lg:px-20 lg:py-24 text-center text-white">
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3 py-1.5 text-xs font-mono uppercase tracking-widest font-bold ring-1 ring-white/20">
                <Sparkles className="h-3 w-3" />
                <span className={isUr ? 'font-urdu text-sm' : ''}>{t('cta.eyebrow')}</span>
              </span>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              className={cn(
                'mt-6 font-display font-extrabold text-4xl lg:text-6xl xl:text-7xl tracking-tight text-balance leading-[1.05]',
                isUr && 'font-urdu leading-snug',
              )}
            >
              {t('cta.title')}
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className={cn(
                'mt-6 text-lg lg:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed',
                isUr && 'font-urdu text-xl leading-loose',
              )}
            >
              {t('cta.subtitle')}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-3 justify-center">
              <Button
                size="xl"
                href={`${APP_URL}/register`}
                className="!bg-white !text-brand-700 hover:!bg-white/95"
                rightIcon={<ArrowRight className="h-5 w-5" />}
              >
                {t('cta.button')}
              </Button>
              <Button
                size="xl"
                variant="ghost"
                href="/contact"
                className="!text-white hover:!bg-white/10"
              >
                {t('cta.secondary')}
              </Button>
            </motion.div>

            <motion.div variants={fadeUp} className={cn('mt-8 text-sm text-white/80', isUr && 'font-urdu text-base')}>
              {isUr
                ? '✓ کریڈٹ کارڈ نہیں ·  ✓ ۵ منٹ میں سیٹ اپ  ·  ✓ کسی بھی وقت منسوخ کریں'
                : '✓ No credit card  ·  ✓ Setup in 5 minutes  ·  ✓ Cancel anytime'}
            </motion.div>
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}
