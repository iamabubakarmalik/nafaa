/**
 * One customer: khata with payment, credit and old-register actions; how they
 * buy (12 months, favourite products, rhythm, payment habits); every bill
 * (paged, from sales history); the full khata timeline with a printable
 * statement; loyalty; and details.
 *
 * Keys: E edit · P payment · U credit · 1–5 tabs.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowLeft, BookOpen, Cake, Copy, Crown, Download, Gift, LineChart, Mail, MapPin, MessageCircle, Pencil, Phone, Plus, Receipt,
  StickyNote, Trash2, User, Wallet,
} from 'lucide-react';
import { Avatar, Button, Card, Modal, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PrintButton, type PrintDoc } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { PAYMENT_LABELS, useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { customerLedgerApi, type LedgerEntry } from '@modules/customers/khata/api/customer-ledger.api';
import { getCachedLedger } from '@core/lib/offline/offlineKhata';
import { salesHistoryApi } from '@modules/sales/history/api';
import { directoryApi } from './api';
import { useDirectory } from './useDirectory';
import { loadTemplates, reminderText, thanksText, toneFor, waLink } from './messages';
import { KhataActionModal, type KhataAction } from './components/KhataActionModal';

const WEEKDAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];
const LEDGER: Record<string, { label: string; tone: string }> = {
  SALE_CREDIT: { label: 'Udhaar sale', tone: 'text-rose-700' }, PAYMENT_RECEIVED: { label: 'Payment aayi', tone: 'text-success-700' },
  ADJUSTMENT: { label: 'Udhaar / tabdeeli', tone: 'text-amber-700' }, OPENING_BALANCE: { label: 'Purana khata', tone: 'text-slate-700' },
  REFUND: { label: 'Maal wapas', tone: 'text-sky-700' }, LOYALTY_REDEEMED: { label: 'Points istemal', tone: 'text-violet-700' },
};
const when = (v: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(v));
const day = (v: string | null) => (v ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v)) : '—');
const ago = (v: string | null) => {
  if (!v) return 'kabhi nahi';
  const d = Math.floor((Date.now() - new Date(v).getTime()) / 86_400_000);
  return d === 0 ? 'aaj' : d === 1 ? 'kal' : d < 30 ? `${d} din pehle` : d < 365 ? `${Math.floor(d / 30)} mahine pehle` : `${Math.floor(d / 365)} saal pehle`;
};

function Tile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <p className="text-[0.75rem] font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-[1.25rem] font-bold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="truncate text-[0.6875rem] text-slate-500">{hint}</p>}
    </div>
  );
}

export function CustomerProfilePage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useChartTheme();
  const startHour = useBusinessDayStart();
  const { sales: money, cost } = useMasked();
  const shopName = useAuthStore((s) => s.tenant?.name) ?? 'Hamari dukaan';
  const { refresh } = useDirectory({ status: 'all', type: 'all', activity: 'all', sort: 'recent' }, 'nafaa-customer-profile');
  const can = {
    edit: usePermission(PERMISSIONS.CUSTOMERS_EDIT),
    khata: usePermission(PERMISSIONS.KHATA_MANAGE),
  };
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') ?? 'overview');
  const [action, setAction] = useState<KhataAction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const customer = useQuery({ queryKey: ['customer', id], queryFn: () => customersApi.getOne(id), enabled: !!id });
  const insights = useQuery({ queryKey: ['customer-insights', id], queryFn: () => directoryApi.insights(id), enabled: !!id });
  const ledger = useQuery({
    queryKey: ['customer-ledger', id],
    enabled: !!id,
    queryFn: async () => {
      try { return await customerLedgerApi.list(id); } catch (e) {
        // Offline: the khata saved on this device.
        const cached = await getCachedLedger(id).catch(() => { throw e; });
        return { ...cached, shopBalance: cached.customer.balance, totalBalance: cached.customer.balance, isAllShops: true };
      }
    },
  });
  const today = businessDayKey(new Date(), startHour);
  const bills = useInfiniteQuery({
    queryKey: ['sales-history', 'customer', id],
    enabled: !!id && tab === 'bills',
    queryFn: ({ pageParam }) => salesHistoryApi.list({ from: 'all', to: today, status: 'all', sort: 'new', customerId: id }, pageParam, 30),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });

  const c = customer.data;
  const ins = insights.data;
  const balance = ledger.data?.shopBalance ?? c?.balance ?? 0;
  const reload = () => { refresh(); void customer.refetch(); void insights.refetch(); void ledger.refetch(); };

  const tabs = [
    { id: 'overview', label: 'Khulasa', icon: LineChart },
    { id: 'bills', label: 'Bills', icon: Receipt },
    { id: 'khata', label: 'Khata', icon: BookOpen },
    ...((c?.loyaltyTransactions?.length ?? 0) > 0 ? [{ id: 'loyalty', label: 'Points', icon: Gift }] : []),
    { id: 'details', label: 'Details', icon: User },
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (k === 'e' && can.edit) navigate(`/customers/${id}/edit`);
      else if (k === 'p' && can.khata && balance > 0) setAction('payment');
      else if (k === 'u' && can.khata) setAction('udhaar');
      else if (/^[1-9]$/.test(e.key) && tabs[Number(e.key) - 1]) setTab(tabs[Number(e.key) - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (customer.isLoading) return <div className="mx-auto max-w-[var(--page-max,96rem)] space-y-4"><Skeleton className="h-56 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></div>;
  if (!c) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center ring-1 ring-slate-200">
        <p className="font-semibold text-slate-900">Customer nahi mila</p>
        <Link to="/customers" className="mt-3 inline-block text-[0.875rem] font-semibold text-brand-700 hover:underline">Customers →</Link>
      </div>
    );
  }

  const owes = balance > 0.009;
  const advance = balance < -0.009;
  const dueDays = ins?.credit.dueDays ?? null;
  const wa = waLink(c.phone, owes ? reminderText(loadTemplates()[toneFor(dueDays)], { ...c, balance, dueDays }, shopName) : thanksText(c, shopName));
  const birthdayToday = c.dateOfBirth && new Date(c.dateOfBirth).getMonth() === new Date().getMonth() && new Date(c.dateOfBirth).getDate() === new Date().getDate();
  const limitPct = c.creditLimit > 0 ? Math.min(100, (Math.max(0, balance) / c.creditLimit) * 100) : null;
  const entries = ledger.data?.ledgers ?? [];
  const months = (ins?.months ?? []).map((m) => ({ ...m, label: new Intl.DateTimeFormat('en-PK', { month: 'short' }).format(new Date(`${m.key}-15T12:00:00`)) }));

  const toggleVip = async () => {
    try { await customersApi.toggleVip(id); toast.success(c.isVip ? 'VIP hata diya' : 'VIP bana diya'); reload(); } catch (e) { toast.error((e as Error).message || 'Nahi hua'); }
  };
  const remove = async () => {
    try {
      const r = await customersApi.remove(id) as { softDeleted?: boolean; message?: string };
      toast.success(r.message ?? 'Ho gaya');
      refresh();
      if (r.softDeleted) { setConfirmDelete(false); void customer.refetch(); } else navigate('/customers');
    } catch (e) { toast.error((e as Error).message || 'Nahi hua'); }
  };
  const copyDetails = async () => {
    await navigator.clipboard.writeText([c.name, c.phone, c.email, [c.address, c.area, c.city].filter(Boolean).join(', ')].filter(Boolean).join('\n'));
    toast.success('Copy ho gaya');
  };
  const statement = (): PrintDoc => ({
    title: `Khata — ${c.name}`,
    subtitle: [c.phone, c.city].filter(Boolean).join(' · ') || undefined,
    meta: [['Baqi', money(balance)], ['Date', day(new Date().toISOString())]],
    sections: [
      { kind: 'rows', title: 'Khulasa', rows: [
        { label: 'Kul udhaar liya', value: money(ins?.credit.taken ?? 0) },
        { label: 'Payment di', value: money(ins?.credit.paid ?? 0) },
        ...(ins?.credit.reduced ? [{ label: 'Return / void se kam hua', value: money(ins.credit.reduced) }] : []),
        { label: owes ? 'Baqi' : advance ? 'Advance' : 'Hisaab', value: owes || advance ? money(Math.abs(balance)) : 'Saaf', strong: true },
      ] },
      { kind: 'table', title: 'Details', columns: [{ label: 'Date' }, { label: 'Kya' }, { label: 'Amount', align: 'right' }, { label: 'Baqi', align: 'right' }],
        rows: [...entries].reverse().map((e) => [day(e.createdAt), `${LEDGER[e.type]?.label ?? e.type}${e.reference ? ` · ${e.reference}` : ''}`, `${e.amount > 0 ? '+' : '−'}${formatPKR(Math.abs(e.amount))}`, formatPKR(e.balanceAfter)]) },
    ],
    footer: owes ? 'Baraye meherbani baqi amount jald ada karein. Shukriya!' : 'Shukriya!',
  });
  const ledgerCsv = () => {
    const rows = [['Date', 'Kya', 'Reference', 'Note', 'Amount', 'Baqi', 'Kis ne', 'Branch'], ...entries.map((e: LedgerEntry) => [
      when(e.createdAt), LEDGER[e.type]?.label ?? e.type, e.reference ?? '', e.note ?? '', e.amount.toFixed(2), e.balanceAfter.toFixed(2), e.createdBy?.fullName ?? '', e.shop?.name ?? '',
    ])];
    const url = URL.createObjectURL(new Blob(['﻿' + rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `khata-${c.name}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <div className="mx-auto w-full max-w-[var(--page-max,96rem)] space-y-4 pb-12">
      {action && <KhataActionModal action={action} customer={{ id, name: c.name, balance }} money={money} onClose={() => setAction(null)} onDone={reload} />}
      {confirmDelete && (
        <Modal open onClose={() => setConfirmDelete(false)} size="sm" title={`${c.name} ko mitayein?`}
          description={c._count.sales || c._count.ledgers || Math.abs(c.balance) > 0.009 ? 'Is ki sale ya khata hai — mitaya nahi jayega, sirf band hoga. Purane bill aur khata salamat rahenge.' : 'Is ki koi sale ya khata nahi — poori tarah mit jayega.'}
          footer={<><Button variant="secondary" onClick={() => setConfirmDelete(false)}>Rehne dein</Button><Button variant="danger" onClick={() => void remove()}>Haan</Button></>}>
          <span />
        </Modal>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/customers" className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Customers</Link>
        <div className="flex flex-wrap items-center gap-1.5">
          <PrivacyToggle compact />
          <PrintButton doc={statement} label="Statement" />
          <button type="button" onClick={() => void copyDetails()} title="Details copy" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Copy className="h-4 w-4" /></button>
          {can.edit && <button type="button" onClick={() => void toggleVip()} title={c.isVip ? 'VIP hatayein' : 'VIP banayein'} className={cn('flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-slate-200 hover:bg-slate-50', c.isVip ? 'bg-amber-50 text-amber-600' : 'bg-white text-slate-500')}><Crown className="h-4 w-4" /></button>}
          {can.edit && <button type="button" onClick={() => setConfirmDelete(true)} title="Mitayein" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-rose-600 ring-1 ring-slate-200 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}
          {can.edit && <Link to={`/customers/${id}/edit`} title="Badlein (E)" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-[0.8125rem] font-semibold text-white shadow-sm hover:bg-brand-700"><Pencil className="h-4 w-4" />Badlein</Link>}
        </div>
      </div>

      <div className="grid gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 gap-4">
          <span className="relative shrink-0">
            <Avatar name={c.name} url={c.avatarUrl ?? undefined} size={80} />
            {c.isVip && <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-amber-950 ring-2 ring-white"><Crown className="h-4 w-4" /></span>}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{c.name}</h1>
              {!c.isActive && <span className="rounded-md bg-slate-900/80 px-2 py-0.5 text-[0.6875rem] font-bold uppercase text-white">Band</span>}
              {birthdayToday && <span className="inline-flex items-center gap-1 rounded-md bg-pink-50 px-2 py-0.5 text-[0.75rem] font-semibold text-pink-700"><Cake className="h-3.5 w-3.5" />Aaj salgirah!</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-slate-600">
              {c.phone && <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 hover:text-brand-700"><Phone className="h-3.5 w-3.5" />{c.phone}</a>}
              {c.email && <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 hover:text-brand-700"><Mail className="h-3.5 w-3.5" />{c.email}</a>}
              {(c.city || c.area) && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{[c.area, c.city].filter(Boolean).join(', ')}</span>}
              <span className="text-slate-500">Customer {day(c.createdAt)} se</span>
            </div>
            {c.notes && <p className="mt-2 line-clamp-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[0.8125rem] text-amber-900"><StickyNote className="mr-1 inline h-3.5 w-3.5" />{c.notes}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {wa && <a href={wa} target="_blank" rel="noreferrer" className={cn('inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold', owes ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-success-50 text-success-700 hover:bg-success-100')}><MessageCircle className="h-4 w-4" />{owes ? 'Udhaar yaad dilayein' : 'WhatsApp'}</a>}
              {c.phone && <a href={`tel:${c.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-[0.8125rem] font-semibold text-slate-700 hover:bg-slate-200"><Phone className="h-4 w-4" />Call</a>}
            </div>
          </div>
        </div>
        <div className={cn('rounded-2xl p-4', owes ? 'bg-rose-50' : advance ? 'bg-success-50' : 'bg-slate-50')}>
          <p className="text-[0.75rem] font-medium text-slate-600">{owes ? 'Baqi udhaar' : advance ? 'Advance jama' : 'Khata'}{ledger.data && !ledger.data.isAllShops && Math.abs(ledger.data.totalBalance - balance) > 0.009 ? ' · is branch par' : ''}</p>
          <p className={cn('text-[2rem] font-bold leading-tight tabular-nums', owes ? 'text-rose-700' : advance ? 'text-success-700' : 'text-slate-500')}>{owes || advance ? money(Math.abs(balance)) : 'Saaf'}</p>
          {owes && dueDays !== null && <p className="text-[0.75rem] text-rose-800">Sab se purana udhaar {dueDays} din se baqi</p>}
          {ledger.data && Math.abs(ledger.data.totalBalance - balance) > 0.009 && <p className="text-[0.75rem] text-slate-600">Saari branches: {money(ledger.data.totalBalance)}</p>}
          {limitPct !== null && (
            <div className="mt-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/70"><div className={cn('h-full rounded-full', limitPct >= 100 ? 'bg-rose-600' : limitPct >= 75 ? 'bg-amber-400' : 'bg-success-500')} style={{ width: `${limitPct}%` }} /></div>
              <p className="mt-0.5 text-[0.6875rem] text-slate-600">Had {money(c.creditLimit)}{limitPct >= 100 ? ' — paar ho gayi' : ''}</p>
            </div>
          )}
          {can.khata && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button size="sm" variant="success" disabled={!owes} onClick={() => setAction('payment')} leftIcon={<Wallet className="h-4 w-4" />}>Payment</Button>
              <Button size="sm" variant="secondary" onClick={() => setAction('udhaar')} leftIcon={<Plus className="h-4 w-4" />}>Udhaar</Button>
              <button type="button" onClick={() => setAction('opening')} className="col-span-2 text-[0.75rem] font-semibold text-slate-600 hover:underline">Kaapi ka purana khata jorein</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Tile label="Kul khareedari" value={money(ins?.visits.spent ?? 0)} hint={`${ins?.visits.count ?? 0} bill`} />
        <Tile label="Ausat bill" value={money(ins?.visits.average ?? 0)} hint={ins?.visits.best ? `sab se bara ${money(ins.visits.best)}` : undefined} />
        <Tile label="Aakhri dafa" value={ago(ins?.visits.last ?? null)} hint={ins?.visits.first ? `pehli dafa ${day(ins.visits.first)}` : undefined} />
        <Tile label="Har kitne din baad" value={ins?.visits.averageGapDays != null ? `${Math.round(ins.visits.averageGapDays)} din` : '—'} hint="aam tor par aata hai" />
        <Tile label="Pasandida din" value={ins?.visits.favouriteWeekday != null ? WEEKDAYS[ins.visits.favouriteWeekday] : '—'} hint={ins?.visits.favouriteHour != null ? `aksar ${ins.visits.favouriteHour % 12 || 12} ${ins.visits.favouriteHour < 12 ? 'AM' : 'PM'} ke qareeb` : undefined} />
        <Tile label="Points" value={c.loyaltyPoints} hint={ins?.visits.returned ? `${ins.visits.returned} dafa maal wapas` : undefined} />
      </div>

      <div role="tablist" className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
        {tabs.map((t, i) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} title={`${t.label} (${i + 1})`}
            className={cn('inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl px-4 text-[0.875rem] font-semibold transition', tab === t.id ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-600 ring-1 ring-slate-200/80 hover:bg-slate-50')}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl lg:col-span-2" title="Har mahine kitna khareeda" description="Pichhle 12 mahine">
            {!ins ? <Skeleton className="h-60 rounded-xl" /> : ins.visits.count === 0 ? <p className="py-16 text-center text-[0.875rem] text-slate-500">Abhi tak kuch nahi khareeda</p> : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={months} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke={theme.grid} vertical={false} />
                    <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} />
                    <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                    <Tooltip formatter={(v, _n, p) => [`${formatPKR(Number(v))} · ${(p.payload as { bills: number }).bills} bill`, 'Khareeda']} contentStyle={theme.tooltip.contentStyle} labelStyle={theme.tooltip.labelStyle} cursor={theme.tooltip.cursor} />
                    <Bar dataKey="spent" fill={theme.primary} radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
          <Card className="rounded-2xl" title="Kya leta hai" flush>
            {!ins?.products.length ? <p className="px-5 py-10 text-center text-[0.8125rem] text-slate-500">Abhi kuch nahi</p> : (
              <ul className="divide-y divide-slate-100 pb-1">
                {ins.products.map((p, i) => (
                  <li key={p.productId}>
                    <Link to={`/products/${p.productId}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 sm:px-5">
                      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[0.6875rem] font-bold', i < 3 ? 'bg-brand-600 text-brand-fg' : 'bg-slate-100 text-slate-600')}>{i + 1}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-[0.8125rem] font-medium text-slate-900">{p.name}</span><span className="block text-[0.6875rem] text-slate-500">{Number(p.qty.toFixed(2))} {p.unit} · {p.times} dafa · aakhri {ago(p.lastAt)}</span></span>
                      <span className="text-[0.8125rem] font-semibold tabular-nums">{money(p.spent)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="rounded-2xl" title="Kaise paise deta hai">
            {!ins?.payments.length ? <p className="py-8 text-center text-[0.8125rem] text-slate-500">Abhi kuch nahi</p> : (
              <ul className="space-y-2.5">
                {ins.payments.map((p) => {
                  const total = ins.payments.reduce((s, x) => s + x.total, 0) || 1;
                  return (
                    <li key={p.method} className="text-[0.8125rem]">
                      <div className="flex justify-between"><span className="text-slate-700">{PAYMENT_LABELS[p.method] ?? p.method} <span className="text-slate-400">· {p.bills}</span></span><span className="font-semibold tabular-nums">{Math.round((p.total / total) * 100)}%</span></div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(p.total / total) * 100}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <Card className="rounded-2xl lg:col-span-2" title="Udhaar ka hisaab">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label="Kul udhaar liya" value={money(ins?.credit.taken ?? 0)} />
              <Tile label="Payment di" value={money(ins?.credit.paid ?? 0)} />
              <Tile label="Return / void" value={money(ins?.credit.reduced ?? 0)} />
              <Tile label="Sab se purana baqi" value={dueDays !== null ? `${dueDays} din` : '—'} hint={ins?.credit.oldestDueAt ? day(ins.credit.oldestDueAt) : undefined} />
            </div>
          </Card>
        </div>
      )}

      {tab === 'bills' && (
        <Card className="rounded-2xl" flush title="Saare bill" description={bills.data ? `${bills.data.pages[0].count} bill · kul ${money(bills.data.pages[0].stats.total)}` : undefined}>
          {bills.isLoading ? <div className="p-5"><Skeleton className="h-40 rounded-xl" /></div> : !bills.data?.pages[0].count ? <p className="px-5 py-10 text-center text-[0.8125rem] text-slate-500">Koi bill nahi</p> : (
            <>
              <ul className="divide-y divide-slate-100">
                {bills.data.pages.flatMap((p) => p.items).map((s) => (
                  <li key={s.id}>
                    <Link to={`/sales/${s.id}/receipt`} className="flex items-center gap-3 px-4 py-2.5 text-[0.8125rem] hover:bg-slate-50 sm:px-5">
                      <span className="w-28 shrink-0 font-mono font-semibold text-slate-900">{s.saleNumber}</span>
                      <span className="w-36 shrink-0 text-slate-500">{when(s.soldAt)}</span>
                      <span className="min-w-0 flex-1 truncate text-slate-600">{s.items.slice(0, 3).map((i) => `${Number(i.quantity)} × ${i.name}`).join(', ')}{s.items.length > 3 ? ` +${s.items.length - 3}` : ''}</span>
                      {s.status === 'VOIDED' && <span className="text-rose-600">void</span>}
                      {s.creditAmount > 0 && s.status !== 'VOIDED' && <span className="rounded bg-rose-50 px-1.5 text-[0.6875rem] font-semibold text-rose-700">udhaar {money(s.creditAmount)}</span>}
                      <span className="w-24 text-right font-semibold tabular-nums text-slate-900">{money(s.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {bills.hasNextPage && <button type="button" onClick={() => void bills.fetchNextPage()} className="w-full border-t border-slate-100 py-2.5 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">{bills.isFetchingNextPage ? 'Aa rahe hain…' : 'Aur dikhayein'}</button>}
            </>
          )}
        </Card>
      )}

      {tab === 'khata' && (
        <Card className="rounded-2xl" flush title="Khata" description="Aakhri 100 entries — naye upar"
          actions={<div className="flex gap-2">
            <button type="button" onClick={ledgerCsv} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 text-[0.75rem] font-semibold text-slate-700 hover:bg-slate-200"><Download className="h-3.5 w-3.5" />CSV</button>
            <Link to="/khata" className="inline-flex h-8 items-center rounded-lg bg-slate-100 px-2.5 text-[0.75rem] font-semibold text-slate-700 hover:bg-slate-200">Poora khata</Link>
          </div>}>
          {ledger.isLoading ? <div className="p-5"><Skeleton className="h-40 rounded-xl" /></div> : entries.length === 0 ? <p className="px-5 py-10 text-center text-[0.8125rem] text-slate-500">Koi entry nahi — hisaab saaf</p> : (
            <ul className="divide-y divide-slate-100">
              {entries.map((e) => {
                const t = LEDGER[e.type] ?? { label: e.type, tone: 'text-slate-700' };
                return (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-[0.8125rem] sm:px-5">
                    <span className="w-36 shrink-0 text-slate-500">{when(e.createdAt)}</span>
                    <span className={cn('w-32 shrink-0 font-medium', t.tone)}>{t.label}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-500">{[e.reference, e.note, e.createdBy?.fullName, e.shop?.name].filter(Boolean).join(' · ')}</span>
                    <span className={cn('w-24 text-right font-semibold tabular-nums', e.amount > 0 ? 'text-rose-700' : 'text-success-700')}>{e.amount > 0 ? '+' : '−'}{money(Math.abs(e.amount))}</span>
                    <span className="w-24 text-right tabular-nums text-slate-600">= {money(e.balanceAfter)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {tab === 'loyalty' && (
        <Card className="rounded-2xl" flush title="Points" description={`Abhi ${c.loyaltyPoints} points`}>
          <ul className="divide-y divide-slate-100">
            {c.loyaltyTransactions.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-2.5 text-[0.8125rem]">
                <span className="w-36 shrink-0 text-slate-500">{when(t.createdAt)}</span>
                <span className="min-w-0 flex-1 truncate text-slate-700">{t.note ?? t.type}{t.reference ? ` · ${t.reference}` : ''}</span>
                <span className={cn('font-semibold tabular-nums', t.points > 0 ? 'text-success-700' : 'text-rose-700')}>{t.points > 0 ? '+' : ''}{t.points}</span>
                <span className="w-16 text-right tabular-nums text-slate-500">= {t.balanceAfter}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === 'details' && (
        <Card className="rounded-2xl" title="Details">
          <dl className="grid gap-x-8 sm:grid-cols-2">
            {([
              ['Phone', c.phone], ['Email', c.email], ['CNIC', c.cnic], ['NTN', (c as { ntn?: string | null }).ntn],
              ['Gender', c.gender === 'MALE' ? 'Mard' : c.gender === 'FEMALE' ? 'Aurat' : c.gender ? 'Doosra' : null],
              ['Salgirah', c.dateOfBirth ? day(c.dateOfBirth) : null], ['Pata', c.address], ['Ilaqa', c.area], ['Sheher', c.city],
              ['Udhaar ki had', c.creditLimit ? cost(c.creditLimit) : 'Koi had nahi'], ['Customer kab se', day(c.createdAt)], ['Notes', c.notes],
            ] as Array<[string, string | null | undefined]>).filter(([, v]) => v).map(([l, v]) => (
              <div key={l} className="flex justify-between gap-3 border-b border-slate-100 py-2 text-[0.8125rem]"><dt className="text-slate-500">{l}</dt><dd className="text-right font-medium text-slate-800">{v}</dd></div>
            ))}
          </dl>
        </Card>
      )}
    </div>
  );
}
