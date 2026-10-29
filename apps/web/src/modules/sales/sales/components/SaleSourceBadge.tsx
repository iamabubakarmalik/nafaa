/** Where a bill came from: nothing for the counter (POS), a channel badge for online orders. */

import { cn } from '@core/lib/cn';
import { BrandLogo, type BrandName } from '@/assets/brands/BrandLogo';

const SOURCE: Record<string, { label: string; brand: BrandName; cls: string }> = {
  WEBSITE: { label: 'Website', brand: 'website', cls: 'bg-sky-50 text-sky-800 ring-sky-200' },
  DARAZ: { label: 'Daraz', brand: 'daraz', cls: 'bg-orange-50 text-orange-800 ring-orange-200' },
  FOODPANDA: { label: 'Foodpanda', brand: 'foodpanda', cls: 'bg-pink-50 text-pink-800 ring-pink-200' },
  SHOPIFY: { label: 'Shopify', brand: 'shopify', cls: 'bg-success-50 text-success-800 ring-success-200' },
  MARKETPLACE: { label: 'Marketplace', brand: 'other', cls: 'bg-violet-50 text-violet-800 ring-violet-200' },
};

export const SALE_SOURCES = Object.entries(SOURCE).map(([value, s]) => ({ value, label: s.label }));

export function SaleSourceBadge({ sale, className = '' }: { sale: { source?: string | null; sourceRef?: string | null }; className?: string }) {
  const s = sale.source && sale.source !== 'POS' ? SOURCE[sale.source] : null;
  if (!s) return null;
  return (
    <span className={cn('inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[0.6875rem] font-semibold ring-1 ring-inset', s.cls, className)}
      title={sale.sourceRef ? `Online order #${sale.sourceRef}` : undefined}>
      <BrandLogo name={s.brand} size={14} />{s.label}{sale.sourceRef ? ` #${sale.sourceRef}` : ''}
    </span>
  );
}
