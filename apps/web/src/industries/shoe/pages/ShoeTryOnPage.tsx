/**
 * Size requests ("farmaish"): a customer wants a size or colour the shop
 * does not have now. The number is noted; when the asked size is back in
 * this branch the row says so, the customer is told on WhatsApp, and the
 * request is closed as bought / not bought. Nothing is deleted.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Ban, BellRing, CheckCircle2, ClipboardList, GraduationCap, HandMetal, Hourglass, MessageCircle, PackageCheck, Plus, ShoppingBag, XCircle,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Textarea, ViewTabs,
  heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { ProductPick, type PickedProduct } from '@industries/garments/components/ProductPick';
import { shoeTryOnApi, type RequestView, type SizeRequest } from '../api/try-on.api';
import { COLORS, GENDERS, REQUEST_KEY, SIZE_SYSTEMS, apiError, opt } from '../components/meta';
import { EmptyBlock, Pager, StatusPill, card, useDebounced, useListKeys } from '../components/ui';

const LIMIT = 30;
const TABS: Array<{ id: RequestView; label: string; icon: typeof ClipboardList }> = [
  { id: 'open', label: 'Khuli', icon: ClipboardList },
  { id: 'waiting', label: 'Maal ka intezar', icon: Hourglass },
  { id: 'told', label: 'Bata diya', icon: BellRing },
  { id: 'bought', label: 'Khareed liya', icon: ShoppingBag },
  { id: 'closed', label: 'Nahi liya / cancel', icon: XCircle },
  { id: 'all', label: 'Sab', icon: ClipboardList },
];
const STATUS: Record<string, { label: string; tone: string }> = {
  PENDING: { label: 'Intezar', tone: 'bg-amber-50 text-amber-800' },
  SCHEDULED: { label: 'Bata diya', tone: 'bg-sky-50 text-sky-700' },
  COMPLETED: { label: 'Band', tone: 'bg-slate-100 text-slate-700' },
  CANCELLED: { label: 'Cancel', tone: 'bg-rose-50 text-rose-700' },
};
const KEYS = [REQUEST_KEY, 'shoe-try-on-summary', 'shoe-dashboard-overview'];

const waPhone = (p: string) => { const d = p.replace(/\D/g, ''); return d.startsWith('0') ? `92${d.slice(1)}` : d; };
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : '—');
const avail = (r: SizeRequest) => r.available.map((a) => [a.size, a.color].filter(Boolean).join(' ') || 'Stock').join(', ');

function NewRequestModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [pick, setPick] = useState<PickedProduct | null>(null);
  const [f, setF] = useState({ customerName: '', customerPhone: '', productName: '', colorPreference: '', gender: '', notes: '', other: '' });
  const [sizes, setSizes] = useState<string[]>([]);
  const [system, setSystem] = useState<string>('UK');
  const [tried, setTried] = useState(false);
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (f.customerName.trim().length < 2) e.customerName = 'Customer ka naam likhein';
    if (!/^[0-9+\-\s]{7,16}$/.test(f.customerPhone.trim())) e.customerPhone = 'Phone number sahi likhein (03001234567)';
    if (!pick && f.productName.trim().length < 2) e.productName = 'Joota chunein ya article / naam likhein';
    return e;
  }, [f, pick]);
  const save = useMutation({
    mutationFn: () => shoeTryOnApi.create({
      customerName: f.customerName.trim(), customerPhone: f.customerPhone.trim(), productId: pick?.productId,
      productName: pick ? pick.name : f.productName.trim(),
      requestedSizes: [...sizes, ...f.other.split(',').map((s) => s.trim()).filter(Boolean)],
      colorPreference: opt(f.colorPreference), gender: f.gender || undefined, notes: opt(f.notes),
    }),
    onSuccess: (r) => { toast.success(`Farmaish ${r.requestNumber} likh li`); KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); onClose(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const submit = () => {
    setTried(true);
    const first = Object.values(errors)[0];
    if (first) { toast.error(first); return; }
    save.mutate();
  };
  const err = (k: string) => (tried ? errors[k] : undefined);
  const set = SIZE_SYSTEMS.find((s) => s.value === system) ?? SIZE_SYSTEMS[0];
  const toggle = (s: string) => {
    const label = system === 'UK' ? s : `${system} ${s}`;
    setSizes((xs) => (xs.includes(label) ? xs.filter((x) => x !== label) : [...xs, label]));
  };

  return (
    <Modal open onClose={onClose} size="lg" title="Nayi farmaish" description="Jo size ya rang abhi nahi — maal aane par customer ko batayein"
      footer={<div className="flex w-full gap-2"><Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button><Button className="flex-1" loading={save.isPending} onClick={submit}>Likh lein</Button></div>}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label="Customer" required value={f.customerName} error={err('customerName')} maxLength={80} placeholder="Sana" onChange={(e) => setF({ ...f, customerName: e.target.value })} />
        <Input label="Phone" required inputMode="tel" value={f.customerPhone} error={err('customerPhone')} placeholder="03001234567" onChange={(e) => setF({ ...f, customerPhone: e.target.value })} hint="Maal aane par WhatsApp" />
        <div className="sm:col-span-2">
          <ProductPick value={pick} onChange={setPick} label="Joota (catalog se)" hint="Chunein to stock aate hi yahan dikhega — warna neeche naam likhein" />
        </div>
        {!pick && <Input wrapperClassName="sm:col-span-2" label="Ya article / naam" value={f.productName} error={err('productName')} maxLength={120} placeholder="Bata loafer brown 8231" onChange={(e) => setF({ ...f, productName: e.target.value })} />}
        <div className="sm:col-span-2">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[0.8125rem] font-medium text-slate-700">Size</span>
            <div className="flex gap-1">{SIZE_SYSTEMS.map((s) => (
              <button key={s.value} type="button" onClick={() => setSystem(s.value)} className={cn('rounded-lg px-2 py-0.5 text-[0.75rem] font-semibold', system === s.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600')}>{s.label}</button>
            ))}</div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {set.sizes.map((s) => {
              const label = system === 'UK' ? s : `${system} ${s}`;
              return <button key={s} type="button" onClick={() => toggle(s)} className={cn('h-9 min-w-[2.5rem] rounded-xl px-2 text-[0.875rem] font-semibold ring-1', sizes.includes(label) ? 'bg-brand-600 text-brand-fg ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:ring-brand-300')}>{s}</button>;
            })}
          </div>
          <Input wrapperClassName="mt-2" label="Doosra size" value={f.other} placeholder="6.5, 44" onChange={(e) => setF({ ...f, other: e.target.value })} hint={sizes.length ? `Chune: ${sizes.join(', ')}` : 'Comma se kai size'} />
        </div>
        <Select label="Rang" value={f.colorPreference} onChange={(e) => setF({ ...f, colorPreference: e.target.value })} options={[{ value: '', label: 'Koi bhi' }, ...COLORS.map(([c]) => ({ value: c, label: c }))]} />
        <Select label="Kis ke liye" value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })} options={[{ value: '', label: '—' }, ...GENDERS.map((g) => ({ value: g.value, label: g.label }))]} />
        <Textarea wrapperClassName="sm:col-span-2" label="Note" rows={2} value={f.notes} maxLength={500} placeholder="Eid se pehle chahiye" onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </form>
    </Modal>
  );
}

export default function ShoeTryOnPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canUse = usePermission(PERMISSIONS.POS_USE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<RequestView>('open');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [closing, setClosing] = useState<SizeRequest | null>(null);
  const [boughtSize, setBoughtSize] = useState('');
  const term = useDebounced(search.trim());

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [REQUEST_KEY, 'page', tab, term, page],
    queryFn: () => shoeTryOnApi.page({ view: tab, search: term || undefined, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
    refetchInterval: 120_000,
  });
  const c = data?.counts;
  const go = (t: RequestView) => { setTab(t); setPage(1); };
  const add = useCallback(() => { if (canUse) setAdding(true); }, [canUse]);
  useListKeys(searchRef, add);

  const refresh = (msg: string) => { toast.success(msg); setClosing(null); KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); };
  const fail = (e: unknown) => toast.error(apiError(e));
  const told = useMutation({ mutationFn: (id: string) => shoeTryOnApi.notified(id), onSuccess: () => refresh('Bata diya — customer ka intezar'), onError: fail });
  const finish = useMutation({ mutationFn: (v: { id: string; purchased: boolean; size?: string }) => shoeTryOnApi.complete(v.id, { purchased: v.purchased, purchasedSize: v.size }), onSuccess: () => refresh('Farmaish band'), onError: fail });
  const cancel = useMutation({ mutationFn: (id: string) => shoeTryOnApi.cancel(id), onSuccess: () => refresh('Farmaish cancel'), onError: fail });

  const items = data?.items ?? [];
  const ready = items.filter((r) => r.available.length > 0).length;
  const message = (r: SizeRequest) => `https://wa.me/${waPhone(r.customerPhone)}?text=${encodeURIComponent(
    `Assalam o alaikum ${r.customerName}, aap ne ${r.productName}${r.requestedSizes.length ? ` size ${r.requestedSizes.join(', ')}` : ''} ka poocha tha — ab dukaan par aa gaya hai. Aa kar le jayein.`,
  )}`;

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Size farmaish — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: HandMetal, color: '#2563eb', title: 'Likh lein', text: 'Customer ka size ya rang nahi mila? Naam, phone aur size likh lein. Catalog se joota chunein to stock khud check hota hai.' },
            { icon: PackageCheck, color: '#16a34a', title: 'Maal aa gaya', text: 'Purchase se size aate hi row par "Stock aa gaya" dikhta hai.' },
            { icon: MessageCircle, color: '#0ea5e9', title: 'Batayein', text: 'WhatsApp se message bhejein aur "Bata diya" dabayein.' },
            { icon: ShoppingBag, color: '#7c3aed', title: 'Band karein', text: 'Customer le gaya to "Le gaya", warna "Nahi liya". Bill counter (POS) par hi banta hai.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'nayi farmaish'], ['G', 'guide']]} />
      )}

      <PageHero title="Size farmaish" chip={<><HandMetal />{c ? `${c.open} khuli` : '…'}</>} busy={isFetching && !isLoading} loading={isLoading || !c}
        meta="Jo size / rang abhi nahi — number likhein, maal aane par batayein"
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canUse && <button type="button" onClick={add} className={heroPrimaryButton}><Plus className="h-4 w-4" />Nayi farmaish</button>}
        </>}
        stats={[
          { label: 'Khuli farmaish', value: String(c?.open ?? 0) },
          { label: 'Is safhe par stock aa gaya', value: String(ready) },
          { label: 'Khareed liya', value: String(c?.bought ?? 0) },
        ]} />

      <KpiRow cols={4}>
        {!c ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Hourglass} color="#d97706" label="Maal ka intezar" value={c.waiting} onClick={() => go('waiting')} active={tab === 'waiting'} />
            <KpiCard icon={BellRing} color="#0284c7" label="Bata diya" value={c.told} hint="Customer ke aane ka intezar" onClick={() => go('told')} active={tab === 'told'} />
            <KpiCard icon={ShoppingBag} color="#16a34a" label="Khareed liya" value={c.bought} onClick={() => go('bought')} active={tab === 'bought'} />
            <KpiCard icon={XCircle} color="#64748b" label="Nahi liya / cancel" value={c.closed} onClick={() => go('closed')} active={tab === 'closed'} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Number, customer, phone ya joota…" />}
        chips={search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined}
        onClear={() => setSearch('')} />

      <ViewTabs value={tab} onChange={go} tabs={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon, count: c ? c[t.id] : null }))} />

      <section className={card}>
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <EmptyBlock icon={HandMetal} title={search || tab !== 'open' ? 'Is filter me kuch nahi' : 'Koi khuli farmaish nahi'}
            text="Customer ko size na mile to uska number likh lein — maal aate hi bata sakenge."
            action={canUse ? <button type="button" onClick={add} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-brand-fg"><Plus className="h-4 w-4" />Nayi farmaish</button> : undefined} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((r) => {
              const open = r.status === 'PENDING' || r.status === 'SCHEDULED';
              const st = r.status === 'COMPLETED' ? { label: r.purchased ? `Le gaya${r.purchasedSize ? ` · ${r.purchasedSize}` : ''}` : 'Nahi liya', tone: r.purchased ? 'bg-success-50 text-success-700' : 'bg-slate-100 text-slate-700' } : STATUS[r.status];
              return (
                <li key={r.id} className="grid gap-2 px-4 py-3 sm:px-5 lg:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1.4fr)_auto] lg:items-center">
                  <div>
                    <p className="font-mono text-[0.8125rem] font-semibold text-slate-900">{r.requestNumber}</p>
                    <p className="text-[0.75rem] text-slate-500">{day(r.createdAt)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{r.customerName}</p>
                    <p className="truncate text-[0.75rem] text-slate-500">{r.customerPhone}</p>
                  </div>
                  <div className="min-w-0 text-[0.8125rem]">
                    <p className="truncate font-medium text-slate-800">{r.productName}</p>
                    <p className="truncate text-slate-500">{[r.requestedSizes.length ? `Size ${r.requestedSizes.join(', ')}` : null, r.colorPreference].filter(Boolean).join(' · ') || 'Koi bhi size'}{r.notes ? ` · ${r.notes}` : ''}</p>
                    {open && r.available.length > 0 && <p className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-success-50 px-1.5 py-0.5 text-[0.75rem] font-semibold text-success-700"><PackageCheck className="h-3.5 w-3.5" />Stock aa gaya: {avail(r)}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                    <StatusPill tone={st.tone}>{st.label}</StatusPill>
                    {open && canUse && (
                      <>
                        <a href={message(r)} target="_blank" rel="noreferrer" title="WhatsApp" className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.75rem] font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>
                        {r.status === 'PENDING' && <Button size="sm" variant="secondary" leftIcon={<BellRing className="h-3.5 w-3.5" />} onClick={() => told.mutate(r.id)}>Bata diya</Button>}
                        <Button size="sm" variant="secondary" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => { setClosing(r); setBoughtSize(r.available[0]?.size ?? r.requestedSizes[0] ?? ''); }}>Band</Button>
                        <Button size="sm" variant="ghost" leftIcon={<Ban className="h-3.5 w-3.5" />} onClick={() => cancel.mutate(r.id)}>Cancel</Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {data && <Pager page={page} limit={LIMIT} total={data.total} onPage={setPage} />}
      </section>

      {adding && <NewRequestModal onClose={() => setAdding(false)} />}
      {closing && (
        <Modal open onClose={() => setClosing(null)} size="sm" title={`${closing.requestNumber} band karein`} description={`${closing.customerName} · ${closing.productName}`}
          footer={<div className="flex w-full gap-2">
            <Button variant="secondary" className="flex-1" loading={finish.isPending} onClick={() => finish.mutate({ id: closing.id, purchased: false })}>Nahi liya</Button>
            <Button className="flex-1" loading={finish.isPending} onClick={() => finish.mutate({ id: closing.id, purchased: true, size: opt(boughtSize) })}>Le gaya</Button>
          </div>}>
          <Input label="Kaunsa size liya" value={boughtSize} maxLength={20} onChange={(e) => setBoughtSize(e.target.value)} hint="Bill counter (POS) par banayein — yahan sirf farmaish band hoti hai" />
        </Modal>
      )}
    </PageShell>
  );
}
