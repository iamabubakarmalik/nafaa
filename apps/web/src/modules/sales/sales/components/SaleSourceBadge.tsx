/* Bill kahan se aaya — counter (POS) par kuch nahi, online par channel ka nishaan */
const SOURCE: Record<string, { label: string; emoji: string; cls: string }> = {
  WEBSITE: { label: 'Website', emoji: '🌐', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300' },
  DARAZ: { label: 'Daraz', emoji: '🛒', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300' },
  FOODPANDA: { label: 'Foodpanda', emoji: '🍔', cls: 'bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300' },
  SHOPIFY: { label: 'Shopify', emoji: '🟢', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  MARKETPLACE: { label: 'Marketplace', emoji: '🏬', cls: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300' },
};

export const SALE_SOURCES = Object.entries(SOURCE).map(([value, s]) => ({ value, label: `${s.emoji} ${s.label}` }));

export function SaleSourceBadge({ sale, className = '' }: { sale: { source?: string | null; sourceRef?: string | null }; className?: string }) {
  const s = sale.source && sale.source !== 'POS' ? SOURCE[sale.source] : null;
  if (!s) return null;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 whitespace-nowrap ${s.cls} ${className}`} title={sale.sourceRef ? `Online order #${sale.sourceRef}` : undefined}>
      {s.emoji} {s.label}{sale.sourceRef ? ` #${sale.sourceRef}` : ''}
    </span>
  );
}
