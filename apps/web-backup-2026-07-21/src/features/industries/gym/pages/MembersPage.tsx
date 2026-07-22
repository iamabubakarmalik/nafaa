import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, Plus, X, Grid3x3, List as ListIcon, Filter, Dumbbell, Award, Trash2, Edit3, Eye, TrendingUp, Zap, Target, Activity, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { gymMembersApi, type MemberStatus } from '../api/members.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';

const STATUS_COLORS: Record<MemberStatus, string> = {
  ACTIVE: 'bg-emerald-500', INACTIVE: 'bg-slate-500', SUSPENDED: 'bg-amber-500', BANNED: 'bg-rose-500',
};

export default function MembersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [goalFilter, setGoalFilter] = useState<string>('all');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['gym-members', statusFilter, goalFilter, search],
    queryFn: () => gymMembersApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      primaryGoal: goalFilter === 'all' ? undefined : goalFilter,
      search: search.trim() || undefined,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['gym-members-summary'],
    queryFn: () => gymMembersApi.summary(),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => gymMembersApi.remove(id),
    onSuccess: () => { toast.success('Member removed'); queryClient.invalidateQueries({ queryKey: ['gym-members'] }); },
  });

  const stats = useMemo(() => {
    const active = members.filter((m: any) => m.status === 'ACTIVE').length;
    const totalStreak = members.reduce((s: number, m: any) => s + (m.currentStreak || 0), 0);
    const avgStreak = members.length ? Math.round(totalStreak / members.length) : 0;
    return { total: members.length, active, avgStreak };
  }, [members]);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-red-900 to-orange-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-red-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Users className="h-3.5 w-3.5 text-amber-300" />
              Gym Members
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold">💪 Members</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              {summary?.total ?? members.length} total • {stats.active} active • Avg {stats.avgStreak}d streak
            </p>
          </div>
          <Link to="/gym-members/new">
            <Button className="bg-white text-slate-900 hover:bg-slate-100 shadow-lg"><Plus className="h-4 w-4" /> Enroll Member</Button>
          </Link>
        </div>
      </section>

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search member name, phone, member#..." className="h-11 w-full rounded-xl border-2 border-slate-200 pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-red-500" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-slate-400" /></button>}
          </div>
          <div className="inline-flex rounded-xl border-2 border-slate-200 overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={'px-3 h-11 text-xs font-extrabold ' + (viewMode === 'grid' ? 'bg-red-600 text-white' : 'text-slate-700')}><Grid3x3 className="h-4 w-4" /></button>
            <button onClick={() => setViewMode('list')} className={'px-3 h-11 text-xs font-extrabold border-l-2 border-slate-200 ' + (viewMode === 'list' ? 'bg-red-600 text-white' : 'text-slate-700')}><ListIcon className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['ACTIVE', 'all', 'INACTIVE', 'SUSPENDED', 'BANNED'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={'px-3 py-1.5 rounded-lg text-xs font-extrabold ' + (statusFilter === s ? 'bg-red-600 text-white shadow' : 'bg-slate-100 text-slate-700')}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-80 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed p-12 text-center">
          <Dumbbell className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700 text-lg">No members yet</p>
          <p className="text-sm text-slate-500 font-semibold mt-1">Enroll your first member to start</p>
          <Link to="/gym-members/new"><Button className="mt-4 bg-gradient-to-r from-red-600 to-orange-600"><Plus className="h-4 w-4" /> Enroll First Member</Button></Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {members.map((m: any) => (
            <MemberCard key={m.id} member={m} onDelete={() => { if (confirm('Remove ' + m.customer?.name + '?')) removeMutation.mutate(m.id); }} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-white border-2 border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase text-slate-700">Member</th>
                  <th className="px-4 py-3 text-left text-[10px] font-extrabold uppercase text-slate-700">Contact</th>
                  <th className="px-4 py-3 text-center text-[10px] font-extrabold uppercase text-slate-700">Goal</th>
                  <th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase text-slate-700">Streak</th>
                  <th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase text-slate-700">Visits</th>
                  <th className="px-4 py-3 text-center text-[10px] font-extrabold uppercase text-slate-700">Status</th>
                  <th className="px-4 py-3 text-right text-[10px] font-extrabold uppercase text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <Link to={'/gym-members/' + m.id} className="flex items-center gap-3">
                        {m.photoUrl ? (
                          <img src={m.photoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 text-white flex items-center justify-center font-extrabold">
                            {m.customer?.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">{m.customer?.name}</div>
                          <div className="text-[10px] font-mono font-bold text-slate-500">{m.memberNumber}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-700">{m.customer?.phone}</td>
                    <td className="px-4 py-3 text-center text-[10px] font-extrabold text-fuchsia-700">{m.primaryGoal.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-orange-700 tabular-nums">🔥 {m.currentStreak}d</td>
                    <td className="px-4 py-3 text-right font-extrabold tabular-nums">{m.totalVisits}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={'inline-block px-2 py-0.5 rounded-full text-white text-[9px] font-extrabold uppercase ' + STATUS_COLORS[m.status as MemberStatus]}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={'/gym-members/' + m.id} className="h-7 w-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Eye className="h-3 w-3" /></Link>
                        <Link to={'/gym-members/' + m.id + '/edit'} className="h-7 w-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center"><Edit3 className="h-3 w-3" /></Link>
                        <button onClick={() => { if (confirm('Remove?')) removeMutation.mutate(m.id); }} className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberCard({ member, onDelete }: any) {
  return (
    <div className="group rounded-2xl bg-white border-2 border-slate-200 overflow-hidden hover:border-red-400 hover:shadow-xl hover:-translate-y-0.5 transition-all">
      <div className="relative aspect-square bg-gradient-to-br from-red-100 via-orange-100 to-red-200">
        {member.photoUrl ? (
          <img src={member.photoUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl font-extrabold text-red-400">
            {member.customer?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
        )}
        <span className={'absolute top-2 left-2 px-2 py-0.5 rounded-full text-white text-[9px] font-extrabold uppercase ' + STATUS_COLORS[member.status as MemberStatus]}>
          {member.status}
        </span>
        {member.currentStreak >= 7 && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow animate-pulse">
            🔥 {member.currentStreak}d
          </span>
        )}
      </div>
      <div className="p-3 space-y-2">
        <div>
          <Link to={'/gym-members/' + member.id}>
            <h3 className="font-extrabold text-slate-900 line-clamp-1 hover:text-red-600">{member.customer?.name}</h3>
          </Link>
          <div className="text-[10px] font-mono font-bold text-slate-500">{member.memberNumber}</div>
          <div className="text-[10px] font-extrabold text-fuchsia-600 mt-0.5">🎯 {member.primaryGoal.replace('_', ' ')}</div>
        </div>
        <div className="grid grid-cols-3 gap-1 text-center text-xs">
          <div>
            <div className="text-[9px] uppercase font-extrabold text-orange-700">Streak</div>
            <div className="font-extrabold text-orange-700 tabular-nums">{member.currentStreak}d</div>
          </div>
          <div>
            <div className="text-[9px] uppercase font-extrabold text-blue-700">Visits</div>
            <div className="font-extrabold text-blue-700 tabular-nums">{member.totalVisits}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase font-extrabold text-emerald-700">Spent</div>
            <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(member.totalSpent)}</div>
          </div>
        </div>
        <div className="flex gap-1 pt-2 border-t border-slate-100">
          <Link to={'/gym-members/' + member.id} className="flex-1 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold inline-flex items-center justify-center gap-1"><Eye className="h-3 w-3" /> View</Link>
          <Link to={'/gym-members/' + member.id + '/edit'} className="h-8 w-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center"><Edit3 className="h-3 w-3" /></Link>
          <button onClick={onDelete} className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>
    </div>
  );
}
