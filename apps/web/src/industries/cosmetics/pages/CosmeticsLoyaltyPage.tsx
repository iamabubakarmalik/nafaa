import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, X, Edit3, Trash2, RefreshCw, Star,
  Award, Crown, Cake, Phone, Mail, Save, TrendingUp,
  DollarSign, Sparkles, Heart, Gift,
} from 'lucide-react';
import { toast } from 'sonner';
import { cosmeticsLoyaltyApi, type CosmeticsLoyaltyMember } from '../api/loyalty.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const TIER_META: Record<string, { color: string; bg: string; label: string; emoji: string }> = {
  BRONZE:   { color: 'text-amber-700',   bg: 'bg-amber-100',   label: 'Bronze',   emoji: '🥉' },
  SILVER:   { color: 'text-slate-700',   bg: 'bg-slate-200',   label: 'Silver',   emoji: '🥈' },
  GOLD:     { color: 'text-yellow-700',  bg: 'bg-yellow-100',  label: 'Gold',     emoji: '🥇' },
  PLATINUM: { color: 'text-violet-700',  bg: 'bg-violet-100',  label: 'Platinum', emoji: '💎' },
  DIAMOND:  { color: 'text-blue-700',    bg: 'bg-blue-100',    label: 'Diamond',  emoji: '💎' },
};

export default function CosmeticsLoyaltyPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CosmeticsLoyaltyMember | null>(null);
  const [pointsDialog, setPointsDialog] = useState<{ member: CosmeticsLoyaltyMember; mode: 'award' | 'redeem' } | null>(null);

  const { data: members = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['cosmetics-loyalty-list', tierFilter],
    queryFn: () => cosmeticsLoyaltyApi.list({
      tier: tierFilter === 'all' ? undefined : tierFilter,
      active: true,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['cosmetics-loyalty-summary'],
    queryFn: () => cosmeticsLoyaltyApi.summary(),
  });

  const { data: birthdayMembers = [] } = useQuery({
    queryKey: ['cosmetics-birthdays'],
    queryFn: () => cosmeticsLoyaltyApi.birthdaysThisMonth(),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return members;
    return members.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      m.memberCode.toLowerCase().includes(q)
    );
  }, [members, search]);

  const remove = useMutation({
    mutationFn: (id: string) => cosmeticsLoyaltyApi.remove(id),
    onSuccess: () => {
      toast.success('Member deactivated');
      qc.invalidateQueries({ queryKey: ['cosmetics-loyalty-list'] });
    },
  });

  const markBirthday = useMutation({
    mutationFn: (id: string) => cosmeticsLoyaltyApi.markBirthdayOfferSent(id),
    onSuccess: () => {
      toast.success('Birthday offer marked as sent');
      qc.invalidateQueries({ queryKey: ['cosmetics-birthdays'] });
    },
  });

  return (
    <div className="space-y-5">
      {showForm && (
        <MemberFormModal editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false); setEditing(null);
            qc.invalidateQueries({ queryKey: ['cosmetics-loyalty-list'] });
            qc.invalidateQueries({ queryKey: ['cosmetics-loyalty-summary'] });
          }} />
      )}

      {pointsDialog && (
        <PointsDialog dialog={pointsDialog}
          onClose={() => setPointsDialog(null)}
          onDone={() => {
            setPointsDialog(null);
            qc.invalidateQueries({ queryKey: ['cosmetics-loyalty-list'] });
            qc.invalidateQueries({ queryKey: ['cosmetics-loyalty-summary'] });
          }} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Users className="h-3.5 w-3.5 text-amber-300" /> Loyalty Program
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">👥 Loyalty Members</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.total ?? 0} members • {summary?.totalPointsBalance ?? 0} pts outstanding • Total spent{' '}
              <strong className="text-emerald-300">{formatPKR(summary?.totalSpent || 0)}</strong>
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> New Member
            </Button>
          </div>
        </div>
      </section>

      {/* TIER BREAKDOWN */}
      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'] as const).map((t) => {
            const meta = TIER_META[t];
            const count = (summary.byTier as any)?.[t.toLowerCase()] ?? 0;
            return (
              <button key={t} onClick={() => setTierFilter(t)}
                className={`rounded-2xl bg-white border-2 p-4 shadow-sm text-left w-full hover:shadow-md transition ${
                  tierFilter === t ? 'border-violet-400 ring-2 ring-violet-100' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{meta.emoji}</span>
                  <div className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${meta.bg} ${meta.color}`}>
                    {meta.label}
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{count}</div>
                <div className="text-[10px] font-bold text-slate-500">members</div>
              </button>
            );
          })}
        </section>
      )}

      {/* BIRTHDAYS THIS MONTH */}
      {birthdayMembers.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-br from-pink-50 to-fuchsia-50 border-2 border-pink-300 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-700 text-white flex items-center justify-center shadow-lg">
              <Cake className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-pink-900">🎂 Birthdays this month</h3>
              <p className="text-xs text-pink-800 font-bold">Send special discount offers</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {birthdayMembers.slice(0, 6).map((m) => (
              <div key={m.id} className="rounded-xl bg-white border-2 border-pink-200 p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 text-white flex items-center justify-center shrink-0 font-extrabold">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-slate-900 text-sm truncate">{m.name}</div>
                  <div className="text-[10px] font-bold text-pink-700">
                    {m.dateOfBirth && new Date(m.dateOfBirth).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <button onClick={() => markBirthday.mutate(m.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-[10px] font-extrabold inline-flex items-center gap-1">
                  <Gift className="h-3 w-3" /> Sent
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TOOLBAR */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, phone, email, code..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          <button onClick={() => setTierFilter('all')}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${tierFilter === 'all' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600'}`}>
            All Tiers
          </button>
          {(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'] as const).map((t) => {
            const meta = TIER_META[t];
            return (
              <button key={t} onClick={() => setTierFilter(t)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 ${
                  tierFilter === t ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600'}`}>
                {meta.emoji} {meta.label}
              </button>
            );
          })}
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Users className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No loyalty members yet</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Enroll customers to build lifetime value</p>
          <Button className="mt-4 bg-gradient-to-r from-violet-600 to-purple-700"
            onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Add First Member
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const meta = TIER_META[m.tier] || TIER_META.BRONZE;
            return (
              <div key={m.id} className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4 hover:shadow-md transition">
                <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
                  <div className={`h-14 w-14 rounded-2xl ${meta.bg} flex items-center justify-center shrink-0 text-2xl`}>
                    {meta.emoji}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 text-base">{m.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${meta.bg} ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 font-bold">{m.memberCode}</span>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 font-bold flex-wrap">
                      <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {m.phone}</span>
                      {m.email && (<span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {m.email}</span>)}
                      {m.dateOfBirth && (
                        <span className="inline-flex items-center gap-1">
                          <Cake className="h-3 w-3" /> {new Date(m.dateOfBirth).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>

                    {m.skinType && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 text-[10px] font-extrabold">
                          {m.skinType.replace('_', ' ')} skin
                        </span>
                        {(m.skinConcerns ?? []).slice(0, 3).map((c) => (
                          <span key={c} className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-extrabold">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs font-bold flex-wrap">
                      <span className="inline-flex items-center gap-1 text-violet-700">
                        <Award className="h-3 w-3" /> <strong>{m.pointsBalance}</strong> points
                      </span>
                      <span className="text-slate-500">Lifetime <strong>{m.lifetimePoints}</strong></span>
                      <span className="text-emerald-700">
                        Spent <strong>{formatPKR(m.totalSpent)}</strong>
                      </span>
                      <span className="text-slate-500">{m.totalPurchases} orders</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => setPointsDialog({ member: m, mode: 'award' })}
                      className="h-9 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold inline-flex items-center gap-1">
                      <Plus className="h-3.5 w-3.5" /> Award
                    </button>
                    <button onClick={() => setPointsDialog({ member: m, mode: 'redeem' })}
                      disabled={m.pointsBalance <= 0}
                      className="h-9 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-extrabold inline-flex items-center gap-1 disabled:opacity-40">
                      <Gift className="h-3.5 w-3.5" /> Redeem
                    </button>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(m); setShowForm(true); }}
                        className="h-8 w-8 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 flex items-center justify-center">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { if (confirm(`Deactivate "${m.name}"?`)) remove.mutate(m.id); }}
                        className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MemberFormModal({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    phone: editing?.phone ?? '',
    email: editing?.email ?? '',
    dateOfBirth: editing?.dateOfBirth ? editing.dateOfBirth.slice(0, 10) : '',
    skinType: editing?.skinType ?? '',
    skinConcerns: editing?.skinConcerns ?? [],
    favoriteFragranceFamilies: editing?.favoriteFragranceFamilies ?? [],
    notes: editing?.notes ?? '',
  });

  const save = useMutation({
    mutationFn: () => editing
      ? cosmeticsLoyaltyApi.update(editing.id, form as any)
      : cosmeticsLoyaltyApi.create(form as any),
    onSuccess: () => {
      toast.success(editing ? 'Member updated' : 'Member enrolled');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const SKIN_TYPES = ['DRY', 'OILY', 'COMBINATION', 'NORMAL', 'SENSITIVE', 'ACNE_PRONE', 'MATURE'];
  const CONCERNS = ['Acne', 'Aging', 'Brightening', 'Hyperpigmentation', 'Redness', 'Dryness', 'Oily skin'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">{editing ? '✏️ Edit Member' : '➕ Enroll Member'}</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Full Name *</Lbl>
              <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Sarah Ahmed"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <Lbl>Phone *</Lbl>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="03XX XXXXXXX"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Email</Lbl>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="sarah@example.com"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <Lbl>Date of Birth 🎂</Lbl>
              <input type="date" value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
          </div>

          <div>
            <Lbl>Skin Type</Lbl>
            <div className="grid grid-cols-4 gap-2">
              {SKIN_TYPES.map((s) => (
                <button key={s} type="button" onClick={() => setForm({ ...form, skinType: form.skinType === s ? '' : s })}
                  className={`px-3 py-2 rounded-xl border-2 text-xs font-extrabold ${
                    form.skinType === s ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Lbl>Skin Concerns</Lbl>
            <div className="flex flex-wrap gap-1.5">
              {CONCERNS.map((c) => {
                const a = form.skinConcerns.includes(c);
                return (
                  <button key={c} type="button"
                    onClick={() => setForm({
                      ...form,
                      skinConcerns: a ? form.skinConcerns.filter((x: string) => x !== c) : [...form.skinConcerns, c]
                    })}
                    className={`px-3 py-1.5 rounded-full border-2 text-xs font-extrabold ${
                      a ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Lbl>Notes</Lbl>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Preferences, allergies, favourite brands..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" />
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700"
            onClick={() => save.mutate()} loading={save.isPending}
            disabled={!form.name.trim() || !form.phone.trim()}>
            <Save className="h-4 w-4" /> {editing ? 'Update' : 'Enroll'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PointsDialog({ dialog, onClose, onDone }: any) {
  const [points, setPoints] = useState(0);
  const [reason, setReason] = useState('');

  const isAward = dialog.mode === 'award';

  const action = useMutation({
    mutationFn: () => isAward
      ? cosmeticsLoyaltyApi.awardPoints(dialog.member.id, points, reason)
      : cosmeticsLoyaltyApi.redeemPoints(dialog.member.id, points, reason),
    onSuccess: () => {
      toast.success(isAward ? `+${points} points awarded` : `${points} points redeemed`);
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const maxPoints = isAward ? 99999 : dialog.member.pointsBalance;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className={`px-5 py-4 text-white flex items-center justify-between ${
          isAward ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-amber-600 to-orange-700'}`}>
          <h3 className="font-extrabold text-xl">
            {isAward ? '➕ Award Points' : '🎁 Redeem Points'}
          </h3>
          <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3">
            <div className="text-[10px] uppercase font-extrabold text-slate-500">Member</div>
            <div className="font-extrabold text-slate-900">{dialog.member.name}</div>
            <div className="text-xs font-bold text-violet-700 mt-1">Balance: {dialog.member.pointsBalance} pts</div>
          </div>

          <div>
            <Lbl>Points {isAward ? 'to Award' : 'to Redeem'} *</Lbl>
            <input type="number" value={points} onChange={(e) => setPoints(Math.max(0, Number(e.target.value)))}
              max={maxPoints}
              className={`h-14 w-full rounded-xl border-2 px-3 text-2xl font-extrabold tabular-nums text-center focus:outline-none ${
                isAward ? 'border-emerald-400 bg-emerald-50 text-emerald-900 focus:border-emerald-600'
                        : 'border-amber-400 bg-amber-50 text-amber-900 focus:border-amber-600'}`} />
            {!isAward && (
              <div className="mt-1 text-[10px] text-slate-500 font-bold">Max: {maxPoints} points available</div>
            )}
          </div>

          <div>
            <Lbl>{isAward ? 'Reason' : 'Note'}</Lbl>
            <input value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder={isAward ? 'Purchase bonus, referral, etc.' : 'Applied to sale...'}
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          </div>
        </div>

        <div className="px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className={`flex-1 ${isAward ? 'bg-gradient-to-r from-emerald-600 to-teal-700' : 'bg-gradient-to-r from-amber-600 to-orange-700'}`}
            onClick={() => action.mutate()} loading={action.isPending}
            disabled={points <= 0 || points > maxPoints}>
            {isAward ? 'Award' : 'Redeem'} {points} pts
          </Button>
        </div>
      </div>
    </div>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
