'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Plus, Minus, Trash2, Check, Zap,
  Receipt, Sparkles, ArrowRight, RefreshCw, CreditCard,
} from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { LiveDot } from '@/components/primitives/LiveDot';
import { toast } from 'sonner';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

interface Product { id: number; emoji: string; nameEn: string; nameUr: string; price: number; category: string; }
interface CartItem extends Product { qty: number; }

const products: Product[] = [
  { id: 1, emoji: '🥛', nameEn: 'Milk 1L', nameUr: 'دودھ ۱ لیٹر', price: 220, category: 'dairy' },
  { id: 2, emoji: '🍞', nameEn: 'Fresh Bread', nameUr: 'تازہ روٹی', price: 120, category: 'bakery' },
  { id: 3, emoji: '🥚', nameEn: 'Eggs (dozen)', nameUr: 'انڈے (درجن)', price: 380, category: 'dairy' },
  { id: 4, emoji: '🍚', nameEn: 'Basmati Rice 5kg', nameUr: 'باسمتی چاول ۵ کلو', price: 1850, category: 'grains' },
  { id: 5, emoji: '🍅', nameEn: 'Tomatoes 1kg', nameUr: 'ٹماٹر ۱ کلو', price: 180, category: 'vegetables' },
  { id: 6, emoji: '🥔', nameEn: 'Potatoes 1kg', nameUr: 'آلو ۱ کلو', price: 95, category: 'vegetables' },
  { id: 7, emoji: '🧅', nameEn: 'Onions 1kg', nameUr: 'پیاز ۱ کلو', price: 120, category: 'vegetables' },
  { id: 8, emoji: '🍎', nameEn: 'Apples 1kg', nameUr: 'سیب ۱ کلو', price: 320, category: 'fruits' },
  { id: 9, emoji: '🍌', nameEn: 'Bananas 1 dozen', nameUr: 'کیلے درجن', price: 180, category: 'fruits' },
  { id: 10, emoji: '🧀', nameEn: 'Cheese 500g', nameUr: 'پنیر ۵۰۰ گرام', price: 850, category: 'dairy' },
  { id: 11, emoji: '🍪', nameEn: 'Biscuit Pack', nameUr: 'بسکٹ پیک', price: 85, category: 'bakery' },
  { id: 12, emoji: '☕', nameEn: 'Tea 250g', nameUr: 'چائے ۲۵۰ گرام', price: 450, category: 'grains' },
];

const categories = [
  { key: 'all', en: 'All', ur: 'سب' },
  { key: 'dairy', en: 'Dairy', ur: 'ڈیری' },
  { key: 'bakery', en: 'Bakery', ur: 'بیکری' },
  { key: 'grains', en: 'Grains', ur: 'اناج' },
  { key: 'vegetables', en: 'Vegetables', ur: 'سبزیاں' },
  { key: 'fruits', en: 'Fruits', ur: 'پھل' },
];

export default function PlaygroundPage() {
  const { locale } = useLocale();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState('all');
  const [stage, setStage] = useState<'shopping' | 'paying' | 'done'>('shopping');
  const [payMethod, setPayMethod] = useState<string | null>(null);
  const isUr = locale === 'ur';

  const filtered = category === 'all' ? products : products.filter((p) => p.category === category);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  const add = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === p.id);
      if (existing) return prev.map((i) => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...p, qty: 1 }];
    });
    toast.success(`${isUr ? p.nameUr : p.nameEn} ${isUr ? 'شامل ہو گیا' : 'added'}`, { duration: 1200 });
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) => {
      const updated = prev.map((i) => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i);
      return updated.filter((i) => i.qty > 0);
    });
  };

  const remove = (id: number) => setCart((prev) => prev.filter((i) => i.id !== id));
  const clearCart = () => { setCart([]); setStage('shopping'); setPayMethod(null); };

  const checkout = () => {
    if (cart.length === 0) return;
    setStage('paying');
  };

  const pay = (method: string) => {
    setPayMethod(method);
    setTimeout(() => {
      setStage('done');
      toast.success(isUr ? 'سیل مکمل!' : 'Sale complete!');
    }, 1500);
  };

  const newSale = () => {
    setCart([]);
    setStage('shopping');
    setPayMethod(null);
  };

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-8">
          <AuroraBackground variant="brand" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="live" size="md" pulse>
              <Sparkles className="h-3 w-3" />
              {isUr ? 'کوئی سائن اپ نہیں — ابھی آزمائیں' : 'No signup — try right now'}
            </Badge>
            <h1 className={cn('mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto text-balance', isUr && 'font-urdu leading-[1.5]')}>
              <GradientText variant="brand">
                {isUr ? 'نفع پی او ایس ابھی چلائیں' : 'Try Nafaa POS live, right now'}
              </GradientText>
            </h1>
            <p className={cn('mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto', isUr && 'font-urdu text-xl leading-loose')}>
              {isUr
                ? 'یہ حقیقی نفع پی او ایس ہے۔ آئٹمز شامل کریں، چیک آؤٹ کریں، ادائیگی کریں۔ کوئی سائن اپ نہیں۔'
                : 'This is the real Nafaa POS. Add items, checkout, take payment. No signup required.'}
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="md">
          <Container>
            <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 max-w-6xl mx-auto">
              {/* Product grid */}
              <div className="rounded-3xl bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 p-5">
                {/* Categories */}
                <div className="flex flex-wrap gap-1.5 mb-4 pb-4 border-b border-ink-100 dark:border-ink-700/60">
                  {categories.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setCategory(c.key)}
                      className={cn(
                        'px-3 h-9 rounded-lg text-sm font-bold transition',
                        category === c.key
                          ? 'bg-ink-900 dark:bg-white text-white dark:text-ink-900'
                          : 'bg-ink-100 dark:bg-ink-900 hover:bg-ink-200 dark:hover:bg-ink-700',
                      )}
                    >
                      {isUr ? c.ur : c.en}
                    </button>
                  ))}
                </div>

                {/* Products */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {filtered.map((p) => (
                    <motion.button
                      key={p.id}
                      onClick={() => add(p)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="group rounded-xl bg-ink-50 dark:bg-ink-900 p-3 text-left hover:ring-2 hover:ring-brand-400 transition-all"
                    >
                      <div className="aspect-square rounded-lg bg-gradient-to-br from-white to-ink-100 dark:from-ink-800 dark:to-ink-950 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                        {p.emoji}
                      </div>
                      <div className={cn('mt-2 font-bold text-xs line-clamp-1', isUr && 'font-urdu text-sm')}>
                        {isUr ? p.nameUr : p.nameEn}
                      </div>
                      <div className="mt-0.5 text-sm font-extrabold tabular-nums text-brand-600 dark:text-brand-400">
                        Rs {p.price}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Cart / Checkout */}
              <div className="rounded-3xl bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-ink-100 dark:border-ink-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-brand-600" />
                    <div className={cn('font-display font-extrabold', isUr && 'font-urdu text-lg')}>
                      {isUr ? 'موجودہ آرڈر' : 'Current order'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <LiveDot color="emerald" size="sm" />
                    <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-500">LIVE</span>
                  </div>
                </div>

                {/* Shopping stage */}
                {stage === 'shopping' && (
                  <>
                    <div className="flex-1 overflow-y-auto p-5 min-h-[300px] max-h-[400px]">
                      {cart.length === 0 ? (
                        <div className={cn('text-center py-12 text-sm text-ink-400', isUr && 'font-urdu text-base')}>
                          {isUr ? 'کارٹ خالی ہے — پروڈکٹس شامل کریں' : 'Cart is empty — add products'}
                        </div>
                      ) : (
                        <AnimatePresence>
                          {cart.map((item) => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className="flex items-center gap-3 py-2.5 border-b border-ink-100 dark:border-ink-700/60 last:border-0"
                            >
                              <span className="text-2xl">{item.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <div className={cn('font-bold text-sm truncate', isUr && 'font-urdu text-base')}>
                                  {isUr ? item.nameUr : item.nameEn}
                                </div>
                                <div className="text-xs tabular-nums text-ink-500">Rs {item.price} × {item.qty}</div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => updateQty(item.id, -1)} className="h-7 w-7 rounded-lg bg-ink-100 dark:bg-ink-900 hover:bg-ink-200 dark:hover:bg-ink-700 flex items-center justify-center">
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-6 text-center text-sm font-bold tabular-nums">{item.qty}</span>
                                <button onClick={() => updateQty(item.id, 1)} className="h-7 w-7 rounded-lg bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center">
                                  <Plus className="h-3 w-3" />
                                </button>
                                <button onClick={() => remove(item.id)} className="h-7 w-7 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center ml-1">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      )}
                    </div>

                    <div className="p-5 border-t border-ink-100 dark:border-ink-700/60 bg-ink-50 dark:bg-ink-900 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={cn('text-sm text-ink-500', isUr && 'font-urdu text-base')}>
                          {isUr ? 'آئٹمز' : 'Items'}
                        </span>
                        <span className="font-bold tabular-nums">{itemCount}</span>
                      </div>
                      <div className="flex items-center justify-between font-bold">
                        <span className={cn('text-lg', isUr && 'font-urdu text-xl')}>{isUr ? 'کل' : 'Total'}</span>
                        <span className="text-2xl font-display font-extrabold text-gradient-brand tabular-nums">
                          Rs {total.toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={checkout}
                        disabled={cart.length === 0}
                        className={cn(
                          'w-full h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all',
                          cart.length === 0
                            ? 'bg-ink-300 dark:bg-ink-700 cursor-not-allowed'
                            : 'bg-gradient-brand shadow-brand-glow hover:-translate-y-0.5',
                        )}
                      >
                        <Zap className="h-4 w-4" />
                        {isUr ? 'چیک آؤٹ کریں' : 'Checkout'}
                      </button>
                    </div>
                  </>
                )}

                {/* Paying stage */}
                {stage === 'paying' && (
                  <div className="flex-1 p-6">
                    <div className={cn('text-lg font-bold mb-5', isUr && 'font-urdu text-xl')}>
                      {isUr ? 'ادائیگی کا طریقہ' : 'Payment method'}
                    </div>
                    <div className="space-y-2">
                      {[
                        { key: 'jazzcash', label: 'JazzCash', emoji: '💜', color: '#ba0c2f' },
                        { key: 'easypaisa', label: 'Easypaisa', emoji: '💚', color: '#00a651' },
                        { key: 'raast', label: 'Raast', emoji: '⚡', color: '#0d9488' },
                        { key: 'cash', label: isUr ? 'نقد' : 'Cash', emoji: '💵', color: '#059669' },
                      ].map((m) => (
                        <button
                          key={m.key}
                          onClick={() => pay(m.label)}
                          disabled={payMethod !== null}
                          className={cn(
                            'w-full flex items-center gap-3 p-4 rounded-xl ring-1 ring-inset ring-ink-200 dark:ring-ink-700 hover:ring-brand-400 transition text-left',
                            payMethod === m.label && 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-950/40',
                          )}
                        >
                          <span className="text-2xl">{m.emoji}</span>
                          <span className="font-bold flex-1">{m.label}</span>
                          {payMethod === m.label ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-brand-600" />
                          ) : (
                            <ArrowRight className="h-4 w-4 text-ink-400" />
                          )}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setStage('shopping')} className={cn('mt-4 w-full text-sm text-ink-500 hover:text-ink-700 dark:hover:text-ink-300', isUr && 'font-urdu')}>
                      {isUr ? '← واپس' : '← Back to cart'}
                    </button>
                  </div>
                )}

                {/* Done stage */}
                {stage === 'done' && (
                  <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-brand-600 flex items-center justify-center shadow-brand-glow"
                    >
                      <Check className="h-10 w-10 text-white" strokeWidth={3} />
                    </motion.div>
                    <div className={cn('mt-5 font-display font-extrabold text-2xl', isUr && 'font-urdu text-3xl')}>
                      {isUr ? 'سیل مکمل!' : 'Sale complete!'}
                    </div>
                    <div className={cn('mt-2 text-sm text-ink-500', isUr && 'font-urdu text-base')}>
                      {isUr
                        ? `Rs ${total.toLocaleString()} ${payMethod} سے وصول ہوئے`
                        : `Rs ${total.toLocaleString()} received via ${payMethod}`}
                    </div>
                    <div className="mt-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      {isUr ? 'واٹس ایپ رسید بھیج دی' : 'WhatsApp receipt sent'}
                    </div>
                    <button onClick={newSale} className="mt-6 w-full h-11 rounded-xl bg-gradient-brand text-white font-bold hover:shadow-brand-glow transition">
                      {isUr ? 'نئی سیل' : 'New sale'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="mt-10 max-w-3xl mx-auto text-center rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-800 p-8 text-white shadow-brand-glow">
              <Sparkles className="h-10 w-10 mx-auto mb-4" />
              <h3 className={cn('font-display font-extrabold text-2xl lg:text-3xl', isUr && 'font-urdu')}>
                {isUr ? 'اپنی حقیقی دکان پر یہی چلائیں' : 'Run this on your actual shop'}
              </h3>
              <p className={cn('mt-3 text-white/90', isUr && 'font-urdu text-lg')}>
                {isUr
                  ? 'یہ صرف ڈیمو نہیں — یہ نفع پی او ایس ہے۔ اپنے پروڈکٹس، اپنے گاہک، اپنا کاروبار — مفت میں شروع کریں۔'
                  : 'This isn\'t just a demo — this is Nafaa POS. Your products, your customers, your business — start free.'}
              </p>
              <Button className="mt-6 !bg-white !text-brand-700 hover:!bg-white/95" size="xl" href={`${APP_URL}/register`} rightIcon={<ArrowRight className="h-5 w-5" />}>
                {isUr ? 'مفت اکاؤنٹ بنائیں' : 'Create free account'}
              </Button>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
