'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform, useMotionValue } from 'framer-motion';
import { ShoppingCart, Check, TrendingUp, Users, Package, Zap, ScanLine, Wifi, Sparkles } from 'lucide-react';
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

const paymentMethods = [
  { en: 'JazzCash', ur: 'جاز کیش', emoji: '📱' },
  { en: 'EasyPaisa', ur: 'ایزی پیسہ', emoji: '💚' },
  { en: 'Card', ur: 'کارڈ', emoji: '💳' },
  { en: 'Cash', ur: 'نقد', emoji: '💵' },
];

/* ─── Animated counter (spring physics — butter smooth) ─── */
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 60, damping: 18, mass: 0.8 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString('en-PK'));
  useEffect(() => { mv.set(value); }, [value, mv]);
  return <motion.span className={className}>{display}</motion.span>;
}

/* ─── Mini sparkline chart (pure SVG, animated draw) ─── */
function Sparkline() {
  return (
    <svg viewBox="0 0 120 32" className="w-full h-8 overflow-visible" fill="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d="M0 26 L12 22 L24 24 L36 18 L48 20 L60 14 L72 16 L84 10 L96 12 L108 6 L120 4 L120 32 L0 32 Z"
        fill="url(#sparkFill)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
      />
      <motion.path
        d="M0 26 L12 22 L24 24 L36 18 L48 20 L60 14 L72 16 L84 10 L96 12 L108 6 L120 4"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, delay: 0.3, ease: 'easeOut' }}
      />
      <motion.circle
        cx="120" cy="4" r="3" fill="#10b981"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.4, 1] }}
        transition={{ duration: 0.5, delay: 1.9 }}
      />
      <motion.circle
        cx="120" cy="4" r="3" fill="none" stroke="#10b981" strokeWidth="1.5"
        animate={{ r: [3, 9], opacity: [0.8, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
      />
    </svg>
  );
}

/* ─── Floating orb background ─── */
function Orbs() {
  return (
    <div className="pointer-events-none absolute -inset-8 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-brand-500/25 blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, 20, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-12 -right-8 h-48 w-48 rounded-full bg-aurora-purple/25 blur-3xl"
        animate={{ x: [0, -25, 0], y: [0, -20, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-aurora-pink/20 blur-3xl"
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
    </div>
  );
}

/* ─── Success confetti burst ─── */
function SuccessBurst() {
  const particles = Array.from({ length: 12 });
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      {particles.map((_, i) => {
        const angle = (i / particles.length) * Math.PI * 2;
        const dist = 60 + Math.random() * 40;
        return (
          <motion.span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: ['#10b981', '#8b5cf6', '#f59e0b', '#ec4899'][i % 4] }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, scale: 0, opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}

export function LivePOSMockup() {
  const { locale } = useLocale();
  const [products] = useState(initialProducts);
  const [checkoutStage, setCheckoutStage] = useState<'shopping' | 'paying' | 'done'>('shopping');
  const [salesToday, setSalesToday] = useState(142580);
  const [orderCount, setOrderCount] = useState(187);
  const [payIndex, setPayIndex] = useState(0);
  const isUr = locale === 'ur';

  const subtotal = products.reduce((s, p) => s + p.price * p.qty, 0);
  const currentPayment = paymentMethods[payIndex];

  // Live sales counter — increments every 3-5s
  useEffect(() => {
    const interval = setInterval(() => {
      const inc = Math.floor(Math.random() * 800) + 200;
      setSalesToday((s) => s + inc);
      if (Math.random() > 0.5) setOrderCount((o) => o + 1);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Rotate payment method chip
  useEffect(() => {
    const t = setInterval(() => setPayIndex((i) => (i + 1) % paymentMethods.length), 3000);
    return () => clearInterval(t);
  }, []);

  // Auto-cycle checkout demo
  useEffect(() => {
    const timings = { shopping: 6000, paying: 2200, done: 2600 } as const;
    const next = { shopping: 'paying', paying: 'done', done: 'shopping' } as const;
    const t = setTimeout(() => setCheckoutStage(next[checkoutStage]), timings[checkoutStage]);
    return () => clearTimeout(t);
  }, [checkoutStage]);

  return (
    <div className="relative isolate" dir={isUr ? 'rtl' : 'ltr'}>
      <Orbs />

      {/* Glow halo */}
      <div className="absolute -inset-3 sm:-inset-5 bg-gradient-to-r from-brand-500/30 via-aurora-purple/20 to-aurora-pink/30 rounded-[2rem] sm:rounded-[2.5rem] blur-2xl sm:blur-3xl opacity-60 animate-pulse-glow" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-[1.5rem] sm:rounded-[1.75rem] bg-gradient-to-br from-ink-900 via-ink-800 to-ink-950 p-1 sm:p-1.5 shadow-2xl"
      >
        {/* Shine sweep */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.5rem] sm:rounded-[1.75rem]" aria-hidden>
          <motion.div
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent skew-x-12"
            animate={{ x: ['-150%', '450%'] }}
            transition={{ duration: 4, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
          />
        </div>

        <div className="rounded-[1.25rem] sm:rounded-3xl bg-white dark:bg-ink-900 overflow-hidden">
          {/* Browser bar */}
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-ink-100 dark:border-ink-800 bg-ink-50 dark:bg-ink-950/70">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-red-400" />
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-amber-400" />
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 mx-2 sm:mx-4 h-6 sm:h-7 rounded-md bg-white dark:bg-ink-800 px-2.5 sm:px-3 flex items-center text-[10px] sm:text-xs text-ink-500 font-mono gap-1.5">
              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate" dir="ltr">nafaa.pk/pos</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] text-ink-500 font-bold shrink-0">
              <LiveDot color="emerald" size="sm" />
              LIVE
            </div>
          </div>

          {/* Content */}
          <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-4">
            {/* Top stats */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-ink-500 font-bold">
                  {isUr ? 'آج کی سیلز' : 'Sales today'}
                  <Wifi className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-500" />
                </div>
                <div className="mt-0.5 text-xl sm:text-2xl lg:text-3xl font-display font-extrabold tabular-nums text-gradient-brand truncate">
                  Rs <AnimatedNumber value={salesToday} />
                </div>
                {/* Sparkline — mini live chart */}
                <div className="mt-1.5 w-24 sm:w-28">
                  <Sparkline />
                </div>
              </div>
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold ring-1 ring-inset ring-emerald-200 dark:ring-emerald-800/50 shrink-0"
              >
                <TrendingUp className="h-3 w-3" />
                +24%
              </motion.div>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {[
                { icon: ShoppingCart, val: orderCount, labelEn: 'Orders', labelUr: 'آرڈرز' },
                { icon: Users, val: 94, labelEn: 'Customers', labelUr: 'گاہک' },
                { icon: Package, val: 412, labelEn: 'Items sold', labelUr: 'آئٹمز' },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.12, duration: 0.5 }}
                    whileHover={{ y: -2 }}
                    className="rounded-lg sm:rounded-xl bg-ink-50 dark:bg-ink-800 p-2 sm:p-3 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] font-mono uppercase tracking-wider sm:tracking-widest text-ink-500 font-bold">
                      <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                      <span className={cn('truncate', isUr && 'font-urdu text-[10px] sm:text-xs normal-case tracking-normal')}>
                        {isUr ? s.labelUr : s.labelEn}
                      </span>
                    </div>
                    <div className="mt-0.5 text-base sm:text-lg font-bold tabular-nums">
                      <AnimatedNumber value={s.val} />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Cart items */}
            <div className="rounded-lg sm:rounded-xl border border-ink-100 dark:border-ink-800 p-2.5 sm:p-3 space-y-1 sm:space-y-1.5 relative overflow-hidden">
              {/* Scan beam */}
              <motion.div
                className="pointer-events-none absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-brand-500/[0.06] to-transparent"
                animate={{ y: ['-100%', '400%'] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
                aria-hidden
              />
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-ink-500 font-bold">
                <span className="flex items-center gap-1">
                  <ScanLine className="h-3 w-3" />
                  {isUr ? 'موجودہ آرڈر' : 'Current order'}
                </span>
                <span dir="ltr">#{String(orderCount + 1).padStart(4, '0')}</span>
              </div>
              {products.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: isUr ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.12, duration: 0.4 }}
                  className="flex items-center justify-between py-1 sm:py-1.5 border-b border-ink-100 dark:border-ink-800 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <motion.span
                      whileHover={{ scale: 1.15, rotate: 8 }}
                      className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-gradient-to-br from-brand-100 to-emerald-100 dark:from-brand-950 dark:to-emerald-950 flex items-center justify-center text-xs sm:text-sm shrink-0"
                    >
                      {p.emoji}
                    </motion.span>
                    <div className="min-w-0">
                      <div className={cn('text-[11px] sm:text-xs font-bold truncate', isUr && 'font-urdu text-xs sm:text-sm')}>
                        {isUr ? p.nameUr : p.nameEn}
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-ink-500 tabular-nums">
                        {isUr ? `تعداد ${p.qty}` : `Qty ${p.qty}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] sm:text-xs font-bold tabular-nums text-brand-600 dark:text-brand-400 shrink-0">
                    Rs {(p.price * p.qty).toLocaleString()}
                  </div>
                </motion.div>
              ))}
              <div className="pt-1.5 sm:pt-2 flex items-center justify-between font-bold">
                <span className={cn('text-xs sm:text-sm', isUr && 'font-urdu text-sm sm:text-base')}>
                  {isUr ? 'کل' : 'Total'}
                </span>
                <span className="tabular-nums text-base sm:text-lg text-gradient-brand">
                  Rs {subtotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment method ticker */}
            <div className="flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] text-ink-500 font-semibold">
              <span className={cn(isUr && 'font-urdu text-[11px]')}>{isUr ? 'قبول کرتا ہے' : 'Accepts'}</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={payIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className={cn('inline-flex items-center gap-1 rounded-full bg-ink-100 dark:bg-ink-800 px-2 py-0.5 font-bold text-ink-700 dark:text-ink-200', isUr && 'font-urdu text-[11px]')}
                >
                  {currentPayment.emoji} {isUr ? currentPayment.ur : currentPayment.en}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* Action button — animated states */}
            <div className="relative">
              <AnimatePresence mode="wait">
                {checkoutStage === 'shopping' && (
                  <motion.button
                    key="shop"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    whileTap={{ scale: 0.97 }}
                    className="relative w-full h-10 sm:h-11 rounded-lg sm:rounded-xl bg-gradient-brand text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-brand-glow overflow-hidden"
                  >
                    <motion.span
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 2.5 }}
                      aria-hidden
                    />
                    <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className={cn(isUr && 'font-urdu text-sm')}>{isUr ? 'چیک آؤٹ کریں' : 'Checkout'}</span>
                  </motion.button>
                )}
                {checkoutStage === 'paying' && (
                  <motion.div
                    key="pay"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="relative w-full h-10 sm:h-11 rounded-lg sm:rounded-xl bg-aurora-purple text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 overflow-hidden"
                  >
                    {/* Progress bar */}
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-white/20"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2, ease: 'easeInOut' }}
                      aria-hidden
                    />
                    <span className="relative h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span className={cn('relative', isUr && 'font-urdu text-sm')}>
                      {isUr ? 'ادائیگی پروسیس ہو رہی ہے' : 'Processing payment'}
                    </span>
                  </motion.div>
                )}
                {checkoutStage === 'done' && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full h-10 sm:h-11 rounded-lg sm:rounded-xl bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2"
                  >
                    <motion.span
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    >
                      <Check className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={3} />
                    </motion.span>
                    <span className={cn(isUr && 'font-urdu text-sm')}>
                      {isUr ? 'مکمل! رسید بھیج دی گئی' : 'Complete! Receipt sent'}
                    </span>
                    <SuccessBurst />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Floating cards — responsive: compact on mobile, offset on desktop ─── */}
      <motion.div
        initial={{ opacity: 0, x: isUr ? 20 : -20, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ delay: 1, duration: 0.6, type: 'spring', stiffness: 120 }}
        className="absolute -left-1 sm:-left-4 md:-left-6 top-20 sm:top-28 md:top-32 z-10"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-lg sm:rounded-xl bg-white/95 dark:bg-ink-800/95 backdrop-blur-sm shadow-lg ring-1 ring-inset ring-ink-100 dark:ring-ink-700 p-2 sm:p-3 flex items-center gap-2 sm:gap-2.5 max-w-[150px] sm:max-w-[200px]"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
            className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0 text-sm sm:text-base"
          >
            ✅
          </motion.div>
          <div className="min-w-0">
            <div className={cn('text-[10px] sm:text-xs font-bold truncate', isUr && 'font-urdu text-xs sm:text-sm')}>
              {isUr ? 'سیل مکمل' : 'Sale complete'}
            </div>
            <div className="text-[8px] sm:text-[10px] text-ink-500 tabular-nums truncate" dir="ltr">
              Rs 1,250 · JazzCash
            </div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: isUr ? -20 : 20, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ delay: 1.3, duration: 0.6, type: 'spring', stiffness: 120 }}
        className="absolute -right-1 sm:-right-3 md:-right-4 bottom-20 sm:bottom-28 md:bottom-32 z-10"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="rounded-lg sm:rounded-xl bg-white/95 dark:bg-ink-800/95 backdrop-blur-sm shadow-lg ring-1 ring-inset ring-ink-100 dark:ring-ink-700 p-2 sm:p-3 flex items-center gap-2 sm:gap-2.5 max-w-[150px] sm:max-w-[200px]"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center shrink-0 text-sm sm:text-base"
          >
            ⚠️
          </motion.div>
          <div className="min-w-0">
            <div className={cn('text-[10px] sm:text-xs font-bold truncate', isUr && 'font-urdu text-xs sm:text-sm')}>
              {isUr ? 'کم اسٹاک' : 'Low stock'}
            </div>
            <div className="text-[8px] sm:text-[10px] text-ink-500 truncate">
              {isUr ? 'کوکنگ آئل — ۵ باقی' : 'Cooking Oil — 5 left'}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Third floating chip — AI insight (desktop only) */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1.6, duration: 0.6, type: 'spring', stiffness: 120 }}
        className="absolute -right-2 lg:-right-8 top-8 z-10 hidden lg:block"
      >
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, 1, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="rounded-xl bg-gradient-to-br from-aurora-purple/95 to-brand-600/95 backdrop-blur-sm shadow-xl p-3 flex items-center gap-2.5 max-w-[190px] text-white"
        >
          <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className={cn('text-xs font-bold', isUr && 'font-urdu text-sm')}>
              {isUr ? 'AI بصیرت' : 'AI Insight'}
            </div>
            <div className={cn('text-[10px] text-white/80', isUr && 'font-urdu text-[11px]')}>
              {isUr ? 'دودھ کی مانگ بڑھ رہی ہے' : 'Milk demand rising ↑'}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
