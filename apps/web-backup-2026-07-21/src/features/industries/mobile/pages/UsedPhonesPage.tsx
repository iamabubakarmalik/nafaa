import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw, Plus, Search, Smartphone, ArrowLeft, Star, TrendingUp,
  Package, AlertCircle, CheckCircle2, Wrench, ShoppingBag, XCircle,
  Trash2, Eye, ChevronRight, Filter, Download, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import {
  usedPhonesApi,
  type UsedPhoneStatus,
  type UsedPhoneCondition,
  STATUS_LABELS,
  STATUS_COLORS,
  CONDITION_LABELS,
  CONDITION_COLORS,
} from '../api/used-phones.api';
import { UsedPhoneTradeInModal } from '../components/UsedPhoneTradeInModal';
import { PtaStatusBadge } from '../components/PtaStatusBadge';
import type { PtaStatus } from '../api/imei.api';

type StatusFilter = 'ALL' | UsedPhoneStatus;

const STATUS_ICONS: Record<UsedPhoneStatus, any> = {
  PENDING_INSPECTION: AlertCircle,
  IN_STOCK: CheckCircle2,
  REPAIRING: Wrench,
  SOLD: ShoppingBag,
  RETURNED: RefreshCw,
  DISCARDED: XCircle,
};

export default function UsedPhonesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [conditionFilter, setConditionFilter] = useState<UsedPhoneCondition | 'ALL'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['used-phones-stats'],
    queryFn: usedPhonesApi.stats,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['used-phones', statusFilter, conditionFilter],
    queryFn: () =>
      usedPhonesApi.list({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        condition: conditionFilter === 'ALL' ? undefined : conditionFilter,
        limit: 200,
      }),
  });

  const phones = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return phones;
    return phones.filter(
      (p) =>
        p.usedPhoneCode.toLowerCase().includes(q) ||
        p.imei1.includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        (p.fromCustomerName || '').toLowerCase().includes(q) ||
        (p.fromCustomerPhone || '').includes(q),
    );
  }, [phones, search]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usedPhonesApi.remove(id),
    onSuccess: () => {
      toast.success('Used phone deleted');
      queryClient.invalidateQueries({ queryKey: ['used-phones'] });
      queryClient.invalidateQueries({ queryKey: ['used-phones-stats'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  const markInStockMutation = useMutation({
    mutationFn: (id: string) => usedPhonesApi.markInStock(id),
    onSuccess: () => {
      toast.success('Marked in-stock');
      queryClient.invalidateQueries({ queryKey: ['used-phones'] });
      queryClient.invalidateQueries({ queryKey: ['used-phones-stats'] });
    },
  });

  // Stats helpers
  const statusCounts = useMemo(() => {
    const counts: Record<UsedPhoneStatus, number> = {
      PENDING_INSPECTION: 0, IN_STOCK: 0, REPAIRING: 0, SOLD: 0, RETURNED: 0, DISCARDED: 0,
    };
    stats?.byStatus.forEach((s) => { counts[s.status] = s.count; });
    return counts;
  }, [stats]);

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('No data');
    const headers = ['Code', 'IMEI', 'Brand', 'Model', 'Condition', 'PTA', 'Status', 'Buyback', 'Refurbish', 'Total Cost', 'Resale', 'Customer', 'Phone', 'Date'];
    const rows = filtered.map((p) => [
      p.usedPhoneCode, p.imei1, p.brand, p.model, p.condition, p.ptaStatus, p.status,
      Number(p.buybackPrice).toFixed(2),
      Number(p.refurbishCost).toFixed(2),
      Number(p.totalCost).toFixed(2),
      Number(p.resalePrice).toFixed(2),
      p.fromCustomerName || '',
      p.fromCustomerPhone || '',
      new Date(p.receivedAt).toLocaleString('en-PK'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `used-phones-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('Exported');
  };

  return (
    <div className="space-y-6">
      <Link to="/products" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-fuchsia-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center">
              <RefreshCw className="h-8 w-8" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-white/70">Mobile Industry</div>
              <h1 className="text-3xl font-extrabold">Used Phones — Trade-In</h1>
              <div className="text-sm text-white/80 mt-1">
                Customer se purchase, inspection, aur resale tracking
              </div>
            </div>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-white text-violet-900 hover:bg-slate-100"
          >
            <Plus className="h-4 w-4" /> New Trade-In
          </Button>
        </div>
      </section>

      {/* Stats overview */}
      {stats && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="In Stock" value={statusCounts.IN_STOCK} icon={Package} color="emerald" />
          <StatCard label="In Stock Value" value={formatPKR(stats.inStockResaleValue)} icon={TrendingUp} color="blue" isText />
          <StatCard label="Total Sold" value={stats.totalSold} icon={ShoppingBag} color="violet" />
          <StatCard label="Total Profit" value={formatPKR(stats.totalProfit)} icon={Sparkles} color="amber" isText />
        </section>
      )}

      {/* Status filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`shrink-0 px-3 h-9 rounded-lg text-xs font-bold transition ${
            statusFilter === 'ALL' ? 'bg-violet-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          All ({phones.length})
        </button>
        {(['PENDING_INSPECTION', 'IN_STOCK', 'REPAIRING', 'SOLD', 'DISCARDED'] as UsedPhoneStatus[]).map((status) => {
          const Icon = STATUS_ICONS[status];
          const active = statusFilter === status;
          const count = statusCounts[status];
          if (count === 0 && statusFilter !== status) return null;
          const colors = STATUS_COLORS[status];
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(active ? 'ALL' : status)}
              className={`shrink-0 inline-flex items-center gap-1 px-3 h-9 rounded-lg text-xs font-bold border-2 transition ${
                active ? `${colors.bg} ${colors.text} border-current shadow` : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <Icon className="h-3 w-3" />
              {STATUS_LABELS[status]} ({count})
            </button>
          );
        })}
      </div>

      {/* Search + filters bar */}
      <div className="rounded-2xl bg-white border border-slate-200 p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code / IMEI / brand / model / customer..."
            className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm focus:outline-none focus:border-violet-500"
          />
        </div>

        <select
          value={conditionFilter}
          onChange={(e) => setConditionFilter(e.target.value as UsedPhoneCondition | 'ALL')}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"
        >
          <option value="ALL">All Conditions</option>
          {(['EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR'] as UsedPhoneCondition[]).map((c) => (
            <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
          ))}
        </select>

        {filtered.length > 0 && (
          <button
            onClick={exportCSV}
            className="h-10 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-1"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        )}
      </div>

      {/* List */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-10 w-10 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Smartphone className="h-12 w-12 text-slate-300 mx-auto" />
            <div className="mt-3 font-bold text-slate-700">
              {search || statusFilter !== 'ALL' ? 'No matching trade-ins' : 'No used phones yet'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {search || statusFilter !== 'ALL'
                ? 'Try different filters'
                : 'Customer se trade-in entry add karein'}
            </div>
            {(!search && statusFilter === 'ALL') && (
              <Button onClick={() => setShowAddModal(true)} className="mt-4">
                <Plus className="h-4 w-4" /> Add First Trade-In
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((phone) => {
              const status = phone.status;
              const condition = phone.condition;
              const StatusIcon = STATUS_ICONS[status];
              const statusColors = STATUS_COLORS[status];
              const conditionColors = CONDITION_COLORS[condition];
              const profit = (Number(phone.finalSoldPrice) || Number(phone.resalePrice)) - Number(phone.totalCost);

              return (
                <div key={phone.id} className="p-4 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-violet-700 text-sm">
                          {phone.usedPhoneCode}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${statusColors.bg} ${statusColors.text}`}>
                          <StatusIcon className="h-3 w-3" />
                          {STATUS_LABELS[status]}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${conditionColors.bg} ${conditionColors.text} border ${conditionColors.border}`}>
                          <Star className="h-2.5 w-2.5 inline mr-0.5 fill-current" />
                          {condition}
                        </span>
                        <PtaStatusBadge status={phone.ptaStatus as PtaStatus} size="sm" />
                      </div>

                      <div className="mt-1.5 font-bold text-slate-900">
                        {phone.brand} {phone.model}
                        {phone.storage && <span className="text-slate-500 font-normal"> · {phone.storage}</span>}
                        {phone.color && <span className="text-violet-700 font-bold"> · {phone.color}</span>}
                        {phone.modelYear && <span className="text-slate-500 font-normal"> · {phone.modelYear}</span>}
                      </div>

                      <div className="mt-1 text-xs text-slate-500 font-mono">IMEI: {phone.imei1}</div>

                      {phone.fromCustomerName && (
                        <div className="mt-1 text-xs text-slate-500">
                          From: <strong className="text-slate-700">{phone.fromCustomerName}</strong>
                          {phone.fromCustomerPhone && <span> · {phone.fromCustomerPhone}</span>}
                        </div>
                      )}
                    </div>

                    {/* Pricing */}
                    <div className="text-right text-xs space-y-0.5">
                      <div className="text-slate-500">Bought: <strong className="text-slate-900">{formatPKR(phone.buybackPrice)}</strong></div>
                      {phone.refurbishCost > 0 && (
                        <div className="text-slate-500">Refurbish: <strong className="text-orange-700">+{formatPKR(phone.refurbishCost)}</strong></div>
                      )}
                      <div className="text-slate-500">Total Cost: <strong className="text-slate-900">{formatPKR(phone.totalCost)}</strong></div>
                      <div className="font-bold text-blue-700">
                        Resale: {formatPKR(phone.finalSoldPrice || phone.resalePrice)}
                      </div>
                      <div className={`font-extrabold ${profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {phone.status === 'SOLD' ? 'Profit' : 'Expected'}: {formatPKR(profit)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 items-start">
                      {status === 'PENDING_INSPECTION' && (
                        <button
                          onClick={() => markInStockMutation.mutate(phone.id)}
                          className="px-3 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Mark In-Stock
                        </button>
                      )}
                      {status !== 'SOLD' && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${phone.usedPhoneCode}?`)) deleteMutation.mutate(phone.id);
                          }}
                          className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && (
        <UsedPhoneTradeInModal
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, color, isText,
}: {
  label: string;
  value: any;
  icon: any;
  color: 'emerald' | 'blue' | 'violet' | 'amber';
  isText?: boolean;
}) {
  const map = {
    emerald: 'from-emerald-500 to-emerald-700',
    blue: 'from-blue-500 to-blue-700',
    violet: 'from-violet-500 to-fuchsia-600',
    amber: 'from-amber-500 to-orange-600',
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${map[color]} text-white flex items-center justify-center shadow`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className={`font-extrabold text-slate-900 ${isText ? 'text-lg truncate' : 'text-2xl'}`}>{value}</div>
        </div>
      </div>
    </div>
  );
}
