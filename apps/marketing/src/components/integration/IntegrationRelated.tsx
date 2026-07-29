'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Button } from '@/components/primitives/Button';
import { integrations } from '@/lib/data/integrations';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import type { IntegrationContent } from '@/lib/data/integration-content';
import type { Integration } from '@/lib/data/integrations';
import { cn } from '@/lib/cn';

export function IntegrationRelated({ current, content }: { current: Integration; content: IntegrationContent }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  const related = integrations.filter((i) => content.relatedSlugs.includes(i.slug));

  if (related.length === 0) return null;

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
            <Eyebrow variant="mono">
              {isUr ? 'اکٹھے بہترین' : 'Better together'}
            </Eyebrow>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-4xl tracking-tight',
              isUr && 'font-urdu leading-snug',
            )}
          >
            {isUr ? 'اکثر ساتھ استعمال ہوتے ہیں' : 'Frequently paired with'}
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.04)}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
        >
          {related.map((it) => (
            <motion.div key={it.slug} variants={fadeUp}>
              <Link
                href={`/integrations/${it.slug}`}
                className={cn(
                  'group flex flex-col items-center gap-3 p-6 rounded-2xl',
                  'bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60',
                  'hover:ring-brand-400 dark:hover:ring-brand-600 hover:-translate-y-1 transition-all duration-300',
                )}
              >
                <div className="text-5xl">{it.logo}</div>
                <div className={cn('text-sm font-bold text-center', isUr && 'font-urdu text-base')}>
                  {isUr ? it.nameUr : it.name}
                </div>
                {it.status === 'live' && (
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    LIVE
                  </span>
                )}
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-10 text-center">
          <Button href="/integrations" variant="secondary" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
            {isUr ? 'تمام انضمام دیکھیں' : 'Explore all integrations'}
          </Button>
        </div>
      </Container>
    </Section>
  );
}
