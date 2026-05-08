'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { useLocale } from '@/components/providers/LocaleProvider';

export function Industries() {
  const { t } = useLocale();

  const items = [
    { emoji: '🍞', title: 'Bakery', slug: 'bakery', desc: 'Cake orders, daily production tracking, expiry alerts' },
    { emoji: '🛒', title: 'Kiryana Store', slug: 'kiryana', desc: 'Quick checkout, khata book, daily essentials' },
    { emoji: '📱', title: 'Mobile Shop', slug: 'mobile-shop', desc: 'IMEI tracking, accessories, repair management' },
    { emoji: '💊', title: 'Pharmacy', slug: 'pharmacy', desc: 'Batch tracking, expiry alerts, prescription scan' },
    { emoji: '👕', title: 'Garment Shop', slug: 'garments', desc: 'Size/color variants, season tracking' },
    { emoji: '🥩', title: 'Meat Shop', slug: 'meat', desc: 'Weight-based pricing, scale integration' },
    { emoji: '🍕', title: 'Restaurant', slug: 'restaurant', desc: 'Table orders, kitchen display, recipes' },
    { emoji: '🥬', title: 'Vegetable Shop', slug: 'vegetables', desc: 'Daily rates, weight pricing, supplier tracking' },
  ];

  return (
    <section className="section-padding bg-slate-50 dark:bg-slate-950/50">
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="accent">🏢 Industry Solutions</Badge>
          <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            {t('industries.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">{t('industries.subtitle')}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((it, i) => (
            <motion.div
              key={it.slug}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <Link
                href={`/industries/${it.slug}`}
                className="group block rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-lg transition-all"
              >
                <div className="text-4xl mb-3">{it.emoji}</div>
                <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {it.title}
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{it.desc}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
                  Learn more <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
