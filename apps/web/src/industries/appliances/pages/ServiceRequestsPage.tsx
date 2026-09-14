import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench, Plus, Search, X, RefreshCw, Filter, Users, Clock,
  AlertTriangle, CheckCircle2, Wallet, TrendingUp, Phone, MapPin,
  Loader2, BarChart3, ListChecks, Star, Trash2, Pencil, MessageCircle,
  FileDown, Printer, CalendarDays, Package, ShieldCheck, Banknote, History,
  ChevronLeft, ChevronRight, Zap, Timer, UserCheck, Ban,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import {
  serviceRequestsApi, type ServiceRequest, type ServiceRequestDetail,
} from '../api/service-requests.api';
import { techniciansApi } from '../api/technicians.api';
import { applianceSerialApi } from '../api/serial-tracking.api';
import { appliancesAnalyticsApi } from '../api/analytics.api';
import { offlineAppliancesApi } from '../api/offline-appliances';
import { warrantyClaimsApi } from '../api/warranty-claims.api';
import {
  ApplianceHero, Kpi, Panel, Teacher, Empty, Sheet, Field, inputCls, ChipRow,
  StatusBadge, useShortcuts, printHtml, downloadCsv, a4Shell, escapeHtml,
  toDateInput, fmtDate, fmtDateTime, fmtDuration, guideAction, printAction, Kbd,
} from '../components/shared';
import {
  svcStatusMeta, svcTypeMeta, prioMeta, SERVICE_STATUS_ORDER, SERVICE_TYPE_ORDER,
  SERVICE_NEXT, PRIORITY_ORDER, TIME_SLOTS, issuesFor, catLabel,
  type ApplianceServiceStatus,
} from '../constants';

/* ═════════════════════════════════════════════════════════════
   SERVICE REQUESTS — repair ka poora register
   ─────────────────────────────────────────────────────────────
   Dukaan-daar ka asal sawal teen hain:
     1. Aaj kaun sa kaam karna hai?      → Kaam (queue)
     2. Kis ka paisa baqi reh gaya?      → Baqi paisa filter
     3. Mera banda chal raha hai ya nahi? → Analytics tab
   Teenon ka jawab isi page par hai.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'queue' | 'all' | 'analytics';

export default function ServiceRequestsPage() {
  const qc = useQueryClient();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Meri Dukaan';
  const shopPhone = useAuthStore((s: any) => s.tenant?.phone || '');
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('queue');
  const [showTeacher, setShowTeacher] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ApplianceServiceStatus | null>(null);
  const [serviceType, setServiceType] = useState<string | null>(null);
  const [priority, setPriority] = useState<string | null>(null);
  const [techId, setTechId] = useState('');
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['appliance-services'] });
    qc.invalidateQueries({ queryKey: ['appliance-service-queue'] });
    qc.invalidateQueries({ queryKey: ['appliance-service-summary'] });
    qc.invalidateQueries({ queryKey: ['appliance-service-analytics'] });
    qc.invalidateQueries({ queryKey: ['appliance-technicians'] });
  };

  const { data: summary } = useQuery({
    queryKey: ['appliance-service-summary'],
    queryFn: serviceRequestsApi.summary,
  });

  const { data: queue = [], isLoading: queueLoading, refetch: refetchQueue, isFetching: queueFetching } = useQuery({
    queryKey: ['appliance-service-queue'],
    queryFn: serviceRequestsApi.queue,
    enabled: tab === 'queue',
  });

  const listParams = {
    search: search.trim() || undefined,
    status: status ?? undefined,
    serviceType: serviceType ?? undefined,
    priority: priority ?? undefined,
    technicianId: techId || undefined,
    unpaidOnly: unpaidOnly || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    limit: 50,
  };

  const { data: listData, isLoading: listLoading, refetch: refetchList, isFetching: listFetching } = useQuery({
    queryKey: ['appliance-services', listParams],
    queryFn: () => serviceRequestsApi.list(listParams),
    enabled: tab === 'all',
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['appliance-technicians', 'active'],
    queryFn: () => techniciansApi.list({ active: true }),
  });

  const rows: ServiceRequest[] = tab === 'queue' ? queue : (listData?.items ?? []);
  const loading = tab === 'queue' ? queueLoading : listLoading;
  const fetching = tab === 'queue' ? queueFetching : listFetching;
  const refetch = tab === 'queue' ? refetchQueue : refetchList;

  const hasFilters = !!(search || status || serviceType || priority || techId || unpaidOnly || from || to);
  const clearFilters = () => {
    setSearch(''); setStatus(null); setServiceType(null); setPriority(null);
    setTechId(''); setUnpaidOnly(false); setFrom(''); setTo(''); setPage(1);
  };

  useShortcuts({
    '/': () => { setTab('all'); setTimeout(() => searchRef.current?.focus(), 0); },
    n: () => setShowNew(true),
    t: () => setShowTeacher(true),
    p: () => printA4(),
    f: () => setShowFilters((v) => !v),
    a: () => setTab((v) => (v === 'analytics' ? 'queue' : 'analytics')),
    q: () => setTab('queue'),
    Escape: () => {
      if (showNew) setShowNew(false);
      else if (detailId) setDetailId(null);
      else if (showTeacher) setShowTeacher(false);
      else if (showFilters) setShowFilters(false);
    },
  }, [showNew, detailId, showTeacher, showFilters, rows]);

  /* ─── CSV ─── */
  const exportCsv = () => {
    if (!rows.length) return toast.error('Koi record nahi');
    downloadCsv(`service-requests-${toDateInput(new Date())}.csv`, [
      [`Service Requests — ${shopName}`],
      [`Nikala gaya: ${new Date().toLocaleString('en-PK')}`],
      [],
      ['Request #', 'Tareekh', 'Customer', 'Phone', 'Ilaqa', 'Product', 'Qism', 'Kharabi',
       'Status', 'Priority', 'Technician', 'Visit', 'Labor', 'Parts', 'Kul', 'Wusool', 'Baqi',
       'Warranty', 'AMC', 'Mukammal', 'Rating'],
      ...rows.map((r) => [
        r.requestNumber,
        fmtDate(r.requestedAt),
        r.customerName,
        r.customerPhone,
        [r.city, r.area].filter(Boolean).join(', '),
        r.productName,
        svcTypeMeta(r.serviceType).label,
        r.reportedIssue,
        svcStatusMeta(r.status).label,
        prioMeta(r.priority).label,
        r.technicianName || '',
        r.visitCharge, r.laborCharge, r.partsCharge, r.totalCharge, r.paidAmount,
        Math.max(r.totalCharge - r.paidAmount, 0),
        r.coveredUnderWarranty ? 'Haan' : 'Nahi',
        r.coveredUnderAmc ? 'Haan' : 'Nahi',
        r.completedAt ? fmtDate(r.completedAt) : '',
        r.customerRating ?? '',
      ]),
    ]);
    toast.success(`${rows.length} record export ho gaye`);
  };

  /* ─── A4 ─── */
  const printA4 = () => {
    if (!rows.length) return toast.error('Koi record nahi');
    const due = rows.reduce((s, r) => s + Math.max(r.totalCharge - r.paidAmount, 0), 0);
    const total = rows.reduce((s, r) => s + r.totalCharge, 0);

    const body = `
      <h2 class="sec">${tab === 'queue' ? '🔧 Khula Hua Kaam' : '📋 Service Record'}</h2>
      <table>
        <thead><tr>
          <th>#</th><th>Request / Tareekh</th><th>Customer</th><th>Product / Kharabi</th>
          <th>Technician</th><th class="c">Halat</th><th class="r">Kul</th><th class="r">Baqi</th>
        </tr></thead>
        <tbody>
          ${rows.map((r, i) => `
            <tr>
              <td class="num">${i + 1}</td>
              <td><div class="main">${escapeHtml(r.requestNumber)}</div><div class="sub">${fmtDate(r.requestedAt)}</div></td>
              <td><div class="main">${escapeHtml(r.customerName)}</div><div class="sub">📞 ${escapeHtml(r.customerPhone)}${r.city ? ` • ${escapeHtml(r.city)}` : ''}</div></td>
              <td><div class="main">${escapeHtml(r.productName)}</div><div class="sub">${escapeHtml(r.reportedIssue).slice(0, 70)}</div></td>
              <td>${escapeHtml(r.technicianName || '—')}</td>
              <td class="c"><span class="pill">${svcStatusMeta(r.status).label}</span></td>
              <td class="r">${formatPKR(r.totalCharge)}</td>
              <td class="r" style="color:${r.totalCharge - r.paidAmount > 0 ? '#b91c1c' : '#059669'}">
                ${r.totalCharge - r.paidAmount > 0 ? formatPKR(r.totalCharge - r.paidAmount) : 'Clear ✓'}
              </td>
            </tr>`).join('')}
          <tr class="grand">
            <td colspan="6" style="text-align:right;padding-right:12px;">KUL</td>
            <td class="r" style="color:#a5f3fc !important;">${formatPKR(total)}</td>
            <td class="r" style="color:#fca5a5 !important;">${formatPKR(due)}</td>
          </tr>
        </tbody>
      </table>`;

    const ok = printHtml(a4Shell({
      title: `Service Requests — ${shopName}`,
      heading: '🔧 Service Register',
      shopName, shopPhone,
      badge: 'Service Report',
      kpis: [
        { label: '📋 Records', value: String(rows.length), sub: tab === 'queue' ? 'khula kaam' : 'is safhe par', tone: 'blue' },
        { label: '✅ Mukammal', value: String(rows.filter((r) => r.status === 'COMPLETED').length) , tone: 'green' },
        { label: '💰 Kul Bill', value: formatPKR(total), tone: 'amber' },
        { label: '⏳ Baqi Paisa', value: formatPKR(due), tone: 'rose' },
      ],
      body,
    }));
    if (!ok) toast.error('Popup block hai — allow karein');
  };

  const m = summary?.month;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <ServiceTeacher onClose={() => setShowTeacher(false)} />}
      {showNew && (
        <NewServiceModal
          technicians={technicians}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); invalidate(); }}
        />
      )}
      {detailId && (
        <ServiceDetailSheet
          id={detailId}
          technicians={technicians}
          shopName={shopName}
          shopPhone={shopPhone}
          onClose={() => setDetailId(null)}
          onChanged={invalidate}
        />
      )}

      {/* ═══ HERO ═══ */}
      <ApplianceHero
        badge="Service & Repair"
        badgeIcon={<Wrench className="h-3.5 w-3.5 text-amber-300" />}
        title="🔧 Service Requests"
        subtitle={
          summary ? (
            <>
              <strong className="text-cyan-200">{summary.open}</strong> khula kaam
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-amber-300">{summary.unassigned}</strong> bina banday ke
              {summary.overdue > 0 && (
                <><span className="opacity-50 mx-1.5">•</span><strong className="text-rose-300">{summary.overdue}</strong> late</>
              )}
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-emerald-300">{summary.completedToday}</strong> aaj mukammal
            </>
          ) : 'Har repair, har visit, har rupya — sab yahan'
        }
        actions={[
          guideAction(() => setShowTeacher(true)),
          { key: 'refresh', label: 'Refresh', icon: <RefreshCw className="h-4 w-4" />, onClick: () => refetch(), spinning: fetching, hideLabelOnMobile: true },
          { key: 'csv', label: 'CSV', icon: <FileDown className="h-4 w-4" />, onClick: exportCsv, disabled: !rows.length, hideLabelOnMobile: true },
          printAction(printA4, !rows.length),
          { key: 'new', label: 'Nayi Request', icon: <Plus className="h-4 w-4" />, shortcut: 'N', onClick: () => setShowNew(true), variant: 'solid' },
        ]}
        shortcuts={[
          { keys: 'Q', label: 'Kaam' }, { keys: 'A', label: 'Analytics' },
          { keys: '/', label: 'Search' }, { keys: 'N', label: 'Nayi' },
          { keys: 'F', label: 'Filters' }, { keys: 'P', label: 'Print' },
          { keys: 'T', label: 'Guide' }, { keys: 'Esc', label: 'Band' },
        ]}
      />

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi
          icon={ListChecks} tone="cyan" label="Khula Kaam"
          value={summary?.open ?? 0}
          sub={`${summary?.unassigned ?? 0} bina banday ke`}
          onClick={() => setTab('queue')} active={tab === 'queue'}
        />
        <Kpi
          icon={AlertTriangle} tone="rose" label="Late"
          value={summary?.overdue ?? 0}
          sub={summary?.urgent ? `${summary.urgent} foran wale` : 'tareekh guzar gayi'}
          alert={(summary?.overdue ?? 0) > 0}
          onClick={() => { setTab('all'); setShowFilters(true); }}
        />
        <Kpi
          icon={Wallet} tone="amber" label="Baqi Paisa"
          value={formatPKR(m?.outstanding ?? 0)}
          sub="kaam ho gaya, paisa nahi"
          alert={(m?.outstanding ?? 0) > 0}
          onClick={() => { setTab('all'); setUnpaidOnly(true); setPage(1); }}
        />
        <Kpi
          icon={TrendingUp} tone="emerald" label="Is Mahine Kamai"
          value={formatPKR(m?.revenue ?? 0)}
          sub={`${m?.jobs ?? 0} kaam • munafa ${formatPKR(m?.profit ?? 0)}`}
        />
      </section>

      {/* ═══ TABS ═══ */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-sm">
          <TabBtn active={tab === 'queue'} onClick={() => setTab('queue')} icon={ListChecks} label="Kaam" badge={summary?.open} />
          <TabBtn active={tab === 'all'} onClick={() => setTab('all')} icon={History} label="Poora Record" />
          <TabBtn active={tab === 'analytics'} onClick={() => setTab('analytics')} icon={BarChart3} label="Analytics" />
        </div>
        {tab !== 'analytics' && (
          <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums px-1">
            {tab === 'queue' ? `${queue.length} khula kaam` : `${listData?.meta.total ?? 0} records`}
          </div>
        )}
      </div>

      {tab === 'analytics' ? (
        <ServiceAnalytics />
      ) : (
        <>
          {/* ═══ SEARCH + FILTERS ═══ */}
          {tab === 'all' && (
            <>
              <div className="flex gap-2 flex-wrap">
                <div className="flex-1 min-w-[240px] relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchRef}
                    className={inputCls('h-12 pl-10 pr-10 text-sm font-semibold')}
                    placeholder="Request #, customer, phone, serial, kharabi... (/)"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                      <X className="h-4 w-4 text-slate-400" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`h-12 px-4 rounded-2xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                    showFilters || hasFilters
                      ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-cyan-300'
                  }`}
                >
                  <Filter className="h-4 w-4" /> <span className="hidden sm:inline">Filters</span>
                  {hasFilters && <span className="h-5 w-5 rounded-full bg-cyan-600 text-white text-[10px] font-bold flex items-center justify-center">!</span>}
                </button>
                <button
                  onClick={() => { setUnpaidOnly(!unpaidOnly); setPage(1); }}
                  className={`h-12 px-4 rounded-2xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                    unpaidOnly
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-rose-300'
                  }`}
                  title="Sirf wo jin ka paisa baqi hai"
                >
                  <Banknote className="h-4 w-4" /> <span className="hidden sm:inline">Baqi paisa</span>
                </button>
              </div>

              {showFilters && (
                <Panel className="space-y-3">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Halat</div>
                    <ChipRow
                      options={SERVICE_STATUS_ORDER.map((s) => ({
                        value: s, label: svcStatusMeta(s).label, emoji: svcStatusMeta(s).emoji,
                      }))}
                      value={status}
                      onChange={(v) => { setStatus(v); setPage(1); }}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Kaam ki qism</div>
                    <ChipRow
                      options={SERVICE_TYPE_ORDER.map((s) => ({
                        value: s, label: svcTypeMeta(s).label, emoji: svcTypeMeta(s).emoji,
                      }))}
                      value={serviceType as any}
                      onChange={(v) => { setServiceType(v); setPage(1); }}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Priority</div>
                    <ChipRow
                      options={PRIORITY_ORDER.map((s) => ({
                        value: s, label: prioMeta(s).label, emoji: prioMeta(s).emoji,
                      }))}
                      value={priority as any}
                      onChange={(v) => { setPriority(v); setPage(1); }}
                    />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <Field label="Technician">
                      <select className={inputCls('h-11 text-xs font-extrabold')} value={techId} onChange={(e) => { setTechId(e.target.value); setPage(1); }}>
                        <option value="">Sab</option>
                        {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Se">
                      <input type="date" className={inputCls('h-11 text-xs font-bold [color-scheme:light] dark:[color-scheme:dark]')} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
                    </Field>
                    <Field label="Tak">
                      <input type="date" className={inputCls('h-11 text-xs font-bold [color-scheme:light] dark:[color-scheme:dark]')} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
                    </Field>
                  </div>
                  {hasFilters && (
                    <button onClick={clearFilters} className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1">
                      <X className="h-3 w-3" /> Sab filters clear karo
                    </button>
                  )}
                </Panel>
              )}
            </>
          )}

          {/* ═══ LIST ═══ */}
          {loading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-56 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
            </div>
          ) : rows.length === 0 ? (
            <Empty
              icon={Wrench}
              title={tab === 'queue' ? 'Koi kaam baqi nahi 🎉' : hasFilters ? 'Koi record nahi mila' : 'Abhi koi service request nahi'}
              hint={
                tab === 'queue'
                  ? 'Saara kaam mukammal ho chuka hai. Naya kaam aaye to yahan nazar aayega.'
                  : hasFilters
                    ? 'Filter badal kar dekhein ya clear karein'
                    : 'Jab kisi ka fridge/AC kharab ho, yahan se request banayein — phir technician lagayein aur record rakhein'
              }
              action={
                hasFilters ? (
                  <Button variant="secondary" onClick={clearFilters}><X className="h-4 w-4" /> Filters Clear</Button>
                ) : (
                  <Button className="bg-gradient-to-r from-cyan-600 to-teal-700 font-extrabold shadow-lg shadow-cyan-500/40" onClick={() => setShowNew(true)}>
                    <Plus className="h-4 w-4" /> Nayi Request
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {rows.map((r) => <ServiceCard key={r.id} r={r} onOpen={() => setDetailId(r.id)} />)}
            </div>
          )}

          {/* ═══ PAGINATION ═══ */}
          {tab === 'all' && listData && listData.meta.totalPages > 1 && (
            <div className="flex items-center justify-between flex-wrap gap-2 bg-white dark:bg-slate-900/80 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-4">
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-bold">
                Page <strong className="text-slate-900 dark:text-white">{listData.meta.page}</strong> / <strong className="text-slate-900 dark:text-white">{listData.meta.totalPages}</strong>
                <span className="opacity-50 mx-1">•</span>
                <strong className="text-slate-900 dark:text-white tabular-nums">{listData.meta.total}</strong> records
              </div>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                  className="h-10 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1">
                  <ChevronLeft className="h-4 w-4" /> Pehle
                </button>
                <button disabled={page >= listData.meta.totalPages} onClick={() => setPage((p) => p + 1)}
                  className="h-10 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1">
                  Agla <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   REQUEST CARD
   ═════════════════════════════════════════════════════════════ */
function ServiceCard({ r, onOpen }: { r: ServiceRequest; onOpen: () => void }) {
  const st = svcStatusMeta(r.status);
  const ty = svcTypeMeta(r.serviceType);
  const pr = prioMeta(r.priority);
  const due = Math.max(r.totalCharge - r.paidAmount, 0);
  const overdue = r.isOverdue ?? (st.isOpen && !!r.scheduledDate && new Date(r.scheduledDate) < new Date());

  const waMsg = () => {
    const digits = String(r.customerPhone).replace(/[^0-9]/g, '');
    const phone = digits.startsWith('92') ? digits : digits.startsWith('0') ? '92' + digits.slice(1) : '92' + digits;
    const msg = r.status === 'COMPLETED'
      ? `Assalam-o-Alaikum ${r.customerName}! 🙏\n\nAap ka *${r.productName}* ka kaam mukammal ho gaya hai (${r.requestNumber}).${due > 0 ? `\n\nBaqi raqam: *Rs ${due.toLocaleString('en-PK')}*` : ''}\n\nShukriya!`
      : `Assalam-o-Alaikum ${r.customerName}! 🙏\n\nAap ki service request *${r.requestNumber}* (${r.productName}) ki halat: *${st.label}*.${r.technicianName ? `\n\nTechnician: ${r.technicianName}` : ''}${r.scheduledDate ? `\nTareekh: ${fmtDate(r.scheduledDate)}` : ''}\n\nShukriya!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div
      className={`group rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all overflow-hidden ${
        overdue ? 'border-rose-300 dark:border-rose-500/40'
          : r.priority === 'URGENT' ? 'border-orange-300 dark:border-orange-500/40'
          : 'border-slate-200 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-500/50'
      }`}
    >
      <button onClick={onOpen} className="block w-full text-left p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[11px] font-extrabold text-cyan-700 dark:text-cyan-400">{r.requestNumber}</span>
              {r.priority !== 'NORMAL' && (
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black border ${pr.cls}`}>{pr.emoji} {pr.label}</span>
              )}
              {overdue && (
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-600 text-white">LATE</span>
              )}
            </div>
            <h3 className="mt-1 font-extrabold text-slate-900 dark:text-white truncate group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition">
              {r.customerName}
            </h3>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-bold">
              <Phone className="h-3 w-3" /> {r.customerPhone}
              {r.city && <><span className="opacity-40">•</span><MapPin className="h-3 w-3" />{r.city}</>}
            </div>
          </div>
          <StatusBadge meta={st} />
        </div>

        <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
            <Package className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="truncate">{r.productName}</span>
            <span className="ml-auto shrink-0 text-[10px] text-slate-500 dark:text-slate-400">{ty.emoji} {ty.label}</span>
          </div>
          <p className="mt-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 line-clamp-2">
            {r.reportedIssue}
          </p>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 px-2.5 py-1.5">
            <div className="text-[9px] text-blue-700 dark:text-blue-400 font-extrabold uppercase tracking-wider">Technician</div>
            <div className="text-[11px] font-extrabold text-blue-700 dark:text-blue-300 truncate">
              {r.technicianName || 'Abhi nahi laga'}
            </div>
          </div>
          <div className={`rounded-xl px-2.5 py-1.5 border ${
            due > 0 ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
              : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
          }`}>
            <div className={`text-[9px] font-extrabold uppercase tracking-wider ${due > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {r.status === 'COMPLETED' ? (due > 0 ? 'Baqi' : 'Wusool') : 'Bill'}
            </div>
            <div className={`text-[11px] font-extrabold tabular-nums ${due > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
              {due > 0 ? formatPKR(due) : r.totalCharge > 0 ? formatPKR(r.totalCharge) : '—'}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 flex-wrap text-[10px] font-bold text-slate-400 dark:text-slate-500">
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmtDate(r.requestedAt)}</span>
          {r.scheduledDate && (
            <span className={`inline-flex items-center gap-1 ${overdue ? 'text-rose-600 dark:text-rose-400' : ''}`}>
              <Clock className="h-3 w-3" />{fmtDate(r.scheduledDate)}{r.scheduledTimeSlot ? ` ${r.scheduledTimeSlot}` : ''}
            </span>
          )}
          {r.coveredUnderWarranty && <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><ShieldCheck className="h-3 w-3" />Warranty</span>}
          {r.coveredUnderAmc && <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400">📋 AMC</span>}
          {r.customerRating ? (
            <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
              <Star className="h-3 w-3 fill-current" />{r.customerRating}
            </span>
          ) : null}
        </div>
      </button>

      {/* Buttons hamesha nazar — hover ka intezar nahi */}
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); waMsg(); }}
          className="h-8 px-2.5 rounded-lg bg-green-100 dark:bg-green-500/15 hover:bg-green-200 dark:hover:bg-green-500/25 text-green-700 dark:text-green-300 text-[10px] font-extrabold inline-flex items-center gap-1 transition"
        >
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </button>
        <button
          onClick={onOpen}
          className="h-8 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-extrabold inline-flex items-center gap-1 transition"
        >
          Kholein <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label, badge }: any) {
  return (
    <button onClick={onClick}
      className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
        active ? 'bg-slate-900 dark:bg-cyan-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}>
      <Icon className="h-4 w-4" /> {label}
      {badge ? (
        <span className={`px-1.5 rounded-full text-[9px] tabular-nums ${active ? 'bg-white/25' : 'bg-slate-200 dark:bg-slate-700'}`}>{badge}</span>
      ) : null}
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════
   NAYI REQUEST — serial daalte hi product aur warranty khud
   ═════════════════════════════════════════════════════════════ */
function NewServiceModal({ technicians, onClose, onCreated }: any) {
  const [form, setForm] = useState({
    serialNumber: '', serialTrackingId: '', productId: '', productName: '',
    customerName: '', customerPhone: '', customerAddress: '', city: '', area: '',
    serviceType: 'REPAIR', priority: 'NORMAL',
    reportedIssue: '', issueCategory: '',
    scheduledDate: '', scheduledTimeSlot: '', technicianId: '',
    coveredUnderWarranty: false, coveredUnderAmc: false, amcContractNumber: '',
    internalNotes: '',
  });
  const [categoryType, setCategoryType] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [lookupNote, setLookupNote] = useState<string | null>(null);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  /** Serial daalo — product, warranty aur AMC khud bhar jate hain */
  const lookupSerial = async () => {
    const code = form.serialNumber.trim();
    if (!code) return;
    setLooking(true);
    setLookupNote(null);
    try {
      const res = await applianceSerialApi.warrantyCheck(code);
      if (!res.found || !res.serial) {
        setLookupNote('❌ Ye serial register me nahi mila — tafseel haath se bharein');
        return;
      }
      const s = res.serial;
      setCategoryType(s.product?.categoryType ?? null);
      setForm((f) => ({
        ...f,
        serialTrackingId: s.id,
        productId: s.productId,
        productName: s.product?.name ?? f.productName,
        customerName: s.customerName || f.customerName,
        customerPhone: s.customerPhone || f.customerPhone,
        customerAddress: s.deliveryAddress || f.customerAddress,
        coveredUnderWarranty: !!res.warranty?.isValid,
        coveredUnderAmc: !!res.amc,
        amcContractNumber: res.amc?.contractNumber ?? '',
      }));

      const w = res.warranty;
      const parts: string[] = [];
      if (w?.isValid) {
        parts.push(`✅ Warranty chal rahi hai — ${w.soonestKind === 'COMPRESSOR' ? 'compressor' : w.soonestKind === 'MOTOR' ? 'motor' : 'main'} me ${w.soonestDays} din baqi`);
      } else {
        parts.push('⚠️ Warranty khatam ho chuki — customer se paisa lena hoga');
      }
      if (res.amc) {
        parts.push(`📋 AMC "${res.amc.contractNumber}" chal raha hai — ${res.amc.visitsLeft} free visit baqi`);
      }
      setLookupNote(parts.join('\n'));
    } catch {
      setLookupNote('Serial check nahi ho saka — internet dekh lein');
    } finally {
      setLooking(false);
    }
  };

  const createMut = useMutation({
    mutationFn: () => {
      const payload: any = {
        productName: form.productName.trim(),
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerAddress: form.customerAddress.trim(),
        serviceType: form.serviceType,
        reportedIssue: form.reportedIssue.trim(),
        priority: form.priority,
        coveredUnderWarranty: form.coveredUnderWarranty,
        coveredUnderAmc: form.coveredUnderAmc,
      };
      // Khali strings mat bhejo — backend 400 de deta hai
      const optional: [string, string][] = [
        ['serialNumber', form.serialNumber], ['serialTrackingId', form.serialTrackingId],
        ['productId', form.productId], ['city', form.city], ['area', form.area],
        ['issueCategory', form.issueCategory], ['scheduledDate', form.scheduledDate],
        ['scheduledTimeSlot', form.scheduledTimeSlot], ['technicianId', form.technicianId],
        ['amcContractNumber', form.amcContractNumber], ['internalNotes', form.internalNotes],
      ];
      for (const [k, v] of optional) if (v && v.trim()) payload[k] = v.trim();
      // Offline ho to queue me — internet na hone par bhi kaam darj ho jata hai
      return offlineAppliancesApi.createServiceRequest(payload);
    },
    onSuccess: (res) => {
      if (res.synced) toast.success(`Request ${res.data?.requestNumber ?? ''} ban gayi ✓`);
      else toast.info('📴 Offline — request queue me chali gayi, internet aate hi ban jayegi');
      onCreated();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Request nahi bani'),
  });

  const errors: Record<string, string> = {};
  if (!form.productName.trim()) errors.productName = 'Cheez ka naam likhein';
  if (!form.customerName.trim()) errors.customerName = 'Customer ka naam likhein';
  if (!form.customerPhone.trim()) errors.customerPhone = 'Phone number likhein';
  if (!form.customerAddress.trim()) errors.customerAddress = 'Pata likhein — technician ne wahin jana hai';
  if (!form.reportedIssue.trim()) errors.reportedIssue = 'Kharabi likhein';
  const ok = Object.keys(errors).length === 0;

  const presets = issuesFor(categoryType);

  return (
    <Sheet
      wide
      badge="Nayi Service Request"
      icon={<Wrench className="h-3 w-3" />}
      title="🔧 Kaam Darj Karein"
      subtitle="Serial number daalein to product aur warranty khud bhar jayegi"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 h-12" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <button
            onClick={() => createMut.mutate()}
            disabled={!ok || createMut.isPending}
            className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-700 hover:from-cyan-500 hover:to-teal-600 disabled:opacity-50 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/40 transition active:scale-[0.98]"
          >
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Request Banao
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Serial lookup */}
        <Panel icon={Package} title="Cheez" hint="Serial ho to lookup karein — baqi khud bhar jayega" tone="blue">
          <div className="flex gap-2">
            <input
              className={inputCls('h-11 font-mono font-bold text-sm')}
              placeholder="Serial number (agar hai)"
              value={form.serialNumber}
              onChange={(e) => set('serialNumber', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookupSerial(); } }}
            />
            <button
              onClick={lookupSerial}
              disabled={!form.serialNumber.trim() || looking}
              className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 transition"
            >
              {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Check
            </button>
          </div>
          {lookupNote && (
            <div className="mt-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-2.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 whitespace-pre-line">
              {lookupNote}
            </div>
          )}
          <div className="mt-3">
            <Field label="Cheez ka naam" required error={errors.productName}>
              <input className={inputCls('h-11 font-bold', !!errors.productName)} placeholder="Haier 1.5 Ton Inverter AC"
                value={form.productName} onChange={(e) => set('productName', e.target.value)} />
            </Field>
          </div>
        </Panel>

        {/* Customer */}
        <Panel icon={Users} title="Customer" hint="Technician ne isi pate par jana hai" tone="cyan">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Naam" required error={errors.customerName}>
              <input className={inputCls('h-11 font-bold', !!errors.customerName)} placeholder="Ali Raza"
                value={form.customerName} onChange={(e) => set('customerName', e.target.value)} />
            </Field>
            <Field label="Phone" required error={errors.customerPhone}>
              <input className={inputCls('h-11 font-bold font-mono', !!errors.customerPhone)} placeholder="0300-1234567" inputMode="tel"
                value={form.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Poora Pata" required error={errors.customerAddress}>
              <textarea rows={2} className={inputCls('py-2 font-semibold resize-none', !!errors.customerAddress)}
                placeholder="Ghar #, gali, ilaqa, landmark"
                value={form.customerAddress} onChange={(e) => set('customerAddress', e.target.value)} />
            </Field>
          </div>
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            <Field label="Sheher"><input className={inputCls('h-11 font-bold')} placeholder="Lahore" value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
            <Field label="Ilaqa"><input className={inputCls('h-11 font-bold')} placeholder="Gulberg" value={form.area} onChange={(e) => set('area', e.target.value)} /></Field>
          </div>
        </Panel>

        {/* Kaam */}
        <Panel icon={Wrench} title="Kaam" hint="Kya karna hai aur kitni jaldi" tone="amber">
          <Field label="Kaam ki qism" required>
            <ChipRow
              options={SERVICE_TYPE_ORDER.map((s) => ({ value: s, label: svcTypeMeta(s).label, emoji: svcTypeMeta(s).emoji }))}
              value={form.serviceType as any}
              onChange={(v) => set('serviceType', v ?? 'REPAIR')}
              allLabel="—"
            />
          </Field>
          <div className="mt-3">
            <Field label="Priority">
              <ChipRow
                options={PRIORITY_ORDER.map((s) => ({ value: s, label: prioMeta(s).label, emoji: prioMeta(s).emoji }))}
                value={form.priority as any}
                onChange={(v) => set('priority', v ?? 'NORMAL')}
                allLabel="—"
              />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Kya kharabi hai?" required error={errors.reportedIssue}>
              <textarea rows={3} className={inputCls('py-2 font-semibold resize-none', !!errors.reportedIssue)}
                placeholder="Customer ne jo bataya, usi ke lafzon me likhein"
                value={form.reportedIssue} onChange={(e) => set('reportedIssue', e.target.value)} />
            </Field>
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {presets.map((p) => (
                <button key={p} type="button"
                  onClick={() => setForm((f) => ({
                    ...f,
                    reportedIssue: f.reportedIssue.includes(p) ? f.reportedIssue : (f.reportedIssue ? `${f.reportedIssue}, ${p}` : p),
                    issueCategory: f.issueCategory || p,
                  }))}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-400 transition"
                >
                  + {p}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        {/* Schedule */}
        <Panel icon={CalendarDays} title="Tareekh aur Banda" hint="Abhi na malum ho to khali chhor dein" tone="violet">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Tareekh">
              <input type="date" className={inputCls('h-11 font-bold [color-scheme:light] dark:[color-scheme:dark]')}
                value={form.scheduledDate} onChange={(e) => set('scheduledDate', e.target.value)} />
            </Field>
            <Field label="Waqt">
              <select className={inputCls('h-11 text-xs font-extrabold')} value={form.scheduledTimeSlot} onChange={(e) => set('scheduledTimeSlot', e.target.value)}>
                <option value="">Koi bhi</option>
                {TIME_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Technician" hint="khali chhorein to baad me lagayein">
              <select className={inputCls('h-11 text-xs font-extrabold')} value={form.technicianId} onChange={(e) => set('technicianId', e.target.value)}>
                <option value="">Abhi nahi</option>
                {technicians.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.openJobs ?? 0} kaam khula{t.currentZone ? ` • ${t.currentZone}` : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-3 grid sm:grid-cols-2 gap-2">
            <ToggleRow
              on={form.coveredUnderWarranty}
              onChange={(v: boolean) => set('coveredUnderWarranty', v)}
              icon={<ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
              title="Warranty me hai"
              sub="Customer se paisa nahi lena"
            />
            <ToggleRow
              on={form.coveredUnderAmc}
              onChange={(v: boolean) => set('coveredUnderAmc', v)}
              icon={<span className="text-base leading-none">📋</span>}
              title="AMC me hai"
              sub="Contract ki free visit lagegi"
            />
          </div>
          {form.coveredUnderAmc && (
            <div className="mt-3">
              <Field label="AMC Contract #" hint="zaroori — warna visit count nahi hogi">
                <input className={inputCls('h-11 font-mono font-bold')} placeholder="AMC-2026-0001"
                  value={form.amcContractNumber} onChange={(e) => set('amcContractNumber', e.target.value)} />
              </Field>
            </div>
          )}
        </Panel>
      </div>
    </Sheet>
  );
}

function ToggleRow({ on, onChange, icon, title, sub }: any) {
  return (
    <button type="button" onClick={() => onChange(!on)}
      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition text-left ${
        on ? 'bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-500/15 dark:to-teal-500/10 border-cyan-300 dark:border-cyan-500/40'
           : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
      }`}>
      <div className="flex items-center gap-2.5 min-w-0">
        {icon}
        <div className="min-w-0">
          <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{title}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate">{sub}</div>
        </div>
      </div>
      <div className={`h-6 w-11 rounded-full transition-colors relative shrink-0 ${on ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════
   DETAIL SHEET — ek request ka poora safar
   ═════════════════════════════════════════════════════════════ */
function ServiceDetailSheet({ id, technicians, shopName, shopPhone, onClose, onChanged }: any) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'view' | 'assign' | 'complete' | 'payment' | 'cancel'>('view');

  const { data: r, isLoading } = useQuery({
    queryKey: ['appliance-service', id],
    queryFn: () => serviceRequestsApi.getOne(id),
  });

  const after = (msg: string) => {
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ['appliance-service', id] });
    onChanged();
    setMode('view');
  };
  const fail = (e: any) => toast.error(e?.response?.data?.message || 'Kaam nahi hua');

  const statusMut = useMutation({
    mutationFn: (status: ApplianceServiceStatus) => serviceRequestsApi.updateStatus(id, { status }),
    onSuccess: () => after('Halat badal gayi ✓'),
    onError: fail,
  });
  const assignMut = useMutation({
    mutationFn: (v: any) => serviceRequestsApi.assignTechnician(id, v),
    onSuccess: () => after('Technician lag gaya ✓'),
    onError: fail,
  });
  const completeMut = useMutation({
    mutationFn: (v: any) => serviceRequestsApi.complete(id, v),
    onSuccess: () => after('Kaam mukammal ✓'),
    onError: fail,
  });
  const payMut = useMutation({
    mutationFn: (v: any) => serviceRequestsApi.addPayment(id, v),
    onSuccess: () => after('Wusooli darj ho gayi ✓'),
    onError: fail,
  });
  /** Warranty wala kaam mukammal — ab brand se paisa claim karein */
  const claimMut = useMutation({
    mutationFn: () => warrantyClaimsApi.fromService(id),
    onSuccess: (c) => {
      toast.success(`Claim ${c.claimNumber} ban gaya — ab brand ko bhejein`);
      qc.invalidateQueries({ queryKey: ['appliance-claim-summary'] });
      qc.invalidateQueries({ queryKey: ['appliance-claims-missing'] });
      qc.invalidateQueries({ queryKey: ['appliance-service', id] });
      onChanged();
    },
    onError: fail,
  });

  const cancelMut = useMutation({
    mutationFn: (reason: string) => serviceRequestsApi.cancel(id, { reason }),
    onSuccess: () => after('Request cancel ho gayi'),
    onError: fail,
  });

  if (isLoading || !r) {
    return (
      <Sheet wide badge="Service" title="Khul raha hai…" onClose={onClose}>
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        </div>
      </Sheet>
    );
  }

  const st = svcStatusMeta(r.status);
  const ty = svcTypeMeta(r.serviceType);
  const due = Math.max(r.totalCharge - r.paidAmount, 0);
  const nexts = SERVICE_NEXT[r.status as ApplianceServiceStatus] ?? [];
  const isOpen = st.isOpen;

  /* ─── Service parchi (80mm) ─── */
  const printSlip = () => {
    const line = (k: string, v: string) => `<div class="row"><span class="k">${escapeHtml(k)}</span><span class="v">${v}</span></div>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(r.requestNumber)}</title>
<style>${THERMAL_CSS_INLINE}</style></head><body>
  <div class="center xl">${escapeHtml(shopName)}</div>
  ${shopPhone ? `<div class="center" style="font-size:10px;">Ph: ${escapeHtml(shopPhone)}</div>` : ''}
  <div class="divider"></div>
  <div class="center"><span class="badge">SERVICE ${r.status === 'COMPLETED' ? 'BILL' : 'PARCHI'}</span></div>
  <div class="center bold" style="font-size:13px;">${escapeHtml(r.requestNumber)}</div>
  <div class="center" style="font-size:9px;">${fmtDateTime(r.requestedAt)}</div>
  <div class="double"></div>
  ${line('Customer', escapeHtml(r.customerName))}
  ${line('Phone', escapeHtml(r.customerPhone))}
  <div style="font-size:9px;margin:3px 0;">📍 ${escapeHtml(r.customerAddress)}</div>
  <div class="divider"></div>
  ${line('Cheez', escapeHtml(r.productName))}
  ${r.serialNumber ? line('Serial', escapeHtml(r.serialNumber)) : ''}
  ${line('Kaam', escapeHtml(ty.label))}
  ${line('Halat', escapeHtml(st.label))}
  ${r.technicianName ? line('Technician', escapeHtml(r.technicianName)) : ''}
  <div style="font-size:9px;margin:4px 0;"><b>Kharabi:</b> ${escapeHtml(r.reportedIssue)}</div>
  ${r.workDone ? `<div style="font-size:9px;margin:4px 0;"><b>Kaam kiya:</b> ${escapeHtml(r.workDone)}</div>` : ''}
  ${r.totalCharge > 0 ? `
    <div class="divider"></div>
    ${r.visitCharge > 0 ? line('Visit', formatPKR(r.visitCharge)) : ''}
    ${r.laborCharge > 0 ? line('Labor', formatPKR(r.laborCharge)) : ''}
    ${r.partsCharge > 0 ? line('Parts', formatPKR(r.partsCharge)) : ''}
    <div class="amount-box">
      <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;">KUL BILL</div>
      <div class="huge">${formatPKR(r.totalCharge)}</div>
      ${r.paidAmount > 0 ? `<div style="font-size:10px;">Wusool: ${formatPKR(r.paidAmount)}</div>` : ''}
      ${due > 0 ? `<div style="font-size:12px;font-weight:800;">BAQI: ${formatPKR(due)}</div>` : '<div style="font-size:10px;font-weight:800;">✓ POORA WUSOOL</div>'}
    </div>` : ''}
  ${(r.coveredUnderWarranty || r.coveredUnderAmc) ? `<div class="center" style="font-size:10px;font-weight:800;">${r.coveredUnderWarranty ? '🛡️ WARRANTY ME' : ''} ${r.coveredUnderAmc ? '📋 AMC ME' : ''}</div>` : ''}
  <div class="sign">Customer ke dastakhat</div>
  <div class="center bold" style="margin-top:10px;font-size:10px;letter-spacing:2px;">* * SHUKRIYA * *</div>
  <script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
</body></html>`;
    if (!printHtml(html, { width: 400, height: 700 })) toast.error('Popup block hai — allow karein');
  };

  const timeline = [
    { at: r.requestedAt, label: 'Request aayi', emoji: '📥' },
    { at: r.scheduledDate, label: `Tareekh lagi${r.scheduledTimeSlot ? ` (${r.scheduledTimeSlot})` : ''}`, emoji: '📅' },
    { at: r.enRouteAt, label: 'Technician nikla', emoji: '🛵' },
    { at: r.arrivedAt, label: 'Ghar pohancha', emoji: '🏠' },
    { at: r.workStartedAt, label: 'Kaam shuru', emoji: '🛠️' },
    { at: r.completedAt, label: 'Mukammal', emoji: '✅' },
  ].filter((t) => t.at);

  return (
    <Sheet
      wide
      badge={ty.label}
      icon={<span>{ty.emoji}</span>}
      title={r.requestNumber}
      subtitle={<span>{r.customerName} • {r.productName}</span>}
      onClose={onClose}
      footer={
        <div className="flex gap-2 flex-wrap">
          <button onClick={printSlip}
            className="h-11 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
            <Printer className="h-4 w-4" /> Parchi
          </button>
          {/* Warranty ka kaam free kiya — ab brand se paisa wapas lein */}
          {r.status === 'COMPLETED' && r.coveredUnderWarranty && !r.warrantyClaimNumber && (
            <button onClick={() => claimMut.mutate()} disabled={claimMut.isPending}
              className="h-11 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg shadow-violet-500/30 transition disabled:opacity-50">
              {claimMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Brand Se Claim Karein
            </button>
          )}
          {r.warrantyClaimNumber && (
            <Link to="/appliances/warranty-claims"
              className="h-11 px-4 rounded-xl border-2 border-violet-200 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 text-xs font-extrabold inline-flex items-center gap-1.5 transition">
              <ShieldCheck className="h-4 w-4" /> {r.warrantyClaimNumber}
            </Link>
          )}
          {due > 0 && (
            <button onClick={() => setMode('payment')}
              className="h-11 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition">
              <Banknote className="h-4 w-4" /> Paisa Wusool ({formatPKR(due)})
            </button>
          )}
          {isOpen && (
            <>
              <button onClick={() => setMode('assign')}
                className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition">
                <UserCheck className="h-4 w-4" /> {r.technicianName ? 'Banda Badlein' : 'Banda Lagayein'}
              </button>
              <button onClick={() => setMode('complete')}
                className="flex-1 min-w-[140px] h-11 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 transition">
                <CheckCircle2 className="h-4 w-4" /> Mukammal Karein
              </button>
            </>
          )}
        </div>
      }
    >
      {mode === 'assign' && (
        <AssignForm
          technicians={technicians}
          current={r.technicianId}
          defaultDate={r.scheduledDate?.slice(0, 10) ?? ''}
          defaultSlot={r.scheduledTimeSlot ?? ''}
          pending={assignMut.isPending}
          onCancel={() => setMode('view')}
          onSubmit={(v: any) => assignMut.mutate(v)}
        />
      )}
      {mode === 'complete' && (
        <CompleteForm
          request={r}
          pending={completeMut.isPending}
          onCancel={() => setMode('view')}
          onSubmit={(v: any) => completeMut.mutate(v)}
        />
      )}
      {mode === 'payment' && (
        <PaymentForm
          due={due}
          pending={payMut.isPending}
          onCancel={() => setMode('view')}
          onSubmit={(v: any) => payMut.mutate(v)}
        />
      )}
      {mode === 'cancel' && (
        <CancelForm
          pending={cancelMut.isPending}
          onCancel={() => setMode('view')}
          onSubmit={(reason: string) => cancelMut.mutate(reason)}
        />
      )}

      {mode === 'view' && (
        <div className="space-y-4">
          {/* Halat + agla qadam */}
          <Panel icon={Zap} title="Halat" hint="Agla qadam ek click par" tone="cyan"
            right={<StatusBadge meta={st} size="md" />}>
            {nexts.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {nexts.map((n) => {
                  const nm = svcStatusMeta(n);
                  return (
                    <button key={n} onClick={() => statusMut.mutate(n)} disabled={statusMut.isPending}
                      className={`h-10 px-3 rounded-xl border-2 text-[11px] font-extrabold inline-flex items-center gap-1.5 transition disabled:opacity-50 ${nm.cls} hover:brightness-95`}>
                      {statusMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>{nm.emoji}</span>}
                      {nm.label}
                    </button>
                  );
                })}
                {isOpen && (
                  <button onClick={() => setMode('cancel')}
                    className="h-10 px-3 rounded-xl border-2 border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[11px] font-extrabold inline-flex items-center gap-1.5 transition">
                    <Ban className="h-3.5 w-3.5" /> Cancel
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {r.status === 'COMPLETED' ? '✅ Ye kaam mukammal ho chuka hai.' : 'Yahan se aage koi qadam nahi.'}
              </p>
            )}
          </Panel>

          {/* Paisa */}
          {(r.totalCharge > 0 || r.status === 'COMPLETED') && (
            <Panel icon={Wallet} title="Hisab" tone={due > 0 ? 'rose' : 'emerald'}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <MiniBox label="Visit" value={formatPKR(r.visitCharge)} />
                <MiniBox label="Labor" value={formatPKR(r.laborCharge)} />
                <MiniBox label="Parts" value={formatPKR(r.partsCharge)} />
                <MiniBox label="Kul Bill" value={formatPKR(r.totalCharge)} tone="cyan" />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <MiniBox label="Wusool" value={formatPKR(r.paidAmount)} tone="emerald" />
                <MiniBox label="Baqi" value={due > 0 ? formatPKR(due) : 'Clear ✓'} tone={due > 0 ? 'rose' : 'emerald'} />
              </div>
              {(r.coveredUnderWarranty || r.coveredUnderAmc) && (
                <div className="mt-2 flex gap-1.5 flex-wrap">
                  {r.coveredUnderWarranty && (
                    <span className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold inline-flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Warranty me — dukaan ne bharaa
                    </span>
                  )}
                  {r.coveredUnderAmc && (
                    <span className="px-2 py-1 rounded-lg bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 text-[10px] font-extrabold">
                      📋 AMC {r.amcContractNumber || ''}
                    </span>
                  )}
                </div>
              )}
            </Panel>
          )}

          {/* AMC card */}
          {r.amc && (
            <Panel icon={ShieldCheck} title={`AMC — ${r.amc.contractNumber}`} hint="Is contract me kya free hai" tone="violet">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <MiniBox label="Qism" value={r.amc.amcType} />
                <MiniBox label="Khatam" value={fmtDate(r.amc.expiryDate)} />
                <MiniBox
                  label="Free Visits"
                  value={`${Math.max(r.amc.freeVisitsAllowed - r.amc.freeVisitsUsed, 0)} / ${r.amc.freeVisitsAllowed}`}
                  tone={r.amc.freeVisitsUsed >= r.amc.freeVisitsAllowed ? 'rose' : 'emerald'}
                />
                <MiniBox label="Labor" value={r.amc.laborCovered ? 'Free ✓' : 'Paid'} />
              </div>
            </Panel>
          )}

          {/* Kharabi / kaam */}
          <Panel icon={Wrench} title="Kya hua tha, kya kiya" tone="amber">
            <div className="space-y-2 text-xs">
              <Row label="Customer ne bataya" value={r.reportedIssue} />
              {r.issueCategory && <Row label="Kharabi ki qism" value={r.issueCategory} />}
              {r.diagnosedIssue && <Row label="Asal masla nikla" value={r.diagnosedIssue} />}
              {r.workDone && <Row label="Kaam kiya" value={r.workDone} />}
              {Array.isArray(r.partsReplaced) && r.partsReplaced.length > 0 && (
                <Row label="Parts badle" value={r.partsReplaced.map((p: any) => p?.name ?? String(p)).join(', ')} />
              )}
              {r.requiresFollowUp && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-2.5 text-[11px] font-bold text-amber-900 dark:text-amber-200">
                  🔁 Dobara jana hai {r.followUpDate ? `— ${fmtDate(r.followUpDate)}` : ''}
                  {r.followUpReason ? <div className="font-semibold mt-0.5">{r.followUpReason}</div> : null}
                </div>
              )}
              {r.customerRating ? (
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < r.customerRating! ? 'fill-current' : 'opacity-25'}`} />
                  ))}
                  {r.customerFeedback && <span className="text-slate-600 dark:text-slate-300 font-semibold ml-1">"{r.customerFeedback}"</span>}
                </div>
              ) : null}
            </div>
          </Panel>

          {/* Timeline */}
          <Panel icon={Timer} title="Safar" hint="Request se mukammal hone tak" tone="blue">
            <div className="space-y-2">
              {timeline.map((t, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">{t.emoji}</div>
                  <div className="flex-1 min-w-0 text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">{t.label}</div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 shrink-0">{fmtDateTime(t.at)}</div>
                </div>
              ))}
              {r.completedAt && (
                <div className="mt-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-2 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 text-center">
                  Kul waqt: {fmtDuration((new Date(r.completedAt).getTime() - new Date(r.requestedAt).getTime()) / 3_600_000)}
                </div>
              )}
            </div>
          </Panel>

          {/* Customer ki purani history */}
          {r.history.length > 0 && (
            <Panel icon={History} title={`Isi customer ka purana kaam (${r.history.length})`} hint="Baar baar wohi masla to nahi?" tone="slate">
              <div className="space-y-1.5">
                {r.history.slice(0, 8).map((h) => (
                  <div key={h.id} className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 truncate">
                        {h.productName} — {h.issueCategory || h.reportedIssue}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        {h.requestNumber} • {fmtDate(h.requestedAt)}{h.technicianName ? ` • ${h.technicianName}` : ''}
                      </div>
                    </div>
                    <StatusBadge meta={svcStatusMeta(h.status)} size="xs" />
                    <div className="text-[11px] font-extrabold tabular-nums text-slate-700 dark:text-slate-200 shrink-0">
                      {formatPKR(h.totalCharge)}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {r.internalNotes && (
            <Panel icon={Pencil} title="Andaruni notes" hint="Customer ko nahi dikhte" tone="slate">
              <pre className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-sans">{r.internalNotes}</pre>
            </Panel>
          )}
        </div>
      )}
    </Sheet>
  );
}

const THERMAL_CSS_INLINE = `
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 80mm; }
  body { font-family: 'Courier New', monospace; padding: 5mm 4mm; color: #000; font-size: 11px; line-height: 1.4; }
  .center { text-align: center; } .bold { font-weight: 700; }
  .xl { font-size: 15px; font-weight: 800; letter-spacing: 1px; } .huge { font-size: 18px; font-weight: 800; }
  .divider { border-top: 1px dashed #000; margin: 8px 0; } .double { border-top: 2px solid #000; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; margin: 2px 0; }
  .row .k { font-weight: 600; word-break: break-word; } .row .v { font-weight: 700; white-space: nowrap; }
  .badge { display: inline-block; border: 1.5px solid #000; padding: 3px 10px; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; margin: 6px 0; }
  .amount-box { border: 2.5px solid #000; padding: 8px; margin: 8px 0; text-align: center; }
  .sign { margin-top: 22px; border-top: 1px solid #000; padding-top: 3px; font-size: 9px; text-align: center; }
`;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</div>
      <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{value}</div>
    </div>
  );
}

function MiniBox({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'cyan' | 'emerald' | 'rose' }) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200',
    cyan: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    rose: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300',
  };
  return (
    <div className={`rounded-xl border px-2.5 py-2 ${tones[tone]}`}>
      <div className="text-[9px] font-extrabold uppercase tracking-wider opacity-75">{label}</div>
      <div className="text-sm font-extrabold tabular-nums truncate">{value}</div>
    </div>
  );
}

/* ═════════════ SUB-FORMS ═════════════ */
function AssignForm({ technicians, current, defaultDate, defaultSlot, pending, onCancel, onSubmit }: any) {
  const [technicianId, setTechnicianId] = useState(current ?? '');
  const [scheduledDate, setScheduledDate] = useState(defaultDate);
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState(defaultSlot);

  return (
    <Panel icon={UserCheck} title="Technician Lagayein" hint="Jis ke paas kaam kam ho usay dein" tone="blue">
      <div className="space-y-3">
        <Field label="Technician" required>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {technicians.map((t: any) => (
              <button key={t.id} type="button" onClick={() => setTechnicianId(t.id)}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition text-left ${
                  technicianId === t.id
                    ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-400 dark:border-blue-500/50'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                }`}>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                  {t.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{t.name}</div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                    {t.employeeCode}{t.currentZone ? ` • ${t.currentZone}` : ''}
                    {t.avgRating ? ` • ⭐ ${Number(t.avgRating).toFixed(1)}` : ''}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                  (t.openJobs ?? 0) === 0
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : (t.openJobs ?? 0) > 5
                      ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {(t.openJobs ?? 0) === 0 ? 'Khali' : `${t.openJobs} kaam`}
                </span>
              </button>
            ))}
            {technicians.length === 0 && (
              <p className="text-xs font-bold text-slate-400 py-4 text-center">
                Koi active technician nahi — pehle Technicians page se add karein
              </p>
            )}
          </div>
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Tareekh">
            <input type="date" className={inputCls('h-11 font-bold [color-scheme:light] dark:[color-scheme:dark]')}
              value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          </Field>
          <Field label="Waqt">
            <select className={inputCls('h-11 text-xs font-extrabold')} value={scheduledTimeSlot} onChange={(e) => setScheduledTimeSlot(e.target.value)}>
              <option value="">Koi bhi</option>
              {TIME_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Wapas</Button>
          <Button
            className="flex-[2] bg-gradient-to-r from-blue-600 to-indigo-700 font-extrabold"
            loading={pending}
            disabled={!technicianId}
            onClick={() => onSubmit({
              technicianId,
              ...(scheduledDate ? { scheduledDate } : {}),
              ...(scheduledTimeSlot ? { scheduledTimeSlot } : {}),
            })}
          >
            <UserCheck className="h-4 w-4" /> Laga Dein
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function CompleteForm({ request, pending, onCancel, onSubmit }: any) {
  const covered = request.coveredUnderWarranty || request.coveredUnderAmc;
  const [f, setF] = useState({
    diagnosedIssue: request.diagnosedIssue ?? '',
    workDone: request.workDone ?? '',
    partsText: '',
    visitCharge: String(request.visitCharge || 0),
    laborCharge: String(request.laborCharge || 0),
    partsCharge: String(request.partsCharge || 0),
    paidAmount: '',
    requiresFollowUp: false,
    followUpDate: '',
    followUpReason: '',
    customerRating: 0,
    customerFeedback: '',
  });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const total = (Number(f.visitCharge) || 0) + (Number(f.laborCharge) || 0) + (Number(f.partsCharge) || 0);
  const paid = f.paidAmount === '' ? (covered ? 0 : total) : Number(f.paidAmount) || 0;
  const due = Math.max(total - paid, 0);
  const tooMuch = paid > total;

  return (
    <Panel icon={CheckCircle2} title="Kaam Mukammal" hint="Bill, kaam ki tafseel aur rating" tone="emerald">
      <div className="space-y-3">
        <Field label="Asal masla kya nikla?" hint="technician ki tashkhees">
          <textarea rows={2} className={inputCls('py-2 font-semibold resize-none')} placeholder="Compressor ki gas leak thi"
            value={f.diagnosedIssue} onChange={(e) => set('diagnosedIssue', e.target.value)} />
        </Field>
        <Field label="Kya kaam kiya?" hint="customer ki parchi par yehi chapega">
          <textarea rows={2} className={inputCls('py-2 font-semibold resize-none')} placeholder="Gas refill ki, leak weld ki, test chalaya"
            value={f.workDone} onChange={(e) => set('workDone', e.target.value)} />
        </Field>
        <Field label="Parts badle" hint="comma se alag karein">
          <input className={inputCls('h-11 font-semibold')} placeholder="Capacitor, Thermostat"
            value={f.partsText} onChange={(e) => set('partsText', e.target.value)} />
        </Field>

        <div className="grid grid-cols-3 gap-2">
          <Field label="Visit"><input type="number" min={0} className={inputCls('h-11 font-extrabold tabular-nums')} value={f.visitCharge} onChange={(e) => set('visitCharge', e.target.value)} /></Field>
          <Field label="Labor"><input type="number" min={0} className={inputCls('h-11 font-extrabold tabular-nums')} value={f.laborCharge} onChange={(e) => set('laborCharge', e.target.value)} /></Field>
          <Field label="Parts"><input type="number" min={0} className={inputCls('h-11 font-extrabold tabular-nums')} value={f.partsCharge} onChange={(e) => set('partsCharge', e.target.value)} /></Field>
        </div>

        <div className="rounded-xl bg-slate-900 dark:bg-slate-950 text-white p-3">
          <div className="flex items-center justify-between text-sm font-extrabold">
            <span>Kul Bill</span>
            <span className="tabular-nums text-cyan-300">{formatPKR(total)}</span>
          </div>
          {covered && (
            <div className="mt-1 text-[10px] font-bold text-emerald-300">
              🛡️ Ye kaam {request.coveredUnderWarranty ? 'warranty' : 'AMC'} me hai — paisa 0 hi rahega
            </div>
          )}
        </div>

        <Field label="Abhi kitna wusool hua?" hint={covered ? 'warranty/AMC me 0 hi rehta hai' : `khali chhorein to poora ${formatPKR(total)}`} error={tooMuch ? 'Bill se ziyada nahi ho sakta' : undefined}>
          <input type="number" min={0} className={inputCls('h-12 text-base font-extrabold tabular-nums', tooMuch)}
            placeholder={String(covered ? 0 : total)}
            value={f.paidAmount} onChange={(e) => set('paidAmount', e.target.value)} />
          {due > 0 && !tooMuch && (
            <div className="mt-1 text-[11px] font-extrabold text-rose-600 dark:text-rose-400">
              ⏳ {formatPKR(due)} udhaar reh jayega — baad me "Paisa Wusool" se darj kar sakte hain
            </div>
          )}
        </Field>

        <ToggleRow
          on={f.requiresFollowUp}
          onChange={(v: boolean) => set('requiresFollowUp', v)}
          icon={<span className="text-base leading-none">🔁</span>}
          title="Dobara jana parega"
          sub="Parts aane par ya check karne"
        />
        {f.requiresFollowUp && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Kab">
              <input type="date" className={inputCls('h-11 font-bold [color-scheme:light] dark:[color-scheme:dark]')}
                value={f.followUpDate} onChange={(e) => set('followUpDate', e.target.value)} />
            </Field>
            <Field label="Kyun">
              <input className={inputCls('h-11 font-semibold')} placeholder="Compressor aane par"
                value={f.followUpReason} onChange={(e) => set('followUpReason', e.target.value)} />
            </Field>
          </div>
        )}

        <Field label="Customer ki rating" hint="technician ka average isi se banta hai">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => set('customerRating', f.customerRating === n ? 0 : n)}
                className="p-1 transition hover:scale-110">
                <Star className={`h-7 w-7 ${n <= f.customerRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
              </button>
            ))}
            {f.customerRating > 0 && (
              <button type="button" onClick={() => set('customerRating', 0)} className="ml-1 text-[10px] font-extrabold text-slate-400 hover:text-rose-500">
                hatao
              </button>
            )}
          </div>
        </Field>
        {f.customerRating > 0 && (
          <Field label="Customer ne kya kaha">
            <input className={inputCls('h-11 font-semibold')} placeholder="Bohat acha kaam kiya"
              value={f.customerFeedback} onChange={(e) => set('customerFeedback', e.target.value)} />
          </Field>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Wapas</Button>
          <Button
            className="flex-[2] bg-gradient-to-r from-emerald-600 to-teal-700 font-extrabold shadow-lg shadow-emerald-500/30"
            loading={pending}
            disabled={tooMuch}
            onClick={() => {
              const payload: any = {
                visitCharge: Number(f.visitCharge) || 0,
                laborCharge: Number(f.laborCharge) || 0,
                partsCharge: Number(f.partsCharge) || 0,
                paidAmount: paid,
                requiresFollowUp: f.requiresFollowUp,
              };
              if (f.diagnosedIssue.trim()) payload.diagnosedIssue = f.diagnosedIssue.trim();
              if (f.workDone.trim()) payload.workDone = f.workDone.trim();
              if (f.partsText.trim()) {
                payload.partsReplaced = f.partsText.split(',').map((s) => ({ name: s.trim() })).filter((p) => p.name);
              }
              if (f.requiresFollowUp && f.followUpDate) payload.followUpDate = f.followUpDate;
              if (f.requiresFollowUp && f.followUpReason.trim()) payload.followUpReason = f.followUpReason.trim();
              if (f.customerRating > 0) payload.customerRating = f.customerRating;
              if (f.customerFeedback.trim()) payload.customerFeedback = f.customerFeedback.trim();
              onSubmit(payload);
            }}
          >
            <CheckCircle2 className="h-4 w-4" /> Mukammal Karein
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function PaymentForm({ due, pending, onCancel, onSubmit }: any) {
  const [amount, setAmount] = useState(String(due));
  const [note, setNote] = useState('');
  const n = Number(amount) || 0;
  const bad = n <= 0 || n > due;

  return (
    <Panel icon={Banknote} title="Paisa Wusool" hint={`Baqi: ${formatPKR(due)}`} tone="amber">
      <div className="space-y-3">
        <Field label="Kitna mila" required error={bad ? `1 se ${due} ke darmiyan honi chahiye` : undefined}>
          <input type="number" min={1} max={due} className={inputCls('h-12 text-base font-extrabold tabular-nums', bad)}
            value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        <div className="flex gap-1.5 flex-wrap">
          {[due, Math.round(due / 2), 1000, 500].filter((v, i, a) => v > 0 && v <= due && a.indexOf(v) === i).map((v) => (
            <button key={v} type="button" onClick={() => setAmount(String(v))}
              className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400 transition">
              {v === due ? `Poora ${formatPKR(v)}` : formatPKR(v)}
            </button>
          ))}
        </div>
        <Field label="Note" hint="optional">
          <input className={inputCls('h-11 font-semibold')} placeholder="Cash • Ali bhai ne diya"
            value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Wapas</Button>
          <Button className="flex-[2] bg-gradient-to-r from-amber-500 to-orange-600 font-extrabold" loading={pending} disabled={bad}
            onClick={() => onSubmit({ amount: n, ...(note.trim() ? { note: note.trim() } : {}) })}>
            <Banknote className="h-4 w-4" /> Darj Karein
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function CancelForm({ pending, onCancel, onSubmit }: any) {
  const [reason, setReason] = useState('');
  const presets = ['Customer ne mana kiya', 'Ghar par koi nahi mila', 'Kharcha ziyada tha', 'Kisi aur se karwa liya', 'Ghalat entry thi'];
  return (
    <Panel icon={Ban} title="Request Cancel" hint="Record rahega — sirf halat badlegi" tone="rose">
      <div className="space-y-3">
        <Field label="Wajah">
          <input className={inputCls('h-11 font-semibold')} placeholder="Kyun cancel kar rahe hain"
            value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </Field>
        <div className="flex gap-1.5 flex-wrap">
          {presets.map((p) => (
            <button key={p} type="button" onClick={() => setReason(p)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-rose-400 transition">
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Wapas</Button>
          <Button className="flex-[2] bg-gradient-to-r from-rose-600 to-red-700 font-extrabold" loading={pending}
            onClick={() => onSubmit(reason.trim())}>
            <Ban className="h-4 w-4" /> Cancel Karein
          </Button>
        </div>
      </div>
    </Panel>
  );
}

/* ═════════════════════════════════════════════════════════════
   ANALYTICS — service desk ki poori tasveer
   ═════════════════════════════════════════════════════════════ */
function ServiceAnalytics() {
  const [days, setDays] = useState(30);
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { from: toDateInput(from), to: toDateInput(to) };
  }, [days]);

  const { data: a, isLoading } = useQuery({
    queryKey: ['appliance-service-analytics', range],
    queryFn: () => appliancesAnalyticsApi.serviceDesk(range),
  });

  if (isLoading || !a) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
        <div className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  const q = a.quality;
  const t = a.totals;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Range chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Arsa</span>
        {[7, 30, 90, 365].map((d) => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border-2 transition ${
              days === d ? 'bg-cyan-600 border-cyan-600 text-white shadow'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-400'
            }`}>
            {d === 7 ? '7 din' : d === 30 ? '1 mahina' : d === 90 ? '3 mahine' : '1 saal'}
          </button>
        ))}
      </div>

      {/* Paisa */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={Wallet} tone="emerald" label="Kul Kamai" value={formatPKR(t.revenue)} sub={`${t.completed} kaam mukammal`} />
        <Kpi icon={Banknote} tone="cyan" label="Wusool Hua" value={formatPKR(t.collected)} sub={`munafa ${formatPKR(t.profit)}`} />
        <Kpi icon={AlertTriangle} tone="rose" label="Baqi Paisa" value={formatPKR(t.outstanding)} sub="kaam ho gaya, paisa nahi" alert={t.outstanding > 0} />
        <Kpi icon={Package} tone="amber" label="Parts ka Kharcha" value={formatPKR(t.cost)} sub="ye dukaan ne diya" />
      </div>

      {/* Kaam ki halat */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={ListChecks} tone="blue" label="Khula Kaam" value={t.open} sub={`${t.serviceJobs} repair • ${t.installJobs} installation`} />
        <Kpi icon={Clock} tone="orange" label="Late" value={t.overdue} sub="tareekh guzar gayi" alert={t.overdue > 0} />
        <Kpi icon={Timer} tone="violet" label="Ausat Waqt" value={fmtDuration(q.avgResolutionHours)} sub="request se mukammal tak" />
        <Kpi icon={Star} tone="teal" label="Rating" value={q.avgRating ? q.avgRating.toFixed(1) : '—'} sub={`${q.ratingCount} logon ne di`} />
      </div>

      {/* Quality band */}
      <Panel icon={Zap} title="Kaam ka Miyaar" hint="Ye teen number batate hain ke team kaisi chal rahi hai" tone="violet">
        <div className="grid sm:grid-cols-3 gap-3">
          <QualityBar
            label="Usi din theek"
            value={q.sameDayRate}
            hint={`${q.sameDayFixes} kaam usi din mukammal hue`}
            good={60}
          />
          <QualityBar
            label="Pehli visit me hal"
            value={q.firstVisitFixRate}
            hint={`${q.firstVisitFix} kaam dobara jane ke baghair`}
            good={75}
          />
          <QualityBar
            label="Paisa wala kaam"
            value={t.revenue > 0 ? (q.paidJobs / Math.max(q.paidJobs + q.warrantyJobs + q.amcJobs, 1)) * 100 : 0}
            hint={`${q.paidJobs} paid • ${q.warrantyJobs} warranty • ${q.amcJobs} AMC`}
            good={50}
          />
        </div>
      </Panel>

      {/* Rozana trend */}
      <Panel icon={TrendingUp} title="Rozana" hint="Kitni requests aayin aur kitni mukammal huin" tone="cyan">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={a.daily} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8"
              tickFormatter={(d) => new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} />
            <YAxis yAxisId="l" allowDecimals={false} tick={{ fontSize: 11, fontWeight: 700 }} stroke="#94a3b8" />
            <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#10b981"
              tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
            <Tooltip contentStyle={TOOLTIP}
              labelFormatter={(d) => new Date(d as string).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
              formatter={(v: any, n: any) => [n === 'Kamai' ? formatPKR(Number(v)) : v, n]} />
            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
            <Bar yAxisId="l" dataKey="requested" name="Aayin" fill="#06b6d4" radius={[6, 6, 0, 0]} />
            <Bar yAxisId="l" dataKey="completed" name="Mukammal" fill="#10b981" radius={[6, 6, 0, 0]} />
            <Line yAxisId="r" type="monotone" dataKey="revenue" name="Kamai" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>

      {/* Technician performance */}
      <Panel icon={Users} title="Technician ki Kaarkardagi" hint="Kaun kitna kaam kar raha hai aur kitna kama raha hai" tone="blue">
        {a.technicians.length === 0 ? (
          <p className="text-xs font-bold text-slate-400 py-6 text-center">Is arse me kisi technician ka kaam darj nahi hua</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700">
                  <Th className="text-left">Technician</Th>
                  <Th className="text-center">Kaam</Th>
                  <Th className="text-center">Mukammal</Th>
                  <Th className="text-center">Khula</Th>
                  <Th className="text-center">Ausat Waqt</Th>
                  <Th className="text-center">Rating</Th>
                  <Th className="text-right">Kamai</Th>
                  <Th className="text-right">Commission</Th>
                </tr>
              </thead>
              <tbody>
                {a.technicians.map((t2) => (
                  <tr key={t2.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-extrabold text-white shrink-0 ${
                          t2.isActive ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-slate-400'
                        }`}>
                          {t2.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-extrabold text-slate-900 dark:text-white truncate">{t2.name}</div>
                          <div className="text-[10px] font-bold text-slate-400">{t2.employeeCode}{t2.zone ? ` • ${t2.zone}` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-extrabold tabular-nums text-slate-700 dark:text-slate-200">{t2.totalJobs}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-xs font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">{t2.completed}</span>
                      <div className="text-[9px] font-bold text-slate-400">{t2.completionRate.toFixed(0)}%</div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        t2.open === 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : t2.open > 5 ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>{t2.open}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-[11px] font-bold text-slate-600 dark:text-slate-300">{fmtDuration(t2.avgHours)}</td>
                    <td className="px-3 py-2.5 text-center text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                      {t2.avgRating ? `⭐ ${t2.avgRating.toFixed(1)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs font-extrabold tabular-nums text-slate-800 dark:text-slate-100 whitespace-nowrap">{formatPKR(t2.revenue)}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-extrabold tabular-nums text-violet-700 dark:text-violet-400 whitespace-nowrap">{formatPKR(t2.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Issues + problem products */}
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        <Panel icon={AlertTriangle} title="Sab Se Aam Kharabiyan" hint="Isi ke parts stock me rakhein" tone="amber">
          {a.topIssues.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 py-6 text-center">Abhi koi record nahi</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, a.topIssues.length * 32)}>
              <BarChart data={a.topIssues.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
                <YAxis type="category" dataKey="issue" width={130} tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [n === 'Kamai' ? formatPKR(Number(v)) : v, n]} />
                <Bar dataKey="jobs" name="Kaam" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel icon={Package} title="Jo Cheez Baar Baar Kharab Hoti Hai" hint="Aise model bechne se pehle sochein" tone="rose">
          {a.problemProducts.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 py-6 text-center">Abhi koi record nahi</p>
          ) : (
            <div className="space-y-1">
              {a.problemProducts.slice(0, 10).map((p, i) => (
                <div key={p.productName} className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <span className={`h-6 w-6 rounded-lg text-[10px] font-extrabold flex items-center justify-center shrink-0 ${
                    i === 0 ? 'bg-rose-500 text-white' : i < 3 ? 'bg-orange-400 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{p.productName}</div>
                    <div className="text-[10px] font-bold text-slate-400">
                      {p.jobs} bar kharab{p.warrantyJobs > 0 ? ` • ${p.warrantyJobs} warranty me (dukaan ka nuqsan)` : ''}
                    </div>
                  </div>
                  <div className="text-xs font-extrabold tabular-nums text-slate-700 dark:text-slate-200 shrink-0">{formatPKR(p.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Tanbeeh — late kaam, follow-ups, AMC */}
      <div className="grid lg:grid-cols-3 gap-3 sm:gap-4">
        <Panel icon={Clock} title={`Late Kaam (${a.overdueJobs.length})`} hint="Foran nipta dein" tone="rose">
          {a.overdueJobs.length === 0 ? (
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 py-6 text-center">✅ Koi kaam late nahi</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {a.overdueJobs.map((j) => (
                <div key={j.id} className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate">{j.customerName}</span>
                    <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 shrink-0">{j.daysLate} din late</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                    {j.requestNumber} • {j.productName}{j.technicianName ? ` • ${j.technicianName}` : ' • banda nahi laga'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel icon={History} title={`Dobara Jana Hai (${a.pendingFollowUps.length})`} hint="Follow-up ka waada kiya tha" tone="amber">
          {a.pendingFollowUps.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 py-6 text-center">Koi follow-up baqi nahi</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {a.pendingFollowUps.map((f) => (
                <div key={f.id} className={`rounded-xl border px-2.5 py-2 ${
                  f.isDue ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate">{f.customerName}</span>
                    <span className={`text-[10px] font-black shrink-0 ${f.isDue ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400'}`}>
                      {fmtDate(f.followUpDate)}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                    {f.productName}{f.followUpReason ? ` — ${f.followUpReason}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel icon={ShieldCheck} title={`AMC Khatam Ho Rahe (${a.amcExpiring.length})`} hint="Renew karwa lein" tone="violet">
          {a.amcExpiring.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 py-6 text-center">Koi AMC khatam nahi ho raha</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {a.amcExpiring.map((c) => (
                <div key={c.id} className="rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate">{c.customerName}</span>
                    <span className="text-[10px] font-black text-violet-700 dark:text-violet-400 shrink-0">{c.daysLeft} din</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                    {c.contractNumber} • {c.visitsLeft} visit baqi{c.pending > 0 ? ` • ${formatPKR(c.pending)} udhaar` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Repeat customers + zones */}
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        <Panel icon={Users} title="Baar Baar Bulane Wale" hint="In se AMC bechein — dono ka faida" tone="teal">
          {a.repeatCustomers.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 py-6 text-center">Abhi koi repeat customer nahi</p>
          ) : (
            <div className="space-y-1">
              {a.repeatCustomers.map((c) => (
                <div key={c.phone} className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-extrabold text-xs shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{c.name}</div>
                    <div className="text-[10px] font-bold text-slate-400">{c.phone} • {c.jobs} bar bulaya</div>
                  </div>
                  <div className="text-xs font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400 shrink-0">{formatPKR(c.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel icon={MapPin} title="Ilaqe ke Hisab Se" hint="Kahan sab se ziyada kaam aata hai" tone="cyan">
          {a.zones.length === 0 ? (
            <p className="text-xs font-bold text-slate-400 py-6 text-center">Abhi koi record nahi</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, a.zones.length * 30)}>
              <BarChart data={a.zones} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
                <YAxis type="category" dataKey="zone" width={120} tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
                <Tooltip contentStyle={TOOLTIP} />
                <Bar dataKey="jobs" name="Kaam" fill="#06b6d4" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>
    </div>
  );
}

function QualityBar({ label, value, hint, good }: { label: string; value: number; hint: string; good: number }) {
  const ok = value >= good;
  return (
    <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300">{label}</span>
        <span className={`text-lg font-extrabold tabular-nums ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {value.toFixed(0)}%
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${ok ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <div className="mt-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">{hint}</div>
      <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500">Acha: {good}% se upar</div>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

const TOOLTIP: React.CSSProperties = {
  borderRadius: 12, border: '2px solid #334155', background: '#0f172a',
  color: '#fff', fontSize: 12, fontWeight: 700,
};

/* ═════════════════════════════════════════════════════════════
   TEACHER
   ═════════════════════════════════════════════════════════════ */
function ServiceTeacher({ onClose }: { onClose: () => void }) {
  return (
    <Teacher
      title="Service Requests Kaise Chalayein?"
      intro={
        <>
          Jab kisi ka <strong>fridge, AC ya washing machine</strong> kharab ho, ye page wohi register hai jahan
          har kaam darj hota hai — kis ne bulaya, kaun gaya, kya kharabi thi, kya theek kiya, aur kitna paisa mila.
        </>
      }
      blocks={[
        {
          title: '📋 Rozana ka tareeqa',
          tone: 'cyan',
          tips: [
            <><strong>"Nayi Request"</strong> (ya <Kbd dark>N</Kbd>) — customer ka phone aate hi darj karein. <strong>Serial number daal kar "Check"</strong> dabayein to product, warranty aur AMC khud bhar jate hain</>,
            <><strong>"Kaam" tab</strong> (<Kbd dark>Q</Kbd>) — sirf khula kaam dikhta hai, <strong>late aur urgent sab se upar</strong>. Subah yahin se din shuru karein</>,
            <><strong>Technician lagayein</strong> — list me har banday ke sath likha hota hai uske paas kitna kaam khula hai. Jo <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Khali</span> ho usay dein</>,
            <>Technician nikle to <strong>🛵 Raaste me</strong>, pohanche to <strong>🏠 Ghar pohancha</strong> — customer poochhe to fauran bata sakte hain</>,
          ],
        },
        {
          title: '💰 Paisa poora wusool karein',
          tone: 'amber',
          tips: [
            <><strong>"Mukammal Karein"</strong> me visit + labor + parts alag alag likhein — report me pata chalta hai kamai kahan se aa rahi hai</>,
            <>Agar customer ne <strong>aadha paisa</strong> diya to utna hi likhein — baqi <strong>udhaar</strong> me chala jayega</>,
            <><strong>"Baqi paisa"</strong> button dabayein — ek nazar me saare wo kaam jin ka paisa reh gaya. Baad me <strong>"Paisa Wusool"</strong> se darj karein</>,
            <>Warranty ya AMC ka kaam ho to <strong>toggle on karein</strong> — paisa 0 rahega aur AMC ki free visit khud ginn jayegi</>,
          ],
        },
        {
          title: '📊 Analytics se faida',
          tone: 'violet',
          tips: [
            <><Kbd dark>A</Kbd> dabayein — <strong>kaun sa technician kitna kama raha hai</strong>, uska commission, rating aur ausat waqt</>,
            <><strong>"Sab se aam kharabiyan"</strong> — jo parts baar baar lagte hain wo stock me rakhein, dobara jana nahi parega</>,
            <><strong>"Baar baar kharab hone wali cheez"</strong> — agar koi model bar bar warranty me aata hai to wo <strong>dukaan ka nuqsan</strong> hai</>,
            <><strong>"Baar baar bulane wale"</strong> customers ko <strong>AMC bechein</strong> — unhein sasta parta hai, aap ko pakka paisa milta hai</>,
          ],
        },
        {
          title: '🖨️ Parchi aur record',
          tone: 'emerald',
          tips: [
            <>Har request ki <strong>80mm parchi</strong> nikalti hai — customer ke dastakhat ki jagah bhi hai</>,
            <><Kbd dark>P</Kbd> — poore safhe ka <strong>A4 report</strong>, filters ke sath. Print dialog me "Save as PDF" karein</>,
            <><strong>CSV</strong> — Excel me poora hisab, har charge alag column me</>,
          ],
        },
      ]}
      shortcuts={[
        { keys: 'Q', label: 'Kaam tab' },
        { keys: 'A', label: 'Analytics' },
        { keys: '/', label: 'Search' },
        { keys: 'N', label: 'Nayi request' },
        { keys: 'F', label: 'Filters' },
        { keys: 'P', label: 'Print' },
        { keys: 'T', label: 'Ye guide' },
        { keys: 'Esc', label: 'Band' },
      ]}
      golden={
        <>
          <strong>Sunahri usool:</strong> Jo kaam <strong>bina technician ke</strong> para hai wohi sab se ziyada
          shikayat banta hai. Subah sab se pehle "Kaam" tab kholein aur <strong>khali bande</strong> ko kaam dein —
          ek bhi request bina banday ke na rahe.
        </>
      }
      onClose={onClose}
    />
  );
}
