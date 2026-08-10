'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Pill, Clock } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

const batches = [
  { name: 'Panadol Extra 500mg', batch: 'PE24-0847', expiry: '2026-11-20', qty: 240, daysLeft: 102, status: 'ok' },
  { name: 'Augmentin 625mg', batch: 'AG25-1132', expiry: '2026-09-15', qty: 45, daysLeft: 36, status: 'warning' },
  { name: 'Brufen 400mg', batch: 'BR24-0921', expiry: '2026-08-25', qty: 12, daysLeft: 15, status: 'critical' },
  { name: 'Risek 20mg', batch: 'RS25-0338', expiry: '2027-02-14', qty: 88, daysLeft: 188, status: 'ok' },
];

export function PharmacyBatchWidget() {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  return (
    <div className="rounded-3xl bg-white dark:bg-ink-800 shadow-2xl ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 overflow-hidden">
      <div className="relative p-6 text-white overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #059669, #065f46)' }}
      >
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className={cn('text-[10px] font-mono uppercase tracking-widest font-bold text-white/90 mb-1', isUr && 'font-urdu text-xs')}>
              {isUr ? 'ڈریپ کی تعمیل' : 'DRAP compliance'}
            </div>
            <div className={cn('font-display font-extrabold text-2xl', isUr && 'font-urdu text-3xl')}>
              {isUr ? 'بیچ اور معیاد' : 'Batch & expiry tracker'}
            </div>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Pill className="h-7 w-7" />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-3">
        {batches.map((b, i) => {
          const cfg = b.status === 'critical'
            ? { bg: 'bg-red-50 dark:bg-red-950/40', ring: 'ring-red-200 dark:ring-red-800', accent: 'text-red-600', icon: AlertTriangle, label: isUr ? 'ختم ہو رہی' : 'Expiring soon' }
            : b.status === 'warning'
            ? { bg: 'bg-amber-50 dark:bg-amber-950/40', ring: 'ring-amber-200 dark:ring-amber-800', accent: 'text-amber-600', icon: Clock, label: isUr ? 'انتباہ' : 'Warning' }
            : { bg: 'bg-emerald-50 dark:bg-emerald-950/40', ring: 'ring-emerald-200 dark:ring-emerald-800', accent: 'text-emerald-600', icon: CheckCircle2, label: isUr ? 'ٹھیک' : 'OK' };
          const Icon = cfg.icon;

          return (
            <motion.div
              key={b.batch}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={cn('rounded-xl p-4 ring-1 ring-inset', cfg.bg, cfg.ring)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn('h-4 w-4', cfg.accent)} />
                    <span className={cn('text-[10px] font-mono uppercase tracking-widest font-bold', cfg.accent)}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className={cn('font-bold text-sm truncate', isUr && 'font-urdu text-base')}>{b.name}</div>
                  <div className="text-xs text-ink-500 font-mono mt-0.5">Batch: {b.batch}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={cn('font-display font-extrabold text-2xl tabular-nums', cfg.accent)}>
                    {b.daysLeft}
                  </div>
                  <div className={cn('text-[10px] font-bold uppercase tracking-widest text-ink-500', isUr && 'font-urdu text-xs')}>
                    {isUr ? 'دن باقی' : 'days left'}
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-current/10 flex items-center justify-between text-xs">
                <span className="text-ink-500">
                  {isUr ? 'اسٹاک:' : 'Stock:'} <span className="font-bold text-ink-700 dark:text-ink-200 tabular-nums">{b.qty}</span>
                </span>
                <span className="text-ink-500 font-mono">Exp: {b.expiry}</span>
              </div>
            </motion.div>
          );
        })}

        <div className={cn('flex items-center gap-1.5 text-xs text-ink-500 pt-2', isUr && 'font-urdu text-sm')}>
          <Pill className="h-3 w-3" />
          {isUr ? 'نفع خود بخود انتباہ دیتا ہے اور رپورٹنگ کرتا ہے' : 'Nafaa auto-alerts and reports batches to DRAP'}
        </div>
      </div>
    </div>
  );
}
