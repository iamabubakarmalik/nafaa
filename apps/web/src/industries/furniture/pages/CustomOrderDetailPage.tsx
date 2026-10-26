/**
 * One custom order: where it stands (quotation → advance → making → ready →
 * delivery), the money (advances and later payments go to the drawer and
 * the customer's khata; the bill is made when it leaves the shop), the
 * karigar and his progress, and the design. Prints the quotation slip.
 *
 * Keys: E edit · P payment · G guide · Esc back.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, CheckCircle2, ClipboardList, GraduationCap, Hammer, Palette, Pencil, Phone, Receipt, Ruler, Truck, UserRound, Wallet, XCircle } from 'lucide-react';
import { Button, Card, Input, Modal, PageHero, PageShell, Select, Skeleton, Textarea, heroButton, heroIconButton } from '@/design-system/components';
import { UploadDropzone } from '@core/components/uploads';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { customOrdersApi, type FurnitureCustomOrder, type FurnitureOrderStatus } from '../api/custom-orders.api';
import { carpentersApi } from '../api/carpenters.api';
import { ConfirmModal, DueChip, Info, MoneyModal } from '../components/ui';
import {
  BILLED_ORDER, FURNITURE_KEYS, MONEY_KEYS, OPEN_ORDER, ORDER_STATUS, categoryLabel, errorText, longDate, materialOf, orderTotal, shortDate, sizeText,
} from '../lib/meta';

const STEPS = [
  { step: 0, label: 'Quotation' }, { step: 1, label: 'Advance' }, { step: 2, label: 'Ban raha' },
  { step: 3, label: 'Tayyar' }, { step: 4, label: 'Raste me' }, { step: 5, label: 'De diya' },
];

function quotationSlip(o: FurnitureCustomOrder, money: (n: number) => string): PrintDoc {
  return {
    title: `Order ${o.orderNumber}`, subtitle: `${longDate(o.quotationDate)} · ${ORDER_STATUS[o.status]?.label ?? o.status}`,
    meta: [['Kul', money(orderTotal(o))], ['Mila', money(o.totalPaid)], ['Baqi', money(o.balanceAmount)]],
    sections: [
      { kind: 'rows', title: 'Customer', rows: [{ label: 'Naam', value: o.customerName }, { label: 'Phone', value: o.customerPhone }, ...(o.customerAddress ? [{ label: 'Pata', value: o.customerAddress }] : [])] },
      { kind: 'rows', title: 'Order', rows: [
        { label: 'Cheez', value: o.productType }, { label: 'Design', value: o.description },
        ...(o.woodType ? [{ label: 'Lakri', value: o.woodType }] : []), ...(o.polishRequested ? [{ label: 'Polish', value: o.polishRequested }] : []),
        ...(o.upholsteryFabric ? [{ label: 'Kapra', value: o.upholsteryFabric }] : []), ...(sizeText(o) ? [{ label: 'Size', value: sizeText(o) }] : []),
        { label: 'Dene ki date', value: longDate(o.expectedDeliveryDate) }, { label: 'Warranty', value: `${o.warrantyMonths} mahine` },
      ] },
      { kind: 'rows', title: 'Hisaab', rows: [
        { label: 'Qeemat', value: money(o.finalPrice ?? o.quotedPrice) },
        ...(o.requiresInstallation ? [{ label: 'Fitting', value: money(o.installationCharge ?? 0) }] : []),
        { label: 'Advance tay', value: money(o.depositAmount) }, { label: 'Mil chuka', value: money(o.totalPaid) }, { label: 'Baqi', value: money(o.balanceAmount) },
      ] },
      { kind: 'text', title: 'Shart', text: 'Advance wapas nahi hota agar kaam shuru ho chuka ho. Design me tabdeeli par qeemat aur date badal sakti hai. Delivery par baqi paisa dena hoga.' },
    ],
  };
}

export default function CustomOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canManage = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  const canTakeMoney = usePermission(PERMISSIONS.POS_USE);
  const [panel, setPanel] = useState<'pay' | 'karigar' | 'progress' | 'cancel' | 'deliver' | 'approve' | null>(null);

  const q = useQuery({ queryKey: [FURNITURE_KEYS.orders, 'one', id], queryFn: () => customOrdersApi.getOne(id!), enabled: !!id });
  const o = q.data;
  const refresh = () => [FURNITURE_KEYS.orders, FURNITURE_KEYS.deliveries, FURNITURE_KEYS.carpenters, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const done = (msg: string) => { toast.success(msg); setPanel(null); refresh(); };

  const status = useMutation({
    mutationFn: (v: { status: FurnitureOrderStatus; cancellationReason?: string; notes?: string }) => customOrdersApi.updateStatus(id!, v),
    onSuccess: (r) => done(BILLED_ORDER.includes(r.status) && r.balanceAmount > 0 ? `Bill ban gaya — ${money(r.balanceAmount)} customer ke khate me` : `Order: ${ORDER_STATUS[r.status]?.label}`),
    onError: (e) => toast.error(errorText(e, 'Nahi hua')),
  });
  const pay = useMutation({
    mutationFn: (v: { amount: number; paymentMethod: string; notes?: string }) => customOrdersApi.recordPayment(id!, { amount: v.amount, paymentMethod: v.paymentMethod, reference: v.notes }),
    onSuccess: (r) => done(`Payment save — ${r.balanceAmount > 0 ? `${money(r.balanceAmount)} baqi` : 'poora mil gaya'}`),
    onError: (e) => toast.error(errorText(e, 'Payment save nahi hui')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen() || !o) return;
      if (e.key === 'Escape') navigate('/furniture/custom-orders');
      if (e.key.toLowerCase() === 'e' && canManage && !BILLED_ORDER.includes(o.status) && o.status !== 'CANCELLED') navigate(`/furniture/custom-orders/${o.id}/edit`);
      if (e.key.toLowerCase() === 'p' && canTakeMoney && o.balanceAmount > 0 && o.status !== 'CANCELLED') setPanel('pay');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (q.isLoading) return <PageShell><Skeleton className="h-28 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div></PageShell>;
  if (!o) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Order nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/furniture/custom-orders')}>Orders par wapas</Button></div></PageShell>;

  const st = ORDER_STATUS[o.status];
  const open = OPEN_ORDER.includes(o.status);
  const closed = o.status === 'CANCELLED' || o.status === 'REFUNDED';
  const total = orderTotal(o);
  const paidPct = total ? Math.min(Math.round((o.totalPaid / total) * 100), 100) : 0;
  const updates = Array.isArray(o.progressUpdates) ? [...o.progressUpdates].reverse() : [];

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Order — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Wallet, color: '#16a34a', title: 'Payment', text: 'Advance aur har qist "Payment lein" se — usi din drawer me aur customer ke khate me jama hoti hai.' },
            { icon: Hammer, color: '#a16207', title: 'Karigar aur kaam', text: 'Karigar dein, phir kaam % aur photo daalte rahein. 100% par order Tayyar.' },
            { icon: Truck, color: '#7c3aed', title: 'Delivery', text: '"Delivery bhejein" se Deliveries page par slip banti hai. Customer khud le jaye to "Customer le gaya". Dono par bill banta hai.' },
            { icon: XCircle, color: '#e11d48', title: 'Cancel', text: 'Advance customer ke khate me rehta hai. Wapas dena ho to Khata se payment wapas karein.' },
          ]}
          shortcuts={[['E', 'badlein'], ['P', 'payment'], ['Esc', 'wapas'], ['G', 'guide']]} />
      )}

      <PageHero
        title={o.productType}
        chip={<span className="font-mono">{o.orderNumber}</span>}
        subtitle={<>{o.customerName} · {o.customerPhone}</>}
        back="/furniture/custom-orders"
        backLabel="Wapas (Esc)"
        actions={(
          <>
            <span className={`rounded-full px-3 py-1 text-[0.8125rem] font-semibold ring-1 ${st?.tone ?? ''}`}>{st?.label ?? o.status}</span>
            <span className="flex flex-wrap gap-1.5 [&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={() => quotationSlip(o, money)} label="Slip" size="sm" /></span>
            {canManage && !BILLED_ORDER.includes(o.status) && !closed && <button type="button" onClick={() => navigate(`/furniture/custom-orders/${o.id}/edit`)} className={heroButton}><Pencil className="h-4 w-4" />Badlein</button>}
            <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          </>
        )}
      />

      {!closed && (
        <ol className="grid grid-cols-3 gap-2 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 sm:grid-cols-6">
          {STEPS.map((s) => {
            const on = (st?.step ?? 0) >= s.step;
            return <li key={s.step} className={`rounded-xl px-2 py-1.5 text-center text-[0.75rem] font-semibold ${on ? 'bg-brand-600 text-brand-fg' : 'bg-slate-100 text-slate-500'}`}>{s.label}</li>;
          })}
        </ol>
      )}
      {closed && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-[0.875rem] text-rose-800 ring-1 ring-rose-200">Cancel {o.cancelledAt ? shortDate(o.cancelledAt) : ''} — {o.cancellationReason ?? '—'}. {o.totalPaid > 0 ? `${money(o.totalPaid)} advance customer ke khate me hai.` : ''}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<span className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-brand-600" />Ab kya karna hai</span>}>
            <div className="flex flex-wrap gap-2">
              {o.status === 'QUOTATION' && canManage && <Button onClick={() => setPanel('approve')}><CheckCircle2 className="h-4 w-4" />Qeemat pakki karein</Button>}
              {canTakeMoney && !closed && o.balanceAmount > 0 && <Button variant={o.status === 'QUOTATION' ? 'secondary' : 'primary'} onClick={() => setPanel('pay')}><Wallet className="h-4 w-4" />{BILLED_ORDER.includes(o.status) ? 'Baqi wusool karein' : 'Advance / qist lein'}</Button>}
              {canManage && open && <Button variant="secondary" onClick={() => setPanel('karigar')}><Hammer className="h-4 w-4" />{o.carpenterName ? 'Karigar badlein' : 'Karigar dein'}</Button>}
              {canManage && (o.status === 'DEPOSIT_PAID' || o.status === 'IN_PRODUCTION') && <Button variant="secondary" onClick={() => setPanel('progress')}><Ruler className="h-4 w-4" />Kaam kitna hua</Button>}
              {canManage && o.status === 'READY_FOR_DELIVERY' && <Button loading={status.isPending} onClick={() => status.mutate({ status: 'OUT_FOR_DELIVERY' })}><Truck className="h-4 w-4" />Delivery bhejein</Button>}
              {canManage && (o.status === 'READY_FOR_DELIVERY' || o.status === 'OUT_FOR_DELIVERY') && <Button variant={o.status === 'OUT_FOR_DELIVERY' ? 'primary' : 'secondary'} onClick={() => setPanel('deliver')}><CheckCircle2 className="h-4 w-4" />{o.status === 'OUT_FOR_DELIVERY' ? 'Pohanch gaya' : 'Customer le gaya'}</Button>}
              {canManage && (o.status === 'DELIVERED' || o.status === 'ASSEMBLED') && <Button variant="secondary" loading={status.isPending} onClick={() => status.mutate({ status: 'COMPLETED' })}><CheckCircle2 className="h-4 w-4" />Mukammal</Button>}
              {o.status === 'OUT_FOR_DELIVERY' && <Link to="/furniture/deliveries" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[0.875rem] font-semibold text-brand-700 hover:bg-brand-50"><Truck className="h-4 w-4" />Delivery slip</Link>}
              {o.sale && <Link to={`/sales/${o.sale.id}/receipt`} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[0.875rem] font-semibold text-brand-700 hover:bg-brand-50"><Receipt className="h-4 w-4" />Bill {o.sale.saleNumber}</Link>}
              {canManage && (open || o.status === 'OUT_FOR_DELIVERY') && <Button variant="ghost" onClick={() => setPanel('cancel')}><XCircle className="h-4 w-4" />Cancel</Button>}
            </div>
          </Card>

          <Card className="rounded-2xl" title={<span className="flex items-center gap-2"><Palette className="h-4 w-4 text-brand-600" />Design</span>}>
            <div className="space-y-3 text-[0.875rem]">
              <p className="whitespace-pre-line text-slate-800">{o.description}</p>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[['Kya hai', o.categoryType ? categoryLabel(o.categoryType) : null], ['Material', o.material ? materialOf(o.material) : null], ['Lakri', o.woodType], ['Polish', o.polishRequested],
                  ['Rang', o.colorRequested], ['Kapra', o.upholsteryFabric], ['Size', sizeText(o)], ['Warranty', `${o.warrantyMonths} mahine`]]
                  .filter(([, v]) => v).map(([k, v]) => <div key={k as string}><dt className="text-[0.75rem] text-slate-500">{k}</dt><dd className="font-semibold text-slate-900">{v}</dd></div>)}
              </dl>
              {o.designNotes && <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900 ring-1 ring-amber-200">Karigar: {o.designNotes}</p>}
              {(o.sketchUrls.length > 0 || o.progressPhotos.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {[...o.sketchUrls, ...o.progressPhotos].map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="h-24 w-24 rounded-xl object-cover ring-1 ring-slate-200" /></a>)}
                </div>
              )}
            </div>
          </Card>

          {updates.length > 0 && (
            <Card className="rounded-2xl" title={<span className="flex items-center gap-2"><Hammer className="h-4 w-4 text-brand-600" />Kaam ki report</span>}>
              <ul className="space-y-2 text-[0.875rem]">
                {updates.map((u, i) => <li key={i} className="flex gap-3"><span className="w-12 shrink-0 font-semibold tabular-nums text-brand-700">{u.pct}%</span><span className="min-w-0 flex-1 text-slate-700">{u.note ?? '—'}</span><span className="shrink-0 text-[0.75rem] text-slate-400">{shortDate(u.at)}</span></li>)}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<span className="flex items-center gap-2"><Wallet className="h-4 w-4 text-brand-600" />Hisaab</span>}>
            <dl className="space-y-1.5 text-[0.875rem]">
              <div className="flex justify-between"><dt>Qeemat</dt><dd className="tabular-nums">{money(o.finalPrice ?? o.quotedPrice)}</dd></div>
              {o.requiresInstallation && <div className="flex justify-between"><dt>Fitting</dt><dd className="tabular-nums">{money(o.installationCharge ?? 0)}</dd></div>}
              <div className="flex justify-between border-t border-slate-100 pt-1.5 font-bold"><dt>Kul</dt><dd className="tabular-nums">{money(total)}</dd></div>
              <div className="flex justify-between text-success-700"><dt>Mil chuka</dt><dd className="tabular-nums">{money(o.totalPaid)}</dd></div>
              <div className="flex justify-between font-semibold text-amber-700"><dt>Baqi</dt><dd className="tabular-nums">{money(o.balanceAmount)}</dd></div>
            </dl>
            <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-success-500" style={{ width: `${Math.max(paidPct, 2)}%` }} /></div>
            <p className="mt-1.5 text-[0.75rem] text-slate-500">
              {o.depositAmount > 0 && !o.depositPaid ? `Advance tay: ${money(o.depositAmount)} · ` : ''}
              {BILLED_ORDER.includes(o.status) ? 'Bill ban chuka — baqi customer ke khate me hai' : 'Har payment usi din drawer aur khate me; bill delivery par'}
            </p>
          </Card>

          <Info icon={UserRound} title="Customer">
            <p className="font-semibold text-slate-900">{o.customerName}</p>
            <a href={`tel:${o.customerPhone}`} className="inline-flex items-center gap-1 text-[0.875rem] text-brand-700 hover:underline"><Phone className="h-3.5 w-3.5" />{o.customerPhone}</a>
            {(o.deliveryAddress || o.customerAddress) && <p className="text-[0.8125rem] text-slate-600">{[o.deliveryAddress || o.customerAddress, o.deliveryArea, o.deliveryCity].filter(Boolean).join(', ')}</p>}
          </Info>
          <Info icon={CalendarClock} title="Waqt">
            <p className="text-[0.875rem] text-slate-700">Order {shortDate(o.quotationDate)} · dena {shortDate(o.expectedDeliveryDate)}</p>
            <DueChip o={o} />
            {o.actualDeliveryDate && <p className="text-[0.8125rem] text-success-700">Diya {shortDate(o.actualDeliveryDate)}</p>}
          </Info>
          <Info icon={Hammer} title="Karigar">
            <p className="font-semibold text-slate-900">{o.carpenterName ?? 'Abhi nahi diya'}</p>
            {o.workshopLocation && <p className="text-[0.8125rem] text-slate-600">{o.workshopLocation}</p>}
            {(o.status === 'IN_PRODUCTION' || o.status === 'DEPOSIT_PAID' || o.progressPct > 0) && (
              <div className="mt-1.5"><div className="h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-amber-500" style={{ width: `${Math.max(o.progressPct, 2)}%` }} /></div><p className="mt-0.5 text-[0.75rem] text-slate-500">{o.progressPct}% kaam</p></div>
            )}
          </Info>
          {o.notes && <p className="whitespace-pre-line rounded-2xl bg-slate-50 px-4 py-3 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200/70">{o.notes}</p>}
        </div>
      </div>

      {panel === 'pay' && (
        <MoneyModal title={BILLED_ORDER.includes(o.status) ? 'Baqi wusool karein' : 'Advance / qist lein'} description={`${o.orderNumber} · ${o.customerName}`} due={o.balanceAmount} max={o.balanceAmount} busy={pay.isPending}
          hint={`Baqi ${money(o.balanceAmount)} — drawer aur khate me jata hai`} onSubmit={(v) => pay.mutate(v)} onClose={() => setPanel(null)} />
      )}
      {panel === 'approve' && <ApproveModal o={o} money={money} onClose={() => setPanel(null)} onDone={() => done('Qeemat pakki — ab advance lein')} />}
      {panel === 'karigar' && <KarigarModal o={o} onClose={() => setPanel(null)} onDone={() => done('Karigar de diya')} />}
      {panel === 'progress' && <ProgressModal o={o} onClose={() => setPanel(null)} onDone={(pct) => done(pct >= 100 ? 'Order tayyar — delivery bhejein' : 'Kaam save')} />}
      {panel === 'deliver' && (
        <ConfirmModal title={o.status === 'OUT_FOR_DELIVERY' ? 'Furniture pohanch gaya?' : 'Customer khud le gaya?'} cta="Haan, bill banayein" busy={status.isPending} onClose={() => setPanel(null)}
          onConfirm={() => status.mutate({ status: 'DELIVERED' })}
          text={<p>Ab bill banega: {money(total)}. {o.totalPaid > 0 ? `${money(o.totalPaid)} advance katega, ` : ''}{o.balanceAmount > 0 ? `${money(o.balanceAmount)} ${o.customerName} ke khate me udhaar.` : 'poora paisa mil chuka.'}</p>} />
      )}
      {panel === 'cancel' && <CancelModal o={o} busy={status.isPending} money={money} onClose={() => setPanel(null)} onConfirm={(reason) => status.mutate({ status: 'CANCELLED', cancellationReason: reason })} />}
    </PageShell>
  );
}

function ApproveModal({ o, money, onClose, onDone }: { o: FurnitureCustomOrder; money: (n: number) => string; onClose: () => void; onDone: () => void }) {
  const [price, setPrice] = useState(String(o.quotedPrice));
  const n = Number(price) || 0;
  const save = useMutation({ mutationFn: () => customOrdersApi.approve(o.id, n), onSuccess: onDone, onError: (e) => toast.error(errorText(e, 'Nahi hua')) });
  return (
    <ConfirmModal title="Qeemat pakki karein" cta="Pakki karein" busy={save.isPending} onClose={onClose} onConfirm={() => { if (!(n > 0)) { toast.error('Qeemat likhein'); return; } save.mutate(); }}
      text={<div className="space-y-3"><p>Customer ne qeemat maan li. Is ke baad qeemat nahi badlegi.</p><Input label="Final qeemat (Rs)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} hint={`Quotation ${money(o.quotedPrice)}`} /></div>} />
  );
}

function KarigarModal({ o, onClose, onDone }: { o: FurnitureCustomOrder; onClose: () => void; onDone: () => void }) {
  const listQ = useQuery({ queryKey: [FURNITURE_KEYS.carpenters, 'active'], queryFn: () => carpentersApi.list({ active: true }), staleTime: 60_000 });
  const [cid, setCid] = useState(o.carpenterId ?? '');
  const [shop, setShop] = useState(o.workshopLocation ?? '');
  const save = useMutation({ mutationFn: () => customOrdersApi.assignCarpenter(o.id, cid, shop.trim() || undefined), onSuccess: onDone, onError: (e) => toast.error(errorText(e, 'Nahi hua')) });
  return (
    <Modal open onClose={onClose} size="sm" title="Karigar dein" description={o.productType}
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={save.isPending} disabled={!cid} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="space-y-3">
        <Select label="Karigar" value={cid} onChange={(e) => setCid(e.target.value)} placeholder={listQ.isLoading ? 'Load ho raha…' : 'Chunein'}
          options={(listQ.data ?? []).map((c) => ({ value: c.id, label: `${c.name}${c.activeProjects ? ` — ${c.activeProjects} kaam` : ''}` }))}
          hint={!listQ.isLoading && !listQ.data?.length ? 'Pehle Karigar page par karigar daalein' : 'Kam kaam wala jaldi bana dega'} />
        <Input label="Workshop" value={shop} onChange={(e) => setShop(e.target.value)} hint="Marzi hai" />
      </div>
    </Modal>
  );
}

function ProgressModal({ o, onClose, onDone }: { o: FurnitureCustomOrder; onClose: () => void; onDone: (pct: number) => void }) {
  const [pct, setPct] = useState(Math.min(o.progressPct + 25, 100));
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const save = useMutation({ mutationFn: () => customOrdersApi.updateProgress(o.id, { progressPct: pct, updateNote: note.trim() || undefined, progressPhotos: photos }), onSuccess: () => onDone(pct), onError: (e) => toast.error(errorText(e, 'Nahi hua')) });
  return (
    <Modal open onClose={onClose} size="md" title="Kaam kitna hua" description={`${o.productType} · abhi ${o.progressPct}%`}
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={save.isPending} onClick={() => save.mutate()}>{pct >= 100 ? 'Tayyar hai' : 'Save'}</Button></>}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {[25, 50, 75, 90, 100].map((n) => <button key={n} type="button" onClick={() => setPct(n)} className={`h-9 rounded-lg px-3 text-[0.875rem] font-semibold ring-1 ${pct === n ? 'bg-brand-600 text-brand-fg ring-brand-600' : 'ring-slate-200 hover:bg-slate-50'}`}>{n}%</button>)}
        </div>
        <input type="range" min={0} max={100} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="w-full accent-brand-600" aria-label="Kaam %" />
        <Textarea label="Kya hua" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Dhancha tayyar, polish baqi" />
        <UploadDropzone purpose="product-gallery" maxFiles={4} hint="Kaam ki photo — customer ko bhej sakte hain" onUploaded={(r) => setPhotos((p) => [...p, ...r.map((x) => x.url)].slice(0, 10))} />
        {photos.length > 0 && <p className="text-[0.75rem] text-slate-500">{photos.length} photo lag gayi</p>}
      </div>
    </Modal>
  );
}

function CancelModal({ o, busy, money, onClose, onConfirm }: { o: FurnitureCustomOrder; busy: boolean; money: (n: number) => string; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <ConfirmModal title="Order cancel karein?" cta="Cancel karein" danger busy={busy} onClose={onClose}
      onConfirm={() => { if (!reason.trim()) { toast.error('Wajah likhein'); return; } onConfirm(reason.trim()); }}
      text={<div className="space-y-3">
        <p>{o.totalPaid > 0 ? `${money(o.totalPaid)} advance customer ke khate me rahega — wapas dena ho to Khata se dein.` : 'Is order par koi advance nahi.'}</p>
        <Input label="Wajah" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Customer ne mana kar diya" />
      </div>} />
  );
}
