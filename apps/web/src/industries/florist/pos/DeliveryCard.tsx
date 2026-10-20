/**
 * Cart block on the florist counter: turns the bill into a delivery or
 * event order. Shows a one-line summary; the dialog takes recipient,
 * address, message card, day and time slot. The delivery charge itself is
 * the counter's own Delivery button, so it lands on the bill.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarDays, Gift, MapPin, MessageSquareHeart, RotateCw, Truck, X } from 'lucide-react';
import { Button, Input, Modal, Select, Switch, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { floristOrdersApi } from '../api/orders.api';
import { FLORIST_KEYS, ORDER_TYPE, SLOT, dayKey, errorText, shiftDay, shortDate } from '../lib/meta';
import { blankDraft, deliveryStore, draftProblems, toOrder, useDeliveryState, type DeliveryDraft } from './deliveryDraft';

const TYPES = (['DELIVERY', 'EVENT', 'CORPORATE', 'WALK_IN'] as const).map((v) => ({ value: v, label: v === 'WALK_IN' ? 'Baad me le jayenge (pickup)' : ORDER_TYPE[v] }));
const CARD_PRESETS = ['Happy Birthday!', 'Shaadi mubarak!', 'Jald sehatyab hon', 'Eid mubarak!', 'Congratulations!', 'Happy Anniversary!'];

export function DeliveryCard() {
  const { draft, failed } = useDeliveryState();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const retry = useMutation({
    mutationFn: () => floristOrdersApi.fromSale(toOrder(failed!.saleId, failed!.draft)),
    onSuccess: (o) => { deliveryStore.set({ failed: null }); qc.invalidateQueries({ queryKey: [FLORIST_KEYS.orders] }); toast.success(`Delivery order ${o.orderNumber} ban gaya`); },
    onError: (e) => toast.error(errorText(e, 'Order ab bhi nahi bana')),
  });

  return (
    <div className="space-y-2">
      {failed && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-800 ring-1 ring-rose-200">
          <span className="min-w-0 flex-1">Bill {failed.saleNumber} ka delivery order nahi bana</span>
          <button type="button" onClick={() => retry.mutate()} disabled={retry.isPending} className="inline-flex items-center gap-1 font-semibold hover:underline"><RotateCw className="h-3.5 w-3.5" />Dobara</button>
          <button type="button" onClick={() => deliveryStore.set({ failed: null })} aria-label="Chhor dein"><X className="h-4 w-4" /></button>
        </div>
      )}
      {draft ? (
        <div className="flex items-start gap-2 rounded-xl bg-pink-50 px-3 py-2 ring-1 ring-pink-200">
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-pink-700" />
          <button type="button" onClick={() => setOpen(true)} className="min-w-0 flex-1 text-left">
            <p className="truncate text-[0.8125rem] font-semibold text-pink-900">{ORDER_TYPE[draft.orderType]} · {shortDate(draft.scheduledDeliveryDate)} · {SLOT[draft.deliveryTimeSlot]}</p>
            <p className="truncate text-[0.75rem] text-pink-800/80">{[draft.recipientName, draft.area || draft.deliveryAddress].filter(Boolean).join(' · ') || 'Tafseel likhein'}</p>
            {draftProblems(draft).length > 0 && <p className="text-[0.75rem] font-medium text-rose-700">{draftProblems(draft)[0]}</p>}
          </button>
          <button type="button" onClick={() => deliveryStore.set({ draft: null })} aria-label="Delivery hatayein" className="text-pink-700 hover:text-pink-900"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <button type="button" onClick={() => { deliveryStore.set({ draft: blankDraft() }); setOpen(true); }}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[0.8125rem] font-semibold text-pink-800 ring-1 ring-dashed ring-pink-300 hover:bg-pink-50">
          <Gift className="h-4 w-4" />Delivery / order (card, pata, waqt)
        </button>
      )}
      {open && draft && <DeliveryDialog initial={draft} onClose={() => setOpen(false)} />}
    </div>
  );
}

function DeliveryDialog({ initial, onClose }: { initial: DeliveryDraft; onClose: () => void }) {
  const [d, setD] = useState<DeliveryDraft>(initial);
  const [touched, setTouched] = useState(false);
  const set = (p: Partial<DeliveryDraft>) => setD((x) => ({ ...x, ...p }));
  const problems = draftProblems(d);
  const away = d.orderType === 'DELIVERY' || d.orderType === 'CORPORATE';
  const save = () => {
    setTouched(true);
    if (problems.length) { toast.error(problems[0]); return; }
    deliveryStore.set({ draft: d });
    onClose();
  };
  const today = dayKey();

  return (
    <Modal open onClose={onClose} size="lg" title="Delivery / order" description="Bill ke saath order banega — Orders page par tayyari se delivery tak dikhega"
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button onClick={save}>Theek hai</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } }}>
        <Select label="Order kis tarah ka" value={d.orderType} onChange={(e) => set({ orderType: e.target.value as DeliveryDraft['orderType'] })} options={TYPES}
          hint="Delivery charge counter ke Delivery button se lagayein — bill me shamil hota hai" />

        <div>
          <span className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-700"><CalendarDays className="h-4 w-4 text-brand-600" />Kab</span>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Date" type="date" min={today} value={d.scheduledDeliveryDate} onChange={(e) => set({ scheduledDeliveryDate: e.target.value })}
              error={touched && !d.scheduledDeliveryDate ? 'Date chunein' : undefined} />
            <Select label="Waqt" value={d.deliveryTimeSlot} onChange={(e) => set({ deliveryTimeSlot: e.target.value as DeliveryDraft['deliveryTimeSlot'] })}
              options={Object.entries(SLOT).map(([value, label]) => ({ value, label }))} />
            {d.deliveryTimeSlot === 'SCHEDULED'
              ? <Input label="Khaas waqt" type="time" value={d.scheduledDeliveryTime} onChange={(e) => set({ scheduledDeliveryTime: e.target.value })} />
              : <div className="flex items-end gap-1.5 pb-1">{[0, 1, 2].map((n) => (
                <button key={n} type="button" onClick={() => set({ scheduledDeliveryDate: shiftDay(today, n) })}
                  className={cn('h-8 rounded-lg px-2.5 text-[0.75rem] font-semibold ring-1', d.scheduledDeliveryDate === shiftDay(today, n) ? 'bg-slate-900 text-white ring-slate-900' : 'ring-slate-200 hover:bg-slate-50')}>
                  {n === 0 ? 'Aaj' : n === 1 ? 'Kal' : 'Parson'}
                </button>))}</div>}
          </div>
        </div>

        {away && (
          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-700"><MapPin className="h-4 w-4 text-brand-600" />Kis ko, kahan</span>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Lene wale ka naam *" value={d.recipientName} onChange={(e) => set({ recipientName: e.target.value })} error={touched && !d.recipientName.trim() ? 'Naam likhein' : undefined} />
              <Input label="Lene wale ka phone *" inputMode="tel" value={d.recipientPhone} onChange={(e) => set({ recipientPhone: e.target.value })} placeholder="0300 1234567"
                error={touched && problems.includes('Lene wale ka phone 10 se 15 hindse') ? 'Phone 10 se 15 hindse' : undefined} hint="Rider isi number par rabta karega" />
              <div className="sm:col-span-2"><Textarea label="Pata *" rows={2} value={d.deliveryAddress} onChange={(e) => set({ deliveryAddress: e.target.value })} error={touched && !d.deliveryAddress.trim() ? 'Pata likhein' : undefined} /></div>
              <Input label="Area" value={d.area} onChange={(e) => set({ area: e.target.value })} placeholder="DHA Phase 5, Gulberg" hint="Rider ki list area se banti hai" />
              <Input label="Nishani" value={d.landmark} onChange={(e) => set({ landmark: e.target.value })} placeholder="Masjid ke saath" />
            </div>
          </div>
        )}

        {d.orderType === 'EVENT' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Event" value={d.eventName} onChange={(e) => set({ eventName: e.target.value })} placeholder="Mehndi, birthday, office opening" />
            <Input label="Jagah *" value={d.eventVenue} onChange={(e) => set({ eventVenue: e.target.value })} error={touched && !d.eventVenue.trim() ? 'Jagah likhein' : undefined} />
          </div>
        )}

        <div>
          <span className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-700"><MessageSquareHeart className="h-4 w-4 text-brand-600" />Card ka message (marzi)</span>
          <Textarea rows={2} maxLength={500} value={d.messageCard} onChange={(e) => set({ messageCard: e.target.value })} placeholder="Card par jo likhna hai" />
          <div className="mt-1.5 flex flex-wrap gap-1.5">{CARD_PRESETS.map((p) => <button key={p} type="button" onClick={() => set({ messageCard: p })} className="h-7 rounded-md px-2 text-[0.75rem] font-medium ring-1 ring-slate-200 hover:bg-slate-50">{p}</button>)}</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input label="Bhejne wale ka naam" disabled={d.isAnonymous} value={d.senderName} onChange={(e) => set({ senderName: e.target.value })} />
            <div className="flex items-end pb-2"><Switch label="Naam chhupa rakhein" checked={d.isAnonymous} onChange={(e) => set({ isAnonymous: e.target.checked })} /></div>
          </div>
        </div>

        <Textarea label="Hidayat (marzi)" rows={2} value={d.specialInstructions} onChange={(e) => set({ specialInstructions: e.target.value })} placeholder="Laal gulab zyada, ghanti mat bajayein…" />
      </form>
    </Modal>
  );
}
