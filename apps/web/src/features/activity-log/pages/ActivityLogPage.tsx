import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, User, Clock, Search, X, Filter, Download, RefreshCw,
  Shield, ShoppingCart, Package, Users, Truck, Wallet, Receipt,
  Plus, Edit3, Trash2, LogIn, LogOut, Settings, Key, Eye,
} from 'lucide-react';
import { activityLogApi } from '@/api/activity-log.api';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const formatRelative = (v: string) => {
  const d = new Date(v);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-PK');
};

// Smart icon detection based on description/action
const getActionConfig = (description: string, action?: string, entityType?: string) => {
  const text = (description + ' ' + (action || '') + ' ' + (entityType || '')).toLowerCase();

  if (text.includes('login') || text.includes('signed in')) return { icon: LogIn, color: 'bg-emerald-100 text-emerald-700', label: 'Login' };
  if (text.includes('logout') || text.includes('signed out')) return { icon: LogOut, color: 'bg-slate-100 text-slate-700', label: 'Logout' };
  if (text.includes('sale') || text.includes('pos')) return { icon: ShoppingCart, color: 'bg-emerald-100 text-emerald-700', label: 'Sale' };
  if (text.includes('product')) return { icon: Package, color: 'bg-violet-100 text-violet-700', label: 'Product' };
  if (text.includes('customer')) return { icon: Users, color: 'bg-blue-100 text-blue-700', label: 'Customer' };
  if (text.includes('supplier')) return { icon: Truck, color: 'bg-orange-100 text-orange-700', label: 'Supplier' };
  if (text.includes('purchase')) return { icon: ShoppingCart, color: 'bg-amber-100 text-amber-700', label: 'Purchase' };
  if (text.includes('expense')) return { icon: Wallet, color: 'bg-rose-100 text-rose-700', label: 'Expense' };
  if (text.includes('payment')) return { icon: Wallet, color: 'bg-emerald-100 text-emerald-700', label: 'Payment' };
  if (text.includes('refund') || text.includes('return')) return { icon: RefreshCw, color: 'bg-orange-100 text-orange-700', label: 'Return' };
  if (text.includes('delete') || text.includes('removed')) return { icon: Trash2, color: 'bg-rose-100 text-rose-700', label: 'Delete' };
  if (text.includes('update') || text.includes('edit')) return { icon: Edit3, color: 'bg-blue-100 text-blue-700', label: 'Edit' };
  if (text.includes('create') || text.includes('add')) return { icon: Plus, color: 'bg-emerald-100 text-emerald-700', label: 'Create' };
  if (text.includes('permission') || text.includes('role') || text.includes('access')) return { icon: Key, color: 'bg-violet-100 text-violet-700', label: 'Access' };
  if (text.includes('settings') || text.includes('config')) return { icon: Settings, color: 'bg-slate-100 text-slate-700', label: 'Settings' };
  if (text.includes('register')) return { icon: Wallet, color: 'bg-emerald-100 text-emerald-700', label: 'Cash Register' };
  if (text.includes('view') || text.includes('viewed')) return { icon: Eye, color: 'bg-slate-100 text-slate-700', label: 'View' };
  return { icon: Activity, color: 'bg-slate-100 text-slate-700', label: 'Activity' };
};

type DateFilter = 'all' | 'today' | 'week' | 'month';
type ActionFilter = 'all' | 'login' | 'sale' | 'product' | 'customer' | 'delete' | 'edit' | 'access';

export default function ActivityLogPage() {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [userFilter, setUserFilter] = useState<string>('all');

  const { data: logs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['activity-log'],
    queryFn: activityLogApi.list,
  });

  const uniqueUsers = useMemo(() => {
    const users = new Map<string, { id: string; name: string; role: string }>();
    logs.forEach((log: any) => {
      if (log.user && !users.has(log.user.id)) {
        users.set(log.user.id, { id: log.user.id, name: log.user.fullName, role: log.user.role });
      }
    });
    return Array.from(users.values());
  }, [logs]);

  const filtered = useMemo(() => {
    let result = [...logs];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((l: any) =>
        l.description.toLowerCase().includes(q) ||
        (l.user?.fullName || '').toLowerCase().includes(q) ||
        (l.action || '').toLowerCase().includes(q) ||
        (l.entityType || '').toLowerCase().includes(q)
      );
    }
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      if (dateFilter === 'today') cutoff.setHours(0, 0, 0, 0);
      else if (dateFilter === 'week') cutoff.setDate(now.getDate() - 7);
      else if (dateFilter === 'month') cutoff.setMonth(now.getMonth() - 1);
      result = result.filter((l: any) => new Date(l.createdAt) >= cutoff);
    }
    if (actionFilter !== 'all') {
      result = result.filter((l: any) => {
        const text = (l.description + ' ' + (l.action || '') + ' ' + (l.entityType || '')).toLowerCase();
        if (actionFilter === 'login') return text.includes('login') || text.includes('logout') || text.includes('signed');
        if (actionFilter === 'sale') return text.includes('sale') || text.includes('pos');
        if (actionFilter === 'product') return text.includes('product');
        if (actionFilter === 'customer') return text.includes('customer');
        if (actionFilter === 'delete') return text.includes('delete') || text.includes('removed');
        if (actionFilter === 'edit') return text.includes('update') || text.includes('edit');
        if (actionFilter === 'access') return text.includes('permission') || text.includes('role') || text.includes('access');
        return true;
      });
    }
    if (userFilter !== 'all') {
      result = result.filter((l: any) => l.user?.id === userFilter);
    }
    return result;
  }, [logs, search, dateFilter, actionFilter, userFilter]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayLogs = logs.filter((l: any) => new Date(l.createdAt).toDateString() === today);
    return {
      total: logs.length,
      today: todayLogs.length,
      uniqueUsers: uniqueUsers.length,
      filtered: filtered.length,
    };
  }, [logs, uniqueUsers, filtered]);

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Date', 'User', 'Role', 'Action', 'Entity', 'Description', 'IP'];
    const rows = filtered.map((l: any) => [
      new Date(l.createdAt).toLocaleString('en-PK'),
      l.user?.fullName || 'System',
      l.user?.role || '—',
      l.action || '—',
      l.entityType || '—',
      l.description,
      l.ipAddress || '—',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const hasFilters = search || dateFilter !== 'all' || actionFilter !== 'all' || userFilter !== 'all';
  const clearFilters = () => {
    setSearch(''); setDateFilter('all'); setActionFilter('all'); setUserFilter('all');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-800 to-slate-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Shield className="h-3.5 w-3.5 text-amber-300" /> Audit Trail
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Activity Log</h2>
            <p className="mt-2 text-sm text-white/80">
              Kis user ne kya kiya — sab ka complete record. Login, sales, edits, deletes — sab trackable.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {filtered.length > 0 && (
              <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 px-4 py-2.5 text-sm font-bold transition">
                <Download className="h-4 w-4" />
                Export
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Activities" value={stats.total} icon={Activity} color="slate" />
        <StatCard label="Today" value={stats.today} icon={Clock} color="blue" />
        <StatCard label="Unique Users" value={stats.uniqueUsers} icon={Users} color="violet" />
        <StatCard label="Filtered" value={stats.filtered} icon={Filter} color="emerald" hint={`${Math.round((stats.filtered/Math.max(stats.total,1))*100)}% of all`} />
      </section>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500"
            placeholder="Search by description, user, action, entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex gap-1 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold self-center mr-1">Date:</span>
            {[
              { v: 'all' as DateFilter, l: 'All Time' },
              { v: 'today' as DateFilter, l: 'Today' },
              { v: 'week' as DateFilter, l: '7 Days' },
              { v: 'month' as DateFilter, l: '30 Days' },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setDateFilter(opt.v)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  dateFilter === opt.v ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold self-center mr-1">Action:</span>
            {[
              { v: 'all' as ActionFilter, l: 'All' },
              { v: 'login' as ActionFilter, l: '🔑 Login' },
              { v: 'sale' as ActionFilter, l: '🛒 Sales' },
              { v: 'product' as ActionFilter, l: '📦 Products' },
              { v: 'customer' as ActionFilter, l: '👥 Customers' },
              { v: 'edit' as ActionFilter, l: '✏️ Edits' },
              { v: 'delete' as ActionFilter, l: '🗑 Deletes' },
              { v: 'access' as ActionFilter, l: '🔐 Access' },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setActionFilter(opt.v)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  actionFilter === opt.v ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
          {uniqueUsers.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold self-center mr-1">User:</span>
              <button
                onClick={() => setUserFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  userFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Users
              </button>
              {uniqueUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setUserFilter(u.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                    userFilter === u.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {u.name}
                </button>
              ))}
            </div>
          )}
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1">
              <X className="h-3 w-3" /> Clear all filters
            </button>
          )}
        </div>
      </div>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">All Activities</h3>
          <p className="text-sm text-slate-500">{filtered.length} of {logs.length} entries</p>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <Activity className="h-9 w-9 text-slate-500" />
            </div>
            <h4 className="mt-5 text-xl font-bold text-slate-900">
              {hasFilters ? 'No matches' : 'Activity log is empty'}
            </h4>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
              {hasFilters
                ? 'Try different filters or clear them'
                : 'User actions ka record yahan automatic save hota hai. POS sales, edits, logins — sab ka complete trail.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[800px] overflow-y-auto">
            {filtered.map((log: any) => {
              const cfg = getActionConfig(log.description, log.action, log.entityType);
              const Icon = cfg.icon;
              return (
                <div key={log.id} className="px-6 py-4 hover:bg-slate-50 transition group">
                  <div className="flex items-start gap-3">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 shadow ${cfg.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900">
                          {log.user?.fullName || 'System'}
                        </span>
                        {log.user?.role && (
                          <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold">
                            {log.user.role}
                          </span>
                        )}
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="text-sm text-slate-700 mt-1 font-semibold">{log.description}</div>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 flex-wrap font-bold">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDate(log.createdAt)}
                        </span>
                        <span>•</span>
                        <span>{formatRelative(log.createdAt)}</span>
                        {log.entityType && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{log.entityType}</span>
                          </>
                        )}
                        {log.entityId && (
                          <span className="font-mono text-slate-300">#{log.entityId.slice(0, 8)}</span>
                        )}
                        {log.ipAddress && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{log.ipAddress}</span>
                          </>
                        )}
                      </div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="mt-2 opacity-0 group-hover:opacity-100 transition">
                          <summary className="text-[10px] font-bold text-slate-500 cursor-pointer hover:text-slate-700">View metadata</summary>
                          <pre className="mt-1 text-[10px] bg-slate-50 rounded-lg p-2 overflow-x-auto">{JSON.stringify(log.metadata, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 p-4 flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
          <Shield className="h-4 w-4" />
        </div>
        <div className="text-sm text-slate-700">
          <strong className="font-bold text-blue-900">Note about Activity Log:</strong> Yeh sab activities backend se aati hain. Agar aap ko lagta hai kuch entries miss ho rahi hain (jaise logins ya specific actions), to backend service me activity recording ko verify karein. Frontend sirf jo data backend bhejta hai woh dikhata hai.
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, hint }: any) {
  const colors: any = {
    slate: 'from-slate-600 to-slate-800',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    violet: 'from-violet-500 to-violet-700 shadow-violet-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{value}</div>
          {hint && <div className="text-xs text-slate-500 font-semibold mt-1">{hint}</div>}
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
