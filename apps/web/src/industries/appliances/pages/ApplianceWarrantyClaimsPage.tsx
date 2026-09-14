import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck, Search, X, RefreshCw, Wallet, TrendingUp, AlertTriangle,
  Loader2, CheckCircle2, Send, Banknote, FileDown, Printer, Package,
  ChevronLeft, ChevronRight, Clock, Building2, Trash2, Plus, Percent,
  BarChart3, Wrench, Phone, CalendarDays, Pencil,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import {
  warrantyClaimsApi, type WarrantyClaim, type MissingClaim,
} from '../api/warranty-claims.api';
import {
  ApplianceHero, Kpi, Panel, Teacher, Empty, Sheet, Field, inputCls, ChipRow,
  StatusBadge, useShortcuts, printHtml, downloadCsv, a4Shell, escapeHtml,
  toDateInput, fmtDate, fmtDateTime, guideAction, printAction, Kbd,
} from '../components/shared';
import { claimStatusMeta, warrantyKindMeta, CLAIM_STATUS_ORDER } from '../constants';

/* ═════════════════════════════════════════════════════════════
   WARRANTY CLAIMS — brand se paisa wapas lena
   ─────────────────────────────────────────────────────────────
   Warranty wala repair dukaan FREE karti hai: parts aur labor ka
   kharcha apni jeb se. Us ke baad company se wo paisa claim kiya
   jata hai.

   Ab tak iska koi record hi nahi tha — sirf service request par
   ek khali `warrantyClaimNumber` ka khana. Natija: wo paisa aksar
   zaya ho jata tha aur kisi ko pata bhi nahi chalta tha.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'claims' | 'missing' | 'brands';

const TOOLTIP: React.CSSProperties = {
  borderRadius: 12, border: '2px solid #334155', background: '#0f172a',
  color: '#fff', fontSize: 12, fontWeight: 700,
};

export default function ApplianceWarrantyClaimsPage() {
  const qc = useQueryClient();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Meri Dukaan';
  const shopPhone = useAuthStore((s: any) => s.tenant?.phone || '');
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('claims');
  const [showTeacher, setShowTeacher] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['appliance-claims'] });
    qc.invalidateQueries({ queryKey: ['appliance-claim-summary'] });
    qc.invalidateQueries({ queryKey: ['appliance-claims-missing'] });
  };

  const { data: summary } = useQuery({
    queryKey: ['appliance-claim-summary'],
    queryFn: warrantyClaimsApi.summary,
  });

  const params = { search: search.trim() || undefined, status: status ?? undefined, page, limit: 50 };
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['appliance-claims', params],
    queryFn: () => warrantyClaimsApi.list(params),
    enabled: tab === 'claims',
  });

  const { data: missing } = useQuery({
    queryKey: ['appliance-claims-missing'],
    queryFn: warrantyClaimsApi.missing,
  });

  const rows = data?.items ?? [];
  const m = summary?.money;

  const fromServiceMut = useMutation({
    mutationFn: (serviceRequestId: string) => warrantyClaimsApi.fromService(serviceRequestId),
    onSuccess: (c) => { toast.success(`Claim ${c.claimNumber} ban gaya ✓`); invalidate(); setDetailId(c.id); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Claim nahi bana'),
  });

  const exportCsv = () => {
    if (!rows.length) return toast.error('Koi claim nahi');
    downloadCsv(`warranty-claims-${toDateInput(new Date())}.csv`, [
      [`Warranty Claims — ${shopName}`],
      [`Nikala gaya: ${new Date().toLocaleString('en-PK')}`],
      m ? [`Claim kiya ${m.claimed.toFixed(0)} • Mila ${m.received.toFixed(0)} • Baqi ${m.pending.toFixed(0)} • Recovery ${m.recoveryRate.toFixed(1)}%`] : [],
      [],
      ['Claim #', 'Tareekh', 'Halat', 'Brand', 'Cheez', 'Serial', 'Warranty ki qism',
       'Customer', 'Phone', 'Repair #', 'Parts', 'Labor', 'Baqi kharcha',
       'Claim ki raqam', 'Brand ne manzoor', 'Paisa mila', 'Baqi', 'Brand ref', 'Din'],
      ...rows.map((c) => [
        c.claimNumber, fmtDate(c.claimDate), claimStatusMeta(c.status).label,
        c.brandName ?? '', c.productName, c.serialNumber ?? '',
        warrantyKindMeta(c.warrantyKind).label,
        c.customerName, c.customerPhone ?? '', c.serviceRequestNumber ?? '',
        c.partsCost, c.laborCost, c.otherCost,
        c.claimedAmount, c.approvedAmount, c.receivedAmount,
        c.pendingAmount ?? Math.max(c.claimedAmount - c.receivedAmount, 0),
        c.brandRef ?? '', c.ageDays ?? '',
      ]),
    ]);
    toast.success(`${rows.length} claims export ho gaye`);
  };

  const printA4 = () => {
    if (!rows.length) return toast.error('Koi claim nahi');
    const body = `
      <h2 class="sec">🛡️ Warranty Claims</h2>
      <table>
        <thead><tr>
          <th>#</th><th>Claim / Tareekh</th><th>Brand</th><th>Cheez / Serial</th>
          <th class="c">Halat</th><th class="r">Claim</th><th class="r">Mila</th><th class="r">Baqi</th>
        </tr></thead>
        <tbody>
          ${rows.map((c, i) => {
            const pend = c.pendingAmount ?? Math.max(c.claimedAmount - c.receivedAmount, 0);
            return `
            <tr>
              <td class="num">${i + 1}</td>
              <td><div class="main">${escapeHtml(c.claimNumber)}</div><div class="sub">${fmtDate(c.claimDate)}${c.ageDays ? ` • ${c.ageDays} din` : ''}</div></td>
              <td>${escapeHtml(c.brandName ?? '—')}${c.brandRef ? `<div class="sub">${escapeHtml(c.brandRef)}</div>` : ''}</td>
              <td><div class="main">${escapeHtml(c.productName)}</div>${c.serialNumber ? `<div class="sub">${escapeHtml(c.serialNumber)}</div>` : ''}</td>
              <td class="c"><span class="pill">${escapeHtml(claimStatusMeta(c.status).label)}</span></td>
              <td class="r">${formatPKR(c.claimedAmount)}</td>
              <td class="r" style="color:#065f46">${formatPKR(c.receivedAmount)}</td>
              <td class="r" style="color:${pend > 0 ? '#b91c1c' : '#059669'}">${pend > 0 ? formatPKR(pend) : 'Clear ✓'}</td>
            </tr>`;
          }).join('')}
          <tr class="grand">
            <td colspan="5" style="text-align:right;padding-right:12px;">KUL</td>
            <td class="r" style="color:#a5f3fc !important;">${formatPKR(rows.reduce((s, c) => s + c.claimedAmount, 0))}</td>
            <td class="r" style="color:#86efac !important;">${formatPKR(rows.reduce((s, c) => s + c.receivedAmount, 0))}</td>
            <td class="r" style="color:#fca5a5 !important;">${formatPKR(rows.reduce((s, c) => s + Math.max(c.claimedAmount - c.receivedAmount, 0), 0))}</td>
          </tr>
        </tbody>
      </table>`;

    const ok = printHtml(a4Shell({
      title: `Warranty Claims — ${shopName}`,
      heading: '🛡️ Warranty Claims',
      shopName, shopPhone, badge: 'Brand Recovery',
      kpis: [
        { label: '📋 Claims', value: String(summary?.total ?? rows.length), sub: `${summary?.open ?? 0} khule`, tone: 'blue' },
        { label: '💰 Claim Kiya', value: formatPKR(m?.claimed ?? 0), tone: 'amber' },
        { label: '✅ Paisa Mila', value: formatPKR(m?.received ?? 0), sub: `${(m?.recoveryRate ?? 0).toFixed(0)}% recovery`, tone: 'green' },
        { label: '⏳ Brand Ke Paas', value: formatPKR(m?.pending ?? 0), tone: 'rose' },
      ],
      body,
    }));
    if (!ok) toast.error('Popup block hai — allow karein');
  };

  useShortcuts({
    '/': () => { setTab('claims'); setTimeout(() => searchRef.current?.focus(), 0); },
    t: () => setShowTeacher(true),
    p: () => printA4(),
    m: () => setTab('missing'),
    Escape: () => {
      if (detailId) setDetailId(null);
      else if (showTeacher) setShowTeacher(false);
    },
  }, [showTeacher, detailId, rows]);

  const brandChart = useMemo(
    () => (summary?.byBrand ?? []).slice(0, 10).map((b) => ({
      name: b.brand.length > 14 ? `${b.brand.slice(0, 13)}…` : b.brand,
      claim: b.claimed,
      mila: b.received,
      rate: b.recoveryRate,
    })),
    [summary],
  );

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <ClaimTeacher onClose={() => setShowTeacher(false)} />}
      {detailId && (
        <ClaimDetailSheet id={detailId} onClose={() => setDetailId(null)} onChanged={invalidate}
          shopName={shopName} shopPhone={shopPhone} />
      )}

      <ApplianceHero
        badge="Brand Recovery"
        badgeIcon={<ShieldCheck className="h-3.5 w-3.5 text-amber-300" />}
        title="🛡️ Warranty Claims"
        subtitle={
          m ? (
            <>
              <strong className="text-amber-300">{formatPKR(m.pending)}</strong> brand ke paas atka hua
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-emerald-300">{formatPKR(m.received)}</strong> wapas mil chuka
              {(summary?.missing.count ?? 0) > 0 && (
                <><span className="opacity-50 mx-1.5">•</span><strong className="text-rose-300">{summary!.missing.count}</strong> claim banaya hi nahi</>
              )}
            </>
          ) : 'Warranty me free kiya gaya kaam — brand se paisa wapas lein'
        }
        actions={[
          guideAction(() => setShowTeacher(true)),
          { key: 'refresh', label: 'Refresh', icon: <RefreshCw className="h-4 w-4" />, onClick: () => refetch(), spinning: isFetching, hideLabelOnMobile: true },
          { key: 'csv', label: 'CSV', icon: <FileDown className="h-4 w-4" />, onClick: exportCsv, disabled: !rows.length, hideLabelOnMobile: true },
          printAction(printA4, !rows.length),
        ]}
        shortcuts={[
          { keys: '/', label: 'Search' }, { keys: 'P', label: 'Print' },
          { keys: 'T', label: 'Guide' }, { keys: 'Esc', label: 'Band' },
        ]}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={Wallet} tone="amber" label="Brand Ke Paas Atka" value={formatPKR(m?.pending ?? 0)}
          sub={`${summary?.open ?? 0} claim khule hain`} alert={(m?.pending ?? 0) > 0} />
        <Kpi icon={CheckCircle2} tone="emerald" label="Wapas Mil Chuka" value={formatPKR(m?.received ?? 0)}
          sub={`${(m?.recoveryRate ?? 0).toFixed(0)}% recovery rate`} />
        <Kpi icon={AlertTriangle} tone="rose" label="Claim Banaya Hi Nahi"
          value={summary?.missing.count ?? 0}
          sub={`${formatPKR(summary?.missing.recoverable ?? 0)} zaya ho raha hai`}
          alert={(summary?.missing.count ?? 0) > 0}
          onClick={() => setTab('missing')} active={tab === 'missing'} />
        <Kpi icon={Clock} tone="violet" label="30 Din Se Latke" value={summary?.stale ?? 0}
          sub={summary?.avgSettleDays ? `ausat ${summary.avgSettleDays.toFixed(0)} din lagte hain` : 'brand ko yaad dilayein'} />
      </section>

      {(m?.shortfall ?? 0) > 0 && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 flex items-start gap-2.5">
          <Percent className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
            Brand ne kul <strong>{formatPKR(m!.shortfall)}</strong> kaat diya — yani jitna claim kiya tha
            us se itna kam manzoor hua. Jis brand ka ye number bara ho, uske sath rate dobara tay karein.
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-sm">
          <TabBtn active={tab === 'claims'} onClick={() => setTab('claims')} icon={ShieldCheck} label="Claims" badge={summary?.total} />
          <TabBtn active={tab === 'missing'} onClick={() => setTab('missing')} icon={AlertTriangle} label="Banaya Nahi" badge={summary?.missing.count} alert />
          <TabBtn active={tab === 'brands'} onClick={() => setTab('brands')} icon={Building2} label="Brand Wise" />
        </div>
      </div>

      {/* ═══ CLAIMS ═══ */}
      {tab === 'claims' && (
        <>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input ref={searchRef} className={inputCls('h-12 pl-10 pr-10 text-sm font-semibold')}
                placeholder="Claim #, customer, serial, brand ref... (/)"
                value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
            <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums px-1">
              {data?.meta.total ?? 0} claims
            </div>
          </div>

          <ChipRow
            options={CLAIM_STATUS_ORDER.map((s) => ({
              value: s, label: claimStatusMeta(s).label, emoji: claimStatusMeta(s).emoji,
              count: summary?.byStatus?.[s],
            }))}
            value={status} onChange={(v) => { setStatus(v); setPage(1); }} allLabel={`Sab (${summary?.total ?? 0})`} />

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
            </div>
          ) : rows.length === 0 ? (
            <Empty
              icon={ShieldCheck}
              title={search || status ? 'Koi claim nahi mila' : 'Abhi koi claim nahi'}
              hint={
                search || status
                  ? 'Search ya filter badal kar dekhein'
                  : 'Jab koi warranty wala repair mukammal ho, "Banaya Nahi" tab se ek click me claim ban jata hai'
              }
              action={
                (summary?.missing.count ?? 0) > 0
                  ? <Button className="bg-gradient-to-r from-cyan-600 to-teal-700 font-extrabold" onClick={() => setTab('missing')}>
                      <AlertTriangle className="h-4 w-4" /> {summary!.missing.count} repair ka claim banayein
                    </Button>
                  : undefined
              }
            />
          ) : (
            <div className="space-y-2">
              {rows.map((c) => <ClaimCard key={c.id} c={c} onOpen={() => setDetailId(c.id)} />)}
            </div>
          )}

          {data && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between flex-wrap gap-2 bg-white dark:bg-slate-900/80 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-4">
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-bold">
                Page <strong className="text-slate-900 dark:text-white">{data.meta.page}</strong> / <strong className="text-slate-900 dark:text-white">{data.meta.totalPages}</strong>
              </div>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                  className="h-10 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1">
                  <ChevronLeft className="h-4 w-4" /> Pehle
                </button>
                <button disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}
                  className="h-10 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1">
                  Agla <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ MISSING ═══ */}
      {tab === 'missing' && (
        <>
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs font-bold text-rose-900 dark:text-rose-200">
              Ye wo <strong>warranty repairs</strong> hain jo aap ne free kiye — parts aur labor ka kharcha
              aap ne bhara — lekin <strong>brand se claim banaya hi nahi</strong>.
              Kul <strong className="text-sm">{formatPKR(missing?.totalRecoverable ?? 0)}</strong> wapas mil sakta hai.
            </div>
          </div>

          {(missing?.items ?? []).length === 0 ? (
            <Empty icon={CheckCircle2} title="Har warranty repair ka claim ban chuka hai 🎉"
              hint="Koi paisa zaya nahi ho raha — behtareen." />
          ) : (
            <div className="space-y-2">
              {missing!.items.map((r) => (
                <MissingCard key={r.id} r={r}
                  pending={fromServiceMut.isPending}
                  onMake={() => fromServiceMut.mutate(r.id)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══ BRAND WISE ═══ */}
      {tab === 'brands' && (
        <>
          <Panel icon={Building2} title="Kaunsa Brand Paisa Deta Hai" hint="Recovery rate jitna kam, brand utna sust" tone="violet">
            {brandChart.length === 0 ? (
              <p className="text-xs font-bold text-slate-400 py-8 text-center">Abhi koi claim nahi</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(240, brandChart.length * 38)}>
                <BarChart data={brandChart} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8"
                    tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <Bar dataKey="claim" name="Claim kiya" fill="#f59e0b" radius={[0, 5, 5, 0]} />
                  <Bar dataKey="mila" name="Paisa mila" fill="#10b981" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel icon={BarChart3} title="Brand Ka Record" tone="cyan">
            {(summary?.byBrand ?? []).length === 0 ? (
              <p className="text-xs font-bold text-slate-400 py-8 text-center">Abhi koi claim nahi</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700">
                      <Th className="text-left">Brand</Th>
                      <Th className="text-center">Claims</Th>
                      <Th className="text-right">Claim Kiya</Th>
                      <Th className="text-right">Mila</Th>
                      <Th className="text-right">Baqi</Th>
                      <Th className="text-center pr-4">Recovery</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary!.byBrand.map((b) => (
                      <tr key={b.brand} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="px-3 py-2.5 text-[13px] font-extrabold text-slate-900 dark:text-white">{b.brand}</td>
                        <td className="px-3 py-2.5 text-center text-xs font-bold tabular-nums text-slate-600 dark:text-slate-300">{b.claims}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatPKR(b.claimed)}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{formatPKR(b.received)}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-extrabold tabular-nums text-rose-700 dark:text-rose-400 whitespace-nowrap">
                          {formatPKR(Math.max(b.claimed - b.received, 0))}
                        </td>
                        <td className="px-3 py-2.5 pr-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                            b.recoveryRate >= 80 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                              : b.recoveryRate >= 40 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                              : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                          }`}>{b.recoveryRate.toFixed(0)}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label, badge, alert }: any) {
  return (
    <button onClick={onClick}
      className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
        active ? 'bg-slate-900 dark:bg-cyan-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}>
      <Icon className="h-4 w-4" /> {label}
      {badge ? (
        <span className={`px-1.5 rounded-full text-[9px] tabular-nums ${
          active ? 'bg-white/25' : alert ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-700'
        }`}>{badge}</span>
      ) : null}
    </button>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

/* ═════════════ CLAIM CARD ═════════════ */
function ClaimCard({ c, onOpen }: { c: WarrantyClaim; onOpen: () => void }) {
  const st = claimStatusMeta(c.status);
  const wk = warrantyKindMeta(c.warrantyKind);
  const pending = c.pendingAmount ?? Math.max(c.claimedAmount - c.receivedAmount, 0);
  const stale = st.isOpen && (c.ageDays ?? 0) > 30;

  return (
    <button onClick={onOpen}
      className={`w-full text-left rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all p-3 sm:p-4 group ${
        stale ? 'border-rose-300 dark:border-rose-500/40' : 'border-slate-200 dark:border-slate-800 hover:border-cyan-300'
      }`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-xs font-extrabold text-cyan-700 dark:text-cyan-400">{c.claimNumber}</span>
            <StatusBadge meta={st} size="xs" />
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {wk.emoji} {wk.label}
            </span>
            {stale && (
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-600 text-white">
                {c.ageDays} DIN SE LATKA
              </span>
            )}
          </div>
          <div className="mt-1 text-[13px] font-extrabold text-slate-900 dark:text-white truncate group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition">
            {c.productName}
          </div>
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
            {c.brandName ? `${c.brandName} • ` : ''}{c.customerName}
            {c.serialNumber ? ` • 🔖 ${c.serialNumber}` : ''}
            {c.serviceRequestNumber ? ` • ${c.serviceRequestNumber}` : ''}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Claim</div>
          <div className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">{formatPKR(c.claimedAmount)}</div>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        <Cell label="Parts" value={formatPKR(c.partsCost)} />
        <Cell label="Labor" value={formatPKR(c.laborCost)} />
        <Cell
          label={c.status === 'SETTLED' ? 'Mila' : 'Baqi'}
          value={c.status === 'SETTLED' ? formatPKR(c.receivedAmount) : formatPKR(pending)}
          tone={c.status === 'SETTLED' ? 'emerald' : 'rose'}
        />
      </div>

      <div className="mt-2 flex items-center gap-2 flex-wrap text-[10px] font-bold text-slate-400 dark:text-slate-500">
        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmtDate(c.claimDate)}</span>
        {c.brandRef && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{c.brandRef}</span>}
        {c.approvedAmount > 0 && c.approvedAmount < c.claimedAmount && (
          <span className="text-amber-600 dark:text-amber-400">
            ➗ {formatPKR(c.claimedAmount - c.approvedAmount)} kaat diya
          </span>
        )}
        <ChevronRight className="h-3.5 w-3.5 ml-auto group-hover:translate-x-0.5 transition" />
      </div>
    </button>
  );
}

function Cell({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'emerald' | 'rose' }) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    rose: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300',
  };
  return (
    <div className={`rounded-lg border px-2 py-1.5 ${tones[tone]}`}>
      <div className="text-[9px] font-extrabold uppercase tracking-wider opacity-75">{label}</div>
      <div className="text-[11px] font-extrabold tabular-nums truncate">{value}</div>
    </div>
  );
}

/* ═════════════ MISSING CARD ═════════════ */
function MissingCard({ r, pending, onMake }: { r: MissingClaim; pending: boolean; onMake: () => void }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-rose-200 dark:border-rose-500/30 shadow-sm p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[11px] font-extrabold text-amber-700 dark:text-amber-400">{r.requestNumber}</span>
            {r.serialNumber && (
              <span className="font-mono text-[9px] font-bold text-slate-400">🔖 {r.serialNumber}</span>
            )}
            {r.ageDays > 60 && (
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-600 text-white">
                {r.ageDays} DIN PURANA
              </span>
            )}
          </div>
          <div className="mt-1 text-[13px] font-extrabold text-slate-900 dark:text-white truncate">{r.productName}</div>
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
            {r.customerName} • {r.issueCategory || r.reportedIssue}
            {r.technicianName ? ` • ${r.technicianName}` : ''}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Wapas mil sakta</div>
          <div className="text-xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">{formatPKR(r.recoverable)}</div>
          <div className="text-[9px] font-bold text-slate-400">
            parts {formatPKR(r.partsCharge)} + labor {formatPKR(r.laborCharge + r.visitCharge)}
          </div>
        </div>
      </div>

      <button onClick={onMake} disabled={pending}
        className="mt-3 w-full h-11 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-700 hover:from-cyan-500 hover:to-teal-600 disabled:opacity-50 text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30 transition active:scale-[0.98]">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Claim Banayein — tafseel khud bhar jayegi
      </button>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   DETAIL — claim ka poora safar
   ═════════════════════════════════════════════════════════════ */
function ClaimDetailSheet({ id, onClose, onChanged, shopName, shopPhone }: any) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'view' | 'submit' | 'response' | 'settle' | 'costs'>('view');

  const { data: c, isLoading } = useQuery({
    queryKey: ['appliance-claim', id],
    queryFn: () => warrantyClaimsApi.getOne(id),
  });

  const after = (msg: string) => {
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ['appliance-claim', id] });
    onChanged();
    setMode('view');
  };
  const fail = (e: any) => toast.error(e?.response?.data?.message || 'Kaam nahi hua');

  const submitMut = useMutation({ mutationFn: (v: any) => warrantyClaimsApi.submit(id, v), onSuccess: () => after('Brand ko bhej diya ✓'), onError: fail });
  const respMut = useMutation({ mutationFn: (v: any) => warrantyClaimsApi.brandResponse(id, v), onSuccess: () => after('Brand ka jawab darj ✓'), onError: fail });
  const settleMut = useMutation({ mutationFn: (v: any) => warrantyClaimsApi.settle(id, v), onSuccess: () => after('Paisa darj ho gaya ✓'), onError: fail });
  const costMut = useMutation({ mutationFn: (v: any) => warrantyClaimsApi.update(id, v), onSuccess: () => after('Kharcha update ✓'), onError: fail });
  const delMut = useMutation({
    mutationFn: () => warrantyClaimsApi.remove(id),
    onSuccess: () => { toast.success('Claim delete ho gaya'); onChanged(); onClose(); }, onError: fail,
  });

  if (isLoading || !c) {
    return (
      <Sheet wide badge="Claim" title="Khul raha hai…" onClose={onClose}>
        <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-500" /></div>
      </Sheet>
    );
  }

  const st = claimStatusMeta(c.status);
  const wk = warrantyKindMeta(c.warrantyKind);
  const pending = c.pendingAmount ?? Math.max(c.claimedAmount - c.receivedAmount, 0);

  /** Brand ko bhejne wala kaghaz */
  const printClaimLetter = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(c.claimNumber)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; font-size: 11.5px; line-height: 1.6;
    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .head { border-bottom: 3px double #0f766e; padding-bottom: 12px; margin-bottom: 16px;
    display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
  .shop { font-size: 20px; font-weight: 800; color: #0f766e; }
  .sub { font-size: 10px; color: #64748b; }
  .no { text-align: right; }
  .no .l { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.4px; color: #64748b; }
  .no .v { font-size: 16px; font-weight: 800; }
  h1 { font-size: 14px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;
    text-align: center; margin: 14px 0; color: #0f766e; }
  h2 { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px;
    color: #0f766e; margin: 14px 0 4px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 5px 4px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  td.k { width: 32%; font-weight: 700; color: #475569; font-size: 10.5px; }
  td.v { font-weight: 700; }
  .money { margin-top: 10px; margin-left: auto; width: 60%; }
  .money .row { display: flex; justify-content: space-between; padding: 5px 8px; font-size: 11px; }
  .money .row.g { background: #0f766e; color: #fff; font-weight: 800; font-size: 14px;
    border-radius: 6px; margin-top: 4px; padding: 9px 12px; }
  .note { margin-top: 14px; background: #f8fafc; border-left: 3px solid #0f766e; padding: 9px 12px; font-size: 10px; }
  .signs { display: flex; justify-content: space-between; margin-top: 46px; gap: 40px; }
  .sg { flex: 1; border-top: 1.5px solid #0f172a; padding-top: 5px; text-align: center; font-size: 10px; font-weight: 700; }
  .foot { margin-top: 16px; text-align: center; font-size: 9px; color: #64748b; }
</style></head><body>
  <div class="head">
    <div>
      <div class="shop">${escapeHtml(shopName)}</div>
      ${shopPhone ? `<div class="sub">📞 ${escapeHtml(shopPhone)}</div>` : ''}
    </div>
    <div class="no">
      <div class="l">Claim Number</div>
      <div class="v">${escapeHtml(c.claimNumber)}</div>
      <div class="sub">${fmtDate(c.claimDate)}</div>
    </div>
  </div>

  <h1>Warranty Claim — ${escapeHtml(c.brandName ?? 'Brand')}</h1>

  <h2>Unit Ki Tafseel</h2>
  <table>
    <tr><td class="k">Product</td><td class="v">${escapeHtml(c.productName)}</td></tr>
    ${c.modelNumber ? `<tr><td class="k">Model</td><td class="v">${escapeHtml(c.modelNumber)}</td></tr>` : ''}
    ${c.serialNumber ? `<tr><td class="k">Serial Number</td><td class="v" style="font-family:monospace;">${escapeHtml(c.serialNumber)}</td></tr>` : ''}
    ${c.purchaseDate ? `<tr><td class="k">Bikne ki tareekh</td><td class="v">${fmtDate(c.purchaseDate)}</td></tr>` : ''}
    ${c.invoiceNumber ? `<tr><td class="k">Invoice</td><td class="v">${escapeHtml(c.invoiceNumber)}</td></tr>` : ''}
    <tr><td class="k">Warranty ki qism</td><td class="v">${escapeHtml(wk.label)}</td></tr>
  </table>

  <h2>Customer</h2>
  <table>
    <tr><td class="k">Naam</td><td class="v">${escapeHtml(c.customerName)}</td></tr>
    ${c.customerPhone ? `<tr><td class="k">Phone</td><td class="v">${escapeHtml(c.customerPhone)}</td></tr>` : ''}
  </table>

  <h2>Kya Kharabi Thi aur Kya Kiya</h2>
  <table>
    <tr><td class="k">Kharabi</td><td class="v">${escapeHtml(c.issue)}</td></tr>
    ${c.issueCategory ? `<tr><td class="k">Qism</td><td class="v">${escapeHtml(c.issueCategory)}</td></tr>` : ''}
    ${c.service?.workDone ? `<tr><td class="k">Kaam kiya</td><td class="v">${escapeHtml(c.service.workDone)}</td></tr>` : ''}
    ${c.service?.technicianName ? `<tr><td class="k">Technician</td><td class="v">${escapeHtml(c.service.technicianName)}</td></tr>` : ''}
    ${c.service?.completedAt ? `<tr><td class="k">Mukammal hua</td><td class="v">${fmtDate(c.service.completedAt)}</td></tr>` : ''}
    ${c.serviceRequestNumber ? `<tr><td class="k">Service Request</td><td class="v">${escapeHtml(c.serviceRequestNumber)}</td></tr>` : ''}
  </table>

  <h2>Kharcha</h2>
  <div class="money">
    <div class="row"><span>Parts</span><span>${formatPKR(c.partsCost)}</span></div>
    <div class="row"><span>Labor / visit</span><span>${formatPKR(c.laborCost)}</span></div>
    ${c.otherCost > 0 ? `<div class="row"><span>Baqi kharcha</span><span>${formatPKR(c.otherCost)}</span></div>` : ''}
    <div class="row g"><span>KUL CLAIM</span><span>${formatPKR(c.claimedAmount)}</span></div>
  </div>

  <div class="note">
    Mohtaram, ye unit warranty ke arse me kharab hua aur hamari dukaan ne customer se koi paisa liye
    baghair theek kiya. Bara-e-meherbani upar likhi hui raqam ki adaigi ki jaye ya parts ka replacement
    bheja jaye. Zaroori kaghazat (invoice, service report, tasaweer) sath mansooba hain.
  </div>

  <div class="signs">
    <div class="sg">${escapeHtml(shopName)} ki janib se</div>
    <div class="sg">${escapeHtml(c.brandName ?? 'Brand')} ki janib se — wusooli</div>
  </div>
  <div class="foot">Powered by <strong>Nafaa POS</strong> — ${new Date().getFullYear()}</div>
  <script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>
</body></html>`;
    if (!printHtml(html)) toast.error('Popup block hai — allow karein');
  };

  const timeline = [
    { at: c.claimDate, label: 'Claim bana', emoji: '📝' },
    { at: c.submittedAt, label: `Brand ko bheja${c.brandRef ? ` — ref ${c.brandRef}` : ''}`, emoji: '📤' },
    { at: c.brandRespondedAt, label: `Brand ka jawab${c.approvedAmount > 0 ? ` — ${formatPKR(c.approvedAmount)} manzoor` : ''}`, emoji: '💬' },
    { at: c.settledAt, label: `Paisa mila — ${formatPKR(c.receivedAmount)}`, emoji: '💰' },
  ].filter((t) => t.at);

  return (
    <Sheet
      wide
      badge={st.label}
      icon={<span>{st.emoji}</span>}
      title={c.claimNumber}
      subtitle={<span>{c.productName}{c.brandName ? ` • ${c.brandName}` : ''}</span>}
      onClose={onClose}
      footer={
        <div className="flex gap-2 flex-wrap">
          <button onClick={printClaimLetter}
            className="h-11 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1.5 transition">
            <Printer className="h-4 w-4" /> Claim Letter
          </button>
          {c.status === 'DRAFT' && (
            <>
              <button onClick={() => setMode('costs')}
                className="h-11 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1.5 transition">
                <Pencil className="h-4 w-4" /> Kharcha
              </button>
              <button onClick={() => { if (confirm('Ye claim delete karein?')) delMut.mutate(); }}
                className="h-11 px-4 rounded-xl border-2 border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-extrabold inline-flex items-center gap-1.5 transition">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
              <button onClick={() => setMode('submit')}
                className="flex-1 min-w-[150px] h-11 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/30 transition">
                <Send className="h-4 w-4" /> Brand Ko Bhejein
              </button>
            </>
          )}
          {['SUBMITTED', 'BRAND_REVIEWING'].includes(c.status) && (
            <button onClick={() => setMode('response')}
              className="flex-1 min-w-[150px] h-11 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-700 hover:from-cyan-500 hover:to-teal-600 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/30 transition">
              <CheckCircle2 className="h-4 w-4" /> Brand Ka Jawab Darj Karein
            </button>
          )}
          {['APPROVED', 'PARTIALLY_APPROVED'].includes(c.status) && (
            <button onClick={() => setMode('settle')}
              className="flex-1 min-w-[150px] h-11 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 transition">
              <Banknote className="h-4 w-4" /> Paisa Mil Gaya
            </button>
          )}
        </div>
      }
    >
      {mode === 'costs' && (
        <CostForm claim={c} pending={costMut.isPending}
          onCancel={() => setMode('view')} onSubmit={(v: any) => costMut.mutate(v)} />
      )}
      {mode === 'submit' && (
        <SubmitForm claim={c} pending={submitMut.isPending}
          onCancel={() => setMode('view')} onSubmit={(v: any) => submitMut.mutate(v)} />
      )}
      {mode === 'response' && (
        <ResponseForm claim={c} pending={respMut.isPending}
          onCancel={() => setMode('view')} onSubmit={(v: any) => respMut.mutate(v)} />
      )}
      {mode === 'settle' && (
        <SettleForm claim={c} pending={settleMut.isPending}
          onCancel={() => setMode('view')} onSubmit={(v: any) => settleMut.mutate(v)} />
      )}

      {mode === 'view' && (
        <div className="space-y-4">
          <Panel icon={Wallet} title="Paisa" hint="Dukaan ne kitna lagaya, brand ne kitna diya"
            tone={c.status === 'SETTLED' ? 'emerald' : pending > 0 ? 'rose' : 'cyan'}
            right={<StatusBadge meta={st} size="md" />}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Box label="Parts" value={formatPKR(c.partsCost)} />
              <Box label="Labor / visit" value={formatPKR(c.laborCost)} />
              <Box label="Baqi kharcha" value={formatPKR(c.otherCost)} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Box label="Claim kiya" value={formatPKR(c.claimedAmount)} tone="cyan" />
              <Box label="Brand ne manzoor" value={c.approvedAmount > 0 ? formatPKR(c.approvedAmount) : '—'} tone="amber" />
              <Box label="Paisa mila" value={formatPKR(c.receivedAmount)} tone="emerald" />
            </div>
            {pending > 0 && (
              <div className="mt-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-2.5 text-xs font-bold text-rose-800 dark:text-rose-200">
                ⏳ <strong className="text-sm">{formatPKR(pending)}</strong> abhi brand ke paas hai
                {(c.ageDays ?? 0) > 30 && ` — ${c.ageDays} din ho gaye, yaad dilayein`}
              </div>
            )}
            {c.approvedAmount > 0 && c.approvedAmount < c.claimedAmount && (
              <div className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-2.5 text-xs font-bold text-amber-800 dark:text-amber-200">
                ➗ Brand ne <strong>{formatPKR(c.claimedAmount - c.approvedAmount)}</strong> kaat diya
                {c.brandResponse ? ` — "${c.brandResponse}"` : ''}
              </div>
            )}
            {c.status === 'REJECTED' && c.rejectionReason && (
              <div className="mt-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-2.5 text-xs font-bold text-rose-800 dark:text-rose-200">
                ❌ Mana karne ki wajah: {c.rejectionReason}
              </div>
            )}
          </Panel>

          <Panel icon={Package} title="Unit" tone="blue">
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <Row label="Product" value={c.productName} />
              <Row label="Brand" value={c.brandName ?? '—'} />
              {c.modelNumber && <Row label="Model" value={c.modelNumber} />}
              {c.serialNumber && <Row label="Serial" value={c.serialNumber} />}
              <Row label="Warranty ki qism" value={`${wk.emoji} ${wk.label}`} />
              {c.purchaseDate && <Row label="Bika" value={fmtDate(c.purchaseDate)} />}
              {c.invoiceNumber && <Row label="Invoice" value={c.invoiceNumber} />}
              <Row label="Customer" value={`${c.customerName}${c.customerPhone ? ` — ${c.customerPhone}` : ''}`} />
            </div>
            {c.serial && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Box label="Main warranty" value={c.serial.warrantyEndDate ? fmtDate(c.serial.warrantyEndDate) : '—'} />
                <Box label="Compressor" value={c.serial.compressorWarrantyEndDate ? fmtDate(c.serial.compressorWarrantyEndDate) : '—'} />
                <Box label="Motor" value={c.serial.motorWarrantyEndDate ? fmtDate(c.serial.motorWarrantyEndDate) : '—'} />
              </div>
            )}
          </Panel>

          {c.service && (
            <Panel icon={Wrench} title="Jis Repair Se Juda Hai" hint={c.service.requestNumber} tone="amber">
              <div className="space-y-2 text-xs">
                <Row label="Kharabi" value={c.service.reportedIssue} />
                {c.service.diagnosedIssue && <Row label="Asal masla" value={c.service.diagnosedIssue} />}
                {c.service.workDone && <Row label="Kaam kiya" value={c.service.workDone} />}
                {Array.isArray(c.service.partsReplaced) && c.service.partsReplaced.length > 0 && (
                  <Row label="Parts badle" value={c.service.partsReplaced.map((p: any) => p?.name ?? String(p)).join(', ')} />
                )}
                {c.service.technicianName && <Row label="Technician" value={c.service.technicianName} />}
                {c.service.completedAt && <Row label="Mukammal hua" value={fmtDateTime(c.service.completedAt)} />}
              </div>
            </Panel>
          )}

          <Panel icon={Clock} title="Safar" tone="violet">
            <div className="space-y-2">
              {timeline.map((t, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">{t.emoji}</div>
                  <div className="flex-1 min-w-0 text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">{t.label}</div>
                  <div className="text-[10px] font-bold text-slate-400 shrink-0">{fmtDate(t.at)}</div>
                </div>
              ))}
            </div>
          </Panel>

          {c.brandHistory.length > 0 && (
            <Panel icon={Building2} title={`${c.brandName ?? 'Is brand'} ke baqi claims (${c.brandHistory.length})`}
              hint="Pata chalta hai brand paisa deta hai ya tal-matol karta hai" tone="slate">
              <div className="space-y-1.5">
                {c.brandHistory.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 truncate">
                        {h.claimNumber} — {h.productName}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400">{fmtDate(h.claimDate)}</div>
                    </div>
                    <StatusBadge meta={claimStatusMeta(h.status)} size="xs" />
                    <div className="text-[11px] font-extrabold tabular-nums text-slate-700 dark:text-slate-200 shrink-0 w-20 text-right">
                      {formatPKR(h.receivedAmount)}<span className="text-slate-400">/{formatPKR(h.claimedAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {c.notes && (
            <Panel icon={Pencil} title="Notes" tone="slate">
              <pre className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-sans">{c.notes}</pre>
            </Panel>
          )}
        </div>
      )}
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</div>
      <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words">{value}</div>
    </div>
  );
}

function Box({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'cyan' | 'emerald' | 'rose' | 'amber' }) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200',
    cyan: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    rose: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300',
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300',
  };
  return (
    <div className={`rounded-xl border px-2.5 py-2 ${tones[tone]}`}>
      <div className="text-[9px] font-extrabold uppercase tracking-wider opacity-75">{label}</div>
      <div className="text-sm font-extrabold tabular-nums truncate">{value}</div>
    </div>
  );
}

/* ═════════════ FORMS ═════════════ */
function CostForm({ claim, pending, onCancel, onSubmit }: any) {
  const [parts, setParts] = useState(String(claim.partsCost || 0));
  const [labor, setLabor] = useState(String(claim.laborCost || 0));
  const [other, setOther] = useState(String(claim.otherCost || 0));
  const total = (Number(parts) || 0) + (Number(labor) || 0) + (Number(other) || 0);

  return (
    <Panel icon={Wallet} title="Kharcha Theek Karein" hint="Jitna dukaan ne apni jeb se lagaya" tone="cyan">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Field label="Parts">
            <input type="number" min={0} className={inputCls('h-11 font-extrabold tabular-nums')} value={parts} onChange={(e) => setParts(e.target.value)} />
          </Field>
          <Field label="Labor / visit">
            <input type="number" min={0} className={inputCls('h-11 font-extrabold tabular-nums')} value={labor} onChange={(e) => setLabor(e.target.value)} />
          </Field>
          <Field label="Baqi">
            <input type="number" min={0} className={inputCls('h-11 font-extrabold tabular-nums')} value={other} onChange={(e) => setOther(e.target.value)} />
          </Field>
        </div>
        <div className="rounded-xl bg-slate-900 dark:bg-slate-950 text-white p-3 flex items-center justify-between text-sm font-extrabold">
          <span>Brand se itna claim karenge</span>
          <span className="tabular-nums text-cyan-300">{formatPKR(total)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Wapas</Button>
          <Button className="flex-[2] bg-gradient-to-r from-cyan-600 to-teal-700 font-extrabold" loading={pending}
            onClick={() => onSubmit({ partsCost: Number(parts) || 0, laborCost: Number(labor) || 0, otherCost: Number(other) || 0 })}>
            <CheckCircle2 className="h-4 w-4" /> Save Karein
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function SubmitForm({ claim, pending, onCancel, onSubmit }: any) {
  const [brandRef, setBrandRef] = useState(claim.brandRef ?? '');
  const [brandContact, setBrandContact] = useState(claim.brandContact ?? '');
  const [notes, setNotes] = useState('');

  return (
    <Panel icon={Send} title="Brand Ko Bhejein" hint="Jo reference brand ne diya wo likh lein — baad me dhoondna asaan" tone="blue">
      <div className="space-y-3">
        <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-3 text-xs font-bold text-blue-900 dark:text-blue-200">
          Claim ki raqam: <strong className="text-sm">{formatPKR(claim.claimedAmount)}</strong>
          <div className="mt-1 font-semibold">
            "Claim Letter" print kar ke brand ko bhejein — us par saari tafseel aur dono dastakhaton ki jagah hai.
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Brand ka reference / ticket #" hint="agar mila ho">
            <input className={inputCls('h-11 font-bold font-mono')} placeholder="HR-CLM-88213"
              value={brandRef} onChange={(e) => setBrandRef(e.target.value)} />
          </Field>
          <Field label="Brand ka banda / raabta">
            <input className={inputCls('h-11 font-bold')} placeholder="Asif sb — 0300-1234567"
              value={brandContact} onChange={(e) => setBrandContact(e.target.value)} />
          </Field>
        </div>
        <Field label="Note" hint="optional">
          <input className={inputCls('h-11 font-semibold')} placeholder="Email par bheja, photos attach kiye"
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Wapas</Button>
          <Button className="flex-[2] bg-gradient-to-r from-blue-600 to-indigo-700 font-extrabold" loading={pending}
            onClick={() => onSubmit({
              ...(brandRef.trim() ? { brandRef: brandRef.trim() } : {}),
              ...(brandContact.trim() ? { brandContact: brandContact.trim() } : {}),
              ...(notes.trim() ? { notes: notes.trim() } : {}),
            })}>
            <Send className="h-4 w-4" /> Bhej Diya
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function ResponseForm({ claim, pending, onCancel, onSubmit }: any) {
  const [status, setStatus] = useState<string>('APPROVED');
  const [approved, setApproved] = useState(String(claim.claimedAmount));
  const [response, setResponse] = useState('');
  const [reason, setReason] = useState('');
  const [replSerial, setReplSerial] = useState('');

  const n = Number(approved) || 0;
  const tooMuch = n > claim.claimedAmount;
  const isReject = status === 'REJECTED';

  return (
    <Panel icon={CheckCircle2} title="Brand Ka Jawab" hint="Brand ne kya kaha aur kitna manzoor kiya" tone="cyan">
      <div className="space-y-3">
        <Field label="Brand ne kya kaha" required>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['APPROVED', '✅ Poora manzoor'],
              ['PARTIALLY_APPROVED', '➗ Thora manzoor'],
              ['BRAND_REVIEWING', '🔍 Abhi dekh rahe hain'],
              ['REJECTED', '❌ Mana kar diya'],
            ] as const).map(([v, label]) => (
              <button key={v} type="button"
                onClick={() => { setStatus(v); if (v === 'APPROVED') setApproved(String(claim.claimedAmount)); if (v === 'REJECTED') setApproved('0'); }}
                className={`h-11 rounded-xl text-[11px] font-extrabold border-2 transition ${
                  status === v ? 'bg-cyan-600 border-cyan-600 text-white shadow'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-400'
                }`}>{label}</button>
            ))}
          </div>
        </Field>

        {!isReject && status !== 'BRAND_REVIEWING' && (
          <Field label="Brand ne kitna manzoor kiya" required
            error={tooMuch ? `Claim ${formatPKR(claim.claimedAmount)} se ziyada nahi ho sakta` : undefined}>
            <input type="number" min={0} max={claim.claimedAmount}
              className={inputCls('h-12 text-base font-extrabold tabular-nums', tooMuch)}
              value={approved} onChange={(e) => setApproved(e.target.value)} />
            {!tooMuch && n < claim.claimedAmount && (
              <div className="mt-1 text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                ➗ Brand {formatPKR(claim.claimedAmount - n)} kaat raha hai
              </div>
            )}
          </Field>
        )}

        {isReject ? (
          <Field label="Mana karne ki wajah" required>
            <textarea rows={2} className={inputCls('py-2 font-semibold resize-none')}
              placeholder="Warranty khatam thi / customer ne khud khola tha"
              value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        ) : (
          <Field label="Brand ne kya kaha" hint="optional">
            <textarea rows={2} className={inputCls('py-2 font-semibold resize-none')}
              placeholder="Parts bhej rahe hain, labor apna"
              value={response} onChange={(e) => setResponse(e.target.value)} />
          </Field>
        )}

        {!isReject && (
          <Field label="Replacement ka naya serial" hint="agar part/unit badla ho">
            <input className={inputCls('h-11 font-bold font-mono')} placeholder="SN-99812"
              value={replSerial} onChange={(e) => setReplSerial(e.target.value)} />
          </Field>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Wapas</Button>
          <Button className="flex-[2] bg-gradient-to-r from-cyan-600 to-teal-700 font-extrabold" loading={pending}
            disabled={tooMuch || (isReject && !reason.trim())}
            onClick={() => onSubmit({
              status,
              ...(isReject || status === 'BRAND_REVIEWING' ? {} : { approvedAmount: n }),
              ...(response.trim() ? { brandResponse: response.trim() } : {}),
              ...(isReject && reason.trim() ? { rejectionReason: reason.trim() } : {}),
              ...(replSerial.trim() ? { replacementSerialNumber: replSerial.trim() } : {}),
            })}>
            <CheckCircle2 className="h-4 w-4" /> Darj Karein
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function SettleForm({ claim, pending, onCancel, onSubmit }: any) {
  const max = Math.max(claim.claimedAmount - claim.receivedAmount, 0);
  const suggested = Math.min(claim.approvedAmount || max, max);
  const [amount, setAmount] = useState(String(suggested));
  const [notes, setNotes] = useState('');
  const n = Number(amount) || 0;
  const bad = n <= 0 || n > max;

  return (
    <Panel icon={Banknote} title="Brand Se Paisa Mil Gaya" hint={`Zyada se zyada ${formatPKR(max)}`} tone="emerald">
      <div className="space-y-3">
        <Field label="Kitna mila" required error={bad ? `1 se ${formatPKR(max)} ke darmiyan` : undefined}>
          <input type="number" min={1} max={max} autoFocus
            className={inputCls('h-14 text-2xl font-extrabold tabular-nums text-center', bad)}
            value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        {claim.approvedAmount > 0 && (
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Brand ne {formatPKR(claim.approvedAmount)} manzoor kiya tha
          </div>
        )}
        <Field label="Note" hint="optional">
          <input className={inputCls('h-11 font-semibold')} placeholder="Cheque #4421 / parts bheje"
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Wapas</Button>
          <Button className="flex-[2] bg-gradient-to-r from-emerald-600 to-teal-700 font-extrabold" loading={pending} disabled={bad}
            onClick={() => onSubmit({ receivedAmount: n, ...(notes.trim() ? { notes: notes.trim() } : {}) })}>
            <Banknote className="h-4 w-4" /> Darj Karein
          </Button>
        </div>
      </div>
    </Panel>
  );
}

/* ═════════════ TEACHER ═════════════ */
function ClaimTeacher({ onClose }: { onClose: () => void }) {
  return (
    <Teacher
      title="Warranty Claim — Brand Se Paisa Wapas"
      intro={
        <>
          Jab koi cheez <strong>warranty ke arse me kharab</strong> hoti hai, dukaan customer se paisa nahi leti —
          parts aur labor ka kharcha <strong>apni jeb se</strong> bhardti hai. Us ke baad company se wo paisa
          wapas liya jata hai. Ye page usi ka hisab rakhta hai.
        </>
      }
      blocks={[
        {
          title: '🚨 "Banaya Nahi" tab — sab se aham',
          tone: 'rose',
          tips: [
            <>Ye wo <strong>warranty repairs</strong> hain jo aap free kar chuke hain lekin <strong>claim banaya hi nahi</strong></>,
            <>Upar bara likha hota hai ke <strong>kitna paisa wapas mil sakta hai</strong> — aksar ye hazaron me hota hai</>,
            <>Ek button — <strong>"Claim Banayein"</strong> — repair ki saari tafseel khud bhar jati hai: parts, labor, serial, warranty ki qism, customer</>,
            <>Ye paisa <strong>khamoshi se zaya</strong> hota rehta hai. Hafte me ek bar ye tab zaroor kholein</>,
          ],
        },
        {
          title: '📤 Claim ka safar',
          tone: 'blue',
          tips: [
            <><strong>📝 Bheja nahi</strong> — claim ban gaya, kharcha theek kar lein</>,
            <><strong>"Claim Letter"</strong> print karein — A4 par unit ki tafseel, kya kharabi thi, kya kaam kiya, aur kharche ka hisab. Brand ko yahi bhejein</>,
            <><strong>📤 Brand ko bheja</strong> — brand ka reference number zaroor likhein, baad me dhoondna asaan</>,
            <><strong>💬 Brand ka jawab</strong> — poora manzoor, thora manzoor, ya mana. Jitna manzoor hua wo likhein</>,
            <><strong>💰 Paisa mila</strong> — jab cheque/parts aa jayein</>,
          ],
        },
        {
          title: '🏢 Brand Wise tab',
          tone: 'violet',
          tips: [
            <><strong>Recovery rate</strong> — kis brand ne kitna paisa diya. <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">80%+</span> acha, <span className="text-rose-600 dark:text-rose-400 font-extrabold">40% se kam</span> masla hai</>,
            <>Jis brand ka rate kam ho, uske sath <strong>rate dobara tay karein</strong> — ya us brand ka maal kam rakhein</>,
            <><strong>"Brand ne kaat diya"</strong> — jitna claim kiya us se kam manzoor hua. Ye seedha nuqsan hai</>,
          ],
        },
        {
          title: '⏰ Latke hue claims',
          tone: 'amber',
          tips: [
            <><strong>30 din se latke</strong> claims ka KPI upar hai — inhe dekh kar brand ko phone karein</>,
            <>Card par <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black">DIN SE LATKA</span> ka laal tag lagta hai</>,
            <><strong>Ausat kitne din</strong> lagte hain — is se andaza hota hai ke brand kitna sust hai</>,
          ],
        },
      ]}
      shortcuts={[
        { keys: '/', label: 'Search' },
        { keys: 'P', label: 'Print' },
        { keys: 'T', label: 'Ye guide' },
        { keys: 'Esc', label: 'Band' },
      ]}
      golden={
        <>
          <strong>Sunahri usool:</strong> Warranty repair mukammal karte hi <strong>usi din claim bana dein</strong>.
          Jitna purana claim, brand utni tal-matol karta hai — aur 6 mahine baad to aksar mana hi kar dete hain.
        </>
      }
      onClose={onClose}
    />
  );
}
