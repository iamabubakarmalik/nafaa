/**
 * Logo for an integration type in the Connected apps hub: the partner's logo
 * when there is one, otherwise the category icon on a soft tint.
 */

import { Calculator, CreditCard, ShoppingCart, Truck, type LucideIcon } from 'lucide-react';
import { BrandLogo, type BrandName } from '@/assets/brands/BrandLogo';

export const TYPE_BRAND: Record<string, BrandName> = {
  CUSTOM_WEBSITE: 'website', SHOPIFY: 'shopify', WOOCOMMERCE: 'woocommerce', DARAZ: 'daraz', FOODPANDA: 'foodpanda',
  TCS_COURIER: 'tcs', LEOPARDS_COURIER: 'leopards', POSTEX: 'postex', TRAX: 'trax', MNP_COURIER: 'mnp', CALLCOURIER: 'callcourier',
  BLUEEX: 'blueex', BLUE_EX: 'blueex', JAZZCASH: 'jazzcash', EASYPAISA: 'easypaisa', SAFEPAY: 'safepay', RAAST: 'raast',
};

const CATEGORY_ICON: Record<string, { icon: LucideIcon; color: string }> = {
  SALES_CHANNEL: { icon: ShoppingCart, color: '#0ea5e9' },
  COURIER: { icon: Truck, color: '#f97316' },
  PAYMENT: { icon: CreditCard, color: '#8b5cf6' },
  ACCOUNTING: { icon: Calculator, color: '#0891b2' },
};

export function AppMark({ type, category, size = 40 }: { type?: string | null; category?: string | null; size?: number }) {
  const brand = type ? TYPE_BRAND[type] : undefined;
  if (brand) return <BrandLogo name={brand} size={size} />;
  const cat = CATEGORY_ICON[category ?? ''] ?? CATEGORY_ICON.SALES_CHANNEL;
  const rem = size / 16;
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-[28%] ring-1 ring-inset ring-black/5"
      style={{ width: `${rem}rem`, height: `${rem}rem`, backgroundColor: `${cat.color}1f`, color: cat.color }}>
      <cat.icon style={{ width: `${rem * 0.5}rem`, height: `${rem * 0.5}rem` }} />
    </span>
  );
}
