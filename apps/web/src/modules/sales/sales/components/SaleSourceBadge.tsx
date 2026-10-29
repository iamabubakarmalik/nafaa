/**
 * Where a bill came from: nothing for the counter (POS), a channel badge for
 * online orders, and a truck badge with the order number for bills made from
 * a distribution (booker) order.
 */

import { Truck, type LucideIcon } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { BrandLogo, type BrandName } from '@/assets/brands/BrandLogo';

type Source = { label: string; cls: string; brand?: BrandName; icon?: LucideIcon; refTitle: (ref: string) => string; refPrefix: string };

const online = (ref: string) => `Online order #${ref}`;
const SOURCE: Record<string, Source> = {
  WEBSITE: { label: 'Website', brand: 'website', cls: 'bg-sky-50 text-sky-800 ring-sky-200', refTitle: online, refPrefix: '#' },
  DARAZ: { label: 'Daraz', brand: 'daraz', cls: 'bg-orange-50 text-orange-800 ring-orange-200', refTitle: online, refPrefix: '#' },
  FOODPANDA: { label: 'Foodpanda', brand: 'foodpanda', cls: 'bg-pink-50 text-pink-800 ring-pink-200', refTitle: online, refPrefix: '#' },
  SHOPIFY: { label: 'Shopify', brand: 'shopify', cls: 'bg-success-50 text-success-800 ring-success-200', refTitle: online, refPrefix: '#' },
  MARKETPLACE: { label: 'Marketplace', brand: 'other', cls: 'bg-violet-50 text-violet-800 ring-violet-200', refTitle: online, refPrefix: '#' },
  DISTRIBUTION: { label: 'Distribution', icon: Truck, cls: 'bg-orange-50 text-orange-800 ring-orange-200', refTitle: (ref) => `Booker order ${ref}`, refPrefix: '' },
};

export const SALE_SOURCES = Object.entries(SOURCE).map(([value, s]) => ({ value, label: s.label }));

export function SaleSourceBadge({ sale, className = '' }: { sale: { source?: string | null; sourceRef?: string | null }; className?: string }) {
  const s = sale.source && sale.source !== 'POS' ? SOURCE[sale.source] : null;
  if (!s) return null;
  const Icon = s.icon;
  return (
    <span className={cn('inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[0.6875rem] font-semibold ring-1 ring-inset', s.cls, className)}
      title={sale.sourceRef ? s.refTitle(sale.sourceRef) : undefined}>
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : s.brand && <BrandLogo name={s.brand} size={14} />}
      {s.label}{sale.sourceRef ? ` ${s.refPrefix}${sale.sourceRef}` : ''}
    </span>
  );
}
