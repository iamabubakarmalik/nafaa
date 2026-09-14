'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';

/**
 * Rotating industry word inside the H1.
 *
 * SEO note: the H1 already carries the money keywords statically
 * ("Pakistan's #1 POS & business software"). This rotator is an
 * *additional* signal — every variant is real DOM text, and the full
 * list also appears in the subtitle so crawlers never depend on the
 * animation frame they happen to snapshot.
 */
export interface IndustryWord {
  en: string;
  ur: string;
  href: string;
}

export const heroIndustries: IndustryWord[] = [
  { en: 'kiryana stores',  ur: 'کریانہ اسٹورز',   href: '/industries/kiryana' },
  { en: 'pharmacies',      ur: 'فارمیسیز',        href: '/industries/pharmacy' },
  { en: 'restaurants',     ur: 'ریسٹورنٹس',       href: '/industries/restaurant' },
  { en: 'mobile shops',    ur: 'موبائل شاپس',     href: '/industries/mobile-shop' },
  { en: 'garment stores',  ur: 'گارمنٹس اسٹورز',  href: '/industries/garments' },
  { en: 'hardware stores', ur: 'ہارڈویئر اسٹورز', href: '/industries/hardware' },
  { en: 'pet shops',       ur: 'پیٹ شاپس',        href: '/industries/petshop' },
  { en: 'salons',          ur: 'سیلونز',          href: '/industries/salon' },
  { en: 'bakeries',        ur: 'بیکریز',          href: '/industries/bakery' },
  { en: 'electronics',     ur: 'الیکٹرانکس',      href: '/industries/electronics' },
];

const ROTATE_MS = 2200;

export function RotatingIndustry({ isUr, className }: { isUr: boolean; className?: string }) {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % heroIndustries.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const word = heroIndustries[index];
  const label = isUr ? word.ur : word.en;

  return (
    <span
      className={cn(
        'relative inline-flex items-baseline align-baseline',
        // Reserve horizontal space so the headline never reflows mid-rotation.
        'min-w-[7ch] sm:min-w-[9ch]',
        className,
      )}
    >
      {/* Longest word held invisibly — locks the layout box, zero CLS. */}
      <span aria-hidden className="invisible whitespace-nowrap">
        {isUr ? 'ہارڈویئر اسٹورز' : 'hardware stores'}
      </span>

      <span className="absolute inset-0 flex items-baseline">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={label}
            initial={reduceMotion ? false : { y: '0.5em', opacity: 0, filter: 'blur(6px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={reduceMotion ? undefined : { y: '-0.5em', opacity: 0, filter: 'blur(6px)' }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="whitespace-nowrap text-gradient-brand"
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}
