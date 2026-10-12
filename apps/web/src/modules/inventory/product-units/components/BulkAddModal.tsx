/**
 * Adds one pack to every selected product in one go, e.g. "Carton = 24" to
 * a whole shelf. Price is the loose price × rate less an optional percent,
 * rounded; a preview shows the first products. Products that already have
 * the pack are skipped unless "update" is on.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Layers } from 'lucide-react';
import { Button, Modal, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { UnitConversionType } from '@modules/inventory/products/api/product-units.api';
import { unitsPageApi, type OverviewProduct } from '../api/units-page.api';
import { apiMessage } from './UnitEditor';
import { TYPE_LABEL, TYPE_ORDER, UNIT_KEYS, packPrice, presetsFor, qtyText } from './meta';

const input = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';
const ROUND = [1, 5, 10, 50, 100] as const;

export function BulkAddModal({ products, industryId, onClose, onDone }: {
  products: OverviewProduct[];
  industryId?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const base = products[0]?.unit ?? 'pcs';
  const mixed = products.some((p) => p.unit.toLowerCase() !== base.toLowerCase());
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [type, setType] = useState<UnitConversionType>('CARTON');
  const [off, setOff] = useState('0');
  const [roundTo, setRoundTo] = useState<(typeof ROUND)[number]>(1);
  const [overwrite, setOverwrite] = useState(false);
  const r = Number(rate);
  const o = Math.min(90, Math.max(0, Number(off) || 0));
  const existing = products.filter((p) => p.units.some((u) => u.unitName.trim().toLowerCase() === name.trim().toLowerCase())).length;

  const run = useMutation({
    mutationFn: () => unitsPageApi.bulkAdd({
      productIds: products.map((p) => p.id), unitName: name.trim(), conversionType: type, conversionRate: r,
      discountPercent: o, roundTo, overwrite,
    }),
    onSuccess: (res) => {
      UNIT_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(`${res.created} products me ${name.trim()} jur gaya${res.updated ? `, ${res.updated} update` : ''}${res.skipped ? ` · ${res.skipped} chhor diye` : ''}`);
      onDone();
    },
    onError: (e) => toast.error(apiMessage(e, 'Pack nahi jure')),
  });

  const problem = !name.trim() ? 'Pack ka naam likhein' : !(r > 0) || r === 1 ? 'Ek pack me kitne — 1 se alag likhein' : null;

  return (
    <Modal open onClose={onClose} size="lg" title={`${products.length} products me ek pack jorein`}
      description="Misaal: sab cold drinks me carton = 24. Qeemat har product ke khule rate se khud banti hai."
      footer={<>
        {problem && <span className="mr-auto text-[0.75rem] text-amber-700">{problem}</span>}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={run.isPending} disabled={!!problem} onClick={() => run.mutate()} leftIcon={<Layers className="h-4 w-4" />}>Sab me jorein</Button>
      </>}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {presetsFor(base, industryId).map((ps) => (
            <button key={ps.name} type="button" onClick={() => { setName(ps.name); setRate(String(ps.rate)); setType(ps.type); }}
              className={cn('rounded-full px-2.5 py-1 text-[0.75rem] font-medium ring-1', name === ps.name ? 'bg-brand-600 text-white ring-brand-600' : 'text-slate-700 ring-slate-200 hover:bg-brand-50')}>
              {ps.name} · {qtyText(ps.rate)}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-[0.8125rem] font-medium text-slate-700">Pack ka naam *
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Carton" className={cn(input, 'mt-1')} />
            <span className="mt-1 block text-[0.75rem] font-normal text-slate-500">{existing ? `${existing} products me ye pack pehle se hai` : 'Har product me isi naam se jurega'}</span>
          </label>
          <label className="block text-[0.8125rem] font-medium text-slate-700">Ek pack me kitne *
            <input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" placeholder="24" className={cn(input, 'mt-1 tabular-nums')} />
            <span className="mt-1 block text-[0.75rem] font-normal text-slate-500">{mixed ? 'Products ke asal unit alag hain — rate har ek ke apne unit me lagega' : `${base} me`}</span>
          </label>
          <label className="block text-[0.8125rem] font-medium text-slate-700">Khule rate se kitna kam (%)
            <input value={off} onChange={(e) => setOff(e.target.value)} inputMode="decimal" className={cn(input, 'mt-1 tabular-nums')} />
            <span className="mt-1 block text-[0.75rem] font-normal text-slate-500">0 = khule ke barabar. Pack par chhoot dene ke liye 2–5%</span>
          </label>
          <label className="block text-[0.8125rem] font-medium text-slate-700">Qeemat gol karein
            <select value={roundTo} onChange={(e) => setRoundTo(Number(e.target.value) as (typeof ROUND)[number])} className={cn(input, 'mt-1')}>
              {ROUND.map((n) => <option key={n} value={n}>{n === 1 ? 'Poore rupay' : `${n} ke hisaab se`}</option>)}
            </select>
            <span className="mt-1 block text-[0.75rem] font-normal text-slate-500">Misaal: 1,437 → 1,440 (10 ke hisaab se)</span>
          </label>
          <label className="block text-[0.8125rem] font-medium text-slate-700">Qism (type)
            <select value={type} onChange={(e) => setType(e.target.value as UnitConversionType)} className={cn(input, 'mt-1')}>
              {TYPE_ORDER.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
            <span className="mt-1 block text-[0.75rem] font-normal text-slate-500">Sirf reports ke liye</span>
          </label>
          <div className="self-center">
            <Switch checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} label="Pehle se ho to update karein" description="Rate aur qeemat naye hisaab se badal dein" />
          </div>
        </div>

        <div className="rounded-2xl ring-1 ring-slate-200">
          <p className="border-b border-slate-100 px-3 py-2 text-[0.75rem] font-semibold text-slate-500">Jhalak (pehle 6)</p>
          <ul className="divide-y divide-slate-100 text-[0.8125rem]">
            {products.slice(0, 6).map((p) => {
              const has = p.units.some((u) => u.unitName.trim().toLowerCase() === name.trim().toLowerCase());
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate text-slate-800">{p.name} <span className="text-slate-400">· {formatPKR(p.price)}/{p.unit}</span></span>
                  <span className={cn('shrink-0 tabular-nums', has && !overwrite ? 'text-slate-400 line-through' : 'font-semibold text-slate-900')}>
                    {r > 0 ? formatPKR(packPrice(Number(p.price) || 0, r, o, roundTo)) : '—'}
                  </span>
                </li>
              );
            })}
            {products.length > 6 && <li className="px-3 py-2 text-[0.75rem] text-slate-500">aur {products.length - 6}…</li>}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
