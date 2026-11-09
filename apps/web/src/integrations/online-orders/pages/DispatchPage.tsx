/**
 * Dispatch & airway bills (/online-orders/dispatch): accepted orders waiting
 * for a courier, bulk booking with rate compare, labels (4x6 / A4), cancel
 * booking, the day's loadsheets and the COD (CPR) audit. Settings: where a
 * booked order moves, label size and the return address on labels.
 *
 * Keys: 1–3 tabs · G guide.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3, ClipboardList, GraduationCap, Mailbox, PackageCheck, Printer, ScanLine, Settings2, Tag, Truck, Wallet, XCircle,
} from 'lucide-react';
import { Button, Checkbox, EmptyState, Input, Modal, PageHero, PageShell, Select, Skeleton, Tabs, heroButton, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { apiErrorMessage, onlineOrdersApi, type OnlineOrder } from '../api/online-orders.api';
import { dispatchApi, type AfterBook, type DispatchSettings } from '../api/dispatch.api';
import { courierBrand, rs, timeAgo } from '../lib/labels';
import { boardEntry, orderNo } from '../lib/orders';
import { BookCourierDialog } from '../components/dispatch/BookCourierDialog';
import { CancelBookingDialog } from '../components/dispatch/DispatchDialogs';
import { LoadsheetPanel } from '../components/dispatch/LoadsheetPanel';
import { CodAuditPanel } from '../components/dispatch/CodAuditPanel';
import { useBoardRefresh } from '../components/orders/useMoveOrder';
import { t } from '@core/i18n';

type Tab = 'ready' | 'loadsheet' | 'audit';

/** Labels for these orders in a new tab. */
export const openLabels = (ids: string[], size?: '4x6' | 'A4') =>
  window.open(`/online-orders/labels?ids=${ids.join(',')}${size ? `&size=${size}` : ''}`, '_blank');

export default function DispatchPage() {
  const guide = usePageGuide();
  const [tab, setTab] = useState<Tab>('ready');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const ready = useQuery(READY_QUERY);
  const readyList = ready.data ?? [];
  const toBook = readyList.filter((o) => !o.trackingNumber);
  const bookedNotSent = readyList.length - toBook.length;
  const codToSend = readyList.reduce((sum, o) => sum + (o.isCod ? Number(o.total) || 0 : 0), 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = (['ready', 'loadsheet', 'audit'] as Tab[])[Number(e.key) - 1];
      if (k) setTab(k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <PageShell>
      <PageHero title={t('Dispatch & airway bills')} chip={<><Truck />{t('Booking, label, loadsheet')}</>}
        meta={t('Orders courier par book karein, label print karein, rider ko loadsheet ke saath dein')}
        actions={<>
          <Link to="/online-orders/dispatch-scan" className={heroButton}><ScanLine className="h-4 w-4" /> {t('Dispatch scan')}</Link>
          <Link to="/online-orders/dispatch-report" className={heroButton}><BarChart3 className="h-4 w-4" /> <span className="hidden sm:inline">{t('Report')}</span></Link>
          <Link to="/online-orders/post-office" title={t('Post office')} className={heroIconButton}><Mailbox className="h-4 w-4" /></Link>
          <button type="button" onClick={() => setSettingsOpen(true)} title={t('Settings')} className={heroIconButton}><Settings2 className="h-4 w-4" /></button>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        busy={ready.isFetching && !ready.isLoading} loading={ready.isLoading}
        stats={[
          { label: t('Book karne hain'), value: String(toBook.length) },
          { label: t('Booked, gaye nahi'), value: String(bookedNotSent) },
          { label: t('COD jana hai'), value: rs(codToSend), hint: t('{{count}} parcels', { count: readyList.length }) },
        ]} />
      <div className="rounded-3xl bg-white px-4 pt-2 shadow-sm ring-1 ring-slate-200/80 sm:px-5">
        <Tabs value={tab} onChange={setTab} label={t('Dispatch')}
          items={[
            { value: 'ready', label: <span className="inline-flex items-center gap-1.5"><PackageCheck className="h-4 w-4" />{t('Book karein')}</span> },
            { value: 'loadsheet', label: <span className="inline-flex items-center gap-1.5"><ClipboardList className="h-4 w-4" />{t('Loadsheet')}</span> },
            { value: 'audit', label: <span className="inline-flex items-center gap-1.5"><Wallet className="h-4 w-4" />{t('COD audit')}</span> },
          ]} />
      </div>
      {tab === 'ready' && <ReadyPanel />}
      {tab === 'loadsheet' && <LoadsheetPanel />}
      {tab === 'audit' && <CodAuditPanel />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {guide.isOpen && (
        <PageGuide title={t('Dispatch — aasaan tareeqa')} onClose={guide.close}
          flowTitle={t('Order se rider tak')}
          flow={[
            { label: t('Accept + pack'), hint: t('Board / packing scan'), icon: PackageCheck, color: '#7c3aed' },
            { label: t('Book courier'), hint: t('Sasta + kam RTO'), icon: Truck, color: '#0891b2' },
            { label: t('Label'), hint: t('4x6 ya A4'), icon: Tag, color: '#d97706' },
            { label: t('Loadsheet'), hint: t('Rider ka dastkhat'), icon: ClipboardList, color: '#16a34a' },
            { label: t('Dispatch scan'), hint: 'DISPATCHED', icon: ScanLine, color: '#dc2626' },
          ]}
          steps={[
            { icon: Truck, color: '#0891b2', title: t('Book courier'), text: t('Orders chunein aur "Book courier" dabayein. Har courier ki qeemat (rate card) aur aap ke shehron me RTO dikhta hai — sab se achha pehle se chuna hota hai.') },
            { icon: Printer, color: '#d97706', title: t('Label'), text: t('Thermal printer par 4x6 label ya A4 par 3 label ek safhe par. CN ka barcode, COD aur customer ka address hota hai.') },
            { icon: ClipboardList, color: '#16a34a', title: t('Loadsheet'), text: t('Din ke parcels courier-wise. Print karke rider se dastkhat lein. Leopards aur PostEx ko seedha bhi bhej sakte hain.') },
            { icon: Wallet, color: '#7c3aed', title: t('COD audit'), text: t('Courier ne kam paisa diya ya rate card se zyada kaata? Statement upload karne ke baad yahan dikhta hai.') },
          ]}
          tips={[t('Settings me chunein ke book hone ke baad order PACKED ho ya DISPATCHED.'), t('Galat booking? Order chun kar "Booking cancel" — courier API se ya sirf Nafaa se.')]}
          shortcuts={[['1–3', t('tabs')], ['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}

/** Accepted orders not yet sent; shared by the hero numbers and the booking list. */
const READY_QUERY = {
  queryKey: ['online-orders', 'dispatch-ready'],
  queryFn: async () => {
    const lists = await Promise.all(['CONFIRMED', 'PACKED', 'PACKED_NOT_SENT'].map((board) => onlineOrdersApi.list({ board, limit: 200 })));
    return lists.flatMap((l) => l.items);
  },
};

/** Accepted orders not yet sent: pick, book, print labels, cancel bookings. */
function ReadyPanel() {
  const refresh = useBoardRefresh();
  const qc = useQueryClient();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [booking, setBooking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [filter, setFilter] = useState<'todo' | 'booked'>('todo');
  const { data, isLoading, error } = useQuery(READY_QUERY);
  const all = data ?? [];
  const isBooked = (o: OnlineOrder) => !!o.trackingNumber;
  const rows = all.filter((o) => (filter === 'todo' ? !isBooked(o) : isBooked(o)));
  const sel = all.filter((o) => picked.has(o.id));
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allPicked = rows.length > 0 && rows.every((o) => picked.has(o.id));
  const done = (failed: string[]) => { setPicked(new Set(failed)); refresh(); qc.invalidateQueries({ queryKey: ['dispatch-loadsheet'] }); };

  return (
    <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
        {(['todo', 'booked'] as const).map((k) => (
          <button key={k} type="button" onClick={() => { setFilter(k); setPicked(new Set()); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${filter === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {k === 'todo' ? t('Book karna baqi ({{count}})', { count: all.filter((o) => !isBooked(o)).length }) : t('Book ho gaye, bheje nahi ({{count}})', { count: all.filter(isBooked).length })}
          </button>
        ))}
        <span className="flex-1" />
        {sel.length > 0 && <span className="text-xs font-semibold text-slate-600">{t('{{count}} chune', { count: sel.length })}</span>}
        {filter === 'todo' && <Button size="sm" disabled={!sel.length} leftIcon={<Truck className="h-4 w-4" />} onClick={() => setBooking(true)}>{t('Book courier')}</Button>}
        <Button size="sm" variant="secondary" disabled={!sel.length} leftIcon={<Printer className="h-4 w-4" />} onClick={() => openLabels(sel.map((o) => o.id))}>{t('Labels')}</Button>
        {filter === 'booked' && <Button size="sm" variant="secondary" disabled={!sel.length} leftIcon={<XCircle className="h-4 w-4" />} onClick={() => setCancelling(true)}>{t('Booking cancel')}</Button>}
      </div>
      {isLoading ? <Skeleton className="m-4 h-40 rounded-2xl" /> : error ? <p className="p-4 text-sm text-rose-700">{apiErrorMessage(error)}</p> : !rows.length ? (
        <EmptyState icon={<PackageCheck className="h-6 w-6" />} title={filter === 'todo' ? t('Book karne ko kuch nahi') : t('Koi booked parcel baqi nahi')}
          description={t('Accept hue orders yahan aate hain. Naye orders board par accept karein.')} action={<Link to="/online-orders" className="text-sm font-semibold text-brand-700 hover:underline">{t('Orders board')}</Link>} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[0.8125rem]">
            <thead><tr className="text-[0.6875rem] uppercase tracking-wide text-slate-500">
              <th className="w-10 px-4 py-2"><Checkbox checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map((o) => o.id)))} aria-label={t('Sab chunein')} /></th>
              <th className="px-2 py-2 text-start">{t('Order')}</th><th className="px-2 py-2 text-start">{t('Customer')}</th><th className="px-2 py-2 text-start">{t('Shehar')}</th>
              <th className="px-2 py-2 text-end">COD</th><th className="px-2 py-2 text-start">{t('Courier')}</th><th className="px-4 py-2 text-start">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((o) => (
                <tr key={o.id} className={picked.has(o.id) ? 'bg-brand-50/40' : undefined}>
                  <td className="px-4 py-2"><Checkbox checked={picked.has(o.id)} onChange={() => toggle(o.id)} aria-label={`#${orderNo(o)}`} /></td>
                  <td className="px-2 py-2"><div className="font-semibold text-slate-900">#{orderNo(o)}</div><div className="text-[0.6875rem] text-slate-500">{timeAgo(o.acceptedAt ?? o.receivedAt)}</div></td>
                  <td className="px-2 py-2">{o.customerName}<div className="text-[0.6875rem] text-slate-500">{o.customerPhone}</div></td>
                  <td className="px-2 py-2">{o.customerCity ?? '—'}</td>
                  <td className="px-2 py-2 text-end tabular-nums">{o.money ? rs(o.money.codDue) : o.isCod ? rs(o.total) : t('Paid')}</td>
                  <td className="px-2 py-2">{o.trackingNumber
                    ? <span className="inline-flex items-center gap-1.5">{o.courierCode && <BrandLogo name={courierBrand(o.courierCode)} size={16} />}<span className="font-mono">{o.trackingNumber}</span></span>
                    : o.autoBookError ? <span className="text-amber-700">{o.autoBookError}</span> : <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-2">{boardEntry(o.board ?? '')?.short ?? o.board ?? o.orderStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {booking && <BookCourierDialog orders={sel} onClose={() => setBooking(false)} onDone={done} />}
      {cancelling && <CancelBookingDialog orders={sel} onClose={() => setCancelling(false)} onDone={done} />}
    </section>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['dispatch-settings'], queryFn: dispatchApi.settings });
  const [form, setForm] = useState<Partial<DispatchSettings>>({});
  const v = { ...data, ...form } as DispatchSettings;
  const save = useMutation({
    mutationFn: () => dispatchApi.saveSettings({ afterBook: v.afterBook, labelSize: v.labelSize, returnName: v.returnName, returnPhone: v.returnPhone, returnAddress: v.returnAddress }),
    onSuccess: (s) => { qc.setQueryData(['dispatch-settings'], s); toast.success(t('Settings save ho gayi')); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const set = (k: keyof DispatchSettings) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <Modal open onClose={onClose} size="md" title={t('Dispatch settings')}
      footer={<div className="flex w-full justify-end gap-2"><Button variant="ghost" onClick={onClose}>{t('Rehne dein')}</Button><Button loading={save.isPending} disabled={!data} onClick={() => save.mutate()}>{t('Save')}</Button></div>}>
      {!data ? <Skeleton className="h-40" /> : (
        <div className="space-y-3">
          <Select label={t('Courier book hone ke baad order')} value={v.afterBook} onChange={(e) => setForm((f) => ({ ...f, afterBook: e.target.value as AfterBook }))}
            options={[{ value: 'NONE', label: t('Status wahi rahe') }, { value: 'PACKED', label: 'PACKED' }, { value: 'DISPATCHED', label: 'DISPATCHED' }]} />
          <Select label={t('Label ka kaghaz')} value={v.labelSize} onChange={(e) => setForm((f) => ({ ...f, labelSize: e.target.value as '4x6' | 'A4' }))}
            options={[{ value: '4x6', label: t('4x6 thermal') }, { value: 'A4', label: t('A4 (3 ek safhe par)') }]} />
          <p className="pt-1 text-[0.8125rem] font-semibold text-slate-700">{t('Label par wapsi ka pata (khali = dukaan ka)')}</p>
          <Input label={t('Naam')} value={v.returnName} onChange={set('returnName')} placeholder={data.shop.name} />
          <Input label={t('Phone')} value={v.returnPhone} onChange={set('returnPhone')} placeholder={data.shop.phone} />
          <Input label={t('Address')} value={v.returnAddress} onChange={set('returnAddress')} placeholder={data.shop.address} />
        </div>
      )}
    </Modal>
  );
}
