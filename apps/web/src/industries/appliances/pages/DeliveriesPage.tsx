import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import {
  Truck, Search, X, RefreshCw, CheckCircle2, Clock, AlertTriangle,
  Phone, MessageCircle, MapPin, Package, Plus, FileSpreadsheet, Printer,
  BarChart3, Wrench, Navigation, User, Building2, ArrowUpDown, Loader2,
  Wallet, CalendarClock, ClipboardCheck, Layers, Send, Camera,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@core/security/HiddenValue';
import { deliveriesApi, type ApplianceDelivery } from '../api/deliveries.api';
import {
  ApplianceHero, Kpi, Panel, StatusBadge, Teacher, Empty, Sheet, Field,
  inputCls, ChipRow, useShortcuts, printHtml, downloadCsv, a4Shell,
  fmtDate, fmtDateTime, printAction, guideAction, escapeHtml,
} from '../components/shared';
import { DELIVERY_STATUS_META, delStatusMeta, DELIVERY_NEXT, TIME_SLOTS } from '../constants';

/* ═════════════════════════════════════════════════════════════
   DELIVERY — BARA MAAL GHAR TAK
   ─────────────────────────────────────────────────────────────
   Fridge, AC, washing machine — customer ye khud le kar nahi
   ja sakta. Delivery isi liye bikti hai: gaari, do banday,
   seerhiyan. Har cheez ka alag paisa hai.

   Safha teen khatron par nazar rakhta hai:
   • Tareekh guzar gayi aur maal abhi tak nahi pohancha
   • Gaari abhi tak lagi hi nahi
   • Maal pohanch gaya magar installation book nahi hui
     (yehi sab se zyada paisa zaya karti hai)
   ═════════════════════════════════════════════════════════════ */

type Tab = 'board' | 'list' | 'analytics';

/** ChipRow apna "Sab" button khud deta hai */
const STATUS_CHIPS = Object.entries(DELIVERY_STATUS_META)
  .map(([k, m]) => ({ value: k, label: `${m.emoji} ${m.label}` }));

export default function DeliveriesPage() {
  const qc = useQueryClient();
  const hideCost = useCostHidden();
  const shopName = useAuthStore((s: any) => s.tenant?.name) || 'Meri Dukaan';
  const shopPhone = useAuthStore((s: any) => s.tenant?.phone || '');

  const [tab, setTab] = useState<Tab>('board');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showGuide, setShowGuide] = useState(false);
  const [vehicleFor, setVehicleFor] = useState<ApplianceDelivery | null>(null);
  const [confirmFor, setConfirmFor] = useState<ApplianceDelivery | null>(null);

  const { data: deliveries = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['appliance-deliveries', statusFilter],
    queryFn: () => deliveriesApi.list({ status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  const { data: summary } = useQuery({
    queryKey: ['appliance-deliveries-summary'],
    queryFn: () => deliveriesApi.summary(),
  });

  const money = (n: number) => (hideCost ? '•••' : formatPKR(n));

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return deliveries;
    return deliveries.filter((d) =>
      d.deliveryNumber.toLowerCase().includes(q) ||
      d.customerName.toLowerCase().includes(q) ||
      (d.customerPhone ?? '').includes(q) ||
      (d.deliveryAddress ?? '').toLowerCase().includes(q) ||
      (d.city ?? '').toLowerCase().includes(q) ||
      (d.area ?? '').toLowerCase().includes(q) ||
      (d.driverName ?? '').toLowerCase().includes(q) ||
      (d.vehicleNumber ?? '').toLowerCase().includes(q));
  }, [deliveries, search]);

  /* ─── Board: har halat ka apna column ─── */
  const board = useMemo(() => {
    const cols: Record<string, ApplianceDelivery[]> = {};
    for (const k of Object.keys(DELIVERY_STATUS_META)) cols[k] = [];
    for (const d of filtered) (cols[d.status] ??= []).push(d);
    return cols;
  }, [filtered]);

  /* ─── Khatray: tareekh guzri, gaari nahi, installation baqi ─── */
  const alerts = useMemo(() => {
    const now = Date.now();
    const overdue = filtered.filter((d) =>
      d.scheduledDate && new Date(d.scheduledDate).getTime() < now &&
      !['DELIVERED', 'CANCELLED'].includes(d.status));
    const noVehicle = filtered.filter((d) =>
      !d.vehicleNumber && !['DELIVERED', 'CANCELLED'].includes(d.status));
    const installPending = filtered.filter((d) =>
      d.status === 'DELIVERED' && d.requiresInstallation && !d.installationLinked);
    return { overdue, noVehicle, installPending };
  }, [filtered]);

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      deliveriesApi.updateStatus(id, { status }),
    onSuccess: () => {
      toast.success('Halat badal di');
      qc.invalidateQueries({ queryKey: ['appliance-deliveries'] });
      qc.invalidateQueries({ queryKey: ['appliance-deliveries-summary'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update nahi hua'),
  });

  const vehicleMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => deliveriesApi.assignVehicle(id, data),
    onSuccess: () => {
      toast.success('Gaari lag gayi ✓');
      setVehicleFor(null);
      qc.invalidateQueries({ queryKey: ['appliance-deliveries'] });
      qc.invalidateQueries({ queryKey: ['appliance-deliveries-summary'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Gaari nahi lagi'),
  });

  const confirmMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => deliveriesApi.confirm(id, data),
    onSuccess: () => {
      toast.success('Delivery mukammal ✓');
      setConfirmFor(null);
      qc.invalidateQueries({ queryKey: ['appliance-deliveries'] });
      qc.invalidateQueries({ queryKey: ['appliance-deliveries-summary'] });
      qc.invalidateQueries({ queryKey: ['appliance-serials'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Confirm nahi hua'),
  });

  /* ─── Print + CSV ─── */
  const doPrint = () => {
    if (!filtered.length) return toast.error('Print ke liye kuch nahi');
    const body = `<table>
      <thead><tr>
        <th>Delivery</th><th>Customer</th><th>Phone</th><th>Pata</th>
        <th>Tareekh</th><th>Gaari</th><th>Driver</th><th>Halat</th><th class="r">Paisa</th>
      </tr></thead>
      <tbody>${filtered.map((d) => `<tr>
        <td><strong>${escapeHtml(d.deliveryNumber)}</strong></td>
        <td>${escapeHtml(d.customerName)}</td>
        <td>${escapeHtml(d.customerPhone ?? '')}</td>
        <td>${escapeHtml([d.deliveryAddress, d.area, d.city].filter(Boolean).join(', '))}</td>
        <td>${d.scheduledDate ? fmtDate(d.scheduledDate) : '—'}${d.scheduledSlot ? ` ${escapeHtml(d.scheduledSlot)}` : ''}</td>
        <td>${escapeHtml(d.vehicleNumber ?? '—')}</td>
        <td>${escapeHtml(d.driverName ?? '—')}</td>
        <td>${escapeHtml(delStatusMeta(d.status).label)}</td>
        <td class="r">${formatPKR(Number(d.totalCharge ?? 0))}</td>
      </tr>`).join('')}</tbody></table>`;

    printHtml(a4Shell({
      title: 'Deliveries',
      heading: 'Delivery Ki List',
      shopName, shopPhone,
      badge: `${filtered.length} delivery`,
      kpis: [
        { label: 'Aaj ki', value: String(summary?.todayScheduled ?? 0), tone: 'blue' },
        { label: 'Chal rahi', value: String(summary?.open ?? 0), tone: 'amber' },
        { label: 'Tareekh guzri', value: String(summary?.overdue ?? 0), tone: 'rose' },
        { label: 'Mahine ki aamdan', value: formatPKR(summary?.month?.revenue ?? 0), tone: 'green' },
      ],
      body,
    }));
  };

  const doCsv = () => {
    if (!filtered.length) return toast.error('CSV ke liye kuch nahi');
    downloadCsv(`deliveries-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Delivery', 'Halat', 'Customer', 'Phone', 'Pata', 'Ilaqa', 'Sheher', 'Manzil', 'Lift',
       'Tareekh', 'Waqt', 'Gaari', 'Driver', 'Driver phone', 'Helper',
       'Delivery', 'Loading', 'Unloading', 'Floor', 'Kul', 'Installation chahiye', 'Installation book',
       'Nikla', 'Pohancha', 'Diya', 'Wasool karne wala'],
      ...filtered.map((d) => [
        d.deliveryNumber, delStatusMeta(d.status).label, d.customerName, d.customerPhone,
        d.deliveryAddress, d.area, d.city, d.floorNumber, d.hasLift ? 'Haan' : 'Nahi',
        d.scheduledDate ? fmtDate(d.scheduledDate) : '', d.scheduledSlot,
        d.vehicleNumber, d.driverName, d.driverPhone, d.helperCount,
        Number(d.deliveryCharge ?? 0), Number(d.loadingCharge ?? 0),
        Number(d.unloadingCharge ?? 0), Number(d.floorCharge ?? 0), Number(d.totalCharge ?? 0),
        d.requiresInstallation ? 'Haan' : 'Nahi', d.installationLinked ? 'Haan' : 'Nahi',
        d.dispatchedAt ? fmtDateTime(d.dispatchedAt) : '',
        d.arrivedAt ? fmtDateTime(d.arrivedAt) : '',
        d.deliveredAt ? fmtDateTime(d.deliveredAt) : '',
        d.receivedByName,
      ]),
    ]);
    toast.success(`${filtered.length} delivery CSV me`);
  };

  useShortcuts({
    '/': () => (document.getElementById('del-search') as HTMLInputElement)?.focus(),
    b: () => setTab('board'),
    l: () => setTab('list'),
    a: () => setTab('analytics'),
    p: doPrint,
    g: () => setShowGuide(true),
    Escape: () => {
      if (showGuide) return setShowGuide(false);
      if (vehicleFor) return setVehicleFor(null);
      if (confirmFor) return setConfirmFor(null);
      if (search) return setSearch('');
    },
  }, [filtered, showGuide, vehicleFor, confirmFor, search]);

  /* ─── Analytics data ─── */
  const chargeData = useMemo(() => {
    const b = summary?.month?.breakdown;
    if (!b) return [];
    return [
      { name: 'Delivery', value: b.delivery, hex: '#06b6d4' },
      { name: 'Loading', value: b.loading, hex: '#6366f1' },
      { name: 'Unloading', value: b.unloading, hex: '#f59e0b' },
      { name: 'Seerhi/Manzil', value: b.floor, hex: '#e11d48' },
    ].filter((r) => r.value > 0);
  }, [summary]);

  const statusData = useMemo(
    () => Object.entries(DELIVERY_STATUS_META).map(([k, m]) => ({
      name: m.label,
      count: (board[k] ?? []).length,
      hex: m.hex,
    })),
    [board],
  );

  /* ─── Ilaqe ka bojh — kahan sab se zyada jana parta hai ─── */
  const areaData = useMemo(() => {
    const map = new Map<string, { area: string; count: number; revenue: number }>();
    for (const d of deliveries) {
      const key = d.area?.trim() || d.city?.trim() || 'Pata nahi';
      const hit = map.get(key) ?? { area: key, count: 0, revenue: 0 };
      hit.count += 1;
      hit.revenue += Number(d.totalCharge ?? 0);
      map.set(key, hit);
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [deliveries]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-20">
      <ApplianceHero
        badge="Delivery — Bara Maal Ghar Tak"
        badgeIcon={<Truck className="h-3.5 w-3.5" />}
        title="🚚 Deliveries"
        subtitle={
          <>
            Aaj {summary?.todayScheduled ?? 0} · {summary?.open ?? 0} chal rahi ·{' '}
            {money(summary?.month?.revenue ?? 0)} mahine ki aamdan
            {(summary?.overdue ?? 0) > 0 && <span className="text-rose-200"> · ⚠️ {summary?.overdue} ki tareekh guzri</span>}
          </>
        }
        actions={[
          { key: 'refresh', label: 'Taaza', icon: <RefreshCw className="h-4 w-4" />, onClick: () => refetch(), spinning: isRefetching, hideLabelOnMobile: true },
          { key: 'csv', label: 'CSV', icon: <FileSpreadsheet className="h-4 w-4" />, onClick: doCsv, hideLabelOnMobile: true },
          printAction(doPrint),
          guideAction(() => setShowGuide(true)),
        ]}
        shortcuts={[
          { keys: '/', label: 'search' }, { keys: 'B', label: 'board' },
          { keys: 'L', label: 'list' }, { keys: 'A', label: 'analytics' },
          { keys: 'P', label: 'print' }, { keys: 'G', label: 'guide' },
        ]}
      >
        <PrivacyToggle />
      </ApplianceHero>

      {/* ─── Khatray ─── */}
      {(alerts.overdue.length > 0 || alerts.installPending.length > 0 || alerts.noVehicle.length > 0) && (
        <div className="grid sm:grid-cols-3 gap-2.5">
          {alerts.overdue.length > 0 && (
            <AlertBox tone="rose" icon={AlertTriangle} n={alerts.overdue.length}
              title="Tareekh guzar gayi"
              desc="Maal abhi tak nahi pohancha — customer ka phone aane se pehle khud rabta karein." />
          )}
          {alerts.noVehicle.length > 0 && (
            <AlertBox tone="amber" icon={Truck} n={alerts.noVehicle.length}
              title="Gaari nahi lagi"
              desc="In par abhi tak koi driver aur gaari muqarrar nahi hui." />
          )}
          {alerts.installPending.length > 0 && (
            <AlertBox tone="violet" icon={Wrench} n={alerts.installPending.length}
              title="Installation baqi"
              desc="Maal pohanch gaya magar installation book nahi hui — ye paisa aksar zaya ho jata hai." />
          )}
        </div>
      )}

      {/* ─── KPI ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 sm:gap-3">
        <Kpi icon={CalendarClock} label="Aaj ki delivery" tone="blue" value={summary?.todayScheduled ?? 0}
          sub="Aaj gaari nikalni hai" />
        <Kpi icon={Package} label="Tareekh baqi" tone="slate" value={summary?.pending ?? 0}
          sub="Abhi tareekh nahi mili"
          active={statusFilter === 'PENDING'}
          onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'all' : 'PENDING')} />
        <Kpi icon={Truck} label="Raste me" tone="cyan" value={summary?.dispatched ?? 0}
          sub={`${summary?.arrived ?? 0} pohanch chuki`}
          active={statusFilter === 'DISPATCHED'}
          onClick={() => setStatusFilter(statusFilter === 'DISPATCHED' ? 'all' : 'DISPATCHED')} />
        <Kpi icon={CheckCircle2} label="De di" tone="emerald" value={summary?.delivered ?? 0}
          sub="Mukammal"
          active={statusFilter === 'DELIVERED'}
          onClick={() => setStatusFilter(statusFilter === 'DELIVERED' ? 'all' : 'DELIVERED')} />
        <Kpi icon={AlertTriangle} label="Tareekh guzri" tone="rose" value={summary?.overdue ?? 0}
          sub="Abhi tak nahi pohancha" alert={(summary?.overdue ?? 0) > 0} />
        <Kpi icon={Navigation} label="Gaari nahi lagi" tone="amber" value={summary?.noVehicle ?? 0}
          sub="Driver muqarrar karein" alert={(summary?.noVehicle ?? 0) > 0} />
        <Kpi icon={Wrench} label="Installation baqi" tone="violet" value={summary?.installationPending ?? 0}
          sub="Maal pohancha, kaam baqi" alert={(summary?.installationPending ?? 0) > 0} />
        <Kpi icon={Wallet} label="Mahine ki aamdan" tone="teal" value={money(summary?.month?.revenue ?? 0)}
          sub={`${summary?.month?.trips ?? 0} trip · ausat ${money(summary?.month?.avgTrip ?? 0)}`} />
      </div>

      {/* ─── TABS ─── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {([
          { v: 'board' as Tab, label: 'Board', icon: Layers },
          { v: 'list' as Tab, label: 'List', icon: Package, n: filtered.length },
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

      {/* ─── SEARCH ─── */}
      {tab !== 'analytics' && (
        <Panel tone="cyan">
          <div className="space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input id="del-search" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Delivery #, customer, pata, driver ya gaari… (/)"
                className={inputCls('h-12 pl-9 pr-9')} />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                  <X className="h-3.5 w-3.5 text-slate-500" />
                </button>
              )}
            </div>
            <ChipRow value={statusFilter === 'all' ? null : statusFilter}
              onChange={(v) => setStatusFilter(v ?? 'all')} options={STATUS_CHIPS} />
          </div>
        </Panel>
      )}

      {/* ══════════ BOARD ══════════ */}
      {tab === 'board' && (
        isLoading ? (
          <Panel tone="cyan">
            <div className="py-16 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-cyan-600 mb-2" />
              <p className="text-sm font-bold text-slate-500">Deliveries aa rahi hain…</p>
            </div>
          </Panel>
        ) : filtered.length === 0 ? (
          <Panel tone="cyan">
            <Empty icon={Truck} title="Koi delivery nahi"
              hint="POS par bara maal bechte waqt delivery ka khana bharein — delivery yahin khud aa jayegi." />
          </Panel>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {Object.entries(DELIVERY_STATUS_META).map(([k, m]) => {
              const items = board[k] ?? [];
              return (
                <div key={k} className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border-2 border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="px-3 py-2.5 flex items-center justify-between gap-2 border-b-2 border-slate-200 dark:border-slate-800"
                    style={{ background: `${m.hex}18` }}>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100">{m.emoji} {m.label}</span>
                    <span className="h-6 min-w-[24px] px-1.5 rounded-lg text-[11px] font-black text-white flex items-center justify-center tabular-nums"
                      style={{ background: m.hex }}>{items.length}</span>
                  </div>
                  <div className="p-2 space-y-2 max-h-[560px] overflow-y-auto">
                    {items.length === 0 ? (
                      <div className="py-8 text-center text-[11px] font-bold text-slate-400">Khali</div>
                    ) : items.map((d) => (
                      <DeliveryCard key={d.id} d={d} money={money} compact
                        onVehicle={() => setVehicleFor(d)}
                        onConfirm={() => setConfirmFor(d)}
                        onStatus={(st) => statusMut.mutate({ id: d.id, status: st })} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ══════════ LIST ══════════ */}
      {tab === 'list' && (
        isLoading ? (
          <Panel tone="cyan">
            <div className="py-16 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-cyan-600 mb-2" />
            </div>
          </Panel>
        ) : filtered.length === 0 ? (
          <Panel tone="cyan"><Empty icon={Truck} title="Koi delivery nahi mili" /></Panel>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((d) => (
              <DeliveryCard key={d.id} d={d} money={money}
                onVehicle={() => setVehicleFor(d)}
                onConfirm={() => setConfirmFor(d)}
                onStatus={(st) => statusMut.mutate({ id: d.id, status: st })} />
            ))}
          </div>
        )
      )}

      {/* ══════════ ANALYTICS ══════════ */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Panel icon={Wallet} title="Is Mahine Ka Paisa Kahan Se" hint="Delivery ke alag alag charges" tone="teal">
              {chargeData.length === 0 ? (
                <Empty icon={Wallet} title="Is mahine abhi koi delivery nahi" />
              ) : (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chargeData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                          innerRadius={50} outerRadius={80} paddingAngle={3}>
                          {chargeData.map((d, i) => <Cell key={i} fill={d.hex} />)}
                        </Pie>
                        <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                          contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700 }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    {chargeData.map((c) => (
                      <div key={c.name} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2 flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300">{c.name}</span>
                        <span className="text-xs font-black tabular-nums" style={{ color: c.hex }}>{money(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Panel>

            <Panel icon={Layers} title="Har Halat Me Kitni" hint="Abhi kahan atki hui hain" tone="blue">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700 }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {statusData.map((d, i) => <Cell key={i} fill={d.hex} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <Panel icon={MapPin} title="Kis Ilaqe Me Sab Se Zyada Jana Parta Hai" hint="Gaari ka rasta yahan se samajh aata hai" tone="violet">
            {areaData.length === 0 ? (
              <Empty icon={MapPin} title="Abhi koi delivery nahi" />
            ) : (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={areaData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="area" width={110} tick={{ fontSize: 10, fontWeight: 700 }} />
                    <Tooltip formatter={(v: any, n: any) => [n === 'revenue' ? formatPKR(Number(v)) : v, n === 'revenue' ? 'Aamdan' : 'Trips']}
                      contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700 }} />
                    <Legend formatter={(v) => (v === 'revenue' ? 'Aamdan' : 'Trips')} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <Panel icon={Wrench} title="Installation Baqi" hint="Maal pohanch gaya magar kaam book nahi hua — yahi paisa zaya hota hai" tone="rose">
            {alerts.installPending.length === 0 ? (
              <Empty icon={CheckCircle2} title="Sab installation book ho chuki hain" />
            ) : (
              <div className="space-y-1.5">
                {alerts.installPending.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 p-2.5">
                    <div className="h-9 w-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{d.customerName}</div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono truncate">
                        {d.deliveryNumber} · di gayi {d.deliveredAt ? fmtDate(d.deliveredAt) : '—'}
                      </div>
                    </div>
                    {d.customerPhone && (
                      <a href={`tel:${d.customerPhone}`}
                        className="h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0 transition">
                        <Phone className="h-3.5 w-3.5" /> Call
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ─── MODALS ─── */}
      {vehicleFor && (
        <VehicleSheet d={vehicleFor} pending={vehicleMut.isPending}
          onClose={() => setVehicleFor(null)}
          onSubmit={(data) => vehicleMut.mutate({ id: vehicleFor.id, data })} />
      )}

      {confirmFor && (
        <ConfirmSheet d={confirmFor} pending={confirmMut.isPending}
          onClose={() => setConfirmFor(null)}
          onSubmit={(data) => confirmMut.mutate({ id: confirmFor.id, data })} />
      )}

      {showGuide && (
        <Teacher onClose={() => setShowGuide(false)}
          title="Delivery ka safha"
          intro="Fridge, AC ya washing machine customer khud le kar nahi ja sakta. Delivery isi liye alag bikti hai — gaari, banday aur seerhiyon ka paisa alag alag. Yahan se har delivery ka safar shuru se aakhir tak nazar aata hai."
          blocks={[
            {
              title: 'Board — delivery ka safar',
              tone: 'cyan',
              tips: [
                'Har column ek halat hai: tareekh baqi → gaari lag gayi → nikal gaya → pohanch gaya → de diya.',
                'Card ke neeche wale button se agli halat par le jayein — waqt khud darj hota hai.',
                'Board se turant nazar aa jata hai ke kitni gaari raste me hai aur kitni khari hai.',
              ],
            },
            {
              title: 'Teen khatray',
              tone: 'rose',
              tips: [
                'Tareekh guzar gayi aur maal nahi pohancha — customer ka phone aane se pehle khud rabta karein.',
                'Gaari abhi tak lagi hi nahi — driver aur gaari muqarrar karein warna subah bhaag-daur hogi.',
                'Maal pohanch gaya magar installation book nahi hui — yehi sab se zyada paisa zaya karti hai.',
              ],
            },
            {
              title: 'Paisa kahan se',
              tone: 'emerald',
              tips: [
                'Delivery, loading, unloading aur seerhi ka paisa alag alag ginn hota hai.',
                'Analytics me nazar aata hai ke mahine ka paisa kis hisse se aaya — lift na hone par manzil ka charge aksar sab se bara nikalta hai.',
                'Ilaqe wala chart batata hai kahan sab se zyada jana parta hai — gaari ka rasta wahin se banayein.',
              ],
            },
            {
              title: 'Delivery mukammal karna',
              tone: 'violet',
              tips: [
                '"De Diya" karte waqt lene wale ka naam aur CNIC darj karein — baad me kisi jhagre me yehi kaam aata hai.',
                'Confirm karte hi serial number us customer ke naam ho jata hai aur warranty ki ginti shuru.',
              ],
            },
          ]}
          shortcuts={[
            { keys: '/', label: 'Search' }, { keys: 'B', label: 'Board' },
            { keys: 'L', label: 'List' }, { keys: 'A', label: 'Analytics' },
            { keys: 'P', label: 'Print' }, { keys: 'G', label: 'Ye guide' },
            { keys: 'Esc', label: 'Band karein' },
          ]}
          golden="Har raat gaari nikalne se pehle board dekh lein — jo card 'gaari nahi lagi' me hai, subah wohi bhaag-daur banata hai."
        />
      )}
    </div>
  );
}

/* ─────────────── purzay ─────────────── */
function AlertBox({ tone, icon: Icon, n, title, desc }: {
  tone: 'rose' | 'amber' | 'violet'; icon: any; n: number; title: string; desc: string;
}) {
  const tones: Record<string, string> = {
    rose: 'border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 text-rose-900 dark:text-rose-200',
    amber: 'border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200',
    violet: 'border-violet-300 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-500/10 text-violet-900 dark:text-violet-200',
  };
  const badges: Record<string, string> = { rose: 'bg-rose-600', amber: 'bg-amber-500', violet: 'bg-violet-600' };
  return (
    <div className={`rounded-2xl border-2 p-3 ${tones[tone]}`}>
      <div className="flex items-start gap-2.5">
        <div className={`h-9 w-9 rounded-xl ${badges[tone]} text-white flex items-center justify-center shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="font-black text-sm">{n} · {title}</div>
          <p className="text-[11px] font-bold opacity-80 mt-0.5">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function DeliveryCard({ d, money, compact, onVehicle, onConfirm, onStatus }: {
  d: ApplianceDelivery; money: (n: number) => string; compact?: boolean;
  onVehicle: () => void; onConfirm: () => void; onStatus: (s: string) => void;
}) {
  const meta = delStatusMeta(d.status);
  const next = DELIVERY_NEXT[d.status] ?? [];
  const overdue = d.scheduledDate && new Date(d.scheduledDate).getTime() < Date.now()
    && !['DELIVERED', 'CANCELLED'].includes(d.status);
  const wa = (d.customerPhone ?? '').replace(/\D/g, '').replace(/^0/, '92');

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-900 border-2 overflow-hidden transition hover:shadow-lg ${
      overdue ? 'border-rose-300 dark:border-rose-500/40' : 'border-slate-200 dark:border-slate-800'
    }`}>
      <div className="h-1.5" style={{ background: meta.hex }} />
      <div className={compact ? 'p-2.5 space-y-2' : 'p-4 space-y-3'}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono text-[10px] font-extrabold text-slate-500 dark:text-slate-400">{d.deliveryNumber}</div>
            <div className={`font-black text-slate-900 dark:text-white truncate ${compact ? 'text-sm' : ''}`}>{d.customerName}</div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">{d.customerPhone}</div>
          </div>
          {!compact && <StatusBadge meta={meta} size="xs" />}
        </div>

        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
          <div className="flex items-start gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
            <span className="min-w-0">{[d.deliveryAddress, d.area, d.city].filter(Boolean).join(', ') || 'Pata darj nahi'}</span>
          </div>
          {(d.floorNumber || d.hasLift !== undefined) && (
            <div className="flex items-center gap-2 mt-1 pl-5 flex-wrap">
              {!!d.floorNumber && (
                <span className="px-1.5 rounded bg-white dark:bg-slate-900 inline-flex items-center gap-0.5">
                  <Building2 className="h-3 w-3" /> {d.floorNumber} manzil
                </span>
              )}
              <span className={`px-1.5 rounded ${d.hasLift ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'}`}>
                {d.hasLift ? 'Lift hai' : 'Lift nahi — seerhi'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap text-[10px] font-extrabold">
          {d.scheduledDate && (
            <span className={`px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
              overdue ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>
              <Clock className="h-3 w-3" /> {fmtDate(d.scheduledDate)}{d.scheduledSlot ? ` · ${d.scheduledSlot}` : ''}
            </span>
          )}
          {d.vehicleNumber ? (
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 inline-flex items-center gap-1">
              <Truck className="h-3 w-3" /> {d.vehicleNumber}{d.driverName ? ` · ${d.driverName}` : ''}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
              Gaari nahi lagi
            </span>
          )}
          {d.requiresInstallation && (
            <span className={`px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
              d.installationLinked
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                : 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300'
            }`}>
              <Wrench className="h-3 w-3" /> {d.installationLinked ? 'Install book' : 'Install baqi'}
            </span>
          )}
          {Number(d.totalCharge ?? 0) > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 tabular-nums">
              {money(Number(d.totalCharge))}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {!d.vehicleNumber && !['DELIVERED', 'CANCELLED'].includes(d.status) && (
            <button onClick={onVehicle}
              className="flex-1 min-w-[110px] h-9 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-700 text-white text-[11px] font-extrabold inline-flex items-center justify-center gap-1 shadow transition">
              <Truck className="h-3.5 w-3.5" /> Gaari Lagayein
            </button>
          )}
          {d.status === 'ARRIVED' && (
            <button onClick={onConfirm}
              className="flex-1 min-w-[110px] h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-[11px] font-extrabold inline-flex items-center justify-center gap-1 shadow transition">
              <ClipboardCheck className="h-3.5 w-3.5" /> De Diya
            </button>
          )}
          {next.map((st) => {
            const m = delStatusMeta(st);
            return (
              <button key={st} onClick={() => onStatus(st)}
                className="h-9 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-extrabold transition">
                {m.emoji} {m.label}
              </button>
            );
          })}
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" title="WhatsApp"
              className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 transition">
              <MessageCircle className="h-4 w-4" />
            </a>
          )}
          {d.customerPhone && (
            <a href={`tel:${d.customerPhone}`} title="Call"
              className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 transition">
              <Phone className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function VehicleSheet({ d, pending, onClose, onSubmit }: {
  d: ApplianceDelivery; pending: boolean; onClose: () => void; onSubmit: (v: any) => void;
}) {
  const [vehicleNumber, setVehicleNumber] = useState(d.vehicleNumber ?? '');
  const [driverName, setDriverName] = useState(d.driverName ?? '');
  const [driverPhone, setDriverPhone] = useState(d.driverPhone ?? '');
  const [helperCount, setHelperCount] = useState(String(d.helperCount ?? 1));

  const ok = vehicleNumber.trim() && driverName.trim() && driverPhone.trim();

  return (
    <Sheet title="Gaari aur Driver" subtitle={`${d.deliveryNumber} · ${d.customerName}`} onClose={onClose}>
      <div className="space-y-3">
        {!d.hasLift && !!d.floorNumber && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 text-[12px] font-bold text-amber-900 dark:text-amber-200">
            ⚠️ {d.floorNumber} manzil aur lift nahi — do banday kam par sakte hain. Helper ki tadaad barha dein.
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Gaari ka number" hint="jo bill par likha jayega">
            <input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              placeholder="LEA-1234" className={inputCls('h-12 text-base font-mono')} />
          </Field>
          <Field label="Helper kitne">
            <input type="number" min={0} value={helperCount} onChange={(e) => setHelperCount(e.target.value)}
              className={inputCls('h-12 text-base tabular-nums')} />
          </Field>
          <Field label="Driver ka naam">
            <input value={driverName} onChange={(e) => setDriverName(e.target.value)}
              placeholder="Ashraf" className={inputCls()} />
          </Field>
          <Field label="Driver ka phone">
            <input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)}
              placeholder="0300-1234567" className={inputCls('font-mono')} />
          </Field>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1 h-12" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <button disabled={!ok || pending}
            onClick={() => onSubmit({
              vehicleNumber: vehicleNumber.trim(),
              driverName: driverName.trim(),
              driverPhone: driverPhone.trim(),
              helperCount: Number(helperCount) || 0,
            })}
            className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-700 disabled:opacity-40 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg transition">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
            Gaari Lagayein
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function ConfirmSheet({ d, pending, onClose, onSubmit }: {
  d: ApplianceDelivery; pending: boolean; onClose: () => void; onSubmit: (v: any) => void;
}) {
  const [receivedByName, setName] = useState(d.customerName ?? '');
  const [receivedByCnic, setCnic] = useState('');

  return (
    <Sheet title="Delivery Mukammal" subtitle={`${d.deliveryNumber} · ${d.customerName}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3 text-[12px] font-bold text-emerald-900 dark:text-emerald-200">
          Confirm karte hi serial number is customer ke naam ho jayega aur warranty ki ginti shuru ho jayegi.
          Lene wale ka naam aur CNIC darj karein — baad me kisi jhagre me yehi kaam aata hai.
        </div>
        <Field label="Kis ne wasool kiya" hint="jo ghar par mojood tha">
          <input value={receivedByName} onChange={(e) => setName(e.target.value)}
            placeholder="Customer ka naam" className={inputCls('h-12 text-base')} />
        </Field>
        <Field label="CNIC" hint="optional magar behtar">
          <input value={receivedByCnic} onChange={(e) => setCnic(e.target.value)}
            placeholder="35202-1234567-1" className={inputCls('font-mono')} />
        </Field>
        {d.requiresInstallation && !d.installationLinked && (
          <div className="rounded-2xl bg-violet-50 dark:bg-violet-500/10 border-2 border-violet-200 dark:border-violet-500/30 p-3 text-[12px] font-bold text-violet-900 dark:text-violet-200">
            🔧 Is par installation bhi honi hai. Delivery ke foran baad installation book kar dein — warna ye paisa aksar zaya ho jata hai.
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1 h-12" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <button disabled={pending || !receivedByName.trim()}
            onClick={() => onSubmit({
              receivedByName: receivedByName.trim(),
              receivedByCnic: receivedByCnic.trim() || undefined,
            })}
            className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 disabled:opacity-40 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg transition">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
            De Diya — Mukammal
          </button>
        </div>
      </div>
    </Sheet>
  );
}
