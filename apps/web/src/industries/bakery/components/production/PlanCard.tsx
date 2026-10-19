/**
 * A baking plan with its lines: start the plan, put a line in the oven,
 * record it as made (with raw materials, stock and a freshness batch), take
 * a line out, add more, and close the plan.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Flame, Package, Play, Plus, Timer, Trash2 } from 'lucide-react';
import { Button, Input, Modal, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { productionApi, type ProductionItem, type ProductionPlan } from '../../api/production.api';
import { PRODUCTION_KEY, FRESH_KEY, RAW_KEY, apiError, fmtQty } from '../meta';
import { useConfirm } from '../useConfirm';

const ITEM_STATUS: Record<string, { label: string; tone: string }> = {
  PLANNED: { label: 'Banana hai', tone: 'bg-slate-100 text-slate-700 ring-slate-200' },
  IN_PROGRESS: { label: 'Kaam chal raha', tone: 'bg-blue-50 text-blue-700 ring-blue-200' },
  BAKING: { label: 'Oven me', tone: 'bg-orange-50 text-orange-700 ring-orange-200' },
  COOLING: { label: 'Thanda ho raha', tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  DECORATING: { label: 'Sajawat', tone: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200' },
  QUALITY_CHECK: { label: 'Check ho raha', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  COMPLETED: { label: 'Ban gaya', tone: 'bg-success-50 text-success-700 ring-success-200' },
  FAILED: { label: 'Kharab hua', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  ON_HOLD: { label: 'Roka hua', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
};
export const itemStatus = (s?: string) => ITEM_STATUS[s ?? 'PLANNED'] ?? ITEM_STATUS.PLANNED;

const FINISH_PREFS = 'nafaa.bakery.finish';
interface FinishPrefs { useIngredients: boolean; addToStock: boolean; makeBatch: boolean; hours: number }
function readPrefs(): FinishPrefs {
  try { return { useIngredients: false, addToStock: false, makeBatch: true, hours: 24, ...JSON.parse(localStorage.getItem(FINISH_PREFS) || '{}') }; }
  catch { return { useIngredients: false, addToStock: false, makeBatch: true, hours: 24 }; }
}

export function PlanCard({ plan, canManage, onAddItems }: { plan: ProductionPlan; canManage: boolean; onAddItems: (plan: ProductionPlan) => void }) {
  const [ask, confirmDialog] = useConfirm();
  const qc = useQueryClient();
  const [bake, setBake] = useState<ProductionItem | null>(null);
  const [finish, setFinish] = useState<ProductionItem | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: [PRODUCTION_KEY] });
  const items = plan.items ?? [];
  const done = items.filter((i) => i.status === 'COMPLETED').length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  const planned = items.reduce((s, i) => s + i.plannedQty, 0);
  const made = items.reduce((s, i) => s + i.producedQty, 0);
  const closed = plan.status === 'COMPLETED';

  const planStep = useMutation({
    mutationFn: (to: 'start' | 'complete') => (to === 'start' ? productionApi.startPlan(plan.id) : productionApi.completePlan(plan.id)),
    onSuccess: (_d, to) => { toast.success(to === 'start' ? 'Kaam shuru' : 'Plan mukammal'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const remove = useMutation({
    mutationFn: (it: ProductionItem) => productionApi.removeItem(it.id!),
    onSuccess: () => { toast.success('Plan se hata diya'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hata')),
  });

  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      {confirmDialog}
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-900">{plan.planNumber}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', itemStatus(plan.status).tone)}>{itemStatus(plan.status).label}</span>
            {plan.shift && <span className="text-[0.75rem] text-slate-500">{plan.shift}</span>}
          </div>
          <p className="text-[0.75rem] text-slate-500">{items.length} cheezein · {fmtQty(made)} / {fmtQty(planned)} bane{plan.notes ? ` · ${plan.notes}` : ''}</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-1.5">
            {!closed && <Button size="sm" variant="secondary" onClick={() => onAddItems(plan)} leftIcon={<Plus className="h-4 w-4" />}>Cheez</Button>}
            {plan.status === 'PLANNED' && <Button size="sm" onClick={() => planStep.mutate('start')} loading={planStep.isPending} leftIcon={<Play className="h-4 w-4" />}>Kaam shuru</Button>}
            {!closed && plan.status !== 'PLANNED' && <Button size="sm" variant="success" onClick={async () => { if (done < items.length && !(await ask({ title: 'Plan band karein?', text: `${items.length - done} cheezein abhi "ban gaya" nahi hui. Phir bhi plan band karein?`, yes: 'Haan, band karein' }))) return; planStep.mutate('complete'); }} loading={planStep.isPending} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Plan mukammal</Button>}
          </div>
        )}
      </header>
      <div className="px-4 pt-2.5">
        <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-success-500 transition-all" style={{ width: `${pct}%` }} /></div>
        <p className="mt-1 text-[0.6875rem] text-slate-500">{done} / {items.length} ban gaya</p>
      </div>
      <ul className="mt-1 divide-y divide-slate-100">
        {items.map((i) => {
          const isDone = i.status === 'COMPLETED';
          const st = itemStatus(i.status);
          return (
            <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', isDone ? 'bg-success-50 text-success-700' : i.status === 'BAKING' ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-500')}>
                {isDone ? <CheckCircle2 className="h-5 w-5" /> : i.status === 'BAKING' ? <Flame className="h-5 w-5" /> : <Package className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate font-medium text-slate-900">{i.productName}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}>{st.label}</span>
                  {i.cakeOrderId && <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[0.6875rem] font-medium text-pink-700">Order</span>}
                </div>
                <p className="text-[0.75rem] text-slate-500">
                  {[i.ovenNumber && `Oven ${i.ovenNumber}`, i.bakingTempC && `${i.bakingTempC}°C`, i.bakerName, i.batchNumber && `Batch ${i.batchNumber}`, i.bakingDurationMin && `${i.bakingDurationMin} min`].filter(Boolean).join(' · ') || (isDone ? '' : 'Abhi shuru nahi hua')}
                  {isDone && i.qualityNotes ? ` · ${i.qualityNotes}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold tabular-nums text-slate-900">{isDone ? fmtQty(i.producedQty) : fmtQty(i.plannedQty)}</p>
                <p className="text-[0.6875rem] text-slate-500">{isDone ? `${fmtQty(i.plannedQty)} socha tha` : 'banana hai'}</p>
                {isDone && i.failedQty > 0 && <p className="text-[0.6875rem] font-semibold text-rose-700">{fmtQty(i.failedQty)} kharab</p>}
              </div>
              {canManage && !isDone && !closed && (
                <div className="flex w-full flex-wrap gap-1.5 sm:w-auto">
                  {i.status === 'PLANNED' && <Button size="sm" variant="secondary" onClick={() => setBake(i)} leftIcon={<Flame className="h-4 w-4" />}>Oven me</Button>}
                  <Button size="sm" variant="success" onClick={() => setFinish(i)} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Ban gaya</Button>
                  {i.status === 'PLANNED' && (
                    <button type="button" aria-label="Plan se hatayein" onClick={async () => { if (await ask({ title: `"${i.productName}" plan se hatayein?`, yes: 'Hatayein', danger: true })) remove.mutate(i); }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {bake && <BakeModal item={bake} onClose={() => setBake(null)} onDone={() => { setBake(null); refresh(); }} />}
      {finish && <FinishModal item={finish} onClose={() => setFinish(null)} onDone={() => { setFinish(null); refresh(); qc.invalidateQueries({ queryKey: [FRESH_KEY] }); qc.invalidateQueries({ queryKey: [RAW_KEY] }); }} />}
    </section>
  );
}

function BakeModal({ item, onClose, onDone }: { item: ProductionItem; onClose: () => void; onDone: () => void }) {
  const [temp, setTemp] = useState('180');
  const [oven, setOven] = useState(item.ovenNumber ?? '');
  const go = useMutation({
    mutationFn: () => productionApi.startBaking(item.id!, { bakingTempC: Number(temp) || undefined, ovenNumber: oven.trim() || undefined }),
    onSuccess: () => { toast.success('Oven me daal diya'); onDone(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Oven me daala" description={`${item.productName} · ${fmtQty(item.plannedQty)}`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={go.isPending} onClick={() => go.mutate()} leftIcon={<Flame className="h-4 w-4" />}>Shuru</Button></>}>
      <div className="space-y-3">
        <Input label="Temperature (°C)" inputMode="numeric" value={temp} onChange={(e) => setTemp(e.target.value.replace(/\D/g, ''))} data-autofocus />
        <div className="flex gap-1.5">{['160', '180', '200', '220'].map((t) => <Button key={t} size="sm" variant={temp === t ? 'primary' : 'secondary'} className="flex-1" onClick={() => setTemp(t)}>{t}°</Button>)}</div>
        <Input label="Oven" value={oven} onChange={(e) => setOven(e.target.value)} placeholder="1, 2, bara wala…" hint="Baad me pata chalta hai kis oven me kharabi zyada hoti hai" />
      </div>
    </Modal>
  );
}

function FinishModal({ item, onClose, onDone }: { item: ProductionItem; onClose: () => void; onDone: () => void }) {
  const [prefs, setPrefs] = useState<FinishPrefs>(readPrefs);
  const [made, setMade] = useState(String(item.plannedQty));
  const [failed, setFailed] = useState('0');
  const [notes, setNotes] = useState('');
  const setPref = (p: Partial<FinishPrefs>) => setPrefs((x) => { const n = { ...x, ...p }; try { localStorage.setItem(FINISH_PREFS, JSON.stringify(n)); } catch { /* storage blocked */ } return n; });
  const producedQty = Math.round(Number(made) || 0);
  const failedQty = Math.round(Number(failed) || 0);
  const linked = !!item.productId;
  const save = useMutation({
    mutationFn: () => productionApi.completeItem(item.id!, {
      producedQty, failedQty, qualityNotes: notes.trim() || undefined,
      useIngredients: linked && prefs.useIngredients, addToStock: linked && prefs.addToStock,
      freshHours: linked && prefs.makeBatch ? prefs.hours : undefined,
    }),
    onSuccess: (r) => {
      toast.success(`${item.productName}: ${producedQty} ban gaye${r.stockAdded ? ` · ${r.stockAdded} stock me` : ''}`);
      (r.warnings ?? []).forEach((w) => toast.warning(w));
      onDone();
    },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const short = item.plannedQty - producedQty;
  return (
    <Modal open onClose={onClose} size="md" title="Ban gaya" description={`${item.productName} · ${fmtQty(item.plannedQty)} socha tha`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button variant="success" disabled={producedQty + failedQty <= 0} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Darj karein</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Kitne bane (theek)" inputMode="numeric" value={made} onChange={(e) => setMade(e.target.value.replace(/\D/g, ''))} size="lg" className="text-center text-xl font-bold tabular-nums" data-autofocus />
          <Input label="Kitne kharab" inputMode="numeric" value={failed} onChange={(e) => setFailed(e.target.value.replace(/\D/g, ''))} size="lg" className="text-center text-xl font-bold tabular-nums" hint="Waste ke record me jata hai" />
        </div>
        {short > 0 && <p className="text-[0.8125rem] text-amber-800">Socha {fmtQty(item.plannedQty)} tha — {fmtQty(short)} kam ban rahe hain.</p>}
        <Input label="Koi baat" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Thora jal gaya, oven garam tha…" hint={failedQty > 0 ? 'Kharabi ki wajah likhein — waste ke record me dikhti hai' : undefined} />
        {linked ? (
          <div className="space-y-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <Switch checked={prefs.addToStock} onChange={(e) => setPref({ addToStock: e.target.checked })} label="Bana hua maal stock me daalein"
              description="Counter par bechne se pehle stock barh jaye. Agar aap stock alag se daalte hain to band rakhein." />
            <Switch checked={prefs.useIngredients} onChange={(e) => setPref({ useIngredients: e.target.checked })} label="Recipe ka saamaan ghatayein"
              description="Maida, cheeni waghera recipe ke hisaab se kachche maal se kam honge. Recipe na bani ho to kuch nahi hota." />
            <Switch checked={prefs.makeBatch} onChange={(e) => setPref({ makeBatch: e.target.checked })} label="Freshness ka batch banayein"
              description="Kab tak theek rahega — waqt guzarne par yaad dilaye ga" />
            {prefs.makeBatch && (
              <div className="flex flex-wrap items-center gap-1.5 pl-1">
                <Timer className="h-4 w-4 text-slate-500" />
                {[6, 12, 24, 48, 72].map((h) => <Button key={h} size="xs" variant={prefs.hours === h ? 'primary' : 'secondary'} onClick={() => setPref({ hours: h })}>{h < 24 ? `${h} ghante` : `${h / 24} din`}</Button>)}
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">Yeh cheez maal se juri nahi, is liye stock, saamaan aur freshness ka hisaab nahi hoga.</p>
        )}
      </div>
    </Modal>
  );
}
