import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Award, Plus, X, Save, Edit3, Trash2, RefreshCw, Sparkles, Users,
  Calendar, Gift, Zap, CheckCircle2, Ban, DollarSign, Star, Crown,
  Search, User, Phone,
} from 'lucide-react';
import { membershipsApi, type MembershipTier, type MembershipPlan, type Membership } from '../api/memberships.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

const TIERS: { value: MembershipTier; label: string; emoji: string; gradient: string; color: string }[] = [
  { value: 'BRONZE', label: 'Bronze', emoji: '🥉', gradient: 'from-orange-400 to-amber-600', color: 'orange' },
  { value: 'SILVER', label: 'Silver', emoji: '🥈', gradient: 'from-slate-300 to-slate-500', color: 'slate' },
  { value: 'GOLD', label: 'Gold', emoji: '🥇', gradient: 'from-amber-400 to-yellow-600', color: 'amber' },
  { value: 'PLATINUM', label: 'Platinum', emoji: '💎', gradient: 'from-cyan-400 to-blue-500', color: 'cyan' },
  { value: 'DIAMOND', label: 'Diamond', emoji: '💠', gradient: 'from-fuchsia-500 to-purple-600', color: 'fuchsia' },
  { value: 'CUSTOM', label: 'Custom', emoji: '⭐', gradient: 'from-emerald-500 to-teal-600', color: 'emerald' },
];

export default function MembershipsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'plans' | 'members'>('plans');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: () => membershipsApi.listPlans({ active: true }),
  });

  const { data: memberships = [], isLoading: membersLoading } = useQuery({
    queryKey: ['memberships', statusFilter],
    queryFn: () => membershipsApi.list({ status: statusFilter === 'all' ? undefined : statusFilter }),
    enabled: tab === 'members',
  });

  const removePlanMutation = useMutation({
    mutationFn: (id: string) => membershipsApi.removePlan(id),
    onSuccess: () => { toast.success('Plan removed'); queryClient.invalidateQueries({ queryKey: ['membership-plans'] }); },
  });

  const cancelMembershipMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => membershipsApi.cancel(id, reason),
    onSuccess: () => { toast.success('Membership cancelled'); queryClient.invalidateQueries({ queryKey: ['memberships'] }); },
  });

  const expireOldMutation = useMutation({
    mutationFn: () => membershipsApi.expireOld(),
    onSuccess: () => { toast.success('Expired old memberships'); queryClient.invalidateQueries({ queryKey: ['memberships'] }); },
  });

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Crown className="h-3.5 w-3.5 text-amber-300" />
              Loyalty Program
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">👑 Memberships</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Bronze/Silver/Gold/Platinum/Diamond tiers with benefits</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => expireOldMutation.mutate()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <Calendar className="h-4 w-4" />
              Expire Old
            </button>
            {tab === 'plans' ? (
              <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditingPlan(null); setShowPlanForm(true); }}>
                <Plus className="h-4 w-4" />
                New Plan
              </Button>
            ) : (
              <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowSubscribe(true)}>
                <Plus className="h-4 w-4" />
                New Subscription
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('plans')} className={
          'px-4 py-2 rounded-xl text-sm font-extrabold transition ' +
          (tab === 'plans' ? 'bg-amber-600 text-white shadow' : 'bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-700 text-slate-700')
        }>
          Plans ({plans.length})
        </button>
        <button onClick={() => setTab('members')} className={
          'px-4 py-2 rounded-xl text-sm font-extrabold transition ' +
          (tab === 'members' ? 'bg-amber-600 text-white shadow' : 'bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-700 text-slate-700')
        }>
          Members
        </button>
      </div>

      {showPlanForm && (
        <PlanForm
          editing={editingPlan}
          onClose={() => { setShowPlanForm(false); setEditingPlan(null); }}
          onSaved={() => {
            setShowPlanForm(false);
            setEditingPlan(null);
            queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
          }}
        />
      )}

      {showSubscribe && (
        <SubscribeForm
          plans={plans}
          onClose={() => setShowSubscribe(false)}
          onSaved={() => { setShowSubscribe(false); queryClient.invalidateQueries({ queryKey: ['memberships'] }); }}
        />
      )}

      {tab === 'plans' ? (
        plansLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-80 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
            <Crown className="h-16 w-16 text-slate-400 mx-auto mb-3" />
            <p className="font-extrabold text-slate-700">No membership plans yet</p>
            <Button className="mt-4 bg-gradient-to-r from-amber-600 to-orange-700" onClick={() => { setEditingPlan(null); setShowPlanForm(true); }}>
              <Plus className="h-4 w-4" />
              Create First Plan
            </Button>
          </div>
        ) : (
          <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={() => { setEditingPlan(plan); setShowPlanForm(true); }}
                onDelete={() => { if (confirm('Remove "' + plan.name + '"?')) removePlanMutation.mutate(plan.id); }}
              />
            ))}
          </section>
        )
      ) : (
        <>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {['ACTIVE', 'all', 'EXPIRED', 'CANCELLED', 'PAUSED'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className={
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
                (statusFilter === s ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
              }>{s === 'all' ? 'All' : s}</button>
            ))}
          </div>

          {membersLoading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
            </div>
          ) : memberships.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
              <Users className="h-16 w-16 text-slate-400 mx-auto mb-3" />
              <p className="font-extrabold text-slate-700">No members yet</p>
            </div>
          ) : (
            <section className="grid gap-3">
              {memberships.map((m) => (
                <MembershipCard
                  key={m.id}
                  membership={m}
                  onCancel={() => {
                    const reason = prompt('Cancellation reason?');
                    if (reason !== null) cancelMembershipMutation.mutate({ id: m.id, reason });
                  }}
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function PlanCard({ plan, onEdit, onDelete }: { plan: MembershipPlan; onEdit: () => void; onDelete: () => void }) {
  const tier = TIERS.find((t) => t.value === plan.tier);

  return (
    <div className="group rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-xl transition overflow-hidden">
      <div className={'relative p-6 text-white bg-gradient-to-br ' + (tier?.gradient ?? 'from-slate-500 to-slate-700')}>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button onClick={onEdit} className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="h-8 w-8 rounded-lg bg-white/20 hover:bg-rose-500 flex items-center justify-center">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="text-5xl mb-2">{tier?.emoji}</div>
        <div className="text-xs uppercase tracking-wider font-extrabold text-white/80">{tier?.label} Tier</div>
        <h3 className="text-2xl font-extrabold mt-1">{plan.name}</h3>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold tabular-nums">{formatPKR(plan.price)}</span>
          <span className="text-xs font-bold text-white/70">/ {plan.durationDays} days</span>
        </div>
      </div>

      <div className="p-5 space-y-3">
        {plan.description && (
          <p className="text-xs text-slate-500 font-semibold line-clamp-2">{plan.description}</p>
        )}

        <div className="space-y-1.5">
          {plan.discountPct > 0 && (
            <div className="flex items-center gap-2 text-xs font-bold">
              <div className="h-6 w-6 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                <Zap className="h-3 w-3" />
              </div>
              <span>{plan.discountPct}% off on all services</span>
            </div>
          )}
          {plan.freeServiceCount > 0 && (
            <div className="flex items-center gap-2 text-xs font-bold">
              <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Gift className="h-3 w-3" />
              </div>
              <span>{plan.freeServiceCount} free services</span>
            </div>
          )}
          {plan.priorityBooking && (
            <div className="flex items-center gap-2 text-xs font-bold">
              <div className="h-6 w-6 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                <Star className="h-3 w-3" />
              </div>
              <span>Priority booking</span>
            </div>
          )}
          {plan.birthdayBonus > 0 && (
            <div className="flex items-center gap-2 text-xs font-bold">
              <div className="h-6 w-6 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                <Gift className="h-3 w-3" />
              </div>
              <span>Birthday bonus: {formatPKR(plan.birthdayBonus)}</span>
            </div>
          )}
          {plan.benefits.slice(0, 3).map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-xs font-bold">
              <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                <CheckCircle2 className="h-3 w-3" />
              </div>
              <span>{b}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-extrabold">
            <Users className="h-3 w-3" />
            {plan.totalSubscribers} members
          </span>
        </div>
      </div>
    </div>
  );
}

function MembershipCard({ membership, onCancel }: any) {
  const daysLeft = differenceInDays(new Date(membership.expiryDate), new Date());
  const isExpiringSoon = daysLeft <= 30 && daysLeft > 0 && membership.status === 'ACTIVE';
  const tier = TIERS.find((t) => t.value === membership.plan?.tier);

  return (
    <div className={
      'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-4 ' +
      (isExpiringSoon ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 dark:border-neutral-800')
    }>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center shadow shrink-0 text-2xl ' + (tier?.gradient ?? 'from-slate-500 to-slate-700')}>
            {tier?.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">{membership.membershipNumber}</span>
              <span className={
                'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' +
                (membership.status === 'ACTIVE' ? 'bg-emerald-600' :
                 membership.status === 'EXPIRED' ? 'bg-slate-500' :
                 membership.status === 'CANCELLED' ? 'bg-rose-500' : 'bg-amber-500')
              }>
                {membership.status}
              </span>
              {isExpiringSoon && (
                <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase animate-pulse">
                  Expires in {daysLeft}d
                </span>
              )}
              {membership.autoRenew && (
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold uppercase">Auto-renew</span>
              )}
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{membership.plan?.name}</div>
            <div className="mt-1 text-xs text-slate-500 font-semibold">
              {format(new Date(membership.startDate), 'dd MMM')} → {format(new Date(membership.expiryDate), 'dd MMM yyyy')}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(membership.amountPaid)}</div>
          {membership.totalSaved > 0 && (
            <div className="text-[10px] font-extrabold text-emerald-600">Saved: {formatPKR(membership.totalSaved)}</div>
          )}
          <div className="text-[10px] font-bold text-slate-500">{membership.usedServices} services used</div>
          {membership.status === 'ACTIVE' && (
            <button onClick={onCancel} className="mt-2 text-xs font-extrabold text-rose-600 hover:underline">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanForm({ editing, onClose, onSaved }: { editing: MembershipPlan | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({
    name: editing?.name ?? '',
    tier: editing?.tier ?? 'SILVER',
    description: editing?.description ?? '',
    price: editing?.price ?? 0,
    durationDays: editing?.durationDays ?? 365,
    discountPct: editing?.discountPct ?? 0,
    freeServiceCount: editing?.freeServiceCount ?? 0,
    priorityBooking: editing?.priorityBooking ?? false,
    freeConsultation: editing?.freeConsultation ?? false,
    birthdayBonus: editing?.birthdayBonus ?? 0,
    colorTheme: editing?.colorTheme ?? '',
    benefits: editing?.benefits?.join('\n') ?? '',
    displayOrder: editing?.displayOrder ?? 0,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        price: Number(form.price),
        durationDays: Number(form.durationDays),
        discountPct: Number(form.discountPct) || 0,
        freeServiceCount: Number(form.freeServiceCount) || 0,
        birthdayBonus: Number(form.birthdayBonus) || 0,
        displayOrder: Number(form.displayOrder) || 0,
        benefits: form.benefits ? form.benefits.split('\n').map((b: string) => b.trim()).filter(Boolean) : [],
      };
      return editing ? membershipsApi.updatePlan(editing.id, payload) : membershipsApi.createPlan(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Plan updated' : 'Plan created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-amber-300 dark:border-amber-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">{editing ? 'Edit Plan' : 'New Membership Plan'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Plan Name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
            {TIERS.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
          </select>
        </div>

        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Plan description..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Price (Rs) *</label>
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Duration (days) *</label>
            <input type="number" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} className="h-14 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        <div className="rounded-xl border-2 border-fuchsia-200 dark:border-fuchsia-800 bg-fuchsia-50 dark:bg-fuchsia-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-fuchsia-900 dark:text-fuchsia-300 flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Benefits
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-fuchsia-700 mb-1 block">Discount (%)</label>
              <input type="number" step="0.1" value={form.discountPct} onChange={(e) => setForm({ ...form, discountPct: e.target.value })} className="h-11 w-full rounded-xl border-2 border-fuchsia-300 bg-white dark:bg-fuchsia-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-fuchsia-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-fuchsia-700 mb-1 block">Free Services</label>
              <input type="number" value={form.freeServiceCount} onChange={(e) => setForm({ ...form, freeServiceCount: e.target.value })} className="h-11 w-full rounded-xl border-2 border-fuchsia-300 bg-white dark:bg-fuchsia-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-fuchsia-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-fuchsia-700 mb-1 block">Birthday Bonus (Rs)</label>
              <input type="number" value={form.birthdayBonus} onChange={(e) => setForm({ ...form, birthdayBonus: e.target.value })} className="h-11 w-full rounded-xl border-2 border-fuchsia-300 bg-white dark:bg-fuchsia-950/40 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-fuchsia-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className={
              'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' +
              (form.priorityBooking ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40' : 'border-slate-200 dark:border-neutral-700 bg-white')
            }>
              <input type="checkbox" checked={form.priorityBooking} onChange={(e) => setForm({ ...form, priorityBooking: e.target.checked })} className="h-4 w-4 rounded" />
              <Star className={'h-4 w-4 ' + (form.priorityBooking ? 'text-violet-600' : 'text-slate-400')} />
              <span className="text-sm font-extrabold">Priority Booking</span>
            </label>
            <label className={
              'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' +
              (form.freeConsultation ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40' : 'border-slate-200 dark:border-neutral-700 bg-white')
            }>
              <input type="checkbox" checked={form.freeConsultation} onChange={(e) => setForm({ ...form, freeConsultation: e.target.checked })} className="h-4 w-4 rounded" />
              <Gift className={'h-4 w-4 ' + (form.freeConsultation ? 'text-blue-600' : 'text-slate-400')} />
              <span className="text-sm font-extrabold">Free Consultation</span>
            </label>
          </div>

          <div>
            <label className="text-[10px] uppercase font-extrabold text-fuchsia-700 mb-1 block">Additional Benefits (one per line)</label>
            <textarea rows={3} value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} placeholder="Free hair spa monthly&#10;Complimentary consultation&#10;VIP treatment room" className="w-full rounded-xl border-2 border-fuchsia-300 bg-white dark:bg-fuchsia-950/40 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-fuchsia-500 resize-none" />
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-amber-600 to-orange-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name.trim() || !form.price}>
            <Save className="h-4 w-4" />
            {editing ? 'Update Plan' : 'Create Plan'}
          </Button>
        </div>
      </div>
    </section>
  );
}

function SubscribeForm({ plans, onClose, onSaved }: { plans: MembershipPlan[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({
    planId: '',
    customerId: '',
    amountPaid: 0,
    paymentMethod: 'CASH',
    autoRenew: false,
    notes: '',
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const selectedPlan = plans.find((p) => p.id === form.planId);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-membership', customerSearch],
    queryFn: () => customersApi.list({ limit: 50, search: customerSearch || undefined }),
    enabled: showPicker,
  });

  const subscribeMutation = useMutation({
    mutationFn: () => membershipsApi.subscribe({
      planId: form.planId,
      customerId: form.customerId,
      amountPaid: Number(form.amountPaid) || (selectedPlan?.price ?? 0),
      paymentMethod: form.paymentMethod,
      autoRenew: form.autoRenew,
      notes: form.notes || undefined,
    }),
    onSuccess: () => { toast.success('Subscribed'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-amber-300 dark:border-amber-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">Subscribe Customer to Plan</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
        {/* Plan picker */}
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Choose Plan *</label>
          <div className="grid sm:grid-cols-2 gap-2">
            {plans.map((plan) => {
              const tier = TIERS.find((t) => t.value === plan.tier);
              return (
                <button
                  key={plan.id}
                  onClick={() => setForm({ ...form, planId: plan.id, amountPaid: plan.price })}
                  className={
                    'p-3 rounded-xl border-2 text-left transition ' +
                    (form.planId === plan.id ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-amber-300')
                  }
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{tier?.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm truncate">{plan.name}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">{tier?.label}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 text-sm tabular-nums">{formatPKR(plan.price)}</div>
                      <div className="text-[9px] font-bold text-slate-500">{plan.durationDays}d</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Customer picker */}
        <div>
          <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Customer *</label>
          {selectedCustomer ? (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 p-3 flex items-center gap-3">
              <User className="h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <div className="font-extrabold">{selectedCustomer.name}</div>
                {selectedCustomer.phone && <div className="text-xs text-slate-600 font-bold">{selectedCustomer.phone}</div>}
              </div>
              <button onClick={() => { setSelectedCustomer(null); setForm({ ...form, customerId: '' }); }} className="text-xs font-extrabold text-amber-600 hover:underline">Change</button>
            </div>
          ) : (
            <>
              <button onClick={() => setShowPicker(!showPicker)} className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-extrabold text-slate-600 hover:border-amber-400">
                <Search className="h-4 w-4 inline mr-1" />
                Search Customer
              </button>
              {showPicker && (
                <div className="mt-2 rounded-xl border-2 border-amber-300 bg-amber-50/50 p-3 space-y-2">
                  <input autoFocus value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search..." className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
                  <div className="max-h-52 overflow-y-auto space-y-1">
                    {(customersData?.items ?? []).map((c) => (
                      <button key={c.id} onClick={() => { setSelectedCustomer(c); setForm({ ...form, customerId: c.id }); setShowPicker(false); }} className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-white text-left">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm font-extrabold flex-1 truncate">{c.name}</span>
                        <span className="text-[10px] text-slate-500 font-bold">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {selectedPlan && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Amount Paid *</label>
              <input type="number" value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Payment Method</label>
              <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                <option>CASH</option><option>CARD</option><option>JAZZCASH</option><option>EASYPAISA</option><option>BANK</option>
              </select>
            </div>
          </div>
        )}

        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/30 cursor-pointer">
          <input type="checkbox" checked={form.autoRenew} onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })} className="h-5 w-5 rounded" />
          <div className="flex-1">
            <div className="text-sm font-extrabold text-blue-900">Auto-renew</div>
            <div className="text-xs text-blue-700 font-semibold">Automatically renew on expiry</div>
          </div>
        </label>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-amber-600 to-orange-700" onClick={() => subscribeMutation.mutate()} loading={subscribeMutation.isPending} disabled={!form.planId || !form.customerId}>
            <Crown className="h-4 w-4" />
            Subscribe
          </Button>
        </div>
      </div>
    </section>
  );
}
