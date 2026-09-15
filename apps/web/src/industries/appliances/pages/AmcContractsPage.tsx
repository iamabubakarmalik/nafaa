import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import {
  FileSignature, Plus, Search, X, RefreshCw, CheckCircle2, XCircle,
  Clock, AlertTriangle, Phone, MessageCircle, Calendar, Eye, Bell,
  TrendingUp, RotateCw, Edit3, Wallet, ShieldCheck, Package,
  FileSpreadsheet, Printer, BarChart3, Users, Layers, HandCoins,
  CalendarClock, Ban, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@/core/security/HiddenValue';
import { amcContractsApi, type AmcContract, type ApplianceAmcStatus } from '../api/amc-contracts.api';
import {
  ApplianceHero, Kpi, Panel, StatusBadge, Teacher, Empty, Sheet, Field,
  inputCls, ChipRow, useShortcuts, printHtml, downloadCsv, a4Shell,
  fmtDate, fmtDateTime, printAction, guideAction, escapeHtml,
} from '../components/shared';
import { AMC_TYPE_META, AMC_STATUS_META, amcTypeMeta, daysPhrase } from '../constants';

/* ═════════════════════════════════════════════════════════════
   AMC — SAALANA MAINTENANCE KA MU'AHIDA
   ─────────────────────────────────────────────────────────────
   AMC dukaan ka sab se khamosh munafa hai: paisa ek dafa aata
   hai, kaam saal bhar thoda thoda hota hai. Magar ye khamoshi
   se khatam bhi ho jata hai — aur kisi ko pata nahi chalta.

   Is liye safha teen cheezon par zor deta hai:
   1. Kaun sa contract khatam hone wala hai (renew ka paisa)
   2. Kaun sa tareekh guzarne ke bawajood ACTIVE para hai —
      us par muft kaam hota reh sakta hai
   3. Contract ka bacha hua paisa
   ═════════════════════════════════════════════════════════════ */

type Tab = 'list' | 'expiring' | 'analytics';
type StatusFilter = 'all' | ApplianceAmcStatus;

/** ChipRow ka apna "Sab" button hai — is liye yahan 'all' na rakhein */
const STATUS_CHIPS: Array<{ v: ApplianceAmcStatus; label: string }> = [
  { v: 'ACTIVE', label: '✅ Chal raha' },
  { v: 'EXPIRED', label: '⌛ Khatam' },
  { v: 'RENEWED', label: '🔁 Renew hua' },
  { v: 'SUSPENDED', label: '⏸️ Roka hua' },
  { v: 'CANCELLED', label: '❌ Cancel' },
];

export default function AmcContractsPage() {
  const qc = useQueryClient();
  const hideCost = useCostHidden();
  const shopName = useAuthStore((s: any) => s.tenant?.name) || 'Meri Dukaan';
  const shopPhone = useAuthStore((s: any) => s.tenant?.phone || '');

  const [tab, setTab] = useState<Tab>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showGuide, setShowGuide] = useState(false);
  const [renewFor, setRenewFor] = useState<AmcContract | null>(null);
  const [statusFor, setStatusFor] = useState<AmcContract | null>(null);

  const { data: contracts = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['amc-contracts-list', statusFilter],
    queryFn: () => amcContractsApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['amc-contracts-summary'],
    queryFn: () => amcContractsApi.summary(),
  });

  const money = (n: number) => (hideCost ? '•••' : formatPKR(n));

  /* ─── Chaant ─── */
  const filtered = useMemo(() => {
    let l = contracts;
    if (typeFilter !== 'all') l = l.filter((c) => c.amcType === typeFilter);
    const q = search.toLowerCase().trim();
    if (q) {
      l = l.filter((c) =>
        c.contractNumber.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        (c.customerPhone ?? '').includes(q) ||
        (c.productName ?? '').toLowerCase().includes(q) ||
        (c.serialNumber ?? '').toLowerCase().includes(q));
    }
    return l;
  }, [contracts, search, typeFilter]);

  /* ─── Khatam hone wale — sab se pehle wohi jo sab se qareeb hai ─── */
  const expiring = useMemo(() => {
    const now = Date.now();
    return contracts
      .filter((c) => c.status === 'ACTIVE')
      .map((c) => ({
        ...c,
        daysLeft: Math.floor((new Date(c.expiryDate).getTime() - now) / 86_400_000),
      }))
      .filter((c) => c.daysLeft <= 60)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [contracts]);

  /* ─── Tareekh guzar chuki magar ACTIVE — paisa khatam, kaam jaari ─── */
  const stale = useMemo(
    () => expiring.filter((c) => c.daysLeft < 0),
    [expiring],
  );

  const sendReminder = useMutation({
    mutationFn: (id: string) => amcContractsApi.sendReminder(id),
    onSuccess: () => {
      toast.success('Reminder bhej diya');
      qc.invalidateQueries({ queryKey: ['amc-contracts-list'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Reminder nahi gaya'),
  });

  const renewMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => amcContractsApi.renew(id, data),
    onSuccess: () => {
      toast.success('Contract renew ho gaya ✓');
      setRenewFor(null);
      qc.invalidateQueries({ queryKey: ['amc-contracts-list'] });
      qc.invalidateQueries({ queryKey: ['amc-contracts-summary'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Renew nahi hua'),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => amcContractsApi.updateStatus(id, data),
    onSuccess: () => {
      toast.success('Halat badal di');
      setStatusFor(null);
      qc.invalidateQueries({ queryKey: ['amc-contracts-list'] });
      qc.invalidateQueries({ queryKey: ['amc-contracts-summary'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update nahi hua'),
  });

  /* ─── Print + CSV ─── */
  const doPrint = () => {
    const rows = tab === 'expiring' ? expiring : filtered;
    if (!rows.length) return toast.error('Print ke liye kuch nahi');
    const body = `<table>
      <thead><tr>
        <th>Contract</th><th>Customer</th><th>Phone</th><th>Cheez</th>
        <th>Qism</th><th>Khatam</th><th class="r">Qeemat</th><th class="r">Diya</th><th class="r">Baqi</th><th>Visits</th>
      </tr></thead>
      <tbody>${rows.map((c: any) => {
        const pending = Number(c.contractValue ?? 0) - Number(c.paidAmount ?? 0);
        return `<tr>
          <td><strong>${escapeHtml(c.contractNumber)}</strong></td>
          <td>${escapeHtml(c.customerName)}</td>
          <td>${escapeHtml(c.customerPhone ?? '')}</td>
          <td>${escapeHtml(c.productName ?? '—')}</td>
          <td>${escapeHtml(amcTypeMeta(c.amcType).label)}</td>
          <td>${fmtDate(c.expiryDate)}</td>
          <td class="r">${formatPKR(Number(c.contractValue ?? 0))}</td>
          <td class="r">${formatPKR(Number(c.paidAmount ?? 0))}</td>
          <td class="r">${pending > 0 ? formatPKR(pending) : '—'}</td>
          <td>${c.freeVisitsUsed}/${c.freeVisitsAllowed}</td>
        </tr>`;
      }).join('')}</tbody></table>`;

    printHtml(a4Shell({
      title: 'AMC Contracts',
      heading: tab === 'expiring' ? 'Khatam Hone Wale AMC' : 'AMC Contracts',
      shopName, shopPhone,
      badge: `${rows.length} contract`,
      kpis: [
        { label: 'Chal rahe', value: String(summary?.active ?? 0), tone: 'green' },
        { label: 'Khatam ho rahe', value: String(summary?.expiringSoon ?? 0), tone: 'amber' },
        { label: 'Kul qeemat', value: formatPKR(summary?.totalContractValue ?? 0), tone: 'blue' },
        { label: 'Baqi paisa', value: formatPKR(summary?.pendingAmount ?? 0), tone: 'rose' },
      ],
      body,
    }));
  };

  const doCsv = () => {
    const rows = tab === 'expiring' ? expiring : filtered;
    if (!rows.length) return toast.error('CSV ke liye kuch nahi');
    downloadCsv(`amc-contracts-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Contract', 'Qism', 'Halat', 'Customer', 'Phone', 'Pata', 'Cheez', 'Serial',
       'Shuru', 'Khatam', 'Mahine', 'Qeemat', 'Diya', 'Baqi',
       'Free visits', 'Use hue', 'Labor cover', 'Parts cover', 'Gas cover', 'Auto renew'],
      ...rows.map((c: any) => [
        c.contractNumber, amcTypeMeta(c.amcType).label, AMC_STATUS_META[c.status as ApplianceAmcStatus]?.label ?? c.status,
        c.customerName, c.customerPhone, c.customerAddress, c.productName, c.serialNumber,
        fmtDate(c.startDate), fmtDate(c.expiryDate), c.durationMonths,
        Number(c.contractValue ?? 0), Number(c.paidAmount ?? 0),
        Number(c.contractValue ?? 0) - Number(c.paidAmount ?? 0),
        c.freeVisitsAllowed, c.freeVisitsUsed,
        c.laborCovered ? 'Haan' : 'Nahi', c.freePartsAllowed ? 'Haan' : 'Nahi',
        c.gasRefillCovered ? 'Haan' : 'Nahi', c.autoRenew ? 'Haan' : 'Nahi',
      ]),
    ]);
    toast.success(`${rows.length} contract CSV me`);
  };

  useShortcuts({
    '/': () => (document.getElementById('amc-search') as HTMLInputElement)?.focus(),
    n: () => { window.location.href = '/appliances/amc-contracts/new'; },
    e: () => setTab('expiring'),
    a: () => setTab('analytics'),
    l: () => setTab('list'),
    p: doPrint,
    g: () => setShowGuide(true),
    Escape: () => {
      if (showGuide) return setShowGuide(false);
      if (renewFor) return setRenewFor(null);
      if (statusFor) return setStatusFor(null);
      if (search) return setSearch('');
    },
  }, [filtered, expiring, showGuide, renewFor, statusFor, search, tab]);

  /* ─── Analytics data ─── */
  const typeData = useMemo(
    () => (summary?.byType ?? []).map((t) => ({
      name: amcTypeMeta(t.type).label,
      value: t.value,
      count: t.count,
      collected: t.collected,
      hex: amcTypeMeta(t.type).hex,
    })),
    [summary],
  );

  return (
    <div className="space-y-4 sm:space-y-5 pb-20">
      <ApplianceHero
        badge="AMC — Saalana Muahida"
        badgeIcon={<FileSignature className="h-3.5 w-3.5" />}
        title="📜 AMC Contracts"
        subtitle={
          <>
            {summary?.active ?? 0} chal rahe · {money(summary?.totalContractValue ?? 0)} ka kaam ·{' '}
            <span className={(summary?.pendingAmount ?? 0) > 0 ? 'text-amber-200' : 'text-emerald-200'}>
              {money(summary?.pendingAmount ?? 0)} baqi
            </span>
            {(summary?.staleActive ?? 0) > 0 && (
              <span className="text-rose-200"> · ⚠️ {summary?.staleActive} ki tareekh guzar chuki</span>
            )}
          </>
        }
        actions={[
          { key: 'refresh', label: 'Taaza', icon: <RefreshCw className="h-4 w-4" />, onClick: () => refetch(), spinning: isRefetching, hideLabelOnMobile: true },
          { key: 'csv', label: 'CSV', icon: <FileSpreadsheet className="h-4 w-4" />, onClick: doCsv, hideLabelOnMobile: true },
          printAction(doPrint),
          guideAction(() => setShowGuide(true)),
          { key: 'new', label: 'Naya AMC', icon: <Plus className="h-4 w-4" />, href: '/appliances/amc-contracts/new', variant: 'solid', shortcut: 'N' },
        ]}
        shortcuts={[
          { keys: '/', label: 'search' }, { keys: 'N', label: 'naya' },
          { keys: 'E', label: 'khatam hone wale' }, { keys: 'A', label: 'analytics' },
          { keys: 'P', label: 'print' }, { keys: 'G', label: 'guide' },
        ]}
      >
        <PrivacyToggle />
      </ApplianceHero>

      {/* ─── Tareekh guzar chuki magar ACTIVE — sab se ahem warning ─── */}
      {stale.length > 0 && (
        <div className="rounded-2xl border-2 border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 p-4">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="h-10 w-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-rose-900 dark:text-rose-200">
                {stale.length} contract ki tareekh guzar chuki hai magar abhi bhi "chal raha" likha hai
              </div>
              <p className="text-xs font-bold text-rose-800 dark:text-rose-300 mt-0.5">
                In par muft visits hoti reh sakti hain jabke paisa khatam ho chuka. Ya renew karein ya khatam ka nishan laga dein.
              </p>
              <div className="flex gap-1.5 flex-wrap mt-2">
                {stale.slice(0, 6).map((c) => (
                  <button key={c.id} onClick={() => setRenewFor(c)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-500/30 text-[11px] font-extrabold text-rose-700 dark:text-rose-300 transition">
                    {c.contractNumber} · {c.customerName}
                  </button>
                ))}
                {stale.length > 6 && (
                  <span className="px-2.5 py-1 text-[11px] font-extrabold text-rose-700 dark:text-rose-300">
                    +{stale.length - 6} aur
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── KPI ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 sm:gap-3">
        <Kpi icon={CheckCircle2} label="Chal rahe" tone="emerald" value={summary?.active ?? 0}
          sub={`${summary?.autoRenewCount ?? 0} khud renew honge`}
          active={statusFilter === 'ACTIVE'}
          onClick={() => { setStatusFilter(statusFilter === 'ACTIVE' ? 'all' : 'ACTIVE'); setTab('list'); }} />
        <Kpi icon={Clock} label="Khatam ho rahe" tone="amber" value={summary?.expiringSoon ?? 0}
          sub="Agle 30 din me" alert={(summary?.expiringSoon ?? 0) > 0}
          onClick={() => setTab('expiring')} />
        <Kpi icon={AlertTriangle} label="Tareekh guzri" tone="rose" value={summary?.staleActive ?? 0}
          sub="Magar abhi ACTIVE hai" alert={(summary?.staleActive ?? 0) > 0}
          onClick={() => setTab('expiring')} />
        <Kpi icon={Wallet} label="Baqi paisa" tone="rose" value={money(summary?.pendingAmount ?? 0)}
          sub="Contract ka wasool karna hai" />
        <Kpi icon={TrendingUp} label="Kul qeemat" tone="blue" value={money(summary?.totalContractValue ?? 0)}
          sub={`${money(summary?.totalCollected ?? 0)} wasool`} />
        <Kpi icon={HandCoins} label="Is mahine" tone="teal" value={money(summary?.month?.billed ?? 0)}
          sub={`${summary?.month?.newContracts ?? 0} naye · ${money(summary?.month?.collected ?? 0)} aaya`} />
        <Kpi icon={ShieldCheck} label="Customer ne bachaya" tone="violet" value={money(summary?.customerSaved ?? 0)}
          sub="Bechne ki sab se achhi daleel" />
        <Kpi icon={Ban} label="Visits khatam" tone="slate" value={summary?.visitsExhausted ?? 0}
          sub="Free visits poori ho gayin" />
      </div>

      {/* ─── TABS ─── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {([
          { v: 'list' as Tab, label: 'Sab Contract', icon: FileSignature, n: contracts.length },
          { v: 'expiring' as Tab, label: 'Khatam Ho Rahe', icon: Clock, n: expiring.length },
          { v: 'analytics' as Tab, label: 'Analytics', icon: BarChart3 },
        ]).map((t) => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`h-11 px-4 rounded-2xl text-sm font-extrabold inline-flex items-center gap-2 shrink-0 transition ${
              tab === t.v
                ? 'bg-gradient-to-r from-cyan-600 to-teal-700 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-cyan-400'
            }`}>
            <t.icon className="h-4 w-4" /> {t.label}
            {t.n !== undefined && t.n > 0 && (
              <span className={`px-1.5 rounded-full text-[10px] tabular-nums ${tab === t.v ? 'bg-black/20' : 'bg-slate-200 dark:bg-slate-800'}`}>{t.n}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════ LIST ══════════ */}
      {tab === 'list' && (
        <>
          <Panel tone="cyan">
            <div className="space-y-3">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input id="amc-search" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Contract #, customer, phone, cheez ya serial… (/)"
                  className={inputCls('h-12 pl-9 pr-9')} />
                {search && (
                  <button onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                    <X className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                )}
              </div>
              <ChipRow value={statusFilter === 'all' ? null : statusFilter}
                onChange={(v) => setStatusFilter((v ?? 'all') as StatusFilter)}
                options={STATUS_CHIPS.map((c) => ({ value: c.v, label: c.label }))} />
              <ChipRow allLabel="Har qism" value={typeFilter === 'all' ? null : typeFilter}
                onChange={(v) => setTypeFilter(v ?? 'all')}
                options={Object.entries(AMC_TYPE_META).map(([k, m]) => ({ value: k, label: `${m.emoji} ${m.label}` }))} />
            </div>
          </Panel>

          {isLoading ? (
            <Panel tone="cyan">
              <div className="py-16 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-cyan-600 mb-2" />
                <p className="text-sm font-bold text-slate-500">Contracts aa rahe hain…</p>
              </div>
            </Panel>
          ) : filtered.length === 0 ? (
            <Panel tone="cyan">
              <Empty icon={FileSignature}
                title={search || statusFilter !== 'all' || typeFilter !== 'all' ? 'Is chaant par koi contract nahi' : 'Abhi koi AMC nahi bana'}
                hint={search || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Chaant hata kar dobara dekhein'
                  : 'AMC dukaan ka sab se khamosh munafa hai — paisa ek dafa, kaam saal bhar thoda thoda. Pehla contract banayein.'}
                action={
                  search || statusFilter !== 'all' || typeFilter !== 'all' ? (
                    <Button variant="secondary" onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); }}>
                      <X className="h-4 w-4" /> Chaant hatayein
                    </Button>
                  ) : (
                    <Link to="/appliances/amc-contracts/new"><Button><Plus className="h-4 w-4" /> Pehla AMC</Button></Link>
                  )
                } />
            </Panel>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map((c) => (
                <ContractCard key={c.id} c={c} money={money}
                  onRenew={() => setRenewFor(c)} onStatus={() => setStatusFor(c)}
                  onRemind={() => sendReminder.mutate(c.id)} reminding={sendReminder.isPending} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════ EXPIRING ══════════ */}
      {tab === 'expiring' && (
        <Panel icon={Clock} title="Khatam Hone Wale Contract" tone="amber"
          hint="Sab se qareeb wala sab se upar — renew ka paisa yahin chhupa hai"
          right={
            <div className="flex gap-1.5">
              <button onClick={doCsv} className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-extrabold inline-flex items-center gap-1 transition">
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
              </button>
              <button onClick={doPrint} className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-extrabold inline-flex items-center gap-1 transition">
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
            </div>
          }>
          {expiring.length === 0 ? (
            <Empty icon={CheckCircle2} title="Agle 60 din me koi contract khatam nahi ho raha"
              hint="Sab kuch waqt par hai — koi jaldi ka kaam nahi." />
          ) : (
            <div className="space-y-2">
              {expiring.map((c) => {
                const pending = Number(c.contractValue ?? 0) - Number(c.paidAmount ?? 0);
                const over = c.daysLeft < 0;
                const wa = (c.customerPhone ?? '').replace(/\D/g, '').replace(/^0/, '92');
                return (
                  <div key={c.id} className={`rounded-2xl border-2 p-3 ${
                    over ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10'
                         : c.daysLeft <= 15 ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10'
                         : 'border-slate-200 dark:border-slate-800'
                  }`}>
                    <div className="flex items-start gap-3 flex-wrap">
                      <div className={`h-12 w-12 rounded-2xl flex flex-col items-center justify-center shrink-0 text-white ${
                        over ? 'bg-rose-600' : c.daysLeft <= 15 ? 'bg-amber-500' : 'bg-cyan-600'
                      }`}>
                        <span className="text-base font-black leading-none tabular-nums">{Math.abs(c.daysLeft)}</span>
                        <span className="text-[8px] font-extrabold uppercase">{over ? 'guzre' : 'din'}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 dark:text-white font-mono text-sm">{c.contractNumber}</span>
                          <StatusBadge meta={amcTypeMeta(c.amcType)} size="xs" />
                          {over && <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black">TAREEKH GUZRI</span>}
                        </div>
                        <div className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-0.5 truncate">
                          {c.customerName} · {c.customerPhone}
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {c.productName ?? 'Cheez darj nahi'} · khatam {fmtDate(c.expiryDate)} ·{' '}
                          visits {c.freeVisitsUsed}/{c.freeVisitsAllowed}
                          {pending > 0 && <span className="text-rose-600 dark:text-rose-400"> · {money(pending)} baqi</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        {wa && (
                          <a href={`https://wa.me/${wa}?text=${encodeURIComponent(
                            `Assalam-o-Alaikum ${c.customerName}, aap ka AMC contract ${c.contractNumber} ${over ? 'khatam ho chuka hai' : `${c.daysLeft} din me khatam ho raha hai`}. Renew karwa lein taake service jaari rahe. — ${shopName}`,
                          )}`} target="_blank" rel="noreferrer"
                            className="h-9 px-3 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold inline-flex items-center gap-1 transition">
                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                          </a>
                        )}
                        <button onClick={() => sendReminder.mutate(c.id)} disabled={sendReminder.isPending}
                          className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition" title="Reminder">
                          <Bell className="h-4 w-4" />
                        </button>
                        <button onClick={() => setRenewFor(c)}
                          className="h-9 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1 shadow transition">
                          <RotateCw className="h-3.5 w-3.5" /> Renew
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      {/* ══════════ ANALYTICS ══════════ */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Panel icon={Layers} title="Kis Qism Ke Kitne" hint="Contract ki qeemat ke hisab se" tone="violet">
              {typeData.length === 0 ? (
                <Empty icon={Layers} title="Abhi koi chalta hua contract nahi" />
              ) : (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                        innerRadius={52} outerRadius={82} paddingAngle={3}>
                        {typeData.map((d, i) => <Cell key={i} fill={d.hex} />)}
                      </Pie>
                      <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                        contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel icon={HandCoins} title="Wasool vs Baqi" hint="Har qism ka paisa" tone="emerald">
              {typeData.length === 0 ? (
                <Empty icon={HandCoins} title="Abhi koi hisab nahi" />
              ) : (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typeData.map((t) => ({ ...t, baqi: t.value - t.collected }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                      <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n === 'collected' ? 'Wasool' : 'Baqi']}
                        contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700 }} />
                      <Legend formatter={(v) => (v === 'collected' ? 'Wasool' : 'Baqi')} />
                      <Bar dataKey="collected" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="baqi" stackId="a" fill="#e11d48" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
          </div>

          <Panel icon={CalendarClock} title="Agle 30 Din Me Khatam" hint="Backend ki apni list — sab se qareeb pehle" tone="amber">
            {(summary?.expiringList ?? []).length === 0 ? (
              <Empty icon={CheckCircle2} title="Agle mahine koi contract khatam nahi ho raha" />
            ) : (
              <div className="space-y-1.5">
                {summary!.expiringList.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-2.5">
                    <div className={`h-9 w-9 rounded-xl flex flex-col items-center justify-center text-white shrink-0 ${
                      e.daysLeft <= 7 ? 'bg-rose-600' : e.daysLeft <= 15 ? 'bg-amber-500' : 'bg-cyan-600'
                    }`}>
                      <span className="text-xs font-black leading-none tabular-nums">{e.daysLeft}</span>
                      <span className="text-[7px] font-extrabold">DIN</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{e.customerName}</div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono truncate">
                        {e.contractNumber} · {amcTypeMeta(e.amcType).label} · visits {e.freeVisitsUsed}/{e.freeVisitsAllowed}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{money(e.contractValue)}</div>
                      {e.pending > 0 && <div className="text-[10px] font-extrabold text-rose-600 tabular-nums">{money(e.pending)} baqi</div>}
                      {e.autoRenew && <div className="text-[10px] font-extrabold text-emerald-600">Auto renew</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ─── MODALS ─── */}
      {renewFor && (
        <RenewSheet c={renewFor} pending={renewMut.isPending}
          onClose={() => setRenewFor(null)}
          onSubmit={(data) => renewMut.mutate({ id: renewFor.id, data })} />
      )}

      {statusFor && (
        <StatusSheet c={statusFor} pending={statusMut.isPending}
          onClose={() => setStatusFor(null)}
          onSubmit={(data) => statusMut.mutate({ id: statusFor.id, data })} />
      )}

      {showGuide && (
        <Teacher onClose={() => setShowGuide(false)}
          title="AMC contracts ka safha"
          intro="AMC yaani saalana maintenance ka muahida — customer ek dafa paisa deta hai aur saal bhar muqarrar visits, labor ya parts free milte hain. Dukaan ke liye ye pehle se aaya hua paisa hai; customer ke liye be-fikri."
          blocks={[
            {
              title: 'Sab se ahem: tareekh guzri magar ACTIVE',
              tone: 'rose',
              tips: [
                'Jab contract ki tareekh guzar jati hai magar halat abhi "chal raha" likhi hoti hai, to us par muft visits hoti reh sakti hain — jabke paisa khatam ho chuka.',
                'Upar laal patti isi ka nishan hai. Ya renew karein ya "Khatam" ka nishan laga dein.',
              ],
            },
            {
              title: 'Renew ka paisa',
              tone: 'amber',
              tips: [
                '"Khatam Ho Rahe" tab me wo contract hain jo agle 60 din me khatam ho rahe hain — sab se qareeb sab se upar.',
                'WhatsApp ka button customer ka naam aur tareekh khud likh deta hai — bas bhej dein.',
                'Renew karte waqt nayi muddat aur nayi qeemat daalein; purana record waise ka waisa mehfooz rehta hai.',
              ],
            },
            {
              title: 'Qismein',
              tone: 'violet',
              tips: [
                'Basic sirf checking visits, Standard me labor free, Premium me gas refill bhi, Comprehensive me parts bhi.',
                'Jitna zyada cover, utni zyada qeemat — aur utna hi customer ka bharosa.',
              ],
            },
            {
              title: 'Bechne ki daleel',
              tone: 'emerald',
              tips: [
                '"Customer ne bachaya" wala number batata hai ke AMC walon ka kitna paisa bacha — agle customer ko yehi number dikhayein.',
                'Free visits khatam hone par contract se aage ka kaam alag bill par jata hai.',
              ],
            },
          ]}
          shortcuts={[
            { keys: '/', label: 'Search' }, { keys: 'N', label: 'Naya contract' },
            { keys: 'E', label: 'Khatam hone wale' }, { keys: 'A', label: 'Analytics' },
            { keys: 'L', label: 'Sab contract' }, { keys: 'P', label: 'Print' },
            { keys: 'G', label: 'Ye guide' }, { keys: 'Esc', label: 'Band karein' },
          ]}
          golden="Har mahine ek baar 'Khatam Ho Rahe' tab kholein aur sab ko WhatsApp kar dein — AMC ka renewal sab se sasta kaam aur sab se pakka paisa hai."
        />
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   CARD
   ═════════════════════════════════════════════════════════════ */
function ContractCard({ c, money, onRenew, onStatus, onRemind, reminding }: {
  c: AmcContract; money: (n: number) => string;
  onRenew: () => void; onStatus: () => void; onRemind: () => void; reminding: boolean;
}) {
  const type = amcTypeMeta(c.amcType);
  const status = AMC_STATUS_META[c.status] ?? AMC_STATUS_META.ACTIVE;
  const pending = Number(c.contractValue ?? 0) - Number(c.paidAmount ?? 0);
  const daysLeft = Math.floor((new Date(c.expiryDate).getTime() - Date.now()) / 86_400_000);
  const visitsLeft = Math.max(c.freeVisitsAllowed - c.freeVisitsUsed, 0);
  const visitPct = c.freeVisitsAllowed > 0 ? (c.freeVisitsUsed / c.freeVisitsAllowed) * 100 : 0;
  const stale = c.status === 'ACTIVE' && daysLeft < 0;

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-900 border-2 overflow-hidden transition hover:shadow-lg ${
      stale ? 'border-rose-300 dark:border-rose-500/40' : 'border-slate-200 dark:border-slate-800'
    }`}>
      <div className="h-1.5" style={{ background: type.hex }} />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono text-xs font-extrabold text-slate-500 dark:text-slate-400">{c.contractNumber}</div>
            <div className="font-black text-slate-900 dark:text-white truncate">{c.customerName}</div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
              {c.customerPhone}{c.productName ? ` · ${c.productName}` : ''}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge meta={type} size="xs" />
            <StatusBadge meta={status} size="xs" />
          </div>
        </div>

        {stale && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-2 text-[11px] font-extrabold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {Math.abs(daysLeft)} din pehle khatam ho chuka — halat theek karein
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5">
            <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Khatam</div>
            <div className="text-sm font-black text-slate-900 dark:text-white">{fmtDate(c.expiryDate)}</div>
            <div className={`text-[10px] font-extrabold ${daysLeft < 0 ? 'text-rose-600' : daysLeft <= 30 ? 'text-amber-600' : 'text-slate-400'}`}>
              {daysLeft < 0 ? `${Math.abs(daysLeft)} din guzre` : `${daysLeft} din baqi`}
            </div>
          </div>
          <div className={`rounded-xl p-2.5 ${pending > 0 ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10'}`}>
            <div className={`text-[9px] font-extrabold uppercase tracking-wider ${pending > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {pending > 0 ? 'Baqi paisa' : 'Poora mila'}
            </div>
            <div className={`text-sm font-black tabular-nums ${pending > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
              {money(pending > 0 ? pending : Number(c.contractValue ?? 0))}
            </div>
            <div className="text-[10px] font-bold text-slate-400">Kul {money(Number(c.contractValue ?? 0))}</div>
          </div>
        </div>

        {/* free visits */}
        <div>
          <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 dark:text-slate-400 mb-1">
            <span>Free visits</span>
            <span className="tabular-nums">{c.freeVisitsUsed} / {c.freeVisitsAllowed} · {visitsLeft} baqi</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${
              visitPct >= 100 ? 'bg-rose-500' : visitPct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
            }`} style={{ width: `${Math.min(visitPct, 100)}%` }} />
          </div>
        </div>

        {/* cover */}
        <div className="flex gap-1.5 flex-wrap text-[10px] font-extrabold">
          {c.laborCovered && <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">Labor free</span>}
          {c.freePartsAllowed && <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300">Parts free</span>}
          {c.gasRefillCovered && <span className="px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300">Gas free</span>}
          {c.autoRenew && <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">Auto renew</span>}
          {c.totalLaborSaved > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
              {money(c.totalLaborSaved)} bachaya
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={onRenew}
            className="flex-1 h-10 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow transition">
            <RotateCw className="h-3.5 w-3.5" /> Renew
          </button>
          <button onClick={onStatus} title="Halat badlein"
            className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition">
            <Edit3 className="h-4 w-4" />
          </button>
          <button onClick={onRemind} disabled={reminding} title="Reminder"
            className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center disabled:opacity-50 transition">
            <Bell className="h-4 w-4" />
          </button>
          {c.customerPhone && (
            <a href={`tel:${c.customerPhone}`} title="Call"
              className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center transition">
              <Phone className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   RENEW SHEET
   ═════════════════════════════════════════════════════════════ */
function RenewSheet({ c, pending, onClose, onSubmit }: {
  c: AmcContract; pending: boolean; onClose: () => void; onSubmit: (d: any) => void;
}) {
  const [months, setMonths] = useState(String(c.durationMonths || 12));
  const [value, setValue] = useState(String(c.contractValue || 0));
  const [paid, setPaid] = useState('');
  const [visits, setVisits] = useState(String(c.freeVisitsAllowed || 4));

  const v = Number(value) || 0;
  const p = Number(paid) || 0;
  const ok = Number(months) > 0 && v > 0;

  return (
    <Sheet title={`Renew — ${c.contractNumber}`} subtitle={`${c.customerName} · ab tak ${fmtDate(c.expiryDate)} tak tha`} onClose={onClose}>
      <div className="space-y-3">
        <div className="rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 border-2 border-cyan-200 dark:border-cyan-500/30 p-3 text-[12px] font-bold text-cyan-900 dark:text-cyan-200">
          Nayi muddat aaj ke baad se shuru hogi. Purana record waise ka waisa mehfooz rahega — sirf nayi tareekh, nayi qeemat aur nayi free visits set hongi.
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Kitne mahine">
            <input type="number" min={1} value={months} onChange={(e) => setMonths(e.target.value)}
              className={inputCls('h-12 text-base tabular-nums')} />
            <div className="flex gap-1.5 flex-wrap mt-1.5">
              {[6, 12, 24].map((m) => (
                <button key={m} type="button" onClick={() => setMonths(String(m))}
                  className={`px-3 py-1 rounded-lg text-[11px] font-extrabold border-2 transition ${
                    months === String(m) ? 'bg-cyan-600 border-cyan-600 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>{m} mahine</button>
              ))}
            </div>
          </Field>
          <Field label="Free visits">
            <input type="number" min={0} value={visits} onChange={(e) => setVisits(e.target.value)}
              className={inputCls('h-12 text-base tabular-nums')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nayi qeemat">
            <input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)}
              className={inputCls('h-12 text-base tabular-nums')} />
          </Field>
          <Field label="Abhi kitna liya" hint="baqi udhaar rahega">
            <input type="number" min={0} max={v} value={paid} onChange={(e) => setPaid(e.target.value)}
              placeholder="0" className={inputCls('h-12 text-base tabular-nums')} />
            <div className="flex gap-1.5 mt-1.5">
              <button type="button" onClick={() => setPaid(String(v))}
                className="px-3 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 transition">
                Poora
              </button>
              <button type="button" onClick={() => setPaid(String(Math.round(v / 2)))}
                className="px-3 py-1 rounded-lg text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition">
                Aadha
              </button>
            </div>
          </Field>
        </div>

        {v > 0 && (
          <div className={`rounded-xl p-3 text-center border-2 ${
            v - p > 0 ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40'
                      : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40'
          }`}>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              {v - p > 0 ? 'Baqi rahega' : 'Poora mil gaya'}
            </div>
            <div className="text-xl font-black tabular-nums text-slate-900 dark:text-white">
              {formatPKR(Math.max(v - p, 0))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1 h-12" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <button disabled={!ok || pending}
            onClick={() => onSubmit({
              durationMonths: Number(months),
              contractValue: v,
              paidAmount: p,
              freeVisitsAllowed: Number(visits) || 0,
            })}
            className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-700 disabled:opacity-40 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg transition">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
            Renew Karein
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/* ═════════════════════════════════════════════════════════════
   STATUS SHEET
   ═════════════════════════════════════════════════════════════ */
function StatusSheet({ c, pending, onClose, onSubmit }: {
  c: AmcContract; pending: boolean; onClose: () => void; onSubmit: (d: any) => void;
}) {
  const [status, setStatus] = useState<ApplianceAmcStatus>(c.status);
  const [reason, setReason] = useState('');

  return (
    <Sheet title={`Halat badlein — ${c.contractNumber}`} subtitle={c.customerName} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(AMC_STATUS_META) as ApplianceAmcStatus[]).map((k) => {
            const m = AMC_STATUS_META[k];
            return (
              <button key={k} onClick={() => setStatus(k)}
                className={`rounded-2xl border-2 p-3 text-left transition ${
                  status === k ? 'border-cyan-500 ring-2 ring-cyan-200 dark:ring-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10'
                               : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}>
                <div className="text-lg">{m.emoji}</div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">{m.label}</div>
              </button>
            );
          })}
        </div>

        <Field label="Wajah" hint="record ke liye — baad me kaam aati hai">
          <input value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Customer ne mana kar diya" className={inputCls()} />
        </Field>

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1 h-12" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <button disabled={pending || status === c.status}
            onClick={() => onSubmit({ status, reason: reason.trim() || undefined })}
            className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-700 disabled:opacity-40 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg transition">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Halat Badlein
          </button>
        </div>
      </div>
    </Sheet>
  );
}
