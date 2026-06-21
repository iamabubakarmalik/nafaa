import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Wrench, Plus, Search, ArrowLeft, Smartphone, Clock, CheckCircle2,
  AlertCircle, TrendingUp, Package, ShoppingBag, Download, Filter,
  Calendar, Phone, User, ChevronRight, X, DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import {
  repairsApi,
  type RepairStatus,
  type RepairPriority,
  REPAIR_STATUS_LABELS,
  REPAIR_STATUS_COLORS,
} from '../api/repairs.api';
import { RepairStatusBadge } from '../components/RepairStatusBadge';
import { RepairPriorityBadge } from '../components/RepairPriorityBadge';
import { CreateRepairTicketModal } from '../components/CreateRepairTicketModal';

type StatusFilter = 'ALL' | RepairStatus;
type PriorityFilter = 'ALL' | RepairPriority;

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-PK');
};

export default function RepairTicketsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['repair-stats'],
    queryFn: repairsApi.stats,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['repair-tickets', statusFilter, priorityFilter],
    queryFn: () =>
      repairsApi.list({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
        limit: 200,
      }),
  });

  const tickets = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return tickets;
    return tickets.filter(
      (t) =>
        t.ticketNumber.toLowerCase().includes(q) ||
        (t.imei1 || '').includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.customerPhone.includes(q) ||
        t.deviceBrand.toLowerCase().includes(q) ||
        t.deviceModel.toLowerCase().includes(q) ||
        t.reportedIssue.toLowerCase().includes(q),
    );
  }, [tickets, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<RepairStatus, number> = {
      RECEIVED: 0, DIAGNOSED: 0, AWAITING_APPROVAL: 0, AWAITING_PARTS: 0,
      IN_PROGRESS: 0, READY: 0, DELIVERED: 0, CANCELLED: 0, UNREPAIRABLE: 0,
    };
    stats?.byStatus.forEach((s) => { counts[s.status] = s.count; });
    return counts;
  }, [stats]);

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('No data');
    const headers = ['Ticket #', 'Device', 'IMEI', 'Customer', 'Phone', 'Issue', 'Status', 'Priority', 'Estimate', 'Paid', 'Balance', 'Received'];
    const rows = filtered.map((t) => [
      t.ticketNumber,
      `${t.deviceBrand} ${t.deviceModel}`,
      t.imei1 || '',
      t.customerName,
      t.customerPhone,
      t.reportedIssue.replace(/\n/g, ' '),
      t.status,
      t.priority,
      Number(t.totalCost).toFixed(2),
      Number(t.paidAmount).toFixed(2),
      Number(t.balanceDue).toFixed(2),
      new Date(t.receivedAt).toLocaleString('en-PK'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repair-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('Exported');
  };

  return (
    <div className="space-y-6">
      <Link to="/products" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-orange-600">
        <ArrowLeft className="h-4 w-4" /> Back to Products
      </Link>

      {/* Header */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Wrench className="h-8 w-8" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-bold text-white/70">Mobile Industry</div>
              <h1 className="text-3xl font-extrabold">Repair Service</h1>
              <div className="text-sm text-white/80 mt-1">
                Customer phones receive, diagnose, repair aur deliver — sab track karein
              </div>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="bg-white text-orange-900 hover:bg-slate-100">
            <Plus className="h-4 w-4" /> New Repair Ticket
          </Button>
        </div>
      </section>

      {/* Stats overview */}
      {stats && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Open Tickets" value={stats.openTickets} icon={Clock} color="orange" />
          <StatCard label="Today Received" value={stats.todayCount} icon={Calendar} color="blue" />
          <StatCard label="Month Revenue" value={formatPKR(stats.monthRevenue)} icon={TrendingUp} color="emerald" isText />
          <StatCard label="Total Delivered" value={stats.totalDelivered} icon={CheckCircle2} color="violet" />
        </section>
      )}

      {/* Status filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`shrink-0 px-3 h-9 rounded-lg text-xs font-bold transition ${
            statusFilter === 'ALL' ? 'bg-orange-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          All ({tickets.length})
        </button>
        {(['RECEIVED', 'DIAGNOSED', 'AWAITING_APPROVAL', 'AWAITING_PARTS', 'IN_PROGRESS', 'READY', 'DELIVERED'] as RepairStatus[]).map((status) => {
          const active = statusFilter === status;
          const count = statusCounts[status];
          if (count === 0 && !active) return null;
          const colors = REPAIR_STATUS_COLORS[status];
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(active ? 'ALL' : status)}
              className={`shrink-0 inline-flex items-center gap-1 px-3 h-9 rounded-lg text-xs font-bold border-2 transition ${
                active ? `${colors.bg} ${colors.text} border-current shadow` : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              {REPAIR_STATUS_LABELS[status]} ({count})
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
            placeholder="Search ticket # / IMEI / customer / device / issue..."
            className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm focus:outline-none focus:border-orange-500"
          />
        </div>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"
        >
          <option value="ALL">All Priority</option>
          <option value="NORMAL">Normal</option>
          <option value="URGENT">Urgent</option>
          <option value="EMERGENCY">Emergency</option>
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

      {/* Tickets list */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-10 w-10 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Wrench className="h-12 w-12 text-slate-300 mx-auto" />
            <div className="mt-3 font-bold text-slate-700">
              {search || statusFilter !== 'ALL' ? 'No matching tickets' : 'No repair tickets yet'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {search || statusFilter !== 'ALL'
                ? 'Try different filters'
                : 'Customer ke phone ka repair entry add karein'}
            </div>
            {!search && statusFilter === 'ALL' && (
              <Button onClick={() => setShowCreateModal(true)} className="mt-4">
                <Plus className="h-4 w-4" /> Create First Ticket
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((ticket) => {
              const isOverdue =
                ticket.estimatedReadyAt &&
                new Date(ticket.estimatedReadyAt) < new Date() &&
                !['DELIVERED', 'CANCELLED', 'READY'].includes(ticket.status);

              return (
                <Link
                  key={ticket.id}
                  to={`/repair-tickets/${ticket.id}`}
                  className="block p-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono font-extrabold text-orange-700 text-sm">
                          {ticket.ticketNumber}
                        </span>
                        <RepairStatusBadge status={ticket.status} size="sm" />
                        {ticket.priority !== 'NORMAL' && (
                          <RepairPriorityBadge priority={ticket.priority} size="sm" />
                        )}
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold uppercase">
                            <AlertCircle className="h-2.5 w-2.5" /> OVERDUE
                          </span>
                        )}
                      </div>

                      <div className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                        <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                        {ticket.deviceBrand} {ticket.deviceModel}
                        {ticket.deviceColor && (
                          <span className="text-violet-700 font-bold text-sm"> · {ticket.deviceColor}</span>
                        )}
                      </div>

                      {ticket.imei1 && (
                        <div className="mt-1 text-xs text-slate-500 font-mono">
                          IMEI: {ticket.imei1}
                        </div>
                      )}

                      <div className="mt-1 text-xs text-slate-700">
                        <strong>Issue:</strong> {ticket.reportedIssue.slice(0, 100)}
                        {ticket.reportedIssue.length > 100 && '...'}
                      </div>

                      <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <strong className="text-slate-700">{ticket.customerName}</strong>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {ticket.customerPhone}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelative(ticket.receivedAt)}
                        </span>
                        {ticket.technicianName && (
                          <span className="text-violet-700 font-bold">
                            👨‍🔧 {ticket.technicianName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="text-right text-xs space-y-0.5 shrink-0">
                      {ticket.totalCost > 0 && (
                        <>
                          <div className="text-slate-500">
                            Total: <strong className="text-slate-900">{formatPKR(ticket.totalCost)}</strong>
                          </div>
                          {ticket.paidAmount > 0 && (
                            <div className="text-emerald-700 font-bold">
                              Paid: {formatPKR(ticket.paidAmount)}
                            </div>
                          )}
                          {ticket.balanceDue > 0 && (
                            <div className="text-amber-700 font-extrabold">
                              Due: {formatPKR(ticket.balanceDue)}
                            </div>
                          )}
                        </>
                      )}
                      <ChevronRight className="h-4 w-4 text-slate-400 ml-auto mt-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateRepairTicketModal onClose={() => setShowCreateModal(false)} />
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
  color: 'orange' | 'blue' | 'emerald' | 'violet';
  isText?: boolean;
}) {
  const map = {
    orange: 'from-orange-500 to-amber-600',
    blue: 'from-blue-500 to-blue-700',
    emerald: 'from-emerald-500 to-emerald-700',
    violet: 'from-violet-500 to-fuchsia-600',
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
