import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link2, Search, CheckCircle2, PackageSearch } from 'lucide-react';
import { Modal } from '@core/ui/Modal';
import { Button } from '@core/ui/Button';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import type { OrderLine } from '../api/online-orders.api';
import { rs } from '../lib/labels';
import { cn } from '@core/lib/cn';

export type Matches = Record<string, { productId: string; variantId?: string | null; label: string }>;

/**
 * Website ka item → Nafaa ka product. Ek dafa jod diya to agli dafa
 * wahi item khud mil jata hai (server link yaad rakhta hai).
 */
export function MatchItemsModal({
  open, lines, onClose, onConfirm, loading,
}: {
  open: boolean;
  lines: OrderLine[];
  onClose: () => void;
  onConfirm: (matches: Matches) => void;
  loading?: boolean;
}) {
  const pending = useMemo(() => lines.filter((l) => !l.match), [lines]);
  const [matches, setMatches] = useState<Matches>({});
  const [active, setActive] = useState<number | null>(null);

  // Sirf modal khulte waqt reset — 20 sec wali refetch par chune hue products na mitein
  useEffect(() => {
    if (open) {
      setMatches({});
      setActive(pending[0]?.index ?? null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = pending.every((l) => matches[String(l.index)]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Items ko apne products se jodein"
      description="Website ke ye items Nafaa me khud nahi mile. Ek dafa jod dein — agli dafa khud mil jayenge."
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-500">
            {Object.keys(matches).length}/{pending.length} jod diye
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Wapas</Button>
            <Button variant="success" disabled={!done} loading={loading} onClick={() => onConfirm(matches)} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
              Jod kar Accept karein
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-2">
        {pending.map((line) => {
          const m = matches[String(line.index)];
          const isActive = active === line.index;
          return (
            <div
              key={line.index}
              className={cn(
                'rounded-xl border-2 p-3 transition',
                m ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-500/5'
                  : isActive ? 'border-brand-400 dark:border-brand-500/60' : 'border-slate-200 dark:border-neutral-700',
              )}
            >
              <button className="flex w-full items-center gap-3 text-left" onClick={() => setActive(isActive ? null : line.index)}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-neutral-800">
                  {line.image ? <img src={line.image} alt="" className="h-full w-full object-cover" /> : <PackageSearch className="h-5 w-5 text-slate-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black text-slate-900 dark:text-white">
                    {line.name}{line.variant ? ` (${line.variant})` : ''}
                  </div>
                  <div className="text-xs text-slate-500">
                    {line.quantity} × {rs(line.price)}{line.sku ? ` · SKU ${line.sku}` : ''}
                  </div>
                </div>
                {m ? (
                  <span className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <Link2 className="h-3 w-3" /> {m.label}
                  </span>
                ) : (
                  <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-black text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                    Jodna hai
                  </span>
                )}
              </button>
              {isActive && (
                <ProductPicker
                  initial={line.name}
                  onPick={(p, variantId, label) => {
                    setMatches((prev) => ({ ...prev, [String(line.index)]: { productId: p.id, variantId, label } }));
                    const next = pending.find((l) => l.index !== line.index && !matches[String(l.index)]);
                    setActive(next?.index ?? null);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function ProductPicker({ initial, onPick }: { initial: string; onPick: (p: Product, variantId: string | null, label: string) => void }) {
  // Pehla lafz se dhoondna shuru — "Lipton Tea 200g" → "Lipton"
  const [q, setQ] = useState(() => initial.split(/\s+/).slice(0, 2).join(' '));
  const [debounced, setDebounced] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isFetching } = useQuery({
    queryKey: ['match-products', debounced],
    queryFn: () => productsApi.list({ search: debounced || undefined, limit: 8, isActive: true }),
  });
  const items = data?.items ?? [];

  return (
    <div className="mt-3 space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Product ka naam, SKU ya barcode…"
          className="h-10 w-full rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-brand-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
        />
      </div>
      <div className="max-h-64 space-y-1 overflow-y-auto">
        {isFetching && !items.length && <div className="p-3 text-center text-xs text-slate-500">Dhoond rahe hain…</div>}
        {!isFetching && !items.length && <div className="p-3 text-center text-xs text-slate-500">Koi product nahi mila — naam badal kar dekhein</div>}
        {items.map((p) =>
          p.hasVariants && p.variants?.length ? (
            <div key={p.id} className="rounded-lg border border-slate-200 p-2 dark:border-neutral-700">
              <div className="mb-1 text-xs font-black text-slate-800 dark:text-slate-100">{p.name}</div>
              <div className="flex flex-wrap gap-1">
                {p.variants.map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => onPick(p, v.id, `${p.name} (${v.name})`)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs font-bold hover:border-brand-500 hover:bg-brand-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    {v.name} · {rs(v.price)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              key={p.id}
              onClick={() => onPick(p, null, p.name)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-neutral-800"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{p.name}</div>
                <div className="text-[11px] text-slate-500">{p.sku ? `SKU ${p.sku} · ` : ''}Stock {p.stock}</div>
              </div>
              <span className="text-sm font-black text-slate-700 dark:text-slate-200">{rs(p.price)}</span>
            </button>
          ),
        )}
      </div>
    </div>
  );
}
