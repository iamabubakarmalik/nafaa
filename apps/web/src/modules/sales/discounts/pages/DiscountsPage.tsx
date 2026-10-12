/**
 * Discount codes: what each code brought in (bills, sales, discount given,
 * customers, branches) for any period; create and edit with branch and
 * per-customer limits and business-day dates; share on WhatsApp; used codes
 * are switched off rather than deleted.
 *
 * Keys: / search · N new code · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BadgePercent, CalendarClock, Check, Copy, Download, GraduationCap, MessageCircle, Pencil, Percent, Plus, Search, Store, Tag,
  Trash2, TrendingUp, Trophy, Users, Wallet, Wand2, X, type LucideIcon,
} from 'lucide-react';
import {
  Button, Card, DateRangeMenu, Kbd, Modal, PageHero, Skeleton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PrintButton, type PrintDoc } from '@core/print';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useBusinessDayStart } from '@core/lib/business-day';
import { useAuthStore } from '@core/stores/auth.store';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { discountsApi, type CreateDiscountPayload, type DiscountCode, type DiscountStatus, type DiscountType } from '../api/discounts.api';

const STATUS: Record<DiscountStatus, { label: string; tone: string }> = {
  active: { label: 'Chalu', tone: 'bg-success-50 text-success-700' },
  scheduled: { label: 'Shuru hoga', tone: 'bg-sky-50 text-sky-700' },
  expired: { label: 'Muddat khatam', tone: 'bg-slate-100 text-slate-600' },
  used_up: { label: 'Had poori', tone: 'bg-amber-50 text-amber-800' },
  inactive: { label: 'Band', tone: 'bg-slate-100 text-slate-500' },
};
const TABS: Array<{ id: 'all' | DiscountStatus; label: string }> = [
  { id: 'active', label: 'Chalu' }, { id: 'scheduled', label: 'Shuru hone wale' }, { id: 'used_up', label: 'Had poori' },
  { id: 'expired', label: 'Muddat khatam' }, { id: 'inactive', label: 'Band' }, { id: 'all', label: 'Sab' },
];
const PRESETS: Array<{ code: string; description: string; type: DiscountType; value: number; minPurchase?: number; maxDiscount?: number }> = [
  { code: 'EID2026', description: 'Eid special', type: 'PERCENTAGE', value: 20, minPurchase: 1000, maxDiscount: 1000 },
  { code: 'SALE10', description: 'Har cheez par 10%', type: 'PERCENTAGE', value: 10 },
  { code: 'NEW500', description: 'Naye customer ke liye', type: 'FIXED_AMOUNT', value: 500, minPurchase: 3000 },
  { code: 'BULK15', description: 'Bari khareedari par', type: 'PERCENTAGE', value: 15, minPurchase: 10000 },
  { code: 'FLASH50', description: 'Aaj ka flash sale', type: 'PERCENTAGE', value: 50, maxDiscount: 2000 },
];

const offText = (d: Pick<DiscountCode, 'type' | 'value' | 'maxDiscount'>) =>
  d.type === 'PERCENTAGE' ? `${d.value}% off${d.maxDiscount ? ` (zyada se zyada ${formatPKR(d.maxDiscount)})` : ''}` : `${formatPKR(d.value)} off`;
const day = (v?: string | null) => (v ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v)) : null);
const daysLeft = (v?: string | null) => (v ? Math.ceil((new Date(v).getTime() - Date.now()) / 86_400_000) : null);
const keyOf = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-CA') : '');

export default function DiscountsPage() {
  const qc = useQueryClient();
  const canManage = usePermission(PERMISSIONS.DISCOUNTS_MANAGE);
  const shopName = useAuthStore((s) => s.tenant?.name) ?? 'Hamari dukaan';
  const startHour = useBusinessDayStart();
  const [range, setRange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const period = resolveRange(range, startHour);
  const [tab, setTab] = useState<'all' | DiscountStatus>('active');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<DiscountCode | 'new' | null>(null);
  const [guide, setGuide] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const list = useQuery({ queryKey: ['discounts', period?.from, period?.to], queryFn: () => discountsApi.list(period ?? undefined), placeholderData: (p) => p });
  const refresh = () => qc.invalidateQueries({ queryKey: ['discounts'] });
  const toggle = useMutation({ mutationFn: discountsApi.toggle, onSuccess: (d) => { toast.success(d.isActive ? 'Code chalu' : 'Code band'); void refresh(); } });
  const remove = useMutation({ mutationFn: discountsApi.remove, onSuccess: (r) => { toast.success(r.message); void refresh(); } });

  const items = useMemo(() => {
    const t = search.trim().toLowerCase();
    return (list.data?.items ?? []).filter((d) => (tab === 'all' || d.status === tab) && (!t || d.code.toLowerCase().includes(t) || d.description?.toLowerCase().includes(t)));
  }, [list.data, tab, search]);
  const counts = useMemo(() => {
    const m: Record<string, number> = { all: list.data?.items.length ?? 0 };
    for (const d of list.data?.items ?? []) m[d.status] = (m[d.status] ?? 0) + 1;
    return m;
  }, [list.data]);
  const top = useMemo(() => [...(list.data?.items ?? [])].filter((d) => d.uses > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 6), [list.data]);
  const t = list.data?.totals;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key.toLowerCase() === 'n' && canManage) setEditing('new');
      else if (e.key.toLowerCase() === 'g') setGuide(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage]);

  const exportCsv = () => {
    const rows = [['Code', 'Tafseel', 'Discount', 'Kam se kam', 'Had', 'Istemal', 'Har customer', 'Shuru', 'Khatam', 'Halat', 'Is muddat: bill', 'Bikri', 'Discount diya', 'Customers'],
      ...items.map((d) => [d.code, d.description ?? '', offText(d), d.minPurchase, d.usageLimit ?? '', d.usageCount, d.perCustomerLimit ?? '', day(d.validFrom) ?? '', day(d.validUntil) ?? '', STATUS[d.status].label, d.uses, d.revenue.toFixed(2), d.discountGiven.toFixed(2), d.customers])];
    const url = URL.createObjectURL(new Blob(['﻿' + rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `discount-codes-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  const printDoc = (): PrintDoc => ({
    title: 'Discount codes', subtitle: period ? `${period.from} — ${period.to}` : 'Sab waqt',
    meta: [['Codes', String(t?.codes ?? 0)], ['Discount diya', formatPKR(t?.discountGiven ?? 0)]],
    sections: [{ kind: 'table', columns: [{ label: 'Code' }, { label: 'Discount' }, { label: 'Bill', align: 'right' }, { label: 'Bikri', align: 'right' }, { label: 'Discount diya', align: 'right' }],
      rows: items.map((d) => [d.code, offText(d), String(d.uses), formatPKR(d.revenue), formatPKR(d.discountGiven)]) }],
  });
  const share = (d: DiscountCode) => {
    const text = `🎁 ${shopName} ki taraf se khaas offer!\n\nCode: *${d.code}* — ${offText(d)}${d.minPurchase ? `\nKam se kam ${formatPKR(d.minPurchase)} ki khareedari par` : ''}${d.validUntil ? `\n${day(d.validUntil)} tak` : ''}\n\nBill banwate waqt yeh code batayein. Shukriya!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="mx-auto w-full max-w-[var(--page-max,96rem)] space-y-4 pb-12">
      {editing && <CodeEditor code={editing === 'new' ? null : editing} shops={list.data?.shops ?? []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void refresh(); }} />}
      {guide && <DiscountsGuide onClose={() => setGuide(false)} />}

      <PageHero
        title="Discount codes"
        chip={<><Tag />{t ? `${t.active} chalu` : '…'}</>}
        busy={list.isFetching && !list.isLoading}
        loading={list.isLoading}
        actions={<>
          <button type="button" onClick={exportCsv} className={heroIconButton} title="CSV"><Download className="h-4 w-4" /></button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Print" /></span>
          <button type="button" onClick={() => setGuide(true)} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setEditing('new')} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya code</button>}
        </>}
        stats={[
          { label: 'Codes se bikri', value: formatPKR(t?.revenue ?? 0), hint: `${t?.uses ?? 0} bill` },
          { label: 'Discount diya', value: formatPKR(t?.discountGiven ?? 0), hint: t?.revenue ? `bikri ka ${((t.discountGiven / t.revenue) * 100).toFixed(1)}%` : '' },
          { label: 'Customers', value: String(t?.customers ?? 0), hint: 'jinhon ne code lagaya' },
          { label: 'Har Rs 1 discount par', value: t?.discountGiven ? formatPKR(t.revenue / t.discountGiven) : '—', hint: 'bikri aayi' },
        ]}
      />

      <div className="relative z-10 flex flex-col gap-2 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 sm:p-4 xl:flex-row">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
          {TABS.map((x) => (
            <button key={x.id} type="button" onClick={() => setTab(x.id)}
              className={cn('inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-[0.8125rem] font-semibold transition', tab === x.id ? 'bg-slate-900 text-white shadow' : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/70')}>
              {x.label}<span className={cn('rounded-full px-1.5 text-[0.6875rem] tabular-nums', tab === x.id ? 'bg-white/20' : 'bg-white text-slate-600')}>{counts[x.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <label className="group relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Code ya tafseel…" aria-label="Code dhoondein"
            className="h-11 w-full rounded-2xl border-0 bg-slate-100/80 pl-12 pr-12 text-[0.9375rem] outline-none focus:bg-white focus:ring-2 focus:ring-brand-500" />
          {search ? <button type="button" onClick={() => setSearch('')} aria-label="Saaf" className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200"><X className="h-4 w-4" /></button>
            : <Kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>}
        </label>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label="Hisaab" defaultPreset="thisMonth" />
      </div>

      {list.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-brand-fg shadow-lg"><BadgePercent className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">{search || tab !== 'all' ? 'Is filter mein koi code nahi' : 'Abhi koi discount code nahi'}</h3>
          <p className="mt-1 max-w-md text-[0.875rem] text-slate-500">Code banayein, WhatsApp par customers ko bhejein — POS par bill banate waqt lagta hai.</p>
          {canManage && <Button className="mt-4" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Pehla code banayein</Button>}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((d) => {
            const left = daysLeft(d.validUntil);
            const usePct = d.usageLimit ? Math.min(100, (d.usageCount / d.usageLimit) * 100) : null;
            const branches = d.shopIds.length ? d.shopIds.map((id) => list.data?.shops.find((s) => s.id === id)?.name).filter(Boolean) : null;
            return (
              <article key={d.id} className={cn('flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80', d.status !== 'active' && 'opacity-85')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button type="button" onClick={() => { void navigator.clipboard.writeText(d.code); toast.success(`${d.code} copy ho gaya`); }}
                      className="group inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 px-3 py-1.5 font-mono text-[1.0625rem] font-bold tracking-wider text-brand-800 hover:bg-brand-100">
                      {d.code}<Copy className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />
                    </button>
                    {d.description && <p className="mt-1.5 truncate text-[0.8125rem] text-slate-600">{d.description}</p>}
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', STATUS[d.status].tone)}>{STATUS[d.status].label}</span>
                </div>
                <p className="mt-3 text-[1.25rem] font-bold text-slate-900">{offText(d)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[0.6875rem]">
                  {d.minPurchase > 0 && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">Kam se kam {formatPKR(d.minPurchase)}</span>}
                  {d.perCustomerLimit && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">Har customer {d.perCustomerLimit} dafa</span>}
                  {branches && <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-violet-700"><Store className="h-3 w-3" />{branches.join(', ')}</span>}
                  {(d.validFrom || d.validUntil) && (
                    <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5', left !== null && left <= 3 && left >= 0 ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600')}>
                      <CalendarClock className="h-3 w-3" />{[day(d.validFrom), day(d.validUntil)].filter(Boolean).join(' — ')}{left !== null && left >= 0 && left <= 30 ? ` · ${left} din baqi` : ''}
                    </span>
                  )}
                </div>
                {usePct !== null && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[0.6875rem] text-slate-500"><span>Istemal</span><span className="tabular-nums">{d.usageCount} / {d.usageLimit}</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', usePct >= 100 ? 'bg-amber-500' : 'bg-brand-500')} style={{ width: `${usePct}%` }} /></div>
                  </div>
                )}
                <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                  <div><dt className="text-[0.6875rem] text-slate-500">Bill</dt><dd className="font-bold tabular-nums">{d.uses}</dd></div>
                  <div><dt className="text-[0.6875rem] text-slate-500">Bikri</dt><dd className="truncate font-bold tabular-nums">{formatPKR(d.revenue)}</dd></div>
                  <div><dt className="text-[0.6875rem] text-slate-500">Diya</dt><dd className="truncate font-bold tabular-nums text-pink-700">{formatPKR(d.discountGiven)}</dd></div>
                </dl>
                {d.branches.length > 1 && <p className="mt-2 truncate text-[0.6875rem] text-slate-500">{d.branches.map((b) => `${b.name}: ${b.uses}`).join(' · ')}</p>}
                <div className="mt-auto flex items-center gap-1 pt-3">
                  <button type="button" onClick={() => share(d)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-success-50 text-[0.8125rem] font-semibold text-success-700 hover:bg-success-100"><MessageCircle className="h-4 w-4" />Bhejein</button>
                  {canManage && (
                    <>
                      <button type="button" onClick={() => setEditing(d)} title="Badlein" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={() => toggle.mutate(d.id)} title={d.isActive ? 'Band karein' : 'Chalu karein'} className={cn('relative h-6 w-11 shrink-0 rounded-full transition', d.isActive ? 'bg-brand-600' : 'bg-slate-300')}>
                        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition', d.isActive ? 'left-[1.375rem]' : 'left-0.5')} />
                      </button>
                      <button type="button" onClick={() => { if (confirm(d.usageCount ? `${d.code} istemal ho chuka hai — band ho jayega, mitega nahi. Theek?` : `${d.code} mitayein?`)) remove.mutate(d.id); }} title="Mitayein" className="flex h-9 w-9 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {top.length > 0 && (
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Trophy className="h-4 w-4 text-brand-600" />Kaunsa code kaam aaya</span>} description="Is muddat mein — har Rs 1 discount par kitni bikri" flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-[0.8125rem]">
              <thead><tr className="bg-slate-50 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5">Code</th><th className="px-3 py-2.5 text-right">Bill</th><th className="px-3 py-2.5 text-right">Customers</th><th className="px-3 py-2.5 text-right">Bikri</th><th className="px-3 py-2.5 text-right">Discount</th><th className="px-5 py-2.5 text-right">Rs 1 par</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {top.map((d) => (
                  <tr key={d.id}>
                    <td className="px-5 py-2.5 font-mono font-semibold">{d.code}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{d.uses}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{d.customers}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatPKR(d.revenue)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-pink-700">{formatPKR(d.discountGiven)}</td>
                    <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-success-700">{d.discountGiven ? formatPKR(d.revenue / d.discountGiven) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function CodeEditor({ code, shops, onClose, onSaved }: { code: DiscountCode | null; shops: Array<{ id: string; name: string }>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<CreateDiscountPayload>(() => code ? {
    code: code.code, description: code.description ?? '', type: code.type, value: code.value, minPurchase: code.minPurchase,
    maxDiscount: code.maxDiscount ?? null, usageLimit: code.usageLimit ?? null, perCustomerLimit: code.perCustomerLimit ?? null,
    shopIds: code.shopIds ?? [], validFrom: keyOf(code.validFrom) || null, validUntil: keyOf(code.validUntil) || null, isActive: code.isActive,
  } : { code: '', description: '', type: 'PERCENTAGE', value: 10, minPurchase: 0, maxDiscount: null, usageLimit: null, perCustomerLimit: null, shopIds: [], validFrom: null, validUntil: null, isActive: true });
  const [sample, setSample] = useState(2000);
  const set = (p: Partial<CreateDiscountPayload>) => setF((x) => ({ ...x, ...p }));
  const save = useMutation({
    mutationFn: () => {
      const payload = { ...f, code: f.code.toUpperCase().replace(/\s+/g, ''), description: f.description || undefined, maxDiscount: f.type === 'PERCENTAGE' ? f.maxDiscount : null };
      return code ? discountsApi.update(code.id, payload) : discountsApi.create(payload);
    },
    onSuccess: () => { toast.success(code ? 'Code badal diya' : 'Code ban gaya'); onSaved(); },
    onError: (e: { response?: { data?: { message?: string } }; message?: string }) => toast.error(e?.response?.data?.message || e.message || 'Save nahi hua'),
  });
  const preview = (() => {
    if (sample < (f.minPurchase ?? 0)) return null;
    let off = f.type === 'PERCENTAGE' ? (sample * f.value) / 100 : f.value;
    if (f.type === 'PERCENTAGE' && f.maxDiscount) off = Math.min(off, f.maxDiscount);
    return Math.min(off, sample);
  })();
  const ok = f.code.trim().length >= 3 && f.value > 0 && (f.type !== 'PERCENTAGE' || f.value <= 100) && (!f.validFrom || !f.validUntil || f.validFrom <= f.validUntil);
  const num = (v: string) => (v === '' ? null : Number(v.replace(/[^\d.]/g, '')));
  const input = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[0.875rem] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
  return (
    <Modal open onClose={onClose} size="lg" title={code ? `Badlein: ${code.code}` : 'Naya discount code'}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button disabled={!ok} loading={save.isPending} onClick={() => save.mutate()}>{code ? 'Save karein' : 'Bana dein'}</Button></>}>
      <div className="space-y-4">
        {!code && (
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => <button key={p.code} type="button" onClick={() => set({ ...p, maxDiscount: p.maxDiscount ?? null, minPurchase: p.minPurchase ?? 0 })} className="h-8 rounded-full bg-amber-50 px-3 text-[0.75rem] font-semibold text-amber-800 hover:bg-amber-100">{p.code}</button>)}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[0.8125rem] font-medium text-slate-700">Code
            <div className="mt-1 flex gap-2">
              <input value={f.code} onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s+/g, '') })} maxLength={40} placeholder="EID2026" className={cn(input, 'font-mono font-bold tracking-wider')} />
              <button type="button" onClick={() => set({ code: `NF${Math.random().toString(36).slice(2, 7).toUpperCase()}` })} title="Khud banayein" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"><Wand2 className="h-4 w-4" /></button>
            </div>
          </label>
          <label className="text-[0.8125rem] font-medium text-slate-700">Tafseel<input value={f.description ?? ''} onChange={(e) => set({ description: e.target.value })} placeholder="Eid special" className={cn(input, 'mt-1')} /></label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([['PERCENTAGE', Percent, 'Percent (%)', 'Bill ka hissa'], ['FIXED_AMOUNT', Wallet, 'Seedhi raqam', 'Itne rupay kam']] as const).map(([v, Icon, l, h]) => (
            <button key={v} type="button" onClick={() => set({ type: v })} className={cn('flex items-center gap-3 rounded-xl border p-3 text-left', f.type === v ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20' : 'border-slate-200 hover:bg-slate-50')}>
              <Icon className="h-5 w-5 text-brand-600" /><span><span className="block text-[0.875rem] font-semibold">{l}</span><span className="block text-[0.75rem] text-slate-500">{h}</span></span>
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-[0.8125rem] font-medium text-slate-700">{f.type === 'PERCENTAGE' ? 'Kitna %' : 'Kitne rupay'}<input inputMode="decimal" value={f.value || ''} onChange={(e) => set({ value: Number(e.target.value.replace(/[^\d.]/g, '')) })} className={cn(input, 'mt-1 tabular-nums')} /></label>
          <label className="text-[0.8125rem] font-medium text-slate-700">Kam se kam khareedari<input inputMode="decimal" value={f.minPurchase || ''} onChange={(e) => set({ minPurchase: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} placeholder="Koi shart nahi" className={cn(input, 'mt-1 tabular-nums')} /></label>
          {f.type === 'PERCENTAGE' && <label className="text-[0.8125rem] font-medium text-slate-700">Zyada se zyada discount<input inputMode="decimal" value={f.maxDiscount ?? ''} onChange={(e) => set({ maxDiscount: num(e.target.value) })} placeholder="Koi had nahi" className={cn(input, 'mt-1 tabular-nums')} /></label>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[0.8125rem] font-medium text-slate-700">Kul kitni dafa chalega<input inputMode="numeric" value={f.usageLimit ?? ''} onChange={(e) => set({ usageLimit: num(e.target.value) })} placeholder="Koi had nahi" className={cn(input, 'mt-1 tabular-nums')} /></label>
          <label className="text-[0.8125rem] font-medium text-slate-700">Ek customer kitni dafa<input inputMode="numeric" value={f.perCustomerLimit ?? ''} onChange={(e) => set({ perCustomerLimit: num(e.target.value) })} placeholder="Koi had nahi" className={cn(input, 'mt-1 tabular-nums')} /></label>
          <label className="text-[0.8125rem] font-medium text-slate-700">Kab se<input type="date" value={f.validFrom ?? ''} onChange={(e) => set({ validFrom: e.target.value || null })} className={cn(input, 'mt-1')} /></label>
          <label className="text-[0.8125rem] font-medium text-slate-700">Kab tak (us din ke aakhir tak)<input type="date" value={f.validUntil ?? ''} onChange={(e) => set({ validUntil: e.target.value || null })} className={cn(input, 'mt-1')} /></label>
        </div>
        {shops.length > 1 && (
          <div>
            <span className="text-[0.8125rem] font-medium text-slate-700">Kis branch par chalega</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => set({ shopIds: [] })} className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-medium', !f.shopIds?.length ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700')}>Har branch</button>
              {shops.map((s) => {
                const on = f.shopIds?.includes(s.id);
                return <button key={s.id} type="button" onClick={() => set({ shopIds: on ? f.shopIds!.filter((x) => x !== s.id) : [...(f.shopIds ?? []), s.id] })} className={cn('inline-flex h-8 items-center gap-1 rounded-full px-3 text-[0.8125rem] font-medium', on ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700')}>{on && <Check className="h-3.5 w-3.5" />}{s.name}</button>;
              })}
            </div>
          </div>
        )}
        <div className="rounded-2xl bg-slate-50 p-3.5">
          <div className="flex items-center justify-between text-[0.8125rem]"><span className="text-slate-600">Agar bill ho</span><span className="font-semibold tabular-nums">{formatPKR(sample)}</span></div>
          <input type="range" min={100} max={50000} step={100} value={sample} onChange={(e) => setSample(Number(e.target.value))} className="mt-1 w-full accent-[rgb(var(--brand-600))]" />
          <p className="mt-1 text-[0.875rem]">{preview === null ? <span className="text-amber-700">Kam se kam {formatPKR(f.minPurchase ?? 0)} ki khareedari par chalega</span>
            : <>Discount <strong className="text-pink-700">{formatPKR(preview)}</strong> · customer dega <strong>{formatPKR(sample - preview)}</strong></>}</p>
        </div>
      </div>
    </Modal>
  );
}

function DiscountsGuide({ onClose }: { onClose: () => void }) {
  const steps: Array<{ icon: LucideIcon; color: string; title: string; text: string }> = [
    { icon: Plus, color: '#2563eb', title: 'Code banayein', text: '"Naya code" — naam, kitna discount (% ya seedhi raqam), aur sharten. Tayyar presets bhi hain.' },
    { icon: MessageCircle, color: '#16a34a', title: 'Customers ko bhejein', text: 'Card par "Bhejein" — WhatsApp par code ka paigham tayyar.' },
    { icon: Tag, color: '#7c3aed', title: 'POS par lagayein', text: 'Bill banate waqt Discount mein code likhein — sharten khud check hoti hain.' },
    { icon: Store, color: '#0891b2', title: 'Branch aur had', text: 'Code sirf kuch branches par, kul itni dafa, ya ek customer itni dafa — sab rakh sakte hain.' },
    { icon: CalendarClock, color: '#d97706', title: 'Muddat', text: '"Kab tak" wala din poora chalta hai — raat tak.' },
    { icon: TrendingUp, color: '#db2777', title: 'Kaunsa kaam aaya', text: 'Har code ki bikri, discount aur customers — upar muddat badal kar dekhein.' },
    { icon: Users, color: '#475569', title: 'Mehfooz', text: 'Jo code istemal ho chuka woh mitta nahi, band hota hai — purane bill ka hisaab bacha rehta hai.' },
  ];
  return (
    <Modal open onClose={onClose} size="lg" title="Discount codes — aasaan tareeqa" description={`${steps.length} cheezein`}>
      <ol className="grid gap-3 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}17`, color: s.color }}>
              <s.icon className="h-5 w-5" /><span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[0.625rem] font-bold text-white">{i + 1}</span>
            </span>
            <div><p className="text-[0.875rem] font-semibold text-slate-900">{s.title}</p><p className="mt-0.5 text-[0.8125rem] leading-relaxed text-slate-600">{s.text}</p></div>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 text-[0.75rem] text-slate-600 ring-1 ring-slate-200">
        <span className="font-semibold text-slate-900">Jaldi ke liye:</span>
        {[['/', 'dhoondein'], ['N', 'naya code'], ['G', 'guide']].map(([k, t]) => <span key={k} className="inline-flex items-center gap-1"><Kbd>{k}</Kbd> {t}</span>)}
      </div>
    </Modal>
  );
}
