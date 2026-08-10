'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Utensils, Timer, Bell } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { LiveDot } from '@/components/primitives/LiveDot';
import { cn } from '@/lib/cn';

const ORDERS = [
  { id: 'KOT-847', table: 'T-04', items: ['Chicken Karahi', 'Naan × 4', 'Coke × 2'], time: 0, status: 'cooking' },
  { id: 'KOT-848', table: 'T-11', items: ['Biryani × 2', 'Raita', 'Kheer'], time: 4, status: 'ready' },
  { id: 'KOT-849', table: 'T-02', items: ['BBQ Platter', 'Roti × 6'], time: 12, status: 'new' },
  { id: 'KOT-850', table: 'T-08', items: ['Zinger Burger', 'Fries'], time: 2, status: 'cooking' },
];

export function RestaurantKOTWidget() {
  const { locale } = useLocale();
  const isUr = locale === 'ur';
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-3xl bg-white dark:bg-ink-800 shadow-2xl ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 overflow-hidden">
      <div className="relative p-6 text-white overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #dc2626, #7c2d12)' }}
      >
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LiveDot color="emerald" size="sm" />
              <div className={cn('text-[10px] font-mono uppercase tracking-widest font-bold text-white/90', isUr && 'font-urdu text-xs')}>
                {isUr ? 'براہ راست کچن' : 'Live kitchen'}
              </div>
            </div>
            <div className={cn('font-display font-extrabold text-2xl', isUr && 'font-urdu text-3xl')}>
              {isUr ? 'KOT مانیٹر' : 'KOT monitor'}
            </div>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <ChefHat className="h-7 w-7" />
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AnimatePresence>
          {ORDERS.map((o, i) => {
            const cfg = o.status === 'new'
              ? { bg: 'bg-blue-50 dark:bg-blue-950/40', ring: 'ring-blue-200 dark:ring-blue-800', accent: 'text-blue-600', label: isUr ? 'نیا' : 'New', icon: Bell }
              : o.status === 'ready'
              ? { bg: 'bg-emerald-50 dark:bg-emerald-950/40', ring: 'ring-emerald-200 dark:ring-emerald-800', accent: 'text-emerald-600', label: isUr ? 'تیار' : 'Ready', icon: Utensils }
              : { bg: 'bg-amber-50 dark:bg-amber-950/40', ring: 'ring-amber-200 dark:ring-amber-800', accent: 'text-amber-600', label: isUr ? 'پک رہا' : 'Cooking', icon: Timer };
            const Icon = cfg.icon;
            const minutes = o.time + Math.floor(tick / 2);

            return (
              <motion.div
                key={o.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn('rounded-xl p-4 ring-1 ring-inset', cfg.bg, cfg.ring)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-mono text-xs font-bold text-ink-600">{o.id}</div>
                  <div className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white dark:bg-ink-900', cfg.accent)}>
                    <Icon className="h-3 w-3" />
                    {cfg.label}
                  </div>
                </div>
                <div className={cn('font-display font-extrabold text-xl mb-2', isUr && 'font-urdu text-2xl')}>
                  {isUr ? `میز ${o.table}` : `Table ${o.table}`}
                </div>
                <ul className="space-y-1 mb-2">
                  {o.items.map((it) => (
                    <li key={it} className="text-xs text-ink-700 dark:text-ink-200 flex items-start gap-1.5">
                      <span className="mt-1 h-1 w-1 rounded-full bg-current shrink-0" />
                      {it}
                    </li>
                  ))}
                </ul>
                <div className={cn('flex items-center gap-1.5 text-xs font-bold tabular-nums', cfg.accent)}>
                  <Timer className="h-3 w-3" />
                  {minutes}:{String((tick * 30) % 60).padStart(2, '0')} min
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
