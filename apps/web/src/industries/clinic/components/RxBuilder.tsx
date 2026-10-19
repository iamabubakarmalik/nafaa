/**
 * Prescription writer: medicines with dose, how often, how many days and
 * meal timing. Names are suggested from the clinic's own stock, so the
 * counter can give the same medicine. Saved prescriptions print on A4.
 */

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pill, Plus, Printer, Trash2 } from 'lucide-react';
import { Button, Input, Modal, Select, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { encountersApi } from '../api/encounters.api';
import { prescriptionsApi, type Prescription, type PrescriptionItem } from '../api/prescriptions.api';
import { useDebounced } from '../hooks/usePageKeys';
import { apiError } from '../lib/meta';

const FREQ = ['1+0+1', '1+1+1', '1+0+0', '0+0+1', '1+1+1+1', 'SOS', 'Hafte me 1'];
const FORMS = ['Tab', 'Cap', 'Syp', 'Inj', 'Drops', 'Cream', 'Sachet', 'Inhaler'];
const DAYS = [3, 5, 7, 10, 14, 30];

interface Line { drugId?: string; drugName: string; form: string; strength: string; dose: string; frequency: string; durationDays: string; afterMeal: boolean; beforeMeal: boolean; atBedtime: boolean; instructions: string }
const empty = (): Line => ({ drugName: '', form: 'Tab', strength: '', dose: '1', frequency: '1+0+1', durationDays: '5', afterMeal: true, beforeMeal: false, atBedtime: false, instructions: '' });

function DrugName({ value, onChange, onPick }: { value: string; onChange: (v: string) => void; onPick: (id: string, name: string) => void }) {
  const [open, setOpen] = useState(false);
  const q = useDebounced(value.trim(), 250);
  const { data } = useQuery({ queryKey: ['clinic-rx-drugs', q], queryFn: () => productsApi.list({ search: q, limit: 8, isActive: true }), enabled: open && q.length >= 2, staleTime: 60_000 });
  const items = (data?.items ?? []).filter((p) => (p.unit ?? '').toLowerCase() !== 'service');
  return (
    <div className="relative">
      <Input aria-label="Dawai" value={value} placeholder="Dawai ka naam" onChange={(e) => { onChange(e.target.value); setOpen(true); }} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && items.length > 0 && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
          {items.map((p) => (
            <button key={p.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(p.id, p.name); setOpen(false); }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[0.8125rem] hover:bg-brand-50">
              <span className="truncate font-medium">{p.name}</span>
              <span className={cn('shrink-0 text-[0.6875rem]', Number(p.stock) > 0 ? 'text-emerald-700' : 'text-rose-600')}>{Number(p.stock) > 0 ? `${Number(p.stock)} stock` : 'stock nahi'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RxBuilder({ appointmentId, encounterId, onClose, onSaved }: {
  appointmentId: string;
  encounterId?: string | null;
  onClose: () => void;
  onSaved: (rx: Prescription) => void;
}) {
  const [lines, setLines] = useState<Line[]>([empty()]);
  const [general, setGeneral] = useState('');
  const [tried, setTried] = useState(false);
  const set = (i: number, patch: Partial<Line>) => setLines((x) => x.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const filled = lines.filter((l) => l.drugName.trim());
  const error = !filled.length ? 'Kam se kam ek dawai likhein'
    : filled.some((l) => l.durationDays && !(Number(l.durationDays) > 0 && Number(l.durationDays) <= 365)) ? 'Din 1 se 365 tak' : null;

  const save = useMutation({
    mutationFn: async () => {
      const encId = encounterId ?? (await encountersApi.upsert(appointmentId, {})).id;
      const items: PrescriptionItem[] = filled.map((l) => ({
        drugId: l.drugId, drugName: l.drugName.trim(), form: l.form || undefined, strength: l.strength.trim() || undefined, dose: l.dose.trim() || undefined,
        frequency: l.frequency || undefined, durationDays: l.durationDays ? Number(l.durationDays) : undefined, afterMeal: l.afterMeal, beforeMeal: l.beforeMeal,
        atBedtime: l.atBedtime, instructions: l.instructions.trim() || undefined,
      }));
      return prescriptionsApi.create({ encounterId: encId, generalInstructions: general.trim() || undefined, items });
    },
    onSuccess: (rx) => { toast.success(`Nuskha ${rx.prescriptionNumber} save`); onSaved(rx); },
    onError: (e) => toast.error(apiError(e)),
  });
  const submit = () => { setTried(true); if (!error) save.mutate(); };

  const chip = (on: boolean) => cn('h-7 rounded-full px-2.5 text-[0.75rem] font-semibold ring-1', on ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50');
  return (
    <Modal open onClose={onClose} size="xl" title="Nuskha likhein" description="Dawai, khuraak, kitni dafa aur kitne din — save ke baad print"
      footer={<div className="flex items-center justify-between gap-2">
        <Button variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setLines((x) => [...x, empty()])}>Aur dawai</Button>
        <div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={save.isPending} leftIcon={<Printer className="h-4 w-4" />} onClick={submit}>Save aur print</Button></div>
      </div>}>
      <div className="space-y-3" onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        {lines.map((l, i) => (
          <div key={i} className="space-y-2 rounded-xl p-3 ring-1 ring-slate-200">
            <div className="flex items-start gap-2">
              <Pill className="mt-2.5 h-4 w-4 shrink-0 text-brand-600" />
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[6rem_minmax(0,1fr)_7rem]">
                <Select aria-label="Shakal" value={l.form} onChange={(e) => set(i, { form: e.target.value })} options={FORMS.map((f) => ({ value: f, label: f }))} />
                <DrugName value={l.drugName} onChange={(v) => set(i, { drugName: v, drugId: undefined })} onPick={(id, name) => set(i, { drugId: id, drugName: name })} />
                <Input aria-label="Strength" value={l.strength} onChange={(e) => set(i, { strength: e.target.value })} placeholder="500mg" />
              </div>
              {lines.length > 1 && <button type="button" aria-label="Hatayein" onClick={() => setLines((x) => x.filter((_, j) => j !== i))} className="flex h-10 w-10 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pl-6">
              <Input aria-label="Khuraak" size="sm" value={l.dose} onChange={(e) => set(i, { dose: e.target.value })} placeholder="1 goli / 5ml" wrapperClassName="w-28" />
              {FREQ.map((f) => <button key={f} type="button" onClick={() => set(i, { frequency: f })} className={chip(l.frequency === f)}>{f}</button>)}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pl-6">
              {DAYS.map((d) => <button key={d} type="button" onClick={() => set(i, { durationDays: String(d) })} className={chip(l.durationDays === String(d))}>{d} din</button>)}
              <Input aria-label="Din" size="sm" inputMode="numeric" value={l.durationDays} onChange={(e) => set(i, { durationDays: e.target.value })} wrapperClassName="w-20" />
              <span className="mx-1 h-5 w-px bg-slate-200" />
              <button type="button" onClick={() => set(i, { afterMeal: !l.afterMeal, beforeMeal: false })} className={chip(l.afterMeal)}>Khane ke baad</button>
              <button type="button" onClick={() => set(i, { beforeMeal: !l.beforeMeal, afterMeal: false })} className={chip(l.beforeMeal)}>Khane se pehle</button>
              <button type="button" onClick={() => set(i, { atBedtime: !l.atBedtime })} className={chip(l.atBedtime)}>Sone se pehle</button>
            </div>
            <Input aria-label="Hidayat" size="sm" value={l.instructions} onChange={(e) => set(i, { instructions: e.target.value })} placeholder="Hidayat (marzi)" wrapperClassName="pl-6" />
          </div>
        ))}
        <Textarea label="Aam hidayat" rows={2} value={general} onChange={(e) => setGeneral(e.target.value)} placeholder="Dawai poora course karein" />
        {tried && error && <p className="text-[0.8125rem] font-medium text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}
