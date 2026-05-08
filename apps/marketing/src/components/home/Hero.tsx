'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Play, Star, ShieldCheck, Zap } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Container } from '@/components/ui/Container';
import { cn } from '@/lib/cn';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173';

export function Hero() {
  const { t, locale } = useLocale();
  const isUrdu = locale === 'ur';

  return (
    <section className="relative overflow-hidden pt-12 lg:pt-20 pb-16 lg:pb-24">
      {/* Decorative gradient blobs */}
      <div className="absolute top-0 -left-24 h-96 w-96 bg-brand-500/20 dark:bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 h-96 w-96 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />

      <Container className="relative">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Badge variant="gradient">
                <Star className="h-3 w-3 fill-white" />
                {t('hero.badge')}
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={cn(
                'mt-6 text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight text-balance leading-[1.1]',
                isUrdu && 'font-urdu leading-[1.6]',
              )}
            >
              <span className="gradient-text">{t('hero.title')}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={cn(
                'mt-6 text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl text-balance leading-relaxed',
                isUrdu && 'font-urdu text-xl leading-loose',
              )}
            >
              {t('hero.subtitle')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Button size="xl" href={`${APP_URL}/register`}>
                {t('hero.cta_primary')}
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button size="xl" variant="secondary" href="#demo">
                <Play className="h-5 w-5" />
                {t('hero.cta_secondary')}
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-600 dark:text-slate-400"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-600" />
                {t('hero.no_cc')}
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent-500" />
                {t('hero.trust')}
              </div>
            </motion.div>
          </div>

          {/* Right preview card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-brand-500 to-emerald-500 rounded-3xl blur-2xl opacity-30 dark:opacity-50" />
            <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 p-2 shadow-2xl">
              <div className="rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
                {/* Browser bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-rose-400" />
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 mx-4 h-7 rounded-md bg-white dark:bg-slate-800 px-3 flex items-center text-xs text-slate-500 font-mono">
                    🔒 nafaa.pk/dashboard
                  </div>
                </div>

                {/* Mock POS UI */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500">Today's Sales</div>
                      <div className="text-2xl font-bold gradient-text">Rs 142,580</div>
                    </div>
                    <Badge variant="brand">+24% ↑</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Orders', val: '187' },
                      { label: 'Customers', val: '94' },
                      { label: 'Items Sold', val: '412' },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">{s.label}</div>
                        <div className="mt-0.5 text-lg font-bold">{s.val}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {['Bakery Items', 'Beverages', 'Snacks'].map((cat, i) => (
                      <div key={cat} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900 dark:to-brand-800 flex items-center justify-center text-xs">
                            {['🍞', '🥤', '🍪'][i]}
                          </div>
                          <span className="text-sm font-semibold">{cat}</span>
                        </div>
                        <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                          Rs {[42500, 28900, 19200][i].toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating cards */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -left-4 top-1/4 hidden md:block"
            >
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3 flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  ✅
                </div>
                <div>
                  <div className="text-xs font-bold">Sale Complete</div>
                  <div className="text-[10px] text-slate-500">Rs 1,250 received</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, delay: 1 }}
              className="absolute -right-4 bottom-1/4 hidden md:block"
            >
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3 flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  ⚠️
                </div>
                <div>
                  <div className="text-xs font-bold">Low Stock</div>
                  <div className="text-[10px] text-slate-500">Cooking Oil — 5 left</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
