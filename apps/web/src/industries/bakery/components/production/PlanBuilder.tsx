/**
 * Builds a baking plan, or adds lines to one: pick products (or type a
 * free line), set how many, choose the shift. Lines can arrive filled from
 * the "what to bake" suggestions.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Button, Input, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { productionApi, type PlanItemInput, type ProductionPlan } from '../../api/production.api';
import { PRODUCTION_KEY, apiError, dayOnly } from '../meta';

const SHIFTS = ['Subah', 'Dopahar', 'Shaam', 'Raat'];

export interface BuilderLine { key: string; productId?: string; productName: string; plannedQty: string; cakeOrderId?: string; note?: string }

export function PlanBuilder({ date, plan, initial, onClose, onDone }: {
  /** Business day (yyyy-mm-dd) of a new plan. */
  date: string;
  /** Adds to this plan instead of making a new one. */
  plan?: ProductionPlan;
  initial?: BuilderLine[];
  onClose: () => void;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [shift, setShift] = useState(() => (new Date().getHours() < 12 ? 'Subah' : new Date().getHours() < 16 ? 'Dopahar' : 'Shaam'));
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<BuilderLine[]>(initial ?? []);
  const [term, setTerm] = useState('');
  const productsQ = useQuery({ queryKey: ['bakery-all-products'], queryFn: () => fetchAllProducts({ isActive: undefined }), staleTime: 60_000 });
  const chosen = new Set(lines.map((l) => l.productId).filter(Boolean));
  const t = term.trim().toLowerCase();
  const options = useMemo(() => ((productsQ.data?.items ?? []) as Array<{ id: string; name: string; isActive?: boolean }>)
    .filter((p) => p.isActive !== false && !chosen.has(p.id) && (!t || p.name.toLowerCase().includes(t))).slice(0, 12),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [productsQ.data, t, lines]);

  const items: PlanItemInput[] = lines.map((l) => ({ productId: l.productId, productName: l.productName.trim(), plannedQty: Math.round(Number(l.plannedQty) || 0), cakeOrderId: l.cakeOrderId, notes: l.note }));
  const bad = !items.length || items.some((i) => !i.productName || i.plannedQty <= 0);
  const save = useMutation({
    mutationFn: () => (plan ? productionApi.addItems(plan.id, items) : productionApi.createPlan({ planDate: date, shift, notes: notes.trim() || undefined, items })),
    onSuccess: (p) => { toast.success(plan ? 'Plan me daal diya' : `Plan ${p.planNumber} ban gaya`); qc.invalidateQueries({ queryKey: [PRODUCTION_KEY] }); onDone(); },
    onError: (e) => toast.error(apiError(e, 'Plan nahi bana')),
  });
  const update = (key: string, patch: Partial<BuilderLine>) => setLines((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  return (
    <Modal open onClose={onClose} size="lg" title={plan ? `${plan.planNumber} me cheezein` : 'Naya baking plan'} description={plan ? 'Jo aur banana hai woh daalein' : `${dayOnly(`${date}T12:00:00`)} ke liye — kya aur kitna banana hai`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button disabled={bad} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Plus className="h-4 w-4" />}>{plan ? 'Plan me daalein' : 'Plan banayein'}</Button>
      </>}>
      <div className="space-y-4">
        {!plan && (
          <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
            <div>
              <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Shift</span>
              <div className="flex flex-wrap gap-1.5">{SHIFTS.map((s) => <Button key={s} size="sm" variant={shift === s ? 'primary' : 'secondary'} onClick={() => setShift(s)}>{s}</Button>)}</div>
            </div>
            <Input label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Maslan: shadi wala order pehle" />
          </div>
        )}

        {lines.length > 0 && (
          <ul className="space-y-2">
            {lines.map((l) => (
              <li key={l.key} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200">
                <div className="min-w-0 flex-1">
                  {l.productId ? <p className="truncate text-[0.875rem] font-medium text-slate-900">{l.productName}</p>
                    : <Input size="sm" value={l.productName} onChange={(e) => update(l.key, { productName: e.target.value })} placeholder="Cheez ka naam" />}
                  {l.note && <p className="truncate text-[0.6875rem] text-slate-500">{l.note}</p>}
                </div>
                <input inputMode="numeric" value={l.plannedQty} onChange={(e) => update(l.key, { plannedQty: e.target.value.replace(/\D/g, '') })} aria-label="Kitne"
                  className={cn('h-9 w-20 rounded-lg border bg-white px-2 text-center text-[0.875rem] font-semibold tabular-nums', Number(l.plannedQty) > 0 ? 'border-slate-300' : 'border-rose-400')} />
                <button type="button" aria-label="Hatayein" onClick={() => setLines((xs) => xs.filter((x) => x.key !== l.key))} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}

        <div>
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Kya banana hai — cheez search…" leftIcon={<Search className="h-4 w-4" />} data-autofocus />
          <div className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
            {options.map((p) => (
              <button key={p.id} type="button" onClick={() => { setLines((xs) => [...xs, { key: p.id, productId: p.id, productName: p.name, plannedQty: '' }]); setTerm(''); }}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-white px-2.5 text-[0.8125rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:ring-brand-400">
                <Plus className="h-3.5 w-3.5 text-brand-600" />{p.name}
              </button>
            ))}
            {t && (
              <button type="button" onClick={() => { setLines((xs) => [...xs, { key: `free-${Date.now()}`, productName: term.trim(), plannedQty: '' }]); setTerm(''); }}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-white px-2.5 text-[0.8125rem] font-medium text-slate-500 border border-dashed border-slate-300">
                <Plus className="h-3.5 w-3.5" />"{term.trim()}" — bina maal ke
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
