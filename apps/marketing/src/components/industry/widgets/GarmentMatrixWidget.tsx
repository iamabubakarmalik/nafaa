'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shirt, Package, AlertCircle } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLORS = [
  { name: 'Black', nameUr: 'کالا', hex: '#111827' },
  { name: 'White', nameUr: 'سفید', hex: '#f9fafb' },
  { name: 'Navy', nameUr: 'گہرا نیلا', hex: '#1e3a8a' },
  { name: 'Maroon', nameUr: 'کاسنی', hex: '#7f1d1d' },
];

// Simulated stock matrix
const STOCK: Record<string, Record<string, number>> = {
  Black: { XS: 8, S: 14, M: 22, L: 18, XL: 6, XXL: 2 },
  White: { XS: 5, S: 11, M: 16, L: 12, XL: 3, XXL: 0 },
  Navy: { XS: 3, S: 9, M: 14, L: 10, XL: 4, XXL: 1 },
  Maroon: { XS: 0, S: 4, M: 8, L: 6, XL: 2, XXL: 0 },
};

export function GarmentMatrixWidget() {
  const { locale } = useLocale();
  const isUr = locale === 'ur';
  const [selected, setSelected] = useState<{ color: string; size: string } | null>({ color: 'Black', size: 'M' });

  const total = Object.values(STOCK).flatMap((row) => Object.values(row)).reduce((s, n) => s + n, 0);
  const lowStock = Object.entries(STOCK).flatMap(([c, sizes]) =>
    Object.entries(sizes).filter(([, q]) => q > 0 && q <= 3).map(([s]) => `${c} ${s}`)
  ).length;

  return (
    <div className="rounded-3xl bg-white dark:bg-ink-800 shadow-2xl ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 overflow-hidden">
      <div className="relative p-6 text-white overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #ec4899, #831843)' }}
      >
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className={cn('text-[10px] font-mono uppercase tracking-widest font-bold text-white/90 mb-1', isUr && 'font-urdu text-xs')}>
              {isUr ? 'سائز اور رنگ میٹرکس' : 'Size & color matrix'}
            </div>
            <div className={cn('font-display font-extrabold text-2xl', isUr && 'font-urdu text-3xl')}>
              {isUr ? 'ٹی-شرٹ کلاسک' : 'T-shirt classic'}
            </div>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Shirt className="h-7 w-7" />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Matrix table */}
        <div className="overflow-hidden rounded-2xl ring-1 ring-inset ring-ink-100 dark:ring-ink-700">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 dark:bg-ink-900">
              <tr>
                <th className={cn('text-left px-3 py-2 text-xs font-bold uppercase tracking-widest text-ink-500', isUr && 'font-urdu text-sm')}>
                  {isUr ? 'رنگ' : 'Color'}
                </th>
                {SIZES.map((s) => (
                  <th key={s} className="text-center px-2 py-2 text-xs font-bold text-ink-500">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COLORS.map((c) => (
                <tr key={c.name} className="border-t border-ink-100 dark:border-ink-700">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full ring-1 ring-inset ring-ink-200 dark:ring-ink-700" style={{ background: c.hex }} />
                      <span className={cn('font-bold text-xs', isUr && 'font-urdu text-sm')}>{isUr ? c.nameUr : c.name}</span>
                    </div>
                  </td>
                  {SIZES.map((s) => {
                    const q = STOCK[c.name][s];
                    const isSelected = selected?.color === c.name && selected?.size === s;
                    return (
                      <td key={s} className="px-1 py-1 text-center">
                        <button
                          onClick={() => setSelected({ color: c.name, size: s })}
                          className={cn(
                            'h-9 w-full min-w-[36px] rounded-lg font-bold text-xs tabular-nums transition-all',
                            q === 0 && 'bg-red-50 dark:bg-red-950/40 text-red-500 line-through',
                            q > 0 && q <= 3 && 'bg-amber-50 dark:bg-amber-950/40 text-amber-700',
                            q > 3 && 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700',
                            isSelected && 'ring-2 ring-pink-500 scale-105 shadow-lg',
                          )}
                          disabled={q === 0}
                        >
                          {q}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend + stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3">
            <div className="font-display font-extrabold text-2xl text-emerald-700 tabular-nums">{total}</div>
            <div className={cn('text-[10px] font-bold uppercase text-emerald-700', isUr && 'font-urdu text-xs')}>
              {isUr ? 'کل اسٹاک' : 'Total stock'}
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3">
            <div className="font-display font-extrabold text-2xl text-amber-700 tabular-nums">{lowStock}</div>
            <div className={cn('text-[10px] font-bold uppercase text-amber-700', isUr && 'font-urdu text-xs')}>
              {isUr ? 'کم اسٹاک' : 'Low stock'}
            </div>
          </div>
          <div className="rounded-xl bg-red-50 dark:bg-red-950/40 p-3">
            <div className="font-display font-extrabold text-2xl text-red-700 tabular-nums">
              {Object.entries(STOCK).flatMap(([, sizes]) => Object.values(sizes)).filter((q) => q === 0).length}
            </div>
            <div className={cn('text-[10px] font-bold uppercase text-red-700', isUr && 'font-urdu text-xs')}>
              {isUr ? 'ختم' : 'Out'}
            </div>
          </div>
        </div>

        <div className={cn('flex items-center gap-1.5 text-xs text-ink-500', isUr && 'font-urdu text-sm')}>
          <Package className="h-3 w-3" />
          {isUr ? 'نفع ہر SKU کو سائز اور رنگ سے ٹریک کرتا ہے' : 'Nafaa tracks every SKU by size + color combination'}
        </div>
      </div>
    </div>
  );
}
