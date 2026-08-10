'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Ruler, Calculator } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

export function CarpetCalculatorWidget() {
  const { locale } = useLocale();
  const isUr = locale === 'ur';
  const [length, setLength] = useState(10);
  const [width, setWidth] = useState(8);
  const [unit, setUnit] = useState<'ft' | 'm'>('ft');
  const [pricePerUnit, setPricePerUnit] = useState(450);

  const area = length * width;
  const areaSqM = unit === 'ft' ? (area * 0.092903).toFixed(2) : (area * 10.7639).toFixed(2);
  const total = Math.round(area * pricePerUnit);
  const waste = Math.round(total * 0.05);
  const grandTotal = total + waste;

  return (
    <div className="rounded-3xl bg-white dark:bg-ink-800 shadow-2xl ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 overflow-hidden">
      <div className="relative p-6 text-white overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #8b4513, #5c2e0a)' }}
      >
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className={cn('text-[10px] font-mono uppercase tracking-widest font-bold text-white/90 mb-1', isUr && 'font-urdu text-xs')}>
              {isUr ? 'مربع فٹ کیلکولیٹر' : 'Square foot calculator'}
            </div>
            <div className={cn('font-display font-extrabold text-2xl', isUr && 'font-urdu text-3xl')}>
              {isUr ? 'قالین کی قیمت' : 'Carpet pricing'}
            </div>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Ruler className="h-7 w-7" />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Unit toggle */}
        <div className="flex gap-2">
          {(['ft', 'm'] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={cn(
                'flex-1 h-11 rounded-xl font-bold text-sm transition-all',
                unit === u
                  ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-white shadow-lg'
                  : 'bg-ink-50 dark:bg-ink-900 text-ink-600',
              )}
            >
              {u === 'ft' ? (isUr ? 'فٹ' : 'Feet') : (isUr ? 'میٹر' : 'Meters')}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={cn('block text-xs font-bold mb-2 text-ink-600', isUr && 'font-urdu text-sm')}>
              {isUr ? 'لمبائی' : 'Length'} ({unit})
            </label>
            <input
              type="number"
              value={length}
              onChange={(e) => setLength(Math.max(1, parseFloat(e.target.value) || 0))}
              className="w-full h-12 rounded-xl bg-ink-50 dark:bg-ink-900 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 px-4 font-bold text-lg tabular-nums focus:ring-2 focus:ring-amber-600 outline-none"
            />
          </div>
          <div>
            <label className={cn('block text-xs font-bold mb-2 text-ink-600', isUr && 'font-urdu text-sm')}>
              {isUr ? 'چوڑائی' : 'Width'} ({unit})
            </label>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(Math.max(1, parseFloat(e.target.value) || 0))}
              className="w-full h-12 rounded-xl bg-ink-50 dark:bg-ink-900 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 px-4 font-bold text-lg tabular-nums focus:ring-2 focus:ring-amber-600 outline-none"
            />
          </div>
        </div>

        <div>
          <label className={cn('block text-xs font-bold mb-2 text-ink-600', isUr && 'font-urdu text-sm')}>
            {isUr ? `قیمت فی ${unit === 'ft' ? 'مربع فٹ' : 'مربع میٹر'}` : `Price per sq${unit}`}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-ink-500">₨</span>
            <input
              type="number"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full h-12 rounded-xl bg-ink-50 dark:bg-ink-900 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 pl-10 pr-4 font-bold text-lg tabular-nums focus:ring-2 focus:ring-amber-600 outline-none"
            />
          </div>
        </div>

        {/* Visual area preview */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-900/10 to-amber-700/5 p-5 ring-1 ring-inset ring-amber-900/20">
          <div className="flex items-baseline justify-between mb-3">
            <span className={cn('text-eyebrow font-mono text-amber-700', isUr && 'font-urdu text-sm')}>
              {isUr ? 'کل رقبہ' : 'Total area'}
            </span>
            <div>
              <span className="font-display font-extrabold text-3xl tabular-nums text-amber-800">{area.toFixed(1)}</span>
              <span className="text-sm font-bold ml-1 text-amber-700">sq{unit}</span>
            </div>
          </div>
          <div className="text-xs text-ink-500 tabular-nums">
            = {areaSqM} sq{unit === 'ft' ? 'm' : 'ft'}
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className={cn('text-ink-500', isUr && 'font-urdu text-base')}>
              {isUr ? 'قالین کی قیمت' : 'Carpet cost'}
            </span>
            <span className="font-bold tabular-nums">₨ {total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className={cn('text-ink-500', isUr && 'font-urdu text-base')}>
              {isUr ? 'کٹنگ / ضیاع (5%)' : 'Cutting / wastage (5%)'}
            </span>
            <span className="font-bold tabular-nums">₨ {waste.toLocaleString()}</span>
          </div>
          <motion.div
            key={grandTotal}
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            className="flex justify-between items-baseline pt-3 border-t border-ink-100 dark:border-ink-700"
          >
            <span className={cn('font-display font-bold text-lg', isUr && 'font-urdu text-xl')}>
              {isUr ? 'کل' : 'Grand total'}
            </span>
            <span className="font-display font-extrabold text-3xl tabular-nums bg-clip-text text-transparent bg-gradient-to-r from-amber-700 to-amber-900">
              ₨ {grandTotal.toLocaleString()}
            </span>
          </motion.div>
        </div>

        <div className={cn('flex items-center gap-1.5 text-xs text-ink-500', isUr && 'font-urdu text-sm')}>
          <Calculator className="h-3 w-3" />
          {isUr ? 'نفع میں یہ حساب POS پر خود کار طور پر' : 'Nafaa auto-calculates on POS with wastage tracking'}
        </div>
      </div>
    </div>
  );
}
