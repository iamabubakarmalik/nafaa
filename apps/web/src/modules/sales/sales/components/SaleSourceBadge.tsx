import type { Sale } from '../api/sales.api';

const SOURCE: Record<string, { label: string; emoji: string }> = {
  WEBSITE: { label: 'Website', emoji: '🌐' },
  DARAZ: { label: 'Daraz', emoji: '🛒' },
  FOODPANDA: { label: 'Foodpanda', emoji: '🍔' },
  SHOPIFY: { label: 'Shopify', emoji: '🟢' },
  MARKETPLACE: { label: 'Marketplace', emoji: '🏬' },
};

/** Online se aayi sale ka nishaan — counter (POS) wali sale par kuch nahi dikhta */
export function SaleSourceBadge({ sale }: { sale: Pick<Sale, 'source' | 'sourceRef'> }) {
  const s = sale.source && sale.source !== 'POS' ? SOURCE[sale.source] : null;
  if (!s) return null;
  return (
    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 text-[10px] font-extrabold inline-flex items-center gap-1">
      {s.emoji} {s.label}{sale.sourceRef ? ` #${sale.sourceRef}` : ''}
    </span>
  );
}
