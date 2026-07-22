import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Plus, Search, Filter, X, Phone, Briefcase,
  Calendar, TrendingUp, UserCheck, UserX, Coffee,
  ArrowUpRight, Sparkles, MapPin, Building2,
} from 'lucide-react';
import { staffApi, type StaffStatus } from '@/api/staff.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';

const statusConfig: Record<StaffStatus, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: 'Active', color: '#16a34a', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  ON_LEAVE: { label: 'On Leave', color: '#f59e0b', bg: 'bg-amber-100 text-amber-700 border-amber-200' },
  SUSPENDED: { label: 'Suspended', color: '#dc2626', bg: 'bg-rose-100 text-rose-700 border-rose-200' },
  TERMINATED: { label: 'Terminated', color: '#64748b', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
  RESIGNED: { label: 'Resigned', color: '#64748b', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const salaryTypeLabels: Record<string, string> = {
  MONTHLY: 'Monthly',
  DAILY: 'Per Day',
  HOURLY: 'Per Hour',
  PER_TASK: 'Per Task',
  COMMISSION: 'Commission',
  HYBRID: 'Hybrid',
};

export default function StaffListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StaffStatus | 'all'>('all');

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff-list', search, statusFilter],
    queryFn: () => staffApi.list({
      search: search || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['staff-stats'],
    queryFn: staffApi.stats,
  });

  const filteredStaff = useMemo(() => staff, [staff]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-violet-700 text-white p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Staff Management
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Your Team</h2>
            <p className="mt-2 text-sm text-white/75">
              Employees, attendance, salaries — sab kuch ek hi jagah
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/staff/attendance">
              <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                <UserCheck className="h-4 w-4" />
                Attendance
              </Button>
            </Link>
            <Link to="/staff/salary/new">
              <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                <TrendingUp className="h-4 w-4" />
                Process Salary
              </Button>
            </Link>
            <Link to="/staff/new">
              <Button className="bg-white text-violet-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" />
                Add Staff
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Staff" value={stats?.total ?? 0} icon={Users} color="#7c3aed" bg="from-violet-500 to-violet-700" />
        <StatCard label="Active" value={stats?.active ?? 0} icon={UserCheck} color="#16a34a" bg="from-emerald-500 to-emerald-700" />
        <StatCard label="On Leave" value={stats?.onLeave ?? 0} icon={Coffee} color="#f59e0b" bg="from-amber-500 to-amber-700" />
        <StatCard label="Present Today" value={stats?.presentToday ?? 0} icon={UserCheck} color="#0ea5e9" bg="from-sky-500 to-sky-700" />
        <StatCard label="Absent Today" value={stats?.absentToday ?? 0} icon={UserX} color="#dc2626" bg="from-rose-500 to-rose-700" />
      </section>

      {/* SEARCH + FILTER */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
              placeholder="Search by name, phone, CNIC, designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              All
            </button>
            {(Object.keys(statusConfig) as StaffStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                  statusFilter === s
                    ? statusConfig[s].bg + ' border-2'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {statusConfig[s].label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* STAFF GRID */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 rounded-3xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-violet-100 flex items-center justify-center">
            <Users className="h-9 w-9 text-violet-600" />
          </div>
          <h4 className="mt-4 text-lg font-bold text-slate-900">
            {search ? 'No staff found' : 'Abhi koi staff add nahi kiya'}
          </h4>
          <p className="mt-1 text-sm text-slate-500">
            {search ? 'Try different search' : 'Apni team add karke shuru karein'}
          </p>
          {!search && (
            <Link to="/staff/new">
              <Button className="mt-4">
                <Plus className="h-4 w-4" /> Add First Staff
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStaff.map((s) => (
            <Link
              key={s.id}
              to={`/staff/${s.id}`}
              className="group rounded-3xl bg-white border-2 border-slate-200 hover:border-violet-400 hover:shadow-xl transition-all overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {s.avatarUrl ? (
                      <img
                        src={s.avatarUrl}
                        alt={s.fullName}
                        className="h-16 w-16 rounded-2xl object-cover border-2 border-slate-200"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white text-2xl font-extrabold shadow-lg shadow-violet-500/30">
                        {s.fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span
                      className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white ${
                        s.status === 'ACTIVE' ? 'bg-emerald-500' :
                        s.status === 'ON_LEAVE' ? 'bg-amber-500' :
                        s.status === 'SUSPENDED' ? 'bg-rose-500' : 'bg-slate-400'
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 truncate">{s.fullName}</div>
                    <div className="text-xs font-bold text-violet-700 mt-0.5 truncate">
                      {s.designation}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">
                      {s.staffNumber}
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <span className="truncate">{s.phone}</span>
                  </div>
                  {s.department && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Briefcase className="h-3 w-3 text-slate-400" />
                      <span className="truncate">{s.department}</span>
                    </div>
                  )}
                  {s.shop && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Building2 className="h-3 w-3 text-slate-400" />
                      <span className="truncate">{s.shop.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    <span>Joined {new Date(s.joinDate).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                      {salaryTypeLabels[s.salaryType]}
                    </div>
                    <div className="text-lg font-extrabold text-emerald-700 mt-0.5">
                      {formatPKR(s.baseSalary)}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${statusConfig[s.status].bg}`}>
                    {statusConfig[s.status].label}
                  </span>
                </div>
              </div>

              <div className="px-5 py-2.5 bg-gradient-to-r from-violet-50 to-pink-50 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[10px] font-bold text-slate-500">
                  {s._count?.attendances || 0} attendance · {s._count?.salaryPayments || 0} payslips
                </div>
                <ArrowUpRight className="h-4 w-4 text-violet-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, bg }: { label: string; value: number; icon: any; color: string; bg: string }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm hover:shadow-md transition">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${bg} text-white flex items-center justify-center shadow-lg`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="text-2xl font-extrabold text-slate-900" style={{ color }}>{value}</div>
        </div>
      </div>
    </div>
  );
}
