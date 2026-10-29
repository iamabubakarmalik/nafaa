/**
 * Partner logos (sales channels, couriers, payment gateways) in one place.
 *
 * Every logo is the brand's own artwork, kept small in this folder:
 *  - simple-icons (CC0): Shopify, Woo, WordPress, foodpanda, Google, WhatsApp, Meta, TikTok;
 *  - the brand's website: Daraz, TCS, BlueEx, Safepay, NayaPay, Leopards,
 *    PostEx, SLGTrax, M&P, Call Courier, Indolj, Daewoo FastEx, SadaPay,
 *    JazzCash (its sandbox site);
 *  - Safepay's partner CDN: Easypaisa, PayFast, Raast (the red wordmark).
 * Swyft and TPL Rider have no reachable logo yet and show a lettermark tile in
 * a neutral colour; own rider and own website use an icon.
 *
 * Use <BrandLogo name="shopify" size="sm|md|lg" /> or the brandFor* helpers.
 */

import type { CSSProperties } from 'react';
import { Bike, Globe, Plug, type LucideIcon } from 'lucide-react';
import { cn } from '@core/lib/cn';
import shopify from './shopify.svg';
import woocommerce from './woocommerce.svg';
import wordpress from './wordpress.svg';
import foodpanda from './foodpanda.svg';
import google from './google.svg';
import whatsapp from './whatsapp.svg';
import meta from './meta.svg';
import tiktok from './tiktok.svg';
import daraz from './daraz.svg';
import tcs from './tcs.svg';
import blueex from './blueex.svg';
import safepay from './safepay.svg';
import easypaisa from './easypaisa.svg';
import nayapay from './nayapay.svg';
import payfast from './payfast.svg';
import jazzcash from './jazzcash.png';
import sadapay from './sadapay.png';
import raast from './raast.png';
import leopards from './leopards.png';
import postex from './postex.png';
import trax from './trax.png';
import mnp from './mnp.png';
import callcourier from './callcourier.png';
import indolj from './indolj.png';
import daewoo from './daewoo.png';

export type BrandName =
  | 'shopify' | 'woocommerce' | 'wordpress' | 'daraz' | 'foodpanda' | 'indolj' | 'website'
  | 'tcs' | 'leopards' | 'postex' | 'trax' | 'mnp' | 'callcourier' | 'blueex' | 'daewoo' | 'tpl' | 'rider'
  | 'swyft' | 'jazzcash' | 'easypaisa' | 'safepay' | 'raast' | 'nayapay' | 'sadapay' | 'payfast'
  | 'google' | 'whatsapp' | 'meta' | 'tiktok' | 'other';

interface Brand {
  label: string;
  /** Brand colour; also used for charts and accents. */
  color: string;
  /** Real logo file. */
  src?: string;
  /** Fixed tile colour behind the logo, the same in light and dark mode (default white). */
  bg?: string;
  /** The logo is its own shape (Daraz disc): no tile, no padding. */
  bleed?: boolean;
  /** Inner padding as a share of the tile; wide wordmarks use less. */
  pad?: number;
  /** Lettermark for brands without a clean vector logo. */
  letters?: string;
  /** Letter colour on the lettermark tile (default white). */
  fg?: string;
  icon?: LucideIcon;
}

export const BRANDS: Record<BrandName, Brand> = {
  shopify: { label: 'Shopify', color: '#7AB55C', src: shopify },
  woocommerce: { label: 'WooCommerce', color: '#96588A', src: woocommerce, pad: 0.1 },
  wordpress: { label: 'WordPress', color: '#21759B', src: wordpress },
  daraz: { label: 'Daraz', color: '#F85606', src: daraz, bleed: true },
  foodpanda: { label: 'foodpanda', color: '#D70F64', src: foodpanda },
  indolj: { label: 'Indolj', color: '#B80000', src: indolj, pad: 0.1 },
  website: { label: 'Website', color: '#0EA5E9', icon: Globe },
  tcs: { label: 'TCS', color: '#D40511', src: tcs, pad: 0.08 },
  leopards: { label: 'Leopards', color: '#FFD000', src: leopards, pad: 0.08 },
  postex: { label: 'PostEx', color: '#92CF4E', src: postex, bg: '#111827', pad: 0.1 },
  trax: { label: 'Trax', color: '#479B6C', src: trax, pad: 0.06 },
  mnp: { label: 'M&P', color: '#F06020', src: mnp, pad: 0.1 },
  callcourier: { label: 'Call Courier', color: '#00B048', src: callcourier, pad: 0.1 },
  blueex: { label: 'BlueEx', color: '#0047BA', src: blueex },
  daewoo: { label: 'Daewoo FastEx', color: '#0B8BD9', src: daewoo, pad: 0.12 },
  tpl: { label: 'Rider (TPL)', color: '#64748B', letters: 'TPL' },
  swyft: { label: 'Swyft', color: '#64748B', letters: 'SW' },
  rider: { label: 'Apna rider', color: '#64748B', icon: Bike },
  jazzcash: { label: 'JazzCash', color: '#E82028', src: jazzcash, pad: 0.1 },
  easypaisa: { label: 'Easypaisa', color: '#27B15D', src: easypaisa, bg: '#0E3F20', pad: 0.06 },
  safepay: { label: 'Safepay', color: '#002DE0', src: safepay, pad: 0.08 },
  raast: { label: 'Raast', color: '#D32B25', src: raast, pad: 0.1 },
  nayapay: { label: 'NayaPay', color: '#FF5018', src: nayapay, pad: 0.18 },
  sadapay: { label: 'SadaPay', color: '#3FD6B0', src: sadapay, pad: 0.14 },
  payfast: { label: 'PayFast', color: '#000628', src: payfast, bleed: true },
  google: { label: 'Google', color: '#4285F4', src: google },
  whatsapp: { label: 'WhatsApp', color: '#25D366', src: whatsapp },
  meta: { label: 'Facebook / Instagram', color: '#0467DF', src: meta, pad: 0.14 },
  tiktok: { label: 'TikTok', color: '#000000', src: tiktok, pad: 0.18 },
  other: { label: 'Doosra', color: '#64748B', icon: Plug },
};

/** Sales channel type (+ website platform, Indolj) → logo. */
export function brandForChannel(type?: string | null, opts: { platform?: string | null; indolj?: boolean } = {}): BrandName {
  if (opts.indolj) return 'indolj';
  switch (type) {
    case 'SHOPIFY': return 'shopify';
    case 'WOOCOMMERCE': return 'woocommerce';
    case 'DARAZ': return 'daraz';
    case 'FOODPANDA': return 'foodpanda';
    case 'CUSTOM_WEBSITE':
    case undefined:
    case null:
      if (opts.platform === 'shopify') return 'shopify';
      if (opts.platform === 'woocommerce') return 'woocommerce';
      if (opts.platform === 'wordpress') return 'wordpress';
      if (opts.platform === 'indolj') return 'indolj';
      return 'website';
    default: return 'other';
  }
}

const COURIER: Record<string, BrandName> = {
  TCS: 'tcs', LEOPARDS: 'leopards', POSTEX: 'postex', TRAX: 'trax', MNP: 'mnp', CALL_COURIER: 'callcourier',
  BLUE_EX: 'blueex', BLUEEX: 'blueex', DAEWOO: 'daewoo', TPL_RIDER: 'tpl', RIDER: 'rider', SWYFT: 'swyft',
};
/** Courier code (TCS, LEOPARDS, POSTEX…) → logo. */
export const brandForCourier = (code?: string | null): BrandName => COURIER[String(code ?? '').toUpperCase()] ?? 'other';

const PAYMENT: Record<string, BrandName> = {
  SAFEPAY: 'safepay', JAZZCASH: 'jazzcash', EASYPAISA: 'easypaisa', RAAST: 'raast', NAYAPAY: 'nayapay', SADAPAY: 'sadapay', PAYFAST: 'payfast',
};
/** Payment gateway code → logo. */
export const brandForPayment = (code?: string | null): BrandName => PAYMENT[String(code ?? '').toUpperCase()] ?? 'other';

export const brandLabel = (name: BrandName) => BRANDS[name].label;
export const brandColor = (name: BrandName) => BRANDS[name].color;

const SIZES = { sm: 24, md: 32, lg: 44 } as const;

/**
 * Square logo tile. `size` is sm (24px), md (32px, default), lg (44px) or a
 * px number at the default text size (it scales with rem).
 * Pass `title` to give it an accessible name; otherwise it is decorative.
 */
export function BrandLogo({ name, size = 'md', className, title }: {
  name: BrandName; size?: keyof typeof SIZES | number; className?: string; title?: string;
}) {
  const b = BRANDS[name] ?? BRANDS.other;
  const px = typeof size === 'number' ? size : SIZES[size];
  const rem = px / 16;
  const box: CSSProperties = { width: `${rem}rem`, height: `${rem}rem` };
  const a11y = title ? { role: 'img' as const, 'aria-label': title, title } : { 'aria-hidden': true as const };
  const radius = 'rounded-[28%]';

  if (b.src && b.bleed) {
    return <img src={b.src} alt="" style={box} className={cn('shrink-0 select-none rounded-[28%]', className)} draggable={false} {...a11y} />;
  }
  if (b.src) {
    return (
      <span style={{ ...box, backgroundColor: b.bg ?? '#ffffff', padding: `${rem * (b.pad ?? 0.16)}rem` }} {...a11y}
        className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden ring-1 ring-inset', b.bg ? 'ring-white/20' : 'ring-black/10', radius, className)}>
        <img src={b.src} alt="" className="h-full w-full select-none object-contain" draggable={false} />
      </span>
    );
  }
  if (b.letters) {
    const len = b.letters.length;
    const fs = rem * (len >= 3 ? 0.3 : len === 2 ? 0.4 : 0.5);
    return (
      <span style={{ ...box, backgroundColor: b.bg ?? b.color, color: b.fg ?? '#ffffff', fontSize: `${fs}rem` }} {...a11y}
        className={cn('inline-flex shrink-0 items-center justify-center font-black leading-none tracking-tight ring-1 ring-inset ring-black/10', radius, className)}>
        {b.letters}
      </span>
    );
  }
  const Icon = b.icon ?? Plug;
  return (
    <span style={{ ...box, backgroundColor: `${b.color}1f`, color: b.color }} {...a11y}
      className={cn('inline-flex shrink-0 items-center justify-center ring-1 ring-inset ring-black/5', radius, className)}>
      <Icon style={{ width: `${rem * 0.55}rem`, height: `${rem * 0.55}rem` }} />
    </span>
  );
}
