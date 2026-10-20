/**
 * Opens when a school set is tapped at the counter. The whole set goes on
 * the bill at the set price (one line, split over its books at checkout),
 * or the cashier ticks only what the child still needs; ticked lines go on
 * separately at the list's rate.
 */

import { useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Check, Minus, Plus } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { PosBundle, PosEngineApi } from '@modules/pos/engine';
import type { PosSchoolList } from '../api/school-lists.api';

/** Rate of one piece of a list line, after its own and the list's discount. */
export const lineRate = (it: PosSchoolList['items'][number], discountPct: number) =>
  Math.round(((it.total / Math.max(it.quantity, 1)) * (1 - (discountPct || 0) / 100)) * 100) / 100;

export function SchoolSetPicker({ list, bundle, api }: { list: PosSchoolList; bundle: PosBundle; api: PosEngineApi }) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set(list.items.filter((i) => i.productId && !i.isOptional).map((i) => i.id)));
  const [sets, setSets] = useState(1);
  const required = list.items.filter((i) => !i.isOptional);
  const wholeSet = required.every((i) => i.productId && picked.has(i.id)) && list.items.filter((i) => i.isOptional).every((i) => !picked.has(i.id));
  const missing = list.items.filter((i) => !i.productId);

  const custom = useMemo(() => list.items.filter((i) => i.productId && picked.has(i.id))
    .reduce((s, i) => s + lineRate(i, list.discountPct) * i.quantity, 0), [list, picked]);

  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const addWhole = () => { api.closePicker(); api.addBundle(bundle, sets, []); };
  const addPicked = () => {
    const lines = list.items.filter((i) => i.productId && picked.has(i.id));
    api.closePicker();
    for (const it of lines) {
      const item = api.itemById(it.productId!);
      if (item) api.addItem(item, { qty: it.quantity * sets, price: lineRate(it, list.discountPct), note: `${list.school.name} — ${list.grade}` });
    }
  };

  return (
    <Modal open onClose={api.closePicker} size="lg" title={`${list.school.name} — ${list.grade}${list.section ? ` (${list.section})` : ''}`}
      description={`Session ${list.session} · ${list.items.length} cheezein`}
      footer={(
        <div className="flex w-full flex-wrap items-center gap-2">
          <div className="mr-auto flex items-center gap-1 rounded-xl ring-1 ring-slate-200">
            <button type="button" aria-label="Kam" onClick={() => setSets(Math.max(1, sets - 1))} className="flex h-10 w-10 items-center justify-center text-slate-600 hover:bg-slate-50"><Minus className="h-4 w-4" /></button>
            <span className="min-w-[4.5rem] text-center text-[0.875rem] font-semibold tabular-nums">{sets} set</span>
            <button type="button" aria-label="Zyada" onClick={() => setSets(sets + 1)} className="flex h-10 w-10 items-center justify-center text-slate-600 hover:bg-slate-50"><Plus className="h-4 w-4" /></button>
          </div>
          {wholeSet
            ? <Button onClick={addWhole} disabled={!bundle.items.length}>Poora set — {formatPKR(bundle.price * sets)}</Button>
            : <Button onClick={addPicked} disabled={picked.size === 0}>Chuni hui {picked.size} — {formatPKR(custom * sets)}</Button>}
        </div>
      )}>
      <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
        {list.items.map((it) => {
          const stock = it.productId ? api.itemById(it.productId)?.stock : undefined;
          const short = stock !== undefined && stock < it.quantity * sets;
          const on = picked.has(it.id);
          return (
            <li key={it.id}>
              <button type="button" disabled={!it.productId} onClick={() => toggle(it.id)} aria-pressed={on}
                className={cn('flex w-full items-center gap-3 px-3 py-2.5 text-left', it.productId ? 'hover:bg-slate-50' : 'cursor-not-allowed opacity-60')}>
                <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1', on ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white ring-slate-300')}>{on && <Check className="h-3.5 w-3.5" />}</span>
                <BookOpen className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.875rem] font-medium text-slate-900">{it.itemName}{it.quantity > 1 ? ` × ${it.quantity}` : ''}</span>
                  <span className="block text-[0.75rem] text-slate-500">
                    {[it.subject, it.isOptional ? 'Marzi ki' : null, !it.productId ? 'Catalog me nahi' : stock !== undefined ? `Stock ${stock}` : null].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {short && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-label="Stock kam" />}
                <span className="shrink-0 text-[0.875rem] font-semibold tabular-nums text-slate-800">{formatPKR(lineRate(it, list.discountPct) * it.quantity)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {missing.length > 0 && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          {missing.map((m) => m.itemName).join(', ')} catalog me nahi — set ki qeemat in ke bagair hai. School list me product jor dein.
        </p>
      )}
      <p className="mt-2 text-[0.75rem] text-slate-500">Jo kitab bachay ke paas pehle se hai us ka nishan hata dein — baqi alag alag list ke rate par lagti hain.</p>
    </Modal>
  );
}
