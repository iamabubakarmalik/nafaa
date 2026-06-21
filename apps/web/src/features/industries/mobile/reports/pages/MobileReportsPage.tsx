import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Smartphone, ShieldCheck, Wrench, CreditCard, RefreshCw,
  TrendingUp, AlertTriangle, Package, ArrowLeft, DollarSign, Award,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { mobileReportsApi } from '../api/mobile-reports.api';
import { PTA_STATUS_LABELS, PTA_STATUS_COLORS } from '../../api/imei.api';
import { CONDITION_LABELS, CONDITION_COLORS } from '../../api/used-phones.api';
import { REPAIR_STATUS_LABELS } from '../../repairs/api/repairs.api';
import { EMI_STATUS_LABELS } from '../../emi/api/emi.api';

type Tab = 'overview' | 'pta' | 'brands' | 'repairs' | 'emi' | 'used';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'pta', label: 'PTA Status', icon: ShieldCheck },
  { id: 'brands', label: 'Top Brands', icon: Award },
  { id: 'repairs', label: 'Repairs', icon: Wrench },
  { id: 'emi', label: 'EMI', icon: CreditCard },
  { id: 'used', label: 'Used Phones', icon: RefreshCw },
];

export default function MobileReportsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [days, setDays] = useState(30);

  const { data: dashboard } = useQuery({
    queryKey: ['mobile-reports-dashboard'],
    queryFn: mobileReportsApi.dashboard,
    enabled: tab === 'overview',
  });

  const { data: pta = [] } = useQuery({
    queryKey: ['mobile-reports-pta'],
    queryFn: mobileReportsApi.ptaBreakdown,
    enabled: tab === 'pta',
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['mobile-reports-brands', days],
    queryFn: () => mobileReportsApi.topBrands(days),
    enabled: tab === 'brands',
  });

  const { data: repairAnalytics } = useQuery({
    queryKey: ['mobile-reports-repairs', days],
    queryFn: () => mobileReportsApi.repairAnalytics(days),
    enabled: tab === 'repairs',
  });

  const { data: emiAnalytics } = useQuery({
    queryKey: ['mobile-reports-emi'],
    queryFn: mobileReportsApi.emiAnalytics,
    enabled: tab === 'emi',
  });

  const { data: usedAnalytics } = useQuery({
    queryKey: ['mobile-reports-used', days],
    queryFn: () => mobileReportsApi.usedPhoneAnalytics(days),
    enabled: tab === 'used',
  });

  return (
    <div className="space-y-6">
      <Link to="/products" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center">
              <BarChart3 className="h-8 w-8" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-white/70">Mobile Industry</div>
              <h1 className="text-3xl font-extrabold">Reports & Analytics</h1>
              <div className="text-sm text-white/80 mt-1">
                Complete business picture — IMEI stock, PTA, repairs, EMI, used phones
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition ${
                active ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && dashboard && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="New Phones In Stock" value={String(dashboard.newPhonesInStock)} subValue={`Value: ${formatPKR(dashboard.newPhonesStockValue)}`} color="blue" icon={Smartphone} />
            <KpiCard label="PTA Tax Locked" value={formatPKR(dashboard.ptaTaxLocked)} color="amber" icon={ShieldCheck} />
            <KpiCard label="Used Phones Stock" value={String(dashboard.usedPhonesInStock)} subValue={`Potential: ${formatPKR(dashboard.usedPhonesPotentialRevenue)}`} color="violet" icon={RefreshCw} />
            <KpiCard label="Month Profit" value={formatPKR(dashboard.monthProfit)} subValue={`${dashboard.monthSalesCount} sales`} color="emerald" icon={TrendingUp} />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <KpiCard label="Open Repair Tickets" value={String(dashboard.openRepairTickets)} color="orange" icon={Wrench} />
            <KpiCard label="Active EMI Plans" value={String(dashboard.activeEmiPlans)} subValue={`Outstanding: ${formatPKR(dashboard.emiOutstanding)}`} color="indigo" icon={CreditCard} />
            <KpiCard label="Month Revenue" value={formatPKR(dashboard.monthRevenue)} subValue={`COGS: ${formatPKR(dashboard.monthCogs)}`} color="teal" icon={DollarSign} />
          </div>
        </div>
      )}

      {/* PTA */}
      {tab === 'pta' && (
        <div className="rounded-3xl bg-white border border-slate-200 p-5">
          <h3 className="font-bold text-slate-900 mb-4">PTA Status Breakdown (In-Stock Phones)</h3>
          {pta.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No IMEI data</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {pta.map((row) => {
                const colors = PTA_STATUS_COLORS[row.ptaStatus];
                return (
                  <div key={row.ptaStatus} className={`rounded-2xl border-2 p-4 ${colors.bg} ${colors.border}`}>
                    <div className={`text-[10px] uppercase font-bold ${colors.text}`}>
                      {PTA_STATUS_LABELS[row.ptaStatus]}
                    </div>
                    <div className={`text-3xl font-extrabold mt-1 ${colors.text}`}>{row.count}</div>
                    <div className="mt-2 text-[11px] space-y-0.5">
                      <div className={`font-bold ${colors.text}`}>Tax: {formatPKR(row.taxPaid)}</div>
                      <div className="text-slate-600">Stock: {formatPKR(row.stockValue)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* BRANDS */}
      {tab === 'brands' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  days === d ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                Last {d} days
              </button>
            ))}
          </div>

          {brands.length === 0 ? (
            <div className="rounded-3xl bg-white border border-slate-200 p-12 text-center">
              <Award className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <div className="font-bold text-slate-700">No brand sales data</div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {brands.map((b, i) => (
                <div key={b.brandId} className="rounded-2xl bg-white border-2 border-slate-200 p-4 hover:border-blue-400 transition">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-extrabold">
                      #{i + 1}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">{b.unitsSold} units</div>
                  </div>
                  <div className="font-bold text-slate-900">{b.brandName}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-emerald-50 p-2">
                      <div className="text-[9px] uppercase font-bold text-emerald-700">Revenue</div>
                      <div className="font-extrabold text-emerald-900">{formatPKR(b.revenue)}</div>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-2">
                      <div className="text-[9px] uppercase font-bold text-blue-700">Profit ({b.margin}%)</div>
                      <div className="font-extrabold text-blue-900">{formatPKR(b.profit)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REPAIRS */}
      {tab === 'repairs' && repairAnalytics && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  days === d ? 'bg-orange-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                Last {d} days
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Delivered" value={String(repairAnalytics.delivered)} color="emerald" icon={CheckCircle2} />
            <KpiCard label="Total Revenue" value={formatPKR(repairAnalytics.totalRevenue)} color="blue" icon={DollarSign} />
            <KpiCard label="Collected" value={formatPKR(repairAnalytics.collected)} color="teal" icon={CheckCircle2} />
            <KpiCard label="Gross Profit" value={formatPKR(repairAnalytics.grossProfit)} color="amber" icon={TrendingUp} />
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900 mb-3">Tickets by Status</h3>
            <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {repairAnalytics.byStatus.map((s) => (
                <div key={s.status} className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    {REPAIR_STATUS_LABELS[s.status]}
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">{s.count}</div>
                </div>
              ))}
            </div>
          </div>

          {repairAnalytics.topBrands.length > 0 && (
            <div className="rounded-3xl bg-white border border-slate-200 p-5">
              <h3 className="font-bold text-slate-900 mb-3">Top Repaired Brands</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
                {repairAnalytics.topBrands.map((b) => (
                  <div key={b.brand} className="rounded-xl bg-orange-50 border border-orange-200 p-3">
                    <div className="font-bold text-orange-900">{b.brand}</div>
                    <div className="text-[10px] text-orange-700 font-bold">{b.count} tickets</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* EMI */}
      {tab === 'emi' && emiAnalytics && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Active Financed" value={formatPKR(emiAnalytics.activeFinanced)} color="indigo" icon={CreditCard} />
            <KpiCard label="Remaining" value={formatPKR(emiAnalytics.activeRemaining)} color="violet" icon={DollarSign} />
            <KpiCard label="Overdue" value={formatPKR(emiAnalytics.overdueAmount)} subValue={`${emiAnalytics.overdueCount} installments`} color="rose" icon={AlertTriangle} />
            <KpiCard label="Month Collected" value={formatPKR(emiAnalytics.collectedThisMonth)} subValue={`${emiAnalytics.collectedCountThisMonth} pmts`} color="emerald" icon={CheckCircle2} />
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900 mb-3">Plans by Status</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-700">Status</th>
                    <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-700">Count</th>
                    <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-700">Financed</th>
                    <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-700">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {emiAnalytics.byStatus.map((s) => (
                    <tr key={s.status} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-bold">{EMI_STATUS_LABELS[s.status]}</td>
                      <td className="px-3 py-2 text-right font-extrabold">{s.count}</td>
                      <td className="px-3 py-2 text-right font-bold text-indigo-700">{formatPKR(s.financed)}</td>
                      <td className="px-3 py-2 text-right font-bold text-amber-700">{formatPKR(s.remaining)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* USED PHONES */}
      {tab === 'used' && usedAnalytics && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  days === d ? 'bg-violet-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                Last {d} days
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="In Stock" value={String(usedAnalytics.inStockCount)} subValue={`Cost: ${formatPKR(usedAnalytics.inStockCost)}`} color="violet" icon={Package} />
            <KpiCard label="Potential Profit" value={formatPKR(usedAnalytics.inStockPotentialProfit)} color="amber" icon={TrendingUp} />
            <KpiCard label="Sold" value={String(usedAnalytics.soldCount)} subValue={formatPKR(usedAnalytics.soldRevenue)} color="emerald" icon={CheckCircle2} />
            <KpiCard label="Realized Profit" value={formatPKR(usedAnalytics.soldProfit)} color="blue" icon={DollarSign} />
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900 mb-3">Stock by Condition</h3>
            <div className="grid sm:grid-cols-5 gap-2">
              {usedAnalytics.byCondition.map((c) => {
                const colors = CONDITION_COLORS[c.condition];
                return (
                  <div key={c.condition} className={`rounded-xl border-2 p-3 ${colors.bg} ${colors.border}`}>
                    <div className={`text-[10px] uppercase font-bold ${colors.text}`}>
                      {CONDITION_LABELS[c.condition]}
                    </div>
                    <div className={`text-2xl font-extrabold ${colors.text}`}>{c.count}</div>
                    <div className="mt-1 text-[10px] space-y-0.5">
                      <div className={`font-bold ${colors.text}`}>Cost: {formatPKR(c.totalCost)}</div>
                      <div className="text-slate-600">Resale: {formatPKR(c.resalePrice)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label, value, subValue, color, icon: Icon,
}: { label: string; value: string; subValue?: string; color: string; icon: any }) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-50 to-green-50 border-emerald-200 text-emerald-900',
    blue: 'from-blue-50 to-indigo-50 border-blue-200 text-blue-900',
    violet: 'from-violet-50 to-purple-50 border-violet-200 text-violet-900',
    amber: 'from-amber-50 to-orange-50 border-amber-200 text-amber-900',
    rose: 'from-rose-50 to-pink-50 border-rose-200 text-rose-900',
    indigo: 'from-indigo-50 to-purple-50 border-indigo-200 text-indigo-900',
    orange: 'from-orange-50 to-amber-50 border-orange-200 text-orange-900',
    teal: 'from-teal-50 to-cyan-50 border-teal-200 text-teal-900',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br border-2 p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5" />
        <div className="text-[10px] uppercase tracking-wider font-bold opacity-80">{label}</div>
      </div>
      <div className="text-2xl font-extrabold truncate">{value}</div>
      {subValue && <div className="text-[11px] font-bold opacity-70 mt-0.5">{subValue}</div>}
    </div>
  );
}
