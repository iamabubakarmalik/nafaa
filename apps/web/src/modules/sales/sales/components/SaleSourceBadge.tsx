/** Where a bill came from: nothing for the counter (POS), a channel badge for online orders. */

import { cn } from '@core/lib/cn';

const SOURCE: Record<string, { label: string; emoji: string; cls: string }> = {
  WEBSITE: { label: 'Website', emoji: '🌐', cls: 'bg-sky-50 text-sky-800 ring-sky-200' },
  DARAZ: { label: 'Daraz', emoji: '🛒', cls: 'bg-orange-50 text-orange-800 ring-orange-200' },
  FOODPANDA: { label: 'Foodpanda', emoji: '🍔', cls: 'bg-pink-50 text-pink-800 ring-pink-200' },
  SHOPIFY: { label: 'Shopify', emoji: '🟢', cls: 'bg-success-50 text-success-800 ring-success-200' },
  MARKETPLACE: { label: 'Marketplace', emoji: '🏬', cls: 'bg-violet-50 text-violet-800 ring-violet-200' },
};

export const SALE_SOURCES = Object.entries(SOURCE).map(([value, s]) => ({ value, label: `${s.emoji} ${s.label}` }));

export function SaleSourceBadge({ sale, className = '' }: { sale: { source?: string | null; sourceRef?: string | null }; className?: string }) {
  const s = sale.source && sale.source !== 'POS' ? SOURCE[sale.source] : null;
  if (!s) return null;
  return (
    <span className={cn('inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[0.6875rem] font-semibold ring-1 ring-inset', s.cls, className)}
      title={sale.sourceRef ? `Online order #${sale.sourceRef}` : undefined}>
      {s.emoji} {s.label}{sale.sourceRef ? ` #${sale.sourceRef}` : ''}
    </span>
  );
}
