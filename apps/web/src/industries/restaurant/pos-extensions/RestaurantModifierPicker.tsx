/**
 * Dish options before it goes on the order: size, add-ons, removals and
 * spice, each group with its own min/max, plus a note for the kitchen.
 * Required groups must be filled; defaults are pre-ticked.
 */

import { useMemo, useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import type { MenuEntry } from '../hooks/useMenu';

export interface PickedModifier { modifierOptionId: string; name: string; quantity: number; priceAdjustment: number }
export interface PickedDish { quantity: number; modifiers: PickedModifier[]; note: string }

const NOTES = ['Kam mirch', 'Zyada mirch', 'Kam tel', 'Pyaz ke bagair', 'Jaldi', 'Alag pack'];

export function RestaurantModifierPicker({ item, onConfirm, onClose }: {
  item: MenuEntry;
  onConfirm: (d: PickedDish) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(item.groups.map((g) => [g.id, g.options.filter((o) => o.isDefault).slice(0, g.maxSelections).map((o) => o.id)])));
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  const toggle = (groupId: string, optionId: string, max: number) => setPicked((prev) => {
    const cur = prev[groupId] ?? [];
    if (cur.includes(optionId)) return { ...prev, [groupId]: cur.filter((x) => x !== optionId) };
    if (max === 1) return { ...prev, [groupId]: [optionId] };
    if (cur.length >= max) return prev;
    return { ...prev, [groupId]: [...cur, optionId] };
  });

  const missing = item.groups.filter((g) => (picked[g.id]?.length ?? 0) < (g.isRequired ? Math.max(1, g.minSelections) : g.minSelections));
  const chosen = useMemo(() => item.groups.flatMap((g) => (picked[g.id] ?? []).map((id) => g.options.find((o) => o.id === id)!).filter(Boolean)), [item.groups, picked]);
  const unit = item.price + chosen.reduce((s, o) => s + o.priceAdjustment, 0);

  const confirm = () => {
    if (missing.length) return;
    onConfirm({
      quantity: qty,
      note: note.trim(),
      modifiers: chosen.map((o) => ({ modifierOptionId: o.id, name: o.name, quantity: 1, priceAdjustment: o.priceAdjustment })),
    });
  };

  return (
    <Modal open onClose={onClose} size="lg" title={item.name} description={`${formatPKR(item.price)} · options chunein`}
      footer={
        <div className="flex w-full items-center gap-3">
          <div className="inline-flex items-center rounded-xl bg-slate-100 p-1">
            <button type="button" aria-label="Kam" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white"><Minus className="h-4 w-4" /></button>
            <span className="w-10 text-center text-[1rem] font-bold tabular-nums">{qty}</span>
            <button type="button" aria-label="Zyada" onClick={() => setQty((q) => Math.min(99, q + 1))} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white"><Plus className="h-4 w-4" /></button>
          </div>
          <Button className="flex-1" size="lg" disabled={missing.length > 0} onClick={confirm}>
            {missing.length ? `"${missing[0].name}" chunein` : `Order me daalein · ${formatPKR(unit * qty)}`}
          </Button>
        </div>
      }>
      <div className="space-y-5">
        {item.groups.map((g) => {
          const sel = picked[g.id] ?? [];
          const need = g.isRequired ? Math.max(1, g.minSelections) : g.minSelections;
          return (
            <section key={g.id}>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h3 className="text-[0.875rem] font-semibold text-slate-900">{g.name}</h3>
                <span className={cn('text-[0.75rem]', sel.length < need ? 'font-semibold text-rose-600' : 'text-slate-500')}>
                  {need > 0 ? `Zaroori · ${need === g.maxSelections ? need : `${need}–${g.maxSelections}`}` : g.maxSelections > 1 ? `${g.maxSelections} tak` : 'Marzi'}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {g.options.map((o) => {
                  const on = sel.includes(o.id);
                  return (
                    <button key={o.id} type="button" onClick={() => toggle(g.id, o.id, g.maxSelections)}
                      className={cn('flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left ring-1 transition',
                        on ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:ring-slate-300')}>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1', on ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-300')}>
                          {on && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="truncate text-[0.875rem] font-medium text-slate-800">{o.name}</span>
                      </span>
                      {o.priceAdjustment !== 0 && <span className="shrink-0 text-[0.8125rem] font-semibold tabular-nums text-slate-600">{o.priceAdjustment > 0 ? '+' : ''}{formatPKR(o.priceAdjustment)}</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        <section>
          <h3 className="mb-2 text-[0.875rem] font-semibold text-slate-900">Kitchen ke liye note</h3>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {NOTES.map((n) => (
              <button key={n} type="button" onClick={() => setNote((v) => (v.includes(n) ? v : v ? `${v}, ${n}` : n))}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.75rem] font-medium text-slate-700 hover:bg-slate-200">{n}</button>
            ))}
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} placeholder="Jaise: kam mirch, alag pack"
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[0.875rem] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
        </section>
      </div>
    </Modal>
  );
}
