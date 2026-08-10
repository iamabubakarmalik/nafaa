'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cookie, Flame, TrendingDown } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

const RECIPES = [
  {
    name: 'Chocolate Fudge Cake',
    nameUr: 'چاکلیٹ فج کیک',
    unit: '2 lb',
    ingredients: [
      { name: 'Flour', nameUr: 'میدہ', qty: 500, unit: 'g', cost: 85 },
      { name: 'Sugar', nameUr: 'چینی', qty: 400, unit: 'g', cost: 68 },
      { name: 'Cocoa powder', nameUr: 'کوکو پاؤڈر', qty: 100, unit: 'g', cost: 240 },
      { name: 'Eggs', nameUr: 'انڈے', qty: 6, unit: 'pcs', cost: 120 },
      { name: 'Butter', nameUr: 'مکھن', qty: 250, unit: 'g', cost: 375 },
      { name: 'Milk', nameUr: 'دودھ', qty: 200, unit: 'ml', cost: 40 },
    ],
    sellPrice: 2200,
  },
  {
    name: 'Chicken Patties (dozen)',
    nameUr: 'چکن پیٹیز (درجن)',
    unit: '12 pcs',
    ingredients: [
      { name: 'Puff pastry', nameUr: 'پف پیسٹری', qty: 500, unit: 'g', cost: 320 },
      { name: 'Chicken', nameUr: 'چکن', qty: 400, unit: 'g', cost: 480 },
      { name: 'Onion + spices', nameUr: 'پیاز + مصالحہ', qty: 100, unit: 'g', cost: 45 },
    ],
    sellPrice: 1500,
  },
];

export function BakeryRecipeWidget() {
  const { locale } = useLocale();
  const isUr = locale === 'ur';
  const [selected, setSelected] = useState(0);

  const recipe = RECIPES[selected];
  const totalCost = recipe.ingredients.reduce((s, i) => s + i.cost, 0);
  const margin = recipe.sellPrice - totalCost;
  const marginPct = ((margin / recipe.sellPrice) * 100).toFixed(0);

  return (
    <div className="rounded-3xl bg-white dark:bg-ink-800 shadow-2xl ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 overflow-hidden">
      <div className="relative p-6 text-white overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #f59e0b, #78350f)' }}
      >
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className={cn('text-[10px] font-mono uppercase tracking-widest font-bold text-white/90 mb-1', isUr && 'font-urdu text-xs')}>
              {isUr ? 'ریسیپی اور لاگت' : 'Recipe & cost'}
            </div>
            <div className={cn('font-display font-extrabold text-2xl', isUr && 'font-urdu text-3xl')}>
              {isUr ? 'مواد کی فہرست' : 'Bill of Materials'}
            </div>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Cookie className="h-7 w-7" />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Recipe selector */}
        <div className="flex gap-2">
          {RECIPES.map((r, i) => (
            <button
              key={r.name}
              onClick={() => setSelected(i)}
              className={cn(
                'flex-1 h-11 rounded-xl font-bold text-xs px-3 transition-all',
                selected === i
                  ? 'bg-gradient-to-br from-amber-500 to-amber-800 text-white shadow-lg'
                  : 'bg-ink-50 dark:bg-ink-900 text-ink-600',
                isUr && 'font-urdu text-sm',
              )}
            >
              {isUr ? r.nameUr : r.name}
            </button>
          ))}
        </div>

        {/* Recipe header */}
        <motion.div
          key={selected}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-baseline justify-between mb-3">
            <div className={cn('font-display font-extrabold text-xl', isUr && 'font-urdu text-2xl')}>
              {isUr ? recipe.nameUr : recipe.name}
            </div>
            <div className={cn('text-sm text-ink-500 font-bold', isUr && 'font-urdu text-base')}>
              {recipe.unit}
            </div>
          </div>

          {/* Ingredients */}
          <div className="rounded-2xl bg-ink-50 dark:bg-ink-900 p-4 space-y-2">
            {recipe.ingredients.map((ing) => (
              <div key={ing.name} className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className={cn('font-bold text-sm', isUr && 'font-urdu text-base')}>
                    {isUr ? ing.nameUr : ing.name}
                  </div>
                </div>
                <div className="text-xs text-ink-500 font-mono tabular-nums shrink-0">
                  {ing.qty} {ing.unit}
                </div>
                <div className="text-sm font-bold tabular-nums shrink-0 w-20 text-right">
                  ₨ {ing.cost}
                </div>
              </div>
            ))}
          </div>

          {/* P&L */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-red-50 dark:bg-red-950/40 p-3 text-center">
              <div className={cn('text-[10px] font-bold uppercase text-red-700 mb-1', isUr && 'font-urdu text-xs')}>
                {isUr ? 'لاگت' : 'Cost'}
              </div>
              <div className="font-display font-extrabold text-lg tabular-nums text-red-700">₨ {totalCost}</div>
            </div>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 p-3 text-center">
              <div className={cn('text-[10px] font-bold uppercase text-blue-700 mb-1', isUr && 'font-urdu text-xs')}>
                {isUr ? 'قیمت' : 'Sell'}
              </div>
              <div className="font-display font-extrabold text-lg tabular-nums text-blue-700">₨ {recipe.sellPrice}</div>
            </div>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 text-center">
              <div className={cn('text-[10px] font-bold uppercase text-emerald-700 mb-1', isUr && 'font-urdu text-xs')}>
                {isUr ? 'منافع' : 'Margin'}
              </div>
              <div className="font-display font-extrabold text-lg tabular-nums text-emerald-700">{marginPct}%</div>
            </div>
          </div>
        </motion.div>

        <div className={cn('flex items-center gap-1.5 text-xs text-ink-500', isUr && 'font-urdu text-sm')}>
          <Flame className="h-3 w-3" />
          {isUr ? 'نفع خود بخود مواد گھٹاتا ہے جب کیک بکتا ہے' : 'Nafaa auto-deducts ingredients when cakes are sold'}
        </div>
      </div>
    </div>
  );
}
