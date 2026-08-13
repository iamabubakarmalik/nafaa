'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Play, Sparkles, ShieldCheck, Zap, Star } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Button } from '@/components/primitives/Button';
import { Badge } from '@/components/primitives/Badge';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { GeoWelcome } from './GeoWelcome';
import { LivePOSMockup } from './LivePOSMockup';
import { cn } from '@/lib/cn';
import { trackEvent } from '@/lib/analytics/events';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

export function Hero() {
  const { t, locale } = useLocale();
  const isUr = locale === 'ur';

  return (
    <section className="relative overflow-hidden pt-12 lg:pt-16 pb-20 lg:pb-28">
      <AuroraBackground variant="brand" intensity="base" />
      <GridBackground className="mask-fade-bottom" />
      <NoiseTexture />

      <Container className="relative">
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-16 items-center">
          {/* Left */}
          <div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <GeoWelcome />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-6"
            >
              <Badge variant="brand" size="md" pulse>
                <Star className="h-3 w-3 fill-current" />
                {t('hero.eyebrow')}
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={cn(
                'mt-6 font-display font-extrabold tracking-tight text-balance',
                'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05]',
                isUr && 'font-urdu leading-[1.5]',
              )}
            >
              <span className="block text-ink-900 dark:text-white">{t('hero.titleLine1')}</span>
              <GradientText variant="brand" as="span" className="block">
                {t('hero.titleLine2')}
              </GradientText>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className={cn(
                'mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl text-balance leading-relaxed',
                isUr && 'font-urdu text-xl leading-loose',
              )}
            >
              {t('hero.subtitle')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Button
                size="xl"
                href={`${APP_URL}/register`}
                rightIcon={<ArrowRight className="h-5 w-5" />} onClick={() => trackEvent("cta_click", { cta_label: "hero_start_trial", cta_location: "hero", destination: "register" })}
              >
                {t('hero.ctaPrimary')}
              </Button>
              <Button
                size="xl"
                variant="secondary"
                href="#demo"
                leftIcon={<Play className="h-4 w-4" />}
              >
                {t('hero.ctaSecondary')}
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-600 dark:text-ink-300"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-600" />
                <span className={isUr ? 'font-urdu' : ''}>{t('hero.noCard')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-gold" />
                <span className={isUr ? 'font-urdu' : ''}>{t('hero.quickSetup')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-aurora-purple" />
                <span className={isUr ? 'font-urdu' : ''}>{t('hero.trust')}</span>
              </div>
            </motion.div>
          </div>

          {/* Right — Live POS mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <LivePOSMockup />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
