/**
 * Prepaid packages (5 facials, a bridal package with trials): the ones
 * sold with sessions left, money still due on khata and the usage log;
 * selling one with an advance (the rest on khata); and the package list.
 * Sessions are used on counter bills.
 *
 * Keys: N sell package · / search · 1 sold · 2 packages · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlarmClock, BookmarkPlus, Filter, Gift, GraduationCap, ListChecks, Pencil, Plus, Receipt, Scissors, Wallet } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import type { PrintDoc } from '@core/print';
import {
  Badge, Button, Checkbox, FilterBar, FilterChip, FilterMenu, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Switch,
  Textarea, ViewTabs, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { packagesApi, type Package, type PackagePurchase } from '../api/packages.api';
import { CancelModal, CustomerField, emptyCustomer, useServices, type CustomerValue } from '../components/fields';
import { EmptyList, HeroPrint, ListSkeleton, LoadFailed } from '../components/ui';
import { SALON_KEYS, apiError, dateOf } from '../lib/meta';
import { useSalonCan } from '../lib/permissions';

type Tab = 'sold' | 'packages';
type Status = 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED' | '';
const STATUS_LABEL: Record<Exclude<Status, ''>, string> = { ACTIVE: 'Chalu', USED: 'Sessions khatam', EXPIRED: 'Muddat khatam', CANCELLED: 'Cancel' };
const DAY = 86_400_000;

export default function PackagesPage() {
  const qc = useQueryClient();
  const can = useSalonCan();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('sold');
  const [status, setStatus] = useState<Status>('ACTIVE');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selling, setSelling] = useState<Package | true | null>(null);
  const [editing, setEditing] = useState<Package | 'new' | null>(null);
  const [cancel, setCancel] = useState<PackagePurchase | null>(null);
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);

  const soldQ = useQuery({ queryKey: [SALON_KEYS.packages, 'sold', status, query], queryFn: () => packagesApi.purchases({ status: status || undefined, search: query || undefined }), placeholderData: (p) => p });
  const activeQ = useQuery({ queryKey: [SALON_KEYS.packages, 'sold', 'ACTIVE', ''], queryFn: () => packagesApi.purchases({ status: 'ACTIVE' }) });
  const pkgQ = useQuery({ queryKey: [SALON_KEYS.packages, 'list'], queryFn: () => packagesApi.list() });

  const rows = soldQ.data ?? [];
  const active = activeQ.data ?? [];
  const pkgs = pkgQ.data ?? [];
  const sessions = active.reduce((s, p) => s + p.sessionsRemaining, 0);
  const ending = active.filter((p) => new Date(p.expiryDate).getTime() - Date.now() < 15 * DAY);
  const owed = active.reduce((s, p) => s + Math.max(Number(p.sale?.creditAmount ?? 0), 0), 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && can.bill) { e.preventDefault(); setSelling(true); }
      if (e.key === '1') setTab('sold');
      if (e.key === '2') setTab('packages');
      if (e.key === '/') { e.preventDefault(); setTab('sold'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const printDoc = (): PrintDoc => ({
    title: 'Packages — becha hua',
    subtitle: status ? STATUS_LABEL[status] : 'Sab',
    meta: [['Packages', String(rows.length)], ['Sessions baqi', String(rows.reduce((s, p) => s + p.sessionsRemaining, 0))]],
    sections: [{
      kind: 'table',
      columns: [{ label: 'Number', wideOnly: true }, { label: 'Customer' }, { label: 'Package' }, { label: 'Baqi' }, { label: 'Khatam', wideOnly: true }, { label: 'Paid', align: 'right' }],
      rows: rows.map((p) => [p.purchaseNumber, `${p.customer?.name ?? ''} ${p.customer?.phone ?? ''}`.trim(), p.package?.name ?? '', `${p.sessionsRemaining}/${p.package?.totalSessions ?? ''}`, dateOf(p.expiryDate), formatPKR(p.amountPaid)]),
    }],
  });

  return (
    <PageShell>
      <PageHero
        title="Packages"
        chip={<><Gift /> Prepaid</>}
        meta="Pehle paisa, phir sessions — bridal packages advance ke saath"
        busy={soldQ.isFetching && !soldQ.isLoading}
        loading={activeQ.isLoading}
        actions={<>
          <HeroPrint doc={printDoc} disabled={tab !== 'sold' || !rows.length} />
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.bill && <button type="button" onClick={() => setSelling(true)} title="Package bechein (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Package bechein</button>}
        </>}
        stats={[
          { label: 'Chalu packages', value: active.length },
          { label: 'Sessions baqi', value: sessions },
          { label: 'Khate me baqi', value: formatPKR(owed), hint: 'In packages ke bill par' },
        ]}
      />

      <KpiRow cols={4}>
        {activeQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Gift} color="#16a34a" label="Chalu" value={active.length} hint={`${sessions} sessions dene hain`} onClick={() => { setTab('sold'); setStatus('ACTIVE'); }} active={tab === 'sold' && status === 'ACTIVE'} />
          <KpiCard icon={AlarmClock} color={ending.length ? '#d97706' : '#64748b'} label="15 din me khatam" value={ending.length} hint="Customer ko yaad dilayein" />
          <KpiCard icon={Wallet} color={owed ? '#e11d48' : '#64748b'} label="Advance ke baad baqi" value={formatPKR(owed)} hint="Khata se wasool karein" />
          <KpiCard icon={BookmarkPlus} color="#db2777" label="Packages" value={pkgs.filter((p) => p.isActive).length} hint={`${pkgs.length - pkgs.filter((p) => p.isActive).length} band`} onClick={() => setTab('packages')} active={tab === 'packages'} />
        </>}
      </KpiRow>

      {tab === 'sold' && (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Customer ka naam, phone ya PKG number…" />}
          chips={query || status !== 'ACTIVE' ? <>
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
            {status !== 'ACTIVE' && <FilterChip onRemove={() => setStatus('ACTIVE')}>{status ? STATUS_LABEL[status] : 'Sab'}</FilterChip>}
          </> : undefined}
          onClear={() => { setSearch(''); setStatus('ACTIVE'); }}>
          <FilterMenu icon={Filter} label={status ? STATUS_LABEL[status] : 'Sab'} value={status} active={status !== 'ACTIVE'} onChange={setStatus}
            options={[{ value: 'ACTIVE', label: 'Chalu' }, { value: 'USED', label: 'Sessions khatam' }, { value: 'EXPIRED', label: 'Muddat khatam' }, { value: 'CANCELLED', label: 'Cancel' }, { value: '', label: 'Sab' }]} />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab} hint={<>{can.bill && <><Kbd>N</Kbd> bechein · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs</>}
        tabs={[{ id: 'sold', label: 'Becha hua', icon: ListChecks, count: rows.length }, { id: 'packages', label: 'Packages', icon: Gift, count: pkgs.length }]} />

      {tab === 'sold' ? (
        soldQ.isLoading ? <ListSkeleton /> : soldQ.isError ? <LoadFailed what="Packages" retry={() => soldQ.refetch()} /> : !rows.length ? (
          <EmptyList icon={Gift} title={query ? 'Is search me koi nahi' : 'Koi package nahi becha'} text="Package banayein (jaise 5 facial Rs 10,000) aur customer ko bechein. Har visit par counter se ek session katta hai.">
            {can.bill && pkgs.length > 0 && <Button onClick={() => setSelling(true)} leftIcon={<Plus className="h-4 w-4" />}>Package bechein</Button>}
            {can.catalog && !pkgs.length && <Button onClick={() => setEditing('new')} leftIcon={<Plus className="h-4 w-4" />}>Pehla package banayein</Button>}
          </EmptyList>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((p) => <PurchaseRow key={p.id} p={p} canCancel={can.bill} onCancel={() => setCancel(p)} />)}
          </ul>
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pkgs.map((p) => (
            <div key={p.id} className={cn('rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80', !p.isActive && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-900">{p.name}</p>
                <div className="flex gap-1">{p.isFeatured && <Badge size="xs" variant="accent">Khaas</Badge>}{!p.isActive && <Badge size="xs">Band</Badge>}</div>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{formatPKR(p.price)}</p>
              {p.originalPrice != null && p.originalPrice > p.price && <p className="text-[0.8125rem] text-success-700">Bachat {formatPKR(p.originalPrice - p.price)} <span className="text-slate-400 line-through">{formatPKR(p.originalPrice)}</span></p>}
              <p className="mt-1 text-[0.8125rem] text-slate-600">{p.totalSessions} sessions · {p.validityDays} din me</p>
              {p.description && <p className="mt-1 line-clamp-2 text-[0.75rem] text-slate-500">{p.description}</p>}
              <p className="mt-1 text-[0.75rem] text-slate-500">{p.totalSold} dafa bika</p>
              <div className="mt-3 flex gap-1.5">
                {can.bill && p.isActive && <Button size="sm" leftIcon={<Receipt className="h-4 w-4" />} onClick={() => setSelling(p)}>Bechein</Button>}
                {can.catalog && <Button size="sm" variant="secondary" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(p)}>Badlein</Button>}
              </div>
            </div>
          ))}
          {can.catalog && (
            <button type="button" onClick={() => setEditing('new')} className="flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-700">
              <Plus className="h-6 w-6" /> Naya package
            </button>
          )}
        </div>
      )}

      {selling && <SellModal packages={pkgs.filter((p) => p.isActive)} initial={selling === true ? undefined : selling} onClose={() => setSelling(null)} />}
      {editing && <PackageModal pkg={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {cancel && (
        <CancelModal title={`${cancel.purchaseNumber} · ${cancel.customer?.name ?? ''}`} paid={0}
          onConfirm={async (reason) => { await packagesApi.cancelPurchase(cancel.id, reason || undefined); qc.invalidateQueries({ queryKey: [SALON_KEYS.packages] }); }}
          onClose={() => setCancel(null)} />
      )}

      {guide.isOpen && (
        <PageGuide title="Packages — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: BookmarkPlus, color: '#db2777', title: 'Package banayein', text: 'Naam, qeemat, kitne sessions, kitne din me, aur kin services par chalega (khali = har service).' },
            { icon: Wallet, color: '#0891b2', title: 'Advance ke saath bechein', text: 'Bridal package me advance likhein — baqi customer ke khate me udhaar. Bill Sales me aaj ki tareekh me aata hai.' },
            { icon: Scissors, color: '#16a34a', title: 'Session lena', text: 'Counter par customer chunein, service par "Package" chunein — session kat jata hai aur bill me paisa nahi lagta. Stylist ki commission banti hai.' },
            { icon: Receipt, color: '#e11d48', title: 'Wapas', text: 'Package ka bill void ho to package khud cancel. Session wala bill void ho to session wapas mil jata hai.' },
          ]}
          shortcuts={[['N', 'bechein'], ['/', 'dhoondein'], ['1', 'becha hua'], ['2', 'packages'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function PurchaseRow({ p, canCancel, onCancel }: { p: PackagePurchase; canCancel: boolean; onCancel: () => void }) {
  const [open, setOpen] = useState(false);
  const total = p.package?.totalSessions ?? p.sessionsUsed + p.sessionsRemaining;
  const log = (p.usageLog ?? []).filter((u) => !u.voided);
  const dead = p.sale && ['VOIDED', 'FULLY_RETURNED'].includes(p.sale.status);
  return (
    <li className="px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{p.customer?.name ?? '—'}</span>
            <Badge size="xs" variant={p.status === 'ACTIVE' ? 'success' : p.status === 'CANCELLED' ? 'danger' : 'default'}>{STATUS_LABEL[p.status as Exclude<Status, ''>] ?? p.status}</Badge>
            {dead && <Badge size="xs" variant="danger">Bill {p.sale!.status === 'VOIDED' ? 'void' : 'wapas'}</Badge>}
          </p>
          <p className="text-[0.8125rem] text-slate-600">{p.package?.name} · {p.purchaseNumber} · {dateOf(p.expiryDate)} tak</p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-success-500" style={{ width: `${total ? (p.sessionsUsed / total) * 100 : 0}%` }} /></div>
            <span className="text-[0.75rem] text-slate-600">{p.sessionsUsed}/{total} istemal · {p.sessionsRemaining} baqi</span>
          </div>
        </div>
        <div className="text-right text-[0.8125rem]">
          <p className="font-semibold tabular-nums">{formatPKR(p.amountPaid)} paid</p>
          {p.sale && p.sale.creditAmount > 0 && <p className="text-amber-700">{formatPKR(p.sale.creditAmount)} khate me tha</p>}
        </div>
        <div className="flex gap-1.5">
          {!!log.length && <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>{open ? 'Band' : 'Visits'}</Button>}
          {canCancel && p.status === 'ACTIVE' && <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>}
        </div>
      </div>
      {open && (
        <ul className="mt-2 space-y-1 rounded-xl bg-slate-50 p-3 text-[0.8125rem]">
          {log.map((u, i) => <li key={i} className="flex justify-between gap-2"><span>{u.serviceName ?? 'Session'}{u.staffName ? ` · ${u.staffName}` : ''}</span><span className="text-slate-500">{u.appointmentNumber} · {dateOf(u.usedAt)}</span></li>)}
        </ul>
      )}
    </li>
  );
}

function SellModal({ packages, initial, onClose }: { packages: Package[]; initial?: Package; onClose: () => void }) {
  const qc = useQueryClient();
  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [pkgId, setPkgId] = useState(initial?.id ?? packages[0]?.id ?? '');
  const p = packages.find((x) => x.id === pkgId);
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const amount = paid === '' ? p?.price ?? 0 : Number(paid) || 0;
  const error = !customer.customerId ? 'Customer chunein' : !p ? 'Package chunein' : amount < 0 || amount > p.price ? `Zyada se zyada ${formatPKR(p.price)}` : undefined;
  const save = useMutation({
    mutationFn: () => packagesApi.purchase({ packageId: pkgId, customerId: customer.customerId, amountPaid: amount, paymentMethod: method, notes: notes.trim() || undefined }),
    onSuccess: (r) => { toast.success(`${r.purchaseNumber} becha gaya`); [SALON_KEYS.packages, 'customers', 'salon-perks'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Package nahi bika')),
  });
  return (
    <Modal open onClose={onClose} size="md" title="Package bechein" description="Bill Sales me aata hai; advance ke baad baqi khate me udhaar"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()} leftIcon={<Wallet className="h-4 w-4" />}>Bechein {formatPKR(amount)}</Button></>}>
      <div className="space-y-3">
        <CustomerField value={customer} onChange={setCustomer} compact />
        <Select label="Package" value={pkgId} onChange={(e) => setPkgId(e.target.value)} options={packages.map((x) => ({ value: x.id, label: `${x.name} · ${formatPKR(x.price)} · ${x.totalSessions} sessions` }))} />
        <Input label="Abhi kitna mila (advance)" inputMode="decimal" value={paid} placeholder={String(p?.price ?? 0)} onChange={(e) => setPaid(e.target.value.replace(/[^\d.]/g, ''))}
          hint={p && amount < p.price ? `${formatPKR(p.price - amount)} khate me udhaar — baad me Khata se wasool` : 'Poora paisa'} />
        {amount > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
        <Textarea label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} placeholder="Shaadi 20 Nov, trial 10 Nov" hint="Marzi hai" />
      </div>
    </Modal>
  );
}

function PackageModal({ pkg, onClose }: { pkg: Package | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { services } = useServices();
  const [name, setName] = useState(pkg?.name ?? '');
  const [price, setPrice] = useState(pkg ? String(pkg.price) : '');
  const [original, setOriginal] = useState(pkg?.originalPrice != null ? String(pkg.originalPrice) : '');
  const [sessions, setSessions] = useState(String(pkg?.totalSessions ?? 5));
  const [days, setDays] = useState(String(pkg?.validityDays ?? 90));
  const [picked, setPicked] = useState<string[]>(Array.isArray(pkg?.services) ? pkg!.services.filter((x) => typeof x === 'string') : []);
  const [description, setDescription] = useState(pkg?.description ?? '');
  const [featured, setFeatured] = useState(pkg?.isFeatured ?? false);
  const [active, setActive] = useState(pkg?.isActive ?? true);
  const error = name.trim().length < 2 ? 'Package ka naam likhein' : price === '' || !(Number(price) >= 0) ? 'Qeemat likhein' : !(Number(sessions) >= 1) ? 'Sessions likhein' : !(Number(days) >= 1) ? 'Din likhein' : undefined;
  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(), price: Number(price), originalPrice: original === '' ? null : Number(original), services: picked,
        totalSessions: Number(sessions), validityDays: Number(days), description: description.trim() || undefined, isFeatured: featured, isActive: active,
      };
      return pkg ? packagesApi.update(pkg.id, body) : packagesApi.create(body);
    },
    onSuccess: () => { toast.success('Package save ho gaya'); qc.invalidateQueries({ queryKey: [SALON_KEYS.packages] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Package save nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="lg" title={pkg ? `${pkg.name} — badlein` : 'Naya package'}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Naam" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bridal Gold" maxLength={120} />
          <Input label="Qeemat" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} placeholder="50000" />
          <Input label="Alag alag lene par" inputMode="decimal" value={original} onChange={(e) => setOriginal(e.target.value.replace(/[^\d.]/g, ''))} placeholder="60000" hint="Customer ko bachat dikhti hai" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Sessions" inputMode="numeric" value={sessions} onChange={(e) => setSessions(e.target.value.replace(/\D/g, ''))} />
            <Input label="Kitne din me" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} />
          </div>
        </div>
        <div>
          <p className="mb-1 text-[0.8125rem] font-medium text-slate-700">Kin services par chalega <span className="font-normal text-slate-500">(kuch na chunein = har service)</span></p>
          <div className="grid max-h-48 gap-1 overflow-auto rounded-xl p-2 ring-1 ring-slate-200 sm:grid-cols-2">
            {services.map((s) => (
              <Checkbox key={s.id} label={s.name} checked={picked.includes(s.id)} onChange={(e) => setPicked((x) => (e.target.checked ? [...x, s.id] : x.filter((y) => y !== s.id)))} />
            ))}
          </div>
        </div>
        <Textarea label="Tafseel" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="2 trial + shaadi ka din + walima" />
        <div className="flex flex-wrap gap-6">
          <Switch label="Khaas" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
          <Switch label="Chalu" description="Band package bikta nahi" checked={active} onChange={(e) => setActive(e.target.checked)} />
        </div>
        {error && <p className="text-[0.8125rem] text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}
