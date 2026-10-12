/**
 * Pickers for the send form: a multi-select list (IMEI phones, used phones,
 * serial units, carpet rolls) with search and select-all, the carpet roll
 * picker that loads the sending branch's rolls, and the variant picker with
 * each variant's stock at that branch.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Search } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { carpetRollsApi, type CarpetRoll } from '@industries/carpet/api/carpet-rolls.api';
import type { SendProduct, VariantChoice } from './useTransferSources';
import { qty } from './transferMeta';

export interface PickItem {
  id: string;
  title: string;
  sub?: string;
  right?: string;
}

export function PickListModal({ title, description, items, loading, exclude, onConfirm, onClose, extra }: {
  title: string;
  description?: string;
  items: PickItem[];
  loading?: boolean;
  /** Already on the transfer. */
  exclude?: Set<string>;
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
  /** Extra footer action, e.g. send by count instead. */
  extra?: ReactNode;
}) {
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const list = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((i) => !exclude?.has(i.id)).filter((i) => words.every((w) => `${i.title} ${i.sub ?? ''}`.toLowerCase().includes(w)));
  }, [items, exclude, q]);
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOn = list.length > 0 && list.every((i) => picked.has(i.id));

  return (
    <Modal open onClose={onClose} size="lg" title={title} description={description}
      footer={<>
        {extra && <span className="mr-auto">{extra}</span>}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button disabled={!picked.size} onClick={() => onConfirm([...picked])}>{picked.size ? `${picked.size} jorein` : 'Chunein'}</Button>
      </>}>
      <div className="mb-2 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input data-autofocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dhoondein — number, naam, rang…" aria-label="Dhoondein"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-brand-500" />
        </div>
        {list.length > 0 && (
          <Button variant="secondary" className="h-10" onClick={() => setPicked(allOn ? new Set() : new Set(list.map((i) => i.id)))}>{allOn ? 'Koi nahi' : 'Sab'}</Button>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div>
      ) : !list.length ? (
        <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">Is branch me kuch nahi mila</p>
      ) : (
        <ul className="max-h-[55vh] space-y-1.5 overflow-y-auto">
          {list.map((i) => {
            const on = picked.has(i.id);
            return (
              <li key={i.id}>
                <button type="button" onClick={() => toggle(i.id)} aria-pressed={on}
                  className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ring-1 transition', on ? 'bg-brand-50 ring-brand-300' : 'ring-slate-200 hover:bg-slate-50')}>
                  <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1', on ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-300')}>{on && <Check className="h-3.5 w-3.5" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{i.title}</span>
                    {i.sub && <span className="block truncate text-[0.75rem] text-slate-500">{i.sub}</span>}
                  </span>
                  {i.right && <span className="shrink-0 text-[0.75rem] tabular-nums text-slate-600">{i.right}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

/** Active rolls of one carpet product at the sending branch. */
export function RollPicker({ product, shopId, exclude, money, onPick, onClose }: {
  product: SendProduct;
  shopId: string;
  exclude: Set<string>;
  money: (n: number) => string;
  onPick: (rolls: CarpetRoll[]) => void;
  onClose: () => void;
}) {
  const q = useQuery({
    queryKey: ['carpet-rolls-for-transfer', product.id, shopId],
    queryFn: () => carpetRollsApi.list({ productId: product.id, shopId, inStockOnly: true, limit: 200 }),
    staleTime: 30_000,
  });
  const rolls = q.data?.items ?? [];
  const items = rolls.map((r) => ({
    id: r.id,
    title: `Roll ${r.rollNumber}${r.variant?.name ? ` · ${r.variant.name}` : ''}`,
    sub: [`${r.widthFt}ft${r.widthInch ? ` ${r.widthInch}in` : ''} × ${qty(r.remainingLengthFt)}ft`, r.designCode && `Design ${r.designCode}`, r.rackNumber && `Rack ${r.rackNumber}`].filter(Boolean).join(' · '),
    right: `${qty(r.remainingSqft)} sqft · ${money(r.remainingSqft * (Number(r.costPerSqft) || product.cost))}`,
  }));
  return (
    <PickListModal title={`${product.name} — rolls chunein`} description="Poora roll jata hai. Kata hua tukda bhejna ho to pehle roll katein." items={items} loading={q.isLoading}
      exclude={exclude} onClose={onClose} onConfirm={(ids) => onPick(rolls.filter((r) => ids.includes(r.id)))} />
  );
}

export function VariantModal({ product, onPick, onClose }: { product: SendProduct; onPick: (v: VariantChoice) => void; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} size="sm" title={`${product.name} — kaunsi qism?`} description="Stock bhejne wali branch ka hai">
      <div className="space-y-1">
        {product.variants.map((v) => (
          <button key={v.id} type="button" onClick={() => onPick(v)} disabled={v.stock <= 0}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
              {v.colorHex && <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: v.colorHex }} />}{v.name}
            </span>
            <span className={cn('text-[0.75rem] tabular-nums', v.stock > 0 ? 'text-slate-600' : 'text-rose-600')}>Stock {qty(v.stock)} {product.unit}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
