import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trophy, Plus, Search, X, Users, Calendar, DollarSign,
  RefreshCw, Award, Save, Edit3, Trash2, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { gamingTournamentsApi, type GamingTournament } from '../api/tournaments.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';

const PLATFORMS = ['PS5', 'PS4', 'XBOX_SERIES_X', 'NINTENDO_SWITCH', 'PC', 'MOBILE', 'MULTI'];
const STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];

export default function GamingTournamentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GamingTournament | null>(null);
  const [showComplete, setShowComplete] = useState<GamingTournament | null>(null);

  const { data: tournaments = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['gaming-tournaments-list', statusFilter, upcomingOnly],
    queryFn: () => gamingTournamentsApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      upcoming: upcomingOnly ? true : undefined,
    }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return tournaments;
    return tournaments.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.gameName.toLowerCase().includes(q) ||
      t.tournamentNumber.toLowerCase().includes(q)
    );
  }, [tournaments, search]);

  const stats = useMemo(() => ({
    total: tournaments.length,
    upcoming: tournaments.filter((t) => t.status === 'UPCOMING').length,
    ongoing: tournaments.filter((t) => t.status === 'ONGOING').length,
    totalPrizePool: tournaments.reduce((s, t) => s + Number(t.prizePool || 0), 0),
    totalEntries: tournaments.reduce((s, t) => s + Number(t.currentParticipants || 0), 0),
  }), [tournaments]);

  const remove = useMutation({
    mutationFn: (id: string) => gamingTournamentsApi.remove(id),
    onSuccess: () => {
      toast.success('Tournament deleted');
      qc.invalidateQueries({ queryKey: ['gaming-tournaments-list'] });
    },
  });

  const registerParticipant = useMutation({
    mutationFn: (id: string) => gamingTournamentsApi.register(id),
    onSuccess: () => {
      toast.success('Player registered');
      qc.invalidateQueries({ queryKey: ['gaming-tournaments-list'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="space-y-5">
      {showForm && (
        <TournamentFormModal editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['gaming-tournaments-list'] });
          }} />
      )}

      {showComplete && (
        <CompleteTournamentModal tournament={showComplete}
          onClose={() => setShowComplete(null)}
          onCompleted={() => {
            setShowComplete(null);
            qc.invalidateQueries({ queryKey: ['gaming-tournaments-list'] });
          }} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-red-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Trophy className="h-3.5 w-3.5 text-amber-300" /> Esports & Tournaments
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🏆 Tournaments</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.upcoming} upcoming • {stats.ongoing} ongoing • Prize pool{' '}
              <strong className="text-emerald-300">{formatPKR(stats.totalPrizePool)}</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> New Tournament
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} icon={Trophy} tone="rose" />
        <StatCard label="Upcoming" value={stats.upcoming} icon={Calendar} tone="amber" onClick={() => setStatusFilter('UPCOMING')} />
        <StatCard label="Entries" value={stats.totalEntries} icon={Users} tone="blue" />
        <StatCard label="Prize Pool" value={formatPKR(stats.totalPrizePool)} icon={Award} tone="violet" />
      </section>

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tournament name, game..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {['all', ...STATUSES].map((v) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                statusFilter === v ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600'}`}>
              {v === 'all' ? 'All' : v}
            </button>
          ))}
          <button onClick={() => setUpcomingOnly(!upcomingOnly)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
              upcomingOnly ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600'}`}>
            Future only
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Trophy className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No tournaments yet</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Host FIFA, PUBG, Valorant tournaments</p>
          <Button className="mt-4 bg-gradient-to-r from-rose-600 to-red-700" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Create First Tournament
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t) => (
            <TournamentCard key={t.id} tournament={t}
              onEdit={() => { setEditing(t); setShowForm(true); }}
              onDelete={() => { if (confirm(`Delete "${t.name}"?`)) remove.mutate(t.id); }}
              onRegister={() => registerParticipant.mutate(t.id)}
              onComplete={() => setShowComplete(t)} />
          ))}
        </section>
      )}
    </div>
  );
}

function TournamentCard({ tournament: t, onEdit, onDelete, onRegister, onComplete }: any) {
  const full = t.currentParticipants >= t.maxParticipants;
  const statusColors: Record<string, string> = {
    UPCOMING: 'bg-amber-500 text-white',
    ONGOING: 'bg-emerald-500 text-white',
    COMPLETED: 'bg-blue-500 text-white',
    CANCELLED: 'bg-slate-500 text-white',
  };

  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm hover:shadow-lg transition overflow-hidden">
      <div className="relative aspect-video bg-gradient-to-br from-rose-500 via-red-600 to-orange-600 overflow-hidden">
        {t.bannerUrl ? (
          <img src={t.bannerUrl} alt={t.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Trophy className="h-16 w-16 text-white/40" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${statusColors[t.status]}`}>
            {t.status}
          </span>
        </div>
        <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur text-white text-xs font-extrabold">
          {t.currentParticipants}/{t.maxParticipants}
        </div>
      </div>

      <div className="p-3 space-y-2">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base truncate">{t.name}</h3>
          <p className="text-xs text-slate-500 font-bold">{t.gameName} • {t.platform.replace(/_/g, ' ')}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-center">
            <div className="text-[9px] uppercase font-extrabold text-amber-700">Entry</div>
            <div className="text-sm font-extrabold text-amber-900 tabular-nums">{formatPKR(t.entryFee)}</div>
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-center">
            <div className="text-[9px] uppercase font-extrabold text-emerald-700">Prize</div>
            <div className="text-sm font-extrabold text-emerald-900 tabular-nums">{formatPKR(t.prizePool)}</div>
          </div>
        </div>

        <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(t.scheduledDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>

        {t.status === 'COMPLETED' && t.winnerName && (
          <div className="rounded-lg bg-amber-100 border-2 border-amber-300 p-2">
            <div className="text-[9px] uppercase font-extrabold text-amber-700">🏆 Winner</div>
            <div className="text-sm font-extrabold text-amber-900">{t.winnerName}</div>
            {t.runnerUpName && <div className="text-[10px] font-bold text-amber-700">🥈 {t.runnerUpName}</div>}
          </div>
        )}

        <div className="flex gap-1.5 pt-2 border-t border-slate-100">
          {t.status === 'UPCOMING' && (
            <button onClick={onRegister} disabled={full}
              className="flex-1 h-9 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold inline-flex items-center justify-center gap-1 disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" /> {full ? 'Full' : 'Register'}
            </button>
          )}
          {(t.status === 'UPCOMING' || t.status === 'ONGOING') && (
            <button onClick={onComplete}
              className="h-9 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-extrabold inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={onEdit}
            className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete}
            className="h-9 w-9 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 flex items-center justify-center">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TournamentFormModal({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    description: editing?.description ?? '',
    gameName: editing?.gameName ?? '',
    platform: editing?.platform ?? 'PS5',
    format: editing?.format ?? 'Single Elimination',
    maxParticipants: editing?.maxParticipants ?? 16,
    entryFee: editing?.entryFee ?? 500,
    prizePool: editing?.prizePool ?? 5000,
    firstPrize: editing?.firstPrize ?? 3000,
    secondPrize: editing?.secondPrize ?? 1500,
    thirdPrize: editing?.thirdPrize ?? 500,
    scheduledDate: editing?.scheduledDate ? editing.scheduledDate.slice(0, 16) : '',
    scheduledEndDate: editing?.scheduledEndDate ? editing.scheduledEndDate.slice(0, 16) : '',
    bannerUrl: editing?.bannerUrl ?? '',
    rules: editing?.rules ?? '',
    status: editing?.status ?? 'UPCOMING',
  });

  const save = useMutation({
    mutationFn: () => editing
      ? gamingTournamentsApi.update(editing.id, form as any)
      : gamingTournamentsApi.create(form as any),
    onSuccess: () => {
      toast.success(editing ? 'Tournament updated' : 'Tournament created');
      onSaved();
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">{editing ? '✏️ Edit Tournament' : '🏆 New Tournament'}</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <Lbl>Tournament Name *</Lbl>
            <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="FIFA 26 Ramzan Cup"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold focus:outline-none focus:border-rose-500" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Game Name *</Lbl>
              <input value={form.gameName} onChange={(e) => setForm({ ...form, gameName: e.target.value })}
                placeholder="FIFA 26, PUBG..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
            </div>
            <div>
              <Lbl>Platform *</Lbl>
              <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-rose-500">
                {PLATFORMS.map((p) => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Format</Lbl>
              <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-rose-500">
                <option value="Single Elimination">Single Elimination</option>
                <option value="Double Elimination">Double Elimination</option>
                <option value="Round Robin">Round Robin</option>
                <option value="Swiss">Swiss</option>
                <option value="Battle Royale">Battle Royale</option>
              </select>
            </div>
            <div>
              <Lbl>Max Participants *</Lbl>
              <input type="number" value={form.maxParticipants}
                onChange={(e) => setForm({ ...form, maxParticipants: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-rose-500" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Start Date & Time *</Lbl>
              <input type="datetime-local" value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
            </div>
            <div>
              <Lbl>End Date & Time</Lbl>
              <input type="datetime-local" value={form.scheduledEndDate}
                onChange={(e) => setForm({ ...form, scheduledEndDate: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Entry Fee</Lbl>
              <input type="number" value={form.entryFee}
                onChange={(e) => setForm({ ...form, entryFee: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <Lbl>Total Prize Pool</Lbl>
              <input type="number" value={form.prizePool}
                onChange={(e) => setForm({ ...form, prizePool: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Lbl>🥇 1st Prize</Lbl>
              <input type="number" value={form.firstPrize}
                onChange={(e) => setForm({ ...form, firstPrize: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-rose-500" />
            </div>
            <div>
              <Lbl>🥈 2nd Prize</Lbl>
              <input type="number" value={form.secondPrize}
                onChange={(e) => setForm({ ...form, secondPrize: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-rose-500" />
            </div>
            <div>
              <Lbl>🥉 3rd Prize</Lbl>
              <input type="number" value={form.thirdPrize}
                onChange={(e) => setForm({ ...form, thirdPrize: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-rose-500" />
            </div>
          </div>

          <div>
            <Lbl>Banner Image</Lbl>
            {form.bannerUrl ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={form.bannerUrl} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setForm({ ...form, bannerUrl: '' })}
                  className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <UploadDropzone purpose="tournament-banner" maxFiles={1}
                onUploaded={(recs: any[]) => {
                  const first = Array.isArray(recs) ? recs[0] : recs;
                  const url = typeof first === 'string' ? first : (first as any)?.url;
                  if (url) setForm({ ...form, bannerUrl: url });
                }} />
            )}
          </div>

          <div>
            <Lbl>Rules / Description</Lbl>
            <textarea rows={3} value={form.rules}
              onChange={(e) => setForm({ ...form, rules: e.target.value })}
              placeholder="Tournament rules, format details, contact info..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500" />
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-rose-600 to-red-700"
            onClick={() => save.mutate()} loading={save.isPending}
            disabled={!form.name.trim() || !form.gameName.trim() || !form.scheduledDate}>
            <Save className="h-4 w-4" /> {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CompleteTournamentModal({ tournament, onClose, onCompleted }: any) {
  const [winnerName, setWinnerName] = useState('');
  const [runnerUpName, setRunnerUpName] = useState('');

  const complete = useMutation({
    mutationFn: () => gamingTournamentsApi.complete(tournament.id, winnerName, runnerUpName || undefined),
    onSuccess: () => {
      toast.success('Tournament completed');
      onCompleted();
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xl">🏆 Complete Tournament</h3>
            <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm font-bold text-white/85 mt-1">{tournament.name}</p>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <Lbl>🥇 Winner *</Lbl>
            <input autoFocus value={winnerName} onChange={(e) => setWinnerName(e.target.value)}
              placeholder="Winner's name / team"
              className="h-12 w-full rounded-xl border-2 border-amber-300 bg-amber-50 px-3 text-base font-extrabold focus:outline-none focus:border-amber-500" />
            <div className="text-[10px] text-amber-700 font-bold mt-1">
              Prize: {formatPKR(tournament.firstPrize)}
            </div>
          </div>
          <div>
            <Lbl>🥈 Runner-up <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
            <input value={runnerUpName} onChange={(e) => setRunnerUpName(e.target.value)}
              placeholder="Runner-up name"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-slate-500" />
          </div>
        </div>

        <div className="px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-amber-600 to-orange-700"
            onClick={() => complete.mutate()} loading={complete.isPending} disabled={!winnerName.trim()}>
            <CheckCircle2 className="h-4 w-4" /> Complete
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, onClick }: any) {
  const tones: Record<string, string> = {
    rose: 'from-rose-500 to-red-700', amber: 'from-amber-500 to-orange-600',
    blue: 'from-blue-500 to-blue-700', violet: 'from-violet-500 to-fuchsia-700',
  };
  const C: any = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick}
      className={`rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full ${onClick ? 'hover:border-rose-300 hover:shadow-md transition' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </C>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
