/** The limits that decide what counts as unusual: discount %, large amount and shop hours. Saved on this device. */

import { useState } from 'react';
import { Button, Input, Modal } from '@/design-system/components';

export interface Limits { discountPct?: number; big?: number; open?: string; close?: string }

const KEY = 'nafaa-audit-limits';

export function readLimits(): Limits {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') as Limits; } catch { return {}; }
}

export function saveLimits(l: Limits) {
  try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* storage blocked */ }
}

export function LimitsModal({ value, defaults, onSave, onClose }: {
  value: Limits;
  /** What the server used when nothing is set here. */
  defaults: { discountPct: number; big: number; hours: string } | undefined;
  onSave: (l: Limits) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState({
    discountPct: value.discountPct ? String(value.discountPct) : '',
    big: value.big ? String(value.big) : '',
    open: value.open ?? '',
    close: value.close ?? '',
  });
  const [dOpen, dClose] = (defaults?.hours ?? '07:00–23:00').split('–');
  const save = () => {
    const n = (v: string, min: number, max: number) => { const x = Number(v); return v && Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : undefined; };
    onSave({ discountPct: n(d.discountPct, 1, 100), big: n(d.big, 100, 100_000_000), open: d.open || undefined, close: d.close || undefined });
  };

  return (
    <Modal open onClose={onClose} title="Nigrani ki hadd" description="Kab koi kaam 'aam se hat kar' gina jaye. Ye is device par yaad rehti hain."
      footer={<>
        <Button variant="ghost" onClick={() => onSave({})}>Default par wapas</Button>
        <Button onClick={save}>Lagayein</Button>
      </>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Bari discount (% bill ka)" hint={`Is se zyada haath ki discount list hogi. Abhi ${defaults?.discountPct ?? 10}%`} type="number" min={1} max={100} inputMode="decimal" placeholder={String(defaults?.discountPct ?? 10)} value={d.discountPct} onChange={(e) => setD({ ...d, discountPct: e.target.value })} />
        <Input label="Bari amount (Rs)" hint={`Void, return, nikala gaya cash is se upar ho to "zaroor dekhein". Abhi ${defaults?.big ?? 5000}`} type="number" min={100} inputMode="numeric" placeholder={String(defaults?.big ?? 5000)} value={d.big} onChange={(e) => setD({ ...d, big: e.target.value })} />
        <Input label="Dukaan khulti hai" hint={`Khali chhorein to Settings wala waqt (${dOpen})`} type="time" value={d.open} onChange={(e) => setD({ ...d, open: e.target.value })} />
        <Input label="Dukaan band hoti hai" hint={`Khali chhorein to Settings wala waqt (${dClose})`} type="time" value={d.close} onChange={(e) => setD({ ...d, close: e.target.value })} />
      </div>
      <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[0.8125rem] leading-relaxed text-slate-600 ring-1 ring-slate-100">
        Dukaan ka waqt sab ke liye Settings → Zubaan aur waqt me badlein. Yahan ki hadd sirf aap ki screen ke liye hai — kisi bande ka record nahi badalta.
      </p>
    </Modal>
  );
}
