/**
 * Returns & exchanges: what customers asked for on their order page (return,
 * exchange, cancel, address change, same order again). Approving runs the
 * normal path: cancel, order edit, a replacement or new order. A return is
 * approved with its pickup; stock comes back only at the return scan.
 *
 * Keys: / search, G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CheckCircle2, GraduationCap, Inbox, Layers, MapPin, MessageCircle, PackageX, Receipt, Repeat, RotateCcw, ScanLine, XCircle,
} from 'lucide-react';
import {
  Button, EmptyState, FilterBar, FilterMenu, Input, Modal, PageHero, PageShell, SearchField, Skeleton, Textarea, ViewTabs, heroButton, heroIconButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../api/online-orders.api';
import { portalAdmin, type QueueItem, type RequestType } from './api';
import { usePortalLink } from './usePortalLink';

type Tab = 'open' | 'DONE' | 'REJECTED' | 'all';
type Act = { kind: 'approve' | 'reject' | 'refund' | 'done'; r: QueueItem } | null;

const TYPE: Record<RequestType, { label: string; color: string; icon: typeof RotateCcw }> = {
  RETURN: { label: t('Return'), color: '#e11d48', icon: RotateCcw },
  EXCHANGE: { label: t('Exchange'), color: '#7c3aed', icon: Repeat },
  CANCEL: { label: t('Cancel'), color: '#64748b', icon: XCircle },
  ADDRESS: { label: t('Address badlein'), color: '#0284c7', icon: MapPin },
  REORDER: { label: t('Dobara order'), color: '#16a34a', icon: Repeat },
};
const STATUS: Record<string, { label: string; cls: string }> = {
  REQUESTED: { label: t('Naya'), cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  APPROVED: { label: t('Manzoor — parcel ka intezar'), cls: 'bg-sky-50 text-sky-800 ring-sky-200' },
  DONE: { label: t('Mukammal'), cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  REJECTED: { label: t('Mana'), cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  WITHDRAWN: { label: t('Customer ne wapas li'), cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
};
const rs = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;
const ago = (iso: string) => new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function ReturnRequestsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canManage = usePermission(PERMISSIONS.ONLINE_ORDERS_MANAGE);
  const canRefund = usePermission(PERMISSIONS.RETURNS_CREATE);
  const sendLink = usePortalLink();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('open');
  const [type, setType] = useState<'all' | RequestType>('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [act, setAct] = useState<Act>(null);

  useEffect(() => { const id = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(id); }, [search]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (!isTyping() && !isDialogOpen() && e.key === '/') { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const params = { status: tab === 'open' ? undefined : tab, type: type === 'all' ? undefined : type, search: query || undefined };
  const q = useQuery({ queryKey: ['portal-requests', params], queryFn: () => portalAdmin.requests(params), placeholderData: (p) => p });
  const s = q.data?.summary;
  const items = q.data?.items ?? [];

  return (
    <PageShell>
      <PageHero
        title={t('Returns & exchanges')}
        chip={<><Inbox />{t('Customer ki requests')}</>}
        meta={t('Customer apne order page se wapsi, exchange, cancel ya address ki request bhejta hai')}
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <Link to="/online-orders/returns-scan" className={heroButton}><ScanLine className="h-4 w-4" /> <span className="hidden sm:inline">{t('Return scan')}</span></Link>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: t('Naye'), value: s ? String(s.requested) : '' },
          { label: t('Parcel ka intezar'), value: s ? String(s.approved) : '' },
          { label: t('Return + exchange'), value: s ? String(s.returns + s.exchanges) : '' },
          { label: t('Mukammal'), value: s ? String(s.done) : '' },
        ]}
      />

      <ViewTabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'open', label: t('Khuli'), count: s?.open ?? null },
        { id: 'DONE', label: t('Mukammal'), count: s?.done ?? null },
        { id: 'REJECTED', label: t('Mana'), count: s?.rejected ?? null },
        { id: 'all', label: t('Sab') },
      ]} />

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={t('Order #, naam ya phone ( / )')} />}>
        <FilterMenu icon={Layers} label={t('Qism')} value={type} onChange={setType} active={type !== 'all'} options={[
          { value: 'all', label: t('Sab') }, ...(Object.keys(TYPE) as RequestType[]).map((k) => ({ value: k, label: TYPE[k].label })),
        ]} />
      </FilterBar>

      {q.isError ? (
        <EmptyState title={t('Requests nahi khulin')} description={apiErrorMessage(q.error)} action={<Button variant="secondary" onClick={() => q.refetch()}>{t('Dobara koshish')}</Button>} />
      ) : q.isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}</div>
      ) : !items.length ? (
        <EmptyState icon={<Inbox className="h-5 w-5" />} title={t('Koi request nahi')} description={t('Order ke WhatsApp menu se customer ko "Customer page" ka link bhejein — wahan se woh request bhej sakta hai.')} />
      ) : (
        <ul className="space-y-3">
          {items.map((r) => {
            const ty = TYPE[r.type];
            return (
              <li key={r.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${ty.color}17`, color: ty.color }}><ty.icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                      {ty.label}
                      {r.order && <Link to={`/online-orders?order=${r.order.id}`} className="text-brand-700 hover:underline">#{r.order.no}</Link>}
                      <span className={cn('rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ring-1', STATUS[r.status]?.cls)}>{STATUS[r.status]?.label ?? r.status}</span>
                    </p>
                    <p className="text-[0.8125rem] text-slate-500">{r.order?.customerName} · {r.order?.customerPhone} · {r.order?.customerCity} · {ago(r.createdAt)}</p>
                  </div>
                  {r.order && <span className="text-sm font-semibold tabular-nums text-slate-900">{rs(r.order.total)}</span>}
                </div>
                <div className="mt-3 space-y-1 text-[0.8125rem] text-slate-700">
                  {r.reason && <p><span className="font-semibold">{t('Wajah')}:</span> {r.reason}</p>}
                  {r.note && <p><span className="font-semibold">{t('Note')}:</span> {r.note}</p>}
                  {!!r.lines.length && <p><span className="font-semibold">{t('Cheezein')}:</span> {r.lines.map((l) => `${l.name}${l.variant ? ` (${l.variant})` : ''} ×${l.qty}`).join(', ')}</p>}
                  {r.pickup && <p><span className="font-semibold">{t('Wapsi')}:</span> {r.pickup.mode === 'DROP_OFF' ? t('Customer khud dega') : [t('Ghar se uthana'), r.pickup.address, r.pickup.city, r.pickup.slot].filter(Boolean).join(' · ')}</p>}
                  {r.address && <p><span className="font-semibold">{t('Naya address')}:</span> {[r.address.name, r.address.phone, r.address.address, r.address.city].filter(Boolean).join(' · ')}</p>}
                  {r.pickupTracking && <p><span className="font-semibold">{t('Pickup')}:</span> {r.pickupCourier} {r.pickupTracking}</p>}
                  {r.decisionNote && <p><span className="font-semibold">{t('Faisla')}:</span> {r.decisionNote}</p>}
                  {r.refundNote && <p><span className="font-semibold">{t('Refund')}:</span> {r.refundNote}{r.refundAmount != null ? ` · ${rs(r.refundAmount)}` : ''}</p>}
                  {r.resultOrderId && <p><Link to={`/online-orders?order=${r.resultOrderId}`} className="font-semibold text-brand-700 hover:underline">{t('Naya order dekhein')}</Link></p>}
                </div>
                {!!r.photos?.length && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.photos.map((p) => <a key={p} href={p} target="_blank" rel="noreferrer"><img src={p} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200" /></a>)}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {canManage && r.status === 'REQUESTED' && <>
                    <Button size="sm" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => setAct({ kind: 'approve', r })}>{t('Approve')}</Button>
                    <Button size="sm" variant="secondary" leftIcon={<XCircle className="h-3.5 w-3.5" />} onClick={() => setAct({ kind: 'reject', r })}>{t('Mana karein')}</Button>
                  </>}
                  {canManage && r.status === 'APPROVED' && <Button size="sm" leftIcon={<PackageX className="h-3.5 w-3.5" />} onClick={() => setAct({ kind: 'done', r })}>{t('Parcel mil gaya — mukammal')}</Button>}
                  {canRefund && ['RETURN', 'EXCHANGE', 'CANCEL'].includes(r.type) && !['REJECTED', 'WITHDRAWN'].includes(r.status) && (
                    <Button size="sm" variant="secondary" leftIcon={<Receipt className="h-3.5 w-3.5" />} onClick={() => setAct({ kind: 'refund', r })}>{t('Refund note')}</Button>
                  )}
                  {r.order && <Button size="sm" variant="ghost" leftIcon={<MessageCircle className="h-3.5 w-3.5" />} onClick={() => sendLink(r.order!.id)}>{t('Customer ko link')}</Button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {act && <ActModal act={act} onClose={() => setAct(null)} onDone={() => { setAct(null); void qc.invalidateQueries({ queryKey: ['portal-requests'] }); }} />}

      {guide.isOpen && (
        <PageGuide
          title={t('Returns & exchanges — aasaan tareeqa')}
          description={t('Customer apne order ke link se request bhejta hai; aap yahan faisla karte hain.')}
          onClose={guide.close}
          flow={[
            { label: t('Customer link'), hint: t('WhatsApp par'), icon: MessageCircle, color: '#16a34a' },
            { label: t('Request'), hint: t('Wajah + tasveer'), icon: Inbox, color: '#d97706' },
            { label: t('Approve'), hint: t('Pickup / naya order'), icon: CheckCircle2, color: '#2563eb' },
            { label: t('Return scan'), hint: t('Stock wapas'), icon: ScanLine, color: '#7c3aed' },
          ]}
          steps={[
            { icon: RotateCcw, color: '#e11d48', title: t('Return'), text: t('Approve par courier aur CN likh dein. Parcel aaye to Return scan karein — stock sirf wahin se wapas aata hai.') },
            { icon: Repeat, color: '#7c3aed', title: t('Exchange'), text: t('Approve par wohi cheezein 0 qeemat par naye order me ban jati hain (replacement). Size/rang order me badal lein.') },
            { icon: MapPin, color: '#0284c7', title: t('Cancel / address'), text: t('Sirf courier ko dene se pehle. Approve karte hi order cancel ya address badal jata hai.') },
          ]}
        />
      )}
    </PageShell>
  );
}

function ActModal({ act, onClose, onDone }: { act: NonNullable<Act>; onClose: () => void; onDone: () => void }) {
  const { kind, r } = act;
  const [note, setNote] = useState('');
  const [courier, setCourier] = useState(r.order?.courierCode ?? '');
  const [cn_, setCn] = useState('');
  const [amount, setAmount] = useState('');
  const m = useMutation({
    mutationFn: async () => {
      if (kind === 'approve') return portalAdmin.approve(r.id, { note: note || undefined, pickupCourier: courier || undefined, pickupTracking: cn_ || undefined });
      if (kind === 'reject') return portalAdmin.reject(r.id, note);
      if (kind === 'done') return portalAdmin.done(r.id, note || undefined);
      return portalAdmin.refund(r.id, note, amount ? Number(amount) : undefined);
    },
    onSuccess: () => { toast.success(t('Ho gaya')); onDone(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const title = kind === 'approve' ? t('Approve karein') : kind === 'reject' ? t('Mana karein') : kind === 'done' ? t('Mukammal karein') : t('Refund note');
  const hint = kind !== 'approve' ? null
    : r.type === 'CANCEL' ? t('Order cancel ho jayega (bill aur stock usi tarah jaise board se cancel par).')
      : r.type === 'ADDRESS' ? t('Order par naya address/phone lag jayega.')
        : r.type === 'EXCHANGE' ? t('Wohi cheezein 0 qeemat par naye replacement order me banengi.')
          : r.type === 'REORDER' ? t('Naya order banega — board par confirm karke bhejein.')
            : t('Parcel wapas mangwayein. Stock Return scan par wapas aayega.');
  const needsNote = kind === 'reject' || kind === 'refund';

  return (
    <Modal open onClose={onClose} title={title} description={hint ?? undefined}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button><Button disabled={m.isPending || (needsNote && !note.trim())} onClick={() => m.mutate()}>{title}</Button></>}>
      <div className="space-y-3">
        {kind === 'approve' && (r.type === 'RETURN' || r.type === 'EXCHANGE') && (
          <div className="grid grid-cols-2 gap-2">
            <Input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder={t('Pickup courier')} aria-label={t('Pickup courier')} />
            <Input value={cn_} onChange={(e) => setCn(e.target.value)} placeholder={t('CN (agar hai)')} aria-label={t('CN')} />
          </div>
        )}
        {kind === 'refund' && <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder={t('Raqam (Rs)')} aria-label={t('Raqam')} />}
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
          placeholder={kind === 'reject' ? t('Customer ko wajah batayein') : kind === 'refund' ? t('Kaise refund hoga (jaise JazzCash, 2 din me)') : t('Customer ke liye note (marzi)')} aria-label={t('Note')} />
      </div>
    </Modal>
  );
}
