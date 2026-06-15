import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, Coffee,
  UserCheck, UserX, Calendar, Search, Sparkles, AlertCircle,
} from 'lucide-react';
import { staffApi, type AttendanceStatus } from '@/api/staff.api';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

const statusConfig: Record<AttendanceStatus, { label: string; color: string; bg: string; icon: any }> = {
  PRESENT: { label: 'Present', color: '#16a34a', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  LATE: { label: 'Late', color: '#f59e0b', bg: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  ABSENT: { label: 'Absent', color: '#dc2626', bg: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle },
  HALF_DAY: { label: 'Half Day', color: '#0ea5e9', bg: 'bg-sky-100 text-sky-700 border-sky-200', icon: Clock },
  ON_LEAVE: { label: 'On Leave', color: '#7c3aed', bg: 'bg-violet-100 text-violet-700 border-violet-200', icon: Coffee },
  HOLIDAY: { label: 'Holiday', color: '#64748b', bg: 'bg-slate-100 text-slate-600 border-slate-200', icon: Calendar },
};

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-list-active'],
    queryFn: () => staffApi.list({ status: 'ACTIVE' }),
  });

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: staffApi.todayAttendance,
  });

  const today = new Date().toISOString().split('T')[0];

  const attendanceMap = useMemo(() => {
    const map = new Map();
    todayAttendance.forEach((a) => map.set(a.staffId, a));
    return map;
  }, [todayAttendance]);

  const filteredStaff = useMemo(() => {
    if (!search) return staff;
    const q = search.toLowerCase();
    return staff.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.designation.toLowerCase().includes(q) ||
        s.staffNumber.toLowerCase().includes(q),
    );
  }, [staff, search]);

  const checkInMutation = useMutation({
    mutationFn: ({ staffId, status }: { staffId: string; status?: AttendanceStatus }) =>
      staffApi.markAttendance({
        staffId,
        date: today,
        checkIn: new Date().toISOString(),
        status: status ?? 'PRESENT',
      }),
    onSuccess: () => {
      toast.success('Check-in marked');
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (staffId: string) =>
      staffApi.markAttendance({
        staffId,
        date: today,
        checkOut: new Date().toISOString(),
      }),
    onSuccess: () => {
      toast.success('Check-out marked');
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
    },
  });

  const markStatusMutation = useMutation({
    mutationFn: ({ staffId, status }: { staffId: string; status: AttendanceStatus }) =>
      staffApi.markAttendance({ staffId, date: today, status }),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
    },
  });

  const presentCount = todayAttendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
  const absentCount = staff.length - presentCount;

  return (
    <div className="space-y-6">
      <Link to="/staff" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600">
        <ArrowLeft className="h-4 w-4" /> Back to Staff
      </Link>

      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-sky-900 to-sky-700 text-white p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Daily Attendance
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">
              {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            <p className="mt-2 text-sm text-white/75">
              Check-in / Check-out aur status mark karein
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 backdrop-blur p-4 text-center">
              <div className="text-3xl font-extrabold text-emerald-300">{presentCount}</div>
              <div className="text-xs text-white/75 font-bold mt-1">Present</div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur p-4 text-center">
              <div className="text-3xl font-extrabold text-rose-300">{absentCount}</div>
              <div className="text-xs text-white/75 font-bold mt-1">Absent</div>
            </div>
          </div>
        </div>
      </section>

      {/* Search */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
          placeholder="Search staff by name, designation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Staff List */}
      {filteredStaff.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <UserCheck className="h-12 w-12 text-slate-400 mx-auto" />
          <h4 className="mt-4 font-bold text-slate-900">No active staff</h4>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((s) => {
            const att = attendanceMap.get(s.id);
            const cfg = att ? statusConfig[att.status as AttendanceStatus] : null;
            const Icon = cfg?.icon;

            return (
              <div
                key={s.id}
                className={`rounded-3xl border-2 bg-white shadow-sm overflow-hidden transition ${
                  att ? 'border-emerald-300' : 'border-slate-200'
                }`}
              >
                <div className="p-4 flex items-start gap-3">
                  {s.avatarUrl ? (
                    <img src={s.avatarUrl} alt={s.fullName} className="h-14 w-14 rounded-2xl object-cover" />
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white text-xl font-extrabold shadow">
                      {s.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 truncate">{s.fullName}</div>
                    <div className="text-xs text-violet-700 font-bold mt-0.5">{s.designation}</div>
                    {att && Icon && cfg && (
                      <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    )}
                  </div>
                </div>

                {att && (
                  <div className="px-4 pb-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 p-2">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Check In</div>
                      <div className="font-bold text-slate-900">
                        {att.checkIn ? new Date(att.checkIn).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Check Out</div>
                      <div className="font-bold text-slate-900">
                        {att.checkOut ? new Date(att.checkOut).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2">
                  {!att?.checkIn ? (
                    <button
                      onClick={() => checkInMutation.mutate({ staffId: s.id })}
                      disabled={checkInMutation.isPending}
                      className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3 w-3 inline mr-1" /> Check In
                    </button>
                  ) : !att?.checkOut ? (
                    <button
                      onClick={() => checkOutMutation.mutate(s.id)}
                      disabled={checkOutMutation.isPending}
                      className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50"
                    >
                      <Clock className="h-3 w-3 inline mr-1" /> Check Out
                    </button>
                  ) : (
                    <div className="px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold text-center">
                      ✓ Complete
                    </div>
                  )}

                  <select
                    className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-bold bg-white"
                    value={att?.status || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        markStatusMutation.mutate({ staffId: s.id, status: e.target.value as AttendanceStatus });
                      }
                    }}
                  >
                    <option value="">Mark as...</option>
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="LATE">Late</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="HOLIDAY">Holiday</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
