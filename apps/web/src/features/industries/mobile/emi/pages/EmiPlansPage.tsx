import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Plus, Search, ArrowLeft, AlertCircle, Calendar, TrendingUp,
  DollarSign, ChevronRight, Download, RefreshCw, Phone, User,
  CheckCircle2, Clock, AlertTriangle, MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import {
  emiApi,
  type EmiPlanStatus,
  EMI_STATUS_LABELS,
  EMI_STATUS_COLORS,
} from '../api/emi.api';
import { CreateEmiPlanModal } from '../components/CreateEmiPlanModal';

type StatusFilter = 'ALL' | EmiPlanStatus;
type SpecialFilter = 'ALL' | 'ONLY_OVERDUE' | 'ONLY_UPCOMING';

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(iso));

export default function EmiPlansPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [specialFilter, setSpecialFilter] = useState<SpecialFilter>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['emi-stats'],
    queryFn: emiApi.stats,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['emi-plans', statusFilter, specialFilter],
    queryFn: () =>
      emiApi.list({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        filter: specialFilter === 'ALL' ? undefined : specialFilter,
        limit: 200,
      }),
  });

  const plans = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return plans;
    return plans.filter(
      (p) =>
        p.planNumber.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        (p.customerPhone || '').includes(q),
    );
  }, [plans, search]);

  const updateOverdueMutation = useMutation({
    mutationFn: emiApi.updateOverdueFlags,
    onSuccess: (data: any) => {
      toast.success(`${data.updatedCount} installments updated to overdue`);
      queryClient.invalidateQueries({ queryKey: ['emi-plans'] });
      queryClient.invalidateQueries({ queryKey: ['emi-stats'] });
    },
  });

  const statusCounts = useMemo(() => {
    const counts: Record<EmiPlanStatus, number> = {
      ACTIVE: 0, COMPLETED: 0, DEFAULTED: 0, CANCELLED: 0,
    };
    stats?.byStatus.forEach((s) => { counts[s.status] = s.count; });
    return counts;
  }, [stats]);

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('No data');
    const headers = ['Plan #', 'Customer', 'Phone', 'Total', 'Down', 'Financed', 'Paid', 'Remaining', 'Overdue', 'Status', 'Start Date'];
    const rows = filtered.map((p) => [
      p.planNumber, p.customerName, p.customerPhone || '',
      Number(p.totalAmount).toFixed(2),
      Number(p.downPayment).toFixed(2),
      Number(p.financedAmount).toFixed(2),
      Number(p.paidAmount).toFixed(2),
      Number(p.remainingAmount).toFixed(2),
      Number(p.overdueAmount).toFixed(2),
      p.status,
      formatDate(p.startDate),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emi-plans-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('Exported');
  };

  const sendOverdueReminder = (plan: typeof filtered[number]) => {
    if (!plan.customerPhone) {
      toast.error('Customer phone not available');
      return;
    }
    const phone = plan.customerPhone.replace(/\D/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
    const msg = `*EMI Payment Reminder*\n\nAssalamu Alaikum ${plan.customerName},\n\nAap ka EMI installment overdue hai:\n\nPlan: *${plan.planNumber}*\nOverdue Amount: *${formatPKR(plan.overdueAmount)}*\n\nKripya jaldi pay karein.\n\nShukriya!`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <Link to="/products" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center">
              <CreditCard className="h-8 w-8" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-white/70">Mobile Industry</div>
              <h1 className="text-3xl font-extrabold">EMI / Installments</h1>
              <div className="text-sm text-white/80 mt-1">
                Plans manage karein, installments track karein, defaulters handle karein
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={() => updateOverdueMutation.mutate()}
              loading={updateOverdueMutation.isPending}
            >
              <RefreshCw className="h-4 w-4" /> Update Overdue
            </Button>
            <Button onClick={() => setShowCreateModal(true)} className="bg-white text-indigo-900 hover:bg-slate-100">
              <Plus className="h-4 w-4" /> New EMI Plan
            </Button>
          </div>
        </div>
      </section>

      {stats && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Active Financed" value={formatPKR(stats.activeFinanced)} icon={TrendingUp} color="indigo" isText />
          <StatCard label="Remaining" value={formatPKR(stats.activeRemaining)} icon={DollarSign} color="violet" isText />
          <StatCard label="Overdue" value={formatPKR(stats.overdueAmount)} icon={AlertTriangle} color="rose" isText hint={`${stats.overdueCount} installments`} />
          <StatCard label="Collected (Month)" value={formatPKR(stats.collectedThisMonth)} icon={CheckCircle2} color="emerald" isText hint={`${stats.collectedCountThisMonth} payments`} />
        </section>
      )}

      {/* Special filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSpecialFilter('ALL')}
          className={`shrink-0 px-3 h-9 rounded-lg text-xs font-bold transition ${
            specialFilter === 'ALL' ? 'bg-indigo-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          All Plans
        </button>
        <button
          onClick={() => setSpecialFilter('ONLY_OVERDUE')}
          className={`shrink-0 inline-flex items-center gap-1 px-3 h-9 rounded-lg text-xs font-bold border-2 transition ${
            specialFilter === 'ONLY_OVERDUE'
              ? 'bg-rose-50 border-rose-400 text-rose-700 shadow'
              : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <AlertTriangle className="h-3 w-3" /> Only Overdue ({stats?.overdueCount || 0})
        </button>
        <button
          onClick={() => setSpecialFilter('ONLY_UPCOMING')}
          className={`shrink-0 inline-flex items-center gap-1 px-3 h-9 rounded-lg text-xs font-bold border-2 transition ${
            specialFilter === 'ONLY_UPCOMING'
              ? 'bg-amber-50 border-amber-400 text-amber-700 shadow'
              : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <Clock className="h-3 w-3" /> Upcoming 7 Days ({stats?.upcomingCount || 0})
        </button>
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`shrink-0 px-3 h-9 rounded-lg text-xs font-bold transition ${
            statusFilter === 'ALL' ? 'bg-indigo-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          All ({plans.length})
        </button>
        {(['ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED'] as EmiPlanStatus[]).map((status) => {
          const active = statusFilter === status;
          const count = statusCounts[status];
          if (count === 0 && !active) return null;
          const colors = EMI_STATUS_COLORS[status];
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(active ? 'ALL' : status)}
              className={`shrink-0 inline-flex items-center gap-1 px-3 h-9 rounded-lg text-xs font-bold border-2 transition ${
                active ? `${colors.bg} ${colors.text} border-current shadow` : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              {EMI_STATUS_LABELS[status]} ({count})
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plan # / customer / phone..."
            className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        {filtered.length > 0 && (
          <button
            onClick={exportCSV}
            className="h-10 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-1"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        )}
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <CreditCard className="h-12 w-12 text-slate-300 mx-auto" />
            <div className="mt-3 font-bold text-slate-700">
              {search || statusFilter !== 'ALL' || specialFilter !== 'ALL'
                ? 'No matching plans'
                : 'No EMI plans yet'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {!search && statusFilter === 'ALL' && specialFilter === 'ALL'
                ? 'Customer ke liye installment plan banayein'
                : 'Try different filters'}
            </div>
            {!search && statusFilter === 'ALL' && specialFilter === 'ALL' && (
              <Button onClick={() => setShowCreateModal(true)} className="mt-4">
                <Plus className="h-4 w-4" /> Create First Plan
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((plan) => {
              const statusColors = EMI_STATUS_COLORS[plan.status];
              const progressPercent = plan.financedAmount > 0
                ? Math.min(((plan.paidAmount - plan.downPayment) / plan.financedAmount) * 100, 100)
                : 0;

              return (
                <Link
                  key={plan.id}
                  to={`/emi-plans/${plan.id}`}
                  className="block p-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono font-extrabold text-indigo-700 text-sm">
                          {plan.planNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                          {EMI_STATUS_LABELS[plan.status]}
                        </span>
                        {plan.overdueCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                            <AlertTriangle className="h-2.5 w-2.5" /> {plan.overdueCount} OVERDUE
                          </span>
                        )}
                      </div>

                      <div className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {plan.customerName}
                        {plan.customerPhone && (
                          <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {plan.customerPhone}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                        <span>{plan.installmentCount} months</span>
                        <span>·</span>
                        <span>
                          <strong className="text-indigo-700">{formatPKR(plan.installmentAmount)}</strong>/month
                        </span>
                        {plan.nextDueDate && plan.status === 'ACTIVE' && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Next: {formatDate(plan.nextDueDate)}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2 max-w-md">
                        <div className="flex items-center justify-between text-[10px] font-bold mb-0.5">
                          <span className="text-emerald-700">
                            {plan.paidInstallmentCount}/{plan.installmentCount} paid
                          </span>
                          <span className="text-slate-500">
                            {formatPKR(plan.paidAmount)} / {formatPKR(plan.totalAmount)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full ${
                              progressPercent >= 100 ? 'bg-emerald-500' :
                              plan.overdueCount > 0 ? 'bg-rose-500' :
                              'bg-indigo-500'
                            }`}
                            style={{ width: `${Math.max(progressPercent, 3)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Remaining</div>
                      <div className="font-extrabold text-amber-700 text-lg">
                        {formatPKR(plan.remainingAmount)}
                      </div>
                      {plan.overdueAmount > 0 && (
                        <div className="text-[11px] font-extrabold text-rose-700">
                          Overdue: {formatPKR(plan.overdueAmount)}
                        </div>
                      )}
                      <div className="flex gap-1 mt-2 justify-end">
                        {plan.overdueAmount > 0 && plan.customerPhone && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              sendOverdueReminder(plan);
                            }}
                            className="h-7 px-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] font-bold inline-flex items-center gap-1"
                            title="Send WhatsApp reminder"
                          >
                            <MessageCircle className="h-3 w-3" />
                          </button>
                        )}
                        <ChevronRight className="h-4 w-4 text-slate-400 mt-1.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateEmiPlanModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, color, isText, hint,
}: {
  label: string;
  value: any;
  icon: any;
  color: 'indigo' | 'violet' | 'rose' | 'emerald';
  isText?: boolean;
  hint?: string;
}) {
  const map = {
    indigo: 'from-indigo-500 to-purple-600',
    violet: 'from-violet-500 to-fuchsia-600',
    rose: 'from-rose-500 to-pink-600',
    emerald: 'from-emerald-500 to-emerald-700',
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
          {hint && <div className="text-[10px] text-slate-500 font-bold mt-0.5">{hint}</div>}
        </div>
      </div>
    </div>
  );
}
