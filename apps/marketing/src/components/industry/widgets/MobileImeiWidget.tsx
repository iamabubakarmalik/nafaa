'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, ShieldCheck, ScanLine, CheckCircle2 } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

const DEVICES = [
  { model: 'iPhone 16 Pro 256GB', imei: '354782910384756', color: 'Titanium', price: 585000, warranty: '11 months', status: 'active' },
  { model: 'Galaxy S25 Ultra', imei: '869421573948120', color: 'Titanium Black', price: 425000, warranty: '9 months', status: 'active' },
  { model: 'Infinix Hot 60', imei: '452983756102847', color: 'Skyline Blue', price: 42000, warranty: '3 months', status: 'active' },
  { model: 'Redmi Note 14', imei: '758429103856471', color: 'Mint Green', price: 55000, warranty: 'Expired', status: 'expired' },
];

export function MobileImeiWidget() {
  const { locale } = useLocale();
  const isUr = locale === 'ur';
  const [selected, setSelected] = useState(0);

  const d = DEVICES[selected];

  return (
    <div className="rounded-3xl bg-white dark:bg-ink-800 shadow-2xl ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 overflow-hidden">
      <div className="relative p-6 text-white overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #6366f1, #312e81)' }}
      >
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className={cn('text-[10px] font-mono uppercase tracking-widest font-bold text-white/90 mb-1', isUr && 'font-urdu text-xs')}>
              {isUr ? 'IMEI ٹریکر' : 'IMEI tracker'}
            </div>
            <div className={cn('font-display font-extrabold text-2xl', isUr && 'font-urdu text-3xl')}>
              {isUr ? 'موبائل رجسٹری' : 'Device registry'}
            </div>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Smartphone className="h-7 w-7" />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Device selector */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-2 px-2">
          {DEVICES.map((dev, i) => (
            <button
              key={dev.imei}
              onClick={() => setSelected(i)}
              className={cn(
                'shrink-0 px-4 h-11 rounded-xl font-bold text-xs whitespace-nowrap transition-all',
                selected === i
                  ? 'bg-gradient-to-br from-indigo-500 to-indigo-800 text-white shadow-lg'
                  : 'bg-ink-50 dark:bg-ink-900 text-ink-600',
              )}
            >
              {dev.model.split(' ').slice(0, 2).join(' ')}
            </button>
          ))}
        </div>

        {/* Device card */}
        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-900/20 p-5 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-800"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className={cn('font-display font-extrabold text-xl text-indigo-900 dark:text-indigo-200', isUr && 'font-urdu text-2xl')}>
                {d.model}
              </div>
              <div className={cn('text-sm text-indigo-700 dark:text-indigo-300 mt-0.5', isUr && 'font-urdu text-base')}>
                {d.color}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display font-extrabold text-2xl tabular-nums text-indigo-900 dark:text-indigo-200">
                ₨ {d.price.toLocaleString()}
              </div>
            </div>
          </div>

          {/* IMEI */}
          <div className="rounded-xl bg-white dark:bg-ink-800 p-3 mb-3 flex items-center gap-3">
            <ScanLine className="h-5 w-5 text-indigo-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className={cn('text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-0.5', isUr && 'font-urdu text-xs')}>
                IMEI
              </div>
              <div className="font-mono text-sm font-bold tabular-nums truncate">{d.imei}</div>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>

          {/* Warranty */}
          <div className={cn(
            'rounded-xl p-3 flex items-center gap-3',
            d.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-red-50 dark:bg-red-950/40'
          )}>
            <ShieldCheck className={cn('h-5 w-5 shrink-0', d.status === 'active' ? 'text-emerald-500' : 'text-red-500')} />
            <div className="flex-1">
              <div className={cn('text-[10px] font-bold uppercase tracking-widest mb-0.5',
                d.status === 'active' ? 'text-emerald-700' : 'text-red-700',
                isUr && 'font-urdu text-xs'
              )}>
                {isUr ? 'وارنٹی' : 'Warranty'}
              </div>
              <div className={cn('font-bold text-sm',
                d.status === 'active' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300',
                isUr && 'font-urdu text-base'
              )}>
                {d.warranty}
              </div>
            </div>
          </div>
        </motion.div>

        <div className={cn('flex items-center gap-1.5 text-xs text-ink-500', isUr && 'font-urdu text-sm')}>
          <ScanLine className="h-3 w-3" />
          {isUr ? 'ہر موبائل IMEI اسکین سے رجسٹر ہوتا ہے' : 'Every phone registered by IMEI scan — instant history lookup'}
        </div>
      </div>
    </div>
  );
}
