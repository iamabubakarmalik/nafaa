'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Marquee } from '@/components/primitives/Marquee';
import { Button } from '@/components/primitives/Button';
import { ArrowRight } from 'lucide-react';
import { integrations } from '@/lib/data/integrations';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import { cn } from '@/lib/cn';

export function IntegrationsWall() {
  const { t, locale } = useLocale();
  const isUr = locale === 'ur';

  const row1 = integrations.slice(0, Math.ceil(integrations.length / 2));
  const row2 = integrations.slice(Math.ceil(integrations.length / 2));

  return (
    <Section variant="default" spacing="lg">
      <Container>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.06)}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <motion.div variants={fadeUp}>
            <Eyebrow variant="brand">{t('integrations.eyebrow')}</Eyebrow>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance',
              isUr && 'font-urdu leading-snug',
            )}
          >
            {t('integrations.title')}
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className={cn(
              'mt-4 text-lg lg:text-xl text-ink-600 dark:text-ink-300',
              isUr && 'font-urdu text-xl leading-loose',
            )}
          >
            {t('integrations.subtitle')}
          </motion.p>
        </motion.div>
      </Container>

      {/* Marquee rows */}
      <div className="space-y-4">
        <Marquee direction="left" speed="slow">
          {row1.map((it) => (
            <IntegrationChip key={it.slug} integration={it} isUr={isUr} />
          ))}
        </Marquee>
        <Marquee direction="right" speed="slow">
          {row2.map((it) => (
            <IntegrationChip key={it.slug} integration={it} isUr={isUr} />
          ))}
        </Marquee>
      </div>

      <Container>
        <div className="mt-12 text-center">
          <Button href="/integrations" variant="secondary" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
            {isUr ? 'تمام انضمام دیکھیں' : 'Explore all integrations'}
          </Button>
        </div>
      </Container>
    </Section>
  );
}

function IntegrationChip({ integration, isUr }: { integration: any; isUr: boolean }) {
  return (
    <Link
      href={`/integrations/${integration.slug}`}
      className={cn(
        'inline-flex items-center gap-3 h-16 px-6 rounded-2xl shrink-0',
        'bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60',
        'hover:ring-brand-400 dark:hover:ring-brand-600 transition-all',
        'shadow-sm hover:shadow-md',
      )}
    >
      <span className="text-3xl">{integration.logo}</span>
      <div>
        <div className={cn('font-bold text-sm text-ink-900 dark:text-white', isUr && 'font-urdu text-base')}>
          {isUr ? integration.nameUr : integration.name}
        </div>
        {integration.status === 'live' && (
          <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {isUr ? 'لائیو' : 'LIVE'}
          </div>
        )}
      </div>
    </Link>
  );
}
