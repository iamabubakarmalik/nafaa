'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Coins, Calculator } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { LiveDot } from '@/components/primitives/LiveDot';
import { cn } from '@/lib/cn';

// Simulated live rates (in a real app, these come from an API)
const BASE_RATE_24K = 285400; // PKR per tola
const RATES = {
  '24k': 1.0,
  '22k': 0.9167,
  '21k': 0.875,
  '18k': 0.75,
};

export function GoldRateWidget() {
  const { locale } = useLocale();
  const isUr = locale === 'ur';
  const [tick, setTick] = useState(0);
  const [weight, setWeight] = useState(1);
  const [purity, setPurity] = useState<keyof typeof RATES>('22k');
  const [makingCharges, setMakingCharges] = useState(12);

  // Simulate live rate updates
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const jitter = Math.sin(tick * 0.7) * 400;
  const currentRate = Math.round(BASE_RATE_24K * RATES[purity] + jitter);
  const goldValue = Math.round(currentRate * weight);
  const makingCost = Math.round(goldValue * (makingCharges / 100));
  const gst = Math.round((goldValue + makingCost) * 0.03);
  const total = goldValue + makingCost + gst;
  const isUp = tick % 2 === 0;

  return (
    <div className="rounded-3xl bg-white dark:bg-ink-800 shadow-2xl ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 overflow-hidden">
      {/* Header with live rate */}
      <div className="relative p-6 text-white overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #d4a017, #a67c00)' }}
      >
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LiveDot color="emerald" size="sm" />
              <div className={cn('text-[10px] font-mono uppercase tracking-widest font-bold text-white/90', isUr && 'font-urdu text-xs')}>
                {isUr ? 'براہ راست شرح' : 'Live rate'}
              </div>
            </div>
            <div className={cn('font-display font-extrabold text-3xl', isUr && 'font-urdu')}>
              {isUr ? `فی تولہ ${purity.toUpperCase()}` : `Per tola ${purity.toUpperCase()}`}
            </div>
          </div>
          <div className="text-right">
            <div className={cn('font-display font-extrabold text-3xl tabular-nums', isUr && 'font-urdu')}>
              ₨ {currentRate.toLocaleString()}
            </div>
            <div className={cn('flex items-center gap-1 justify-end text-xs font-bold mt-1',
              isUp ? 'text-emerald-200' : 'text-red-200'
            )}>
              {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isUp ? '+' : '-'}₨ {Math.abs(Math.round(jitter))}
            </div>
          </div>
        </div>
      </div>

      {/* Calculator */}
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="h-4 w-4 text-amber-600" />
          <div className={cn('text-eyebrow font-mono text-amber-600', isUr && 'font-urdu text-sm')}>
            {isUr ? 'قیمت کیلکولیٹر' : 'Price calculator'}
          </div>
        </div>

        {/* Weight input */}
        <div>
          <label className={cn('block text-sm font-bold mb-2 text-ink-700 dark:text-ink-200', isUr && 'font-urdu text-base')}>
            {isUr ? 'وزن (تولہ)' : 'Weight (tola)'}
          </label>
          <input
            type="number"
            step="0.25"
            min="0.25"
            value={weight}
            onChange={(e) => setWeight(Math.max(0.25, parseFloat(e.target.value) || 0))}
            className="w-full h-12 rounded-xl bg-ink-50 dark:bg-ink-900 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 px-4 font-bold text-lg tabular-nums focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>

        {/* Purity selector */}
        <div>
          <label className={cn('block text-sm font-bold mb-2 text-ink-700 dark:text-ink-200', isUr && 'font-urdu text-base')}>
            {isUr ? 'کیریٹ' : 'Purity'}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(RATES) as Array<keyof typeof RATES>).map((k) => (
              <button
                key={k}
                onClick={() => setPurity(k)}
                className={cn(
                  'h-11 rounded-xl font-bold text-sm transition-all uppercase',
                  purity === k
                    ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg'
                    : 'bg-ink-50 dark:bg-ink-900 text-ink-600 hover:bg-ink-100 dark:hover:bg-ink-800',
                )}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {/* Making charges */}
        <div>
          <label className={cn('block text-sm font-bold mb-2 text-ink-700 dark:text-ink-200', isUr && 'font-urdu text-base')}>
            {isUr ? `مزدوری: ${makingCharges}%` : `Making charges: ${makingCharges}%`}
          </label>
          <input
            type="range"
            min="5"
            max="25"
            step="1"
            value={makingCharges}
            onChange={(e) => setMakingCharges(parseInt(e.target.value))}
            className="w-full accent-amber-600"
          />
        </div>

        {/* Breakdown */}
        <div className="pt-4 border-t border-ink-100 dark:border-ink-700 space-y-2">
          {[
            { label: isUr ? 'سونے کی قیمت' : 'Gold value', value: goldValue },
            { label: isUr ? 'مزدوری' : 'Making charges', value: makingCost },
            { label: isUr ? 'جی ایس ٹی (3%)' : 'GST (3%)', value: gst },
          ].map((row) => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className={cn('text-ink-500', isUr && 'font-urdu text-base')}>{row.label}</span>
              <span className="font-bold tabular-nums">₨ {row.value.toLocaleString()}</span>
            </div>
          ))}

          <motion.div
            key={total}
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            className="flex justify-between items-baseline pt-3 border-t border-ink-100 dark:border-ink-700"
          >
            <span className={cn('font-display font-bold text-lg', isUr && 'font-urdu text-xl')}>
              {isUr ? 'کل قیمت' : 'Final price'}
            </span>
            <span className="font-display font-extrabold text-3xl tabular-nums bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-amber-700">
              ₨ {total.toLocaleString()}
            </span>
          </motion.div>

          <div className={cn('flex items-center gap-1.5 text-xs text-ink-500 pt-2', isUr && 'font-urdu text-sm')}>
            <Coins className="h-3 w-3" />
            {isUr ? 'نفع میں یہ حساب خود کار طور پر ہوتا ہے' : 'Nafaa auto-calculates this on every invoice'}
          </div>
        </div>
      </div>
    </div>
  );
}
