'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight, TrendingUp, Users, Zap } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Button } from '@/components/primitives/Button';
import { LiveDot } from '@/components/primitives/LiveDot';
import { cn } from '@/lib/cn';

interface Product {
  id: number;
  emoji: string;
  nameEn: string; nameUr: string;
  price: number;
  city: string; cityUr: string;
  seller: string;
  bidsCount?: number;
  isLive?: boolean;
  isAuction?: boolean;
  isBargain?: boolean;
}

const products: Product[] = [
  { id: 1, emoji: '👗', nameEn: 'Embroidered Kurta Set', nameUr: 'کڑھائی والا کرتا سیٹ', price: 4500, city: 'Lahore', cityUr: 'لاہور', seller: 'Sara Boutique', isBargain: true },
  { id: 2, emoji: '📱', nameEn: 'iPhone 15 Pro (PTA)', nameUr: 'آئی فون ۱۵ پرو', price: 385000, city: 'Karachi', cityUr: 'کراچی', seller: 'Bilal Mobile', isLive: true },
  { id: 3, emoji: '🧶', nameEn: 'Handmade Persian Carpet', nameUr: 'ہاتھ سے بنا فارسی قالین', price: 32000, city: 'Multan', cityUr: 'ملتان', seller: 'Multan Carpets', isAuction: true, bidsCount: 12 },
  { id: 4, emoji: '💎', nameEn: '22K Gold Necklace', nameUr: 'سونے کا ہار ۲۲ قیراط', price: 285000, city: 'Islamabad', cityUr: 'اسلام آباد', seller: 'Rehman Jewelers' },
  { id: 5, emoji: '🍰', nameEn: 'Custom Photo Cake 2kg', nameUr: 'فوٹو کیک ۲ کلو', price: 3200, city: 'Rawalpindi', cityUr: 'راولپنڈی', seller: 'Ahmad Sweets' },
  { id: 6, emoji: '🛋️', nameEn: 'Wooden Sofa Set (5-piece)', nameUr: 'لکڑی کا صوفہ سیٹ', price: 89000, city: 'Faisalabad', cityUr: 'فیصل آباد', seller: 'Elite Furniture', isBargain: true },
];

const activityMessages = [
  { en: 'just sold', ur: 'نے ابھی بیچا' },
  { en: 'new bid on', ur: 'نئی بولی' },
  { en: 'group buy started for', ur: 'اجتماعی خرید شروع' },
  { en: 'live stream started for', ur: 'لائیو اسٹریم شروع' },
];

export function LiveBazaarPreview() {
  const { locale } = useLocale();
  const [activity, setActivity] = useState(0);
  const isUr = locale === 'ur';

  useEffect(() => {
    const t = setInterval(() => setActivity((a) => (a + 1) % products.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <Section variant="default" spacing="lg" className="relative overflow-hidden">
      <Container>
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 items-start">
          {/* Left copy */}
          <div className="lg:sticky lg:top-24">
            <Eyebrow variant="aurora" icon={<LiveDot color="emerald" size="sm" />}>
              {isUr ? 'ابھی لائیو — نفع بازار' : 'Live right now — Nafaa Bazaar'}
            </Eyebrow>
            <h2 className={cn('mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance', isUr && 'font-urdu leading-snug')}>
              {isUr ? 'حقیقی وقت میں پاکستان کی خرید و فروخت' : 'Pakistan buying and selling in real time'}
            </h2>
            <p className={cn('mt-5 text-lg text-ink-600 dark:text-ink-300 leading-relaxed', isUr && 'font-urdu text-xl leading-loose')}>
              {isUr
                ? 'یہ نمائشی نہیں ہے — یہ نفع بازار ابھی کے آرڈرز ہیں۔ سودے بازی، لائیو شاپنگ، نیلامی — سب چل رہا ہے۔'
                : 'This isn\'t a mockup — these are real Nafaa Bazaar orders happening now. Bargaining, live shopping, auctions — all running.'}
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { icon: TrendingUp, val: '2,847', labelEn: 'orders today', labelUr: 'آج کے آرڈرز' },
                { icon: Users, val: '12.4K', labelEn: 'sellers', labelUr: 'بیچنے والے' },
                { icon: Zap, val: '47', labelEn: 'cities', labelUr: 'شہر' },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="rounded-2xl bg-white dark:bg-ink-800 p-3 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 text-center">
                    <Icon className="h-4 w-4 mx-auto text-aurora-purple" />
                    <div className="mt-1 font-display font-extrabold tabular-nums">{s.val}</div>
                    <div className={cn('text-[10px] font-bold text-ink-500', isUr && 'font-urdu text-xs')}>
                      {isUr ? s.labelUr : s.labelEn}
                    </div>
                  </div>
                );
              })}
            </div>

            <Button href="https://bazaar.nafaa.pk" variant="aurora" size="xl" className="mt-8" rightIcon={<ArrowRight className="h-5 w-5" />}>
              {isUr ? 'بازار کھولیں' : 'Open Bazaar'}
            </Button>
          </div>

          {/* Right — animated product grid */}
          <div className="relative rounded-3xl bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 p-5 shadow-2xl">
            {/* Browser bar */}
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-ink-100 dark:border-ink-700/60">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 mx-3 h-6 rounded-md bg-ink-50 dark:bg-ink-900 px-3 flex items-center text-xs font-mono text-ink-500 gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                bazaar.nafaa.pk
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-600 flex items-center gap-1">
                <LiveDot color="emerald" size="sm" />
                LIVE
              </span>
            </div>

            {/* Live activity ticker inside */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activity}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mb-4 flex items-center gap-2 rounded-xl bg-aurora-purple/10 dark:bg-aurora-purple/20 p-2.5 ring-1 ring-inset ring-aurora-purple/30"
              >
                <span className="h-2 w-2 rounded-full bg-aurora-purple animate-pulse shrink-0" />
                <div className={cn('text-xs truncate', isUr && 'font-urdu text-sm')}>
                  <span className="font-bold">{products[activity].seller}</span>
                  {' '}
                  {isUr ? activityMessages[activity % 4].ur : activityMessages[activity % 4].en}
                  {' '}
                  <span className="font-bold">{isUr ? products[activity].nameUr : products[activity].nameEn}</span>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Products grid */}
            <div className="grid grid-cols-2 gap-3">
              {products.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative rounded-xl bg-ink-50 dark:bg-ink-900 p-3 hover:ring-2 hover:ring-aurora-purple/40 transition-all"
                >
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {p.isLive && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-500 text-white flex items-center gap-1">
                        <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
                        LIVE
                      </span>
                    )}
                    {p.isAuction && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-gold text-ink-900">
                        AUCTION · {p.bidsCount} bids
                      </span>
                    )}
                    {p.isBargain && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500 text-white">
                        BARGAIN
                      </span>
                    )}
                  </div>

                  <div className="aspect-square rounded-lg bg-gradient-to-br from-white to-ink-100 dark:from-ink-800 dark:to-ink-950 flex items-center justify-center text-5xl group-hover:scale-110 transition-transform">
                    {p.emoji}
                  </div>
                  <div className={cn('mt-2 font-bold text-xs line-clamp-1', isUr && 'font-urdu text-sm')}>
                    {isUr ? p.nameUr : p.nameEn}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-sm font-extrabold tabular-nums text-gradient-aurora">
                      Rs {p.price.toLocaleString()}
                    </div>
                    <div className={cn('text-[10px] text-ink-500', isUr && 'font-urdu text-xs')}>
                      📍 {isUr ? p.cityUr : p.city}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
