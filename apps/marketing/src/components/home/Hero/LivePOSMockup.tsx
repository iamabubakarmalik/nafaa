'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Check, TrendingUp, Users, Package, Zap } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { LiveDot } from '@/components/primitives/LiveDot';
import { cn } from '@/lib/cn';

interface Product {
  emoji: string;
  nameEn: string;
  nameUr: string;
  price: number;
  qty: number;
}

const initialProducts: Product[] = [
  { emoji: '🍞', nameEn: 'Fresh Bread', nameUr: 'تازہ روٹی', price: 120, qty: 2 },
  { emoji: '🥛', nameEn: 'Milk 1L', nameUr: 'دودھ ۱ لیٹر', price: 220, qty: 1 },
  { emoji: '🍪', nameEn: 'Biscuits', nameUr: 'بسکٹ', price: 85, qty: 3 },
];

export function LivePOSMockup() {
  const { locale } = useLocale();
  const [products, setProducts] = useState(initialProducts);
  const [checkoutStage, setCheckoutStage] = useState<'shopping' | 'paying' | 'done'>('shopping');
  const [salesToday, setSalesToday] = useState(142580);
  const [orderCount, setOrderCount] = useState(187);
  const isUr = locale === 'ur';

  const subtotal = products.reduce((s, p) => s + p.price * p.qty, 0);

  // Live sales counter — increments every 3-5s
  useEffect(() => {
    const interval = setInterval(() => {
      const inc = Math.floor(Math.random() * 800) + 200;
      setSalesToday((s) => s + inc);
      if (Math.random() > 0.5) setOrderCount((o) => o + 1);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Auto-cycle checkout demo every 8s
  useEffect(() => {
    if (checkoutStage === 'shopping') {
      const t = setTimeout(() => setCheckoutStage('paying'), 6000);
      return () => clearTimeout(t);
    }
    if (checkoutStage === 'paying') {
      const t = setTimeout(() => setCheckoutStage('done'), 2000);
      return () => clearTimeout(t);
    }
    if (checkoutStage === 'done') {
      const t = setTimeout(() => setCheckoutStage('shopping'), 2500);
      return () => clearTimeout(t);
    }
  }, [checkoutStage]);

  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute -inset-4 bg-gradient-to-r from-brand-500/30 via-aurora-purple/20 to-aurora-pink/30 rounded-[2rem] blur-3xl opacity-60 animate-pulse-glow" />

      {/* Card */}
      <div className="relative rounded-[1.75rem] bg-gradient-to-br from-ink-900 to-ink-950 p-1.5 shadow-2xl">
        <div className="rounded-3xl bg-white dark:bg-ink-900 overflow-hidden">
          {/* Browser bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-100 dark:border-ink-800 bg-ink-50 dark:bg-ink-950/70">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 mx-4 h-7 rounded-md bg-white dark:bg-ink-800 px-3 flex items-center text-xs text-ink-500 font-mono gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              nafaa.pk/pos
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-ink-500 font-semibold">
              <LiveDot color="emerald" size="sm" />
              LIVE
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Top stats */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-ink-500 font-bold">
                  {isUr ? 'آج کی سیلز' : 'Sales today'}
                </div>
                <div className="mt-0.5 text-2xl lg:text-3xl font-display font-extrabold tabular-nums text-gradient-brand">
                  Rs {salesToday.toLocaleString('en-PK')}
                </div>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-xs font-bold ring-1 ring-inset ring-emerald-200 dark:ring-emerald-800/50">
                <TrendingUp className="h-3 w-3" />
                +24%
              </div>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: ShoppingCart, val: orderCount, labelEn: 'Orders', labelUr: 'آرڈرز' },
                { icon: Users, val: 94, labelEn: 'Customers', labelUr: 'گاہک' },
                { icon: Package, val: 412, labelEn: 'Items sold', labelUr: 'آئٹمز' },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="rounded-xl bg-ink-50 dark:bg-ink-800 p-3">
                    <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-ink-500 font-bold">
                      <Icon className="h-3 w-3" />
                      <span className={isUr ? 'font-urdu' : ''}>{isUr ? s.labelUr : s.labelEn}</span>
                    </div>
                    <div className="mt-0.5 text-lg font-bold tabular-nums">{s.val}</div>
                  </div>
                );
              })}
            </div>

            {/* Cart items */}
            <div className="rounded-xl border border-ink-100 dark:border-ink-800 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-ink-500 font-bold">
                <span>{isUr ? 'موجودہ آرڈر' : 'Current order'}</span>
                <span>#{String(orderCount + 1).padStart(4, '0')}</span>
              </div>
              {products.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center justify-between py-1.5 border-b border-ink-100 dark:border-ink-800 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-brand-100 to-emerald-100 dark:from-brand-950 dark:to-emerald-950 flex items-center justify-center text-sm">
                      {p.emoji}
                    </span>
                    <div>
                      <div className={cn('text-xs font-bold', isUr && 'font-urdu text-sm')}>
                        {isUr ? p.nameUr : p.nameEn}
                      </div>
                      <div className="text-[10px] text-ink-500 tabular-nums">Qty {p.qty}</div>
                    </div>
                  </div>
                  <div className="text-xs font-bold tabular-nums text-brand-600 dark:text-brand-400">
                    Rs {(p.price * p.qty).toLocaleString()}
                  </div>
                </motion.div>
              ))}
              <div className="pt-2 flex items-center justify-between font-bold">
                <span className={cn('text-sm', isUr && 'font-urdu text-base')}>{isUr ? 'کل' : 'Total'}</span>
                <span className="tabular-nums text-lg text-gradient-brand">Rs {subtotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Action button — animated states */}
            <AnimatePresence mode="wait">
              {checkoutStage === 'shopping' && (
                <motion.button
                  key="shop"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="w-full h-11 rounded-xl bg-gradient-brand text-white font-bold text-sm flex items-center justify-center gap-2 shadow-brand-glow"
                >
                  <Zap className="h-4 w-4" />
                  {isUr ? 'چیک آؤٹ کریں' : 'Checkout'}
                </motion.button>
              )}
              {checkoutStage === 'paying' && (
                <motion.div
                  key="pay"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="w-full h-11 rounded-xl bg-aurora-purple text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  {isUr ? 'ادائیگی پروسیس ہو رہی ہے' : 'Processing payment'}
                </motion.div>
              )}
              {checkoutStage === 'done' && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full h-11 rounded-xl bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Check className="h-5 w-5" />
                  {isUr ? 'مکمل! رسید بھیج دی گئی' : 'Complete! Receipt sent'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Floating notification cards */}
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-6 top-32 hidden md:block"
      >
        <div className="rounded-xl bg-white dark:bg-ink-800 shadow-lg ring-1 ring-inset ring-ink-100 dark:ring-ink-700 p-3 flex items-center gap-2.5 max-w-[200px]">
          <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
            ✅
          </div>
          <div>
            <div className={cn('text-xs font-bold', isUr && 'font-urdu text-sm')}>
              {isUr ? 'سیل مکمل' : 'Sale complete'}
            </div>
            <div className="text-[10px] text-ink-500 tabular-nums">Rs 1,250 · JazzCash</div>
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute -right-4 bottom-32 hidden md:block"
      >
        <div className="rounded-xl bg-white dark:bg-ink-800 shadow-lg ring-1 ring-inset ring-ink-100 dark:ring-ink-700 p-3 flex items-center gap-2.5 max-w-[200px]">
          <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center shrink-0">
            ⚠️
          </div>
          <div>
            <div className={cn('text-xs font-bold', isUr && 'font-urdu text-sm')}>
              {isUr ? 'کم اسٹاک' : 'Low stock'}
            </div>
            <div className="text-[10px] text-ink-500">
              {isUr ? 'کوکنگ آئل — ۵ باقی' : 'Cooking Oil — 5 left'}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
