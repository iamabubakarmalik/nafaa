'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { JsonLd } from '@/lib/seo/JsonLdScript';
import { jsonLdFAQ } from '@/lib/seo/jsonld';
import type { IndustryContent } from '@/lib/data/industry-content';
import type { Industry } from '@/lib/data/industries';
import { cn } from '@/lib/cn';

export function IndustryFAQ({ industry, content }: { industry: Industry; content: IndustryContent }) {
  const { locale } = useLocale();
  const [open, setOpen] = useState<number | null>(0);
  const isUr = locale === 'ur';

  const schemaData = jsonLdFAQ(
    content.faqs.map((f) => ({ q: isUr ? f.qUr : f.qEn, a: isUr ? f.aUr : f.aEn })),
  );

  return (
    <>
      <JsonLd id={`faq-${industry.slug}`} data={schemaData} />
      <Section variant="default" spacing="lg">
        <Container size="md">
          <div className="text-center mb-12">
            <Eyebrow variant="brand">
              {isUr ? 'عمومی سوالات' : 'Frequently asked'}
            </Eyebrow>
            <h2 className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight',
              isUr && 'font-urdu leading-snug',
            )}>
              {isUr
                ? `${industry.nameUr} کے بارے میں سوالات`
                : `Questions about ${industry.nameEn.toLowerCase()}`}
            </h2>
          </div>

          <div className="space-y-3">
            {content.faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  className={cn(
                    'rounded-2xl bg-white dark:bg-ink-800 overflow-hidden',
                    'ring-1 ring-inset transition-all duration-300',
                    isOpen ? 'ring-brand-400 dark:ring-brand-600 shadow-lg' : 'ring-ink-100 dark:ring-ink-700/60',
                  )}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left"
                  >
                    <span className={cn('font-bold text-base lg:text-lg pr-4', isUr && 'font-urdu text-lg lg:text-xl')}>
                      {isUr ? f.qUr : f.qEn}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                        isOpen ? 'bg-brand-500 text-white' : 'bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300',
                      )}
                    >
                      <Plus className="h-4 w-4" strokeWidth={3} />
                    </motion.span>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className={cn(
                          'px-6 pb-6 text-ink-600 dark:text-ink-300 leading-relaxed',
                          isUr ? 'font-urdu text-lg leading-loose' : 'text-base',
                        )}>
                          {isUr ? f.aUr : f.aEn}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </Container>
      </Section>
    </>
  );
}
