import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Target, Plus, X, Save, Edit3, Trash2, RefreshCw, Sparkles, Award,
  Clock, Users, Check, Star, Zap, DollarSign, Snowflake,
} from 'lucide-react';
import { membershipPlansApi, type PlanType, type MembershipPlan } from '../api/membership-plans.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const PLAN_TYPES: { value: PlanType; label: string; emoji: string; gradient: string }[] = [
  { value: 'DAILY', label: 'Daily Pass', emoji: '☀️', gradient: 'from-amber-400 to-orange-500' },
  { value: 'WEEKLY', label: 'Weekly', emoji: '📅', gradient: 'from-blue-400 to-cyan-500' },
  { value: 'MONTHLY', label: 'Monthly', emoji: '📆', gradient: 'from-emerald-400 to-teal-500' },
  { value: 'QUARTERLY', label: 'Quarterly', emoji: '🗓️', gradient: 'from-violet-400 to-purple-500' },
  { value: 'HALF_YEARLY', label: 'Half-Year', emoji: '📊', gradient: 'from-pink-400 to-fuchsia-500' },
  { value: 'YEARLY', label: 'Yearly', emoji: '🏆', gradient: 'from-amber-500 to-yellow-600' },
  { value: 'LIFETIME', label: 'Lifetime', emoji: '💎', gradient: 'from-cyan-500 to-blue-600' },
  { value: 'PAY_PER_VISIT', label: 'Pay per Visit', emoji: '🎟️', gradient: 'from-slate-400 to-slate-600' },
  { value: 'CUSTOM', label: 'Custom', emoji: '⭐', gradient: 'from-rose-500 to-pink-600' },
];

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MembershipPlan | null>(null);

  const { data: plans = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['gym-plans', typeFilter],
    queryFn: () => membershipPlansApi.list({
      planType: typeFilter === 'all' ? undefined : typeFilter,
      active: true,
    }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => membershipPlansApi.remove(id),
    onSuccess: () => { toast.success('Plan removed'); queryClient.invalidateQueries({ queryKey: ['gym-plans'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-fuchsia-900 to-pink-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Target className="h-3.5 w-3.5 text-amber-300" />
              Pricing Plans
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🎯 Membership Plans</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Daily/monthly/yearly plans with benefits & access</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              New Plan
            </Button>
          </div>
        </div>
      </section>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setTypeFilter('all')} className={
          'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
          (typeFilter === 'all' ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
        }>All Plans</button>
        {PLAN_TYPES.map((t) => (
          <button key={t.value} onClick={() => setTypeFilter(t.value)} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (typeFilter === t.value ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>{t.emoji} {t.label}</button>
        ))}
      </div>

      {showForm && (
        <PlanForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['gym-plans'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-96 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed p-12 text-center">
          <Target className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No plans yet</p>
          <Button className="mt-4 bg-gradient-to-r from-fuchsia-600 to-pink-700" onClick={() => { setEditing(null); setShowForm(true); }}>
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
              onEdit={() => { setEditing(plan); setShowForm(true); }}
              onDelete={() => { if (confirm('Remove "' + plan.name + '"?')) removeMutation.mutate(plan.id); }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function PlanCard({ plan, onEdit, onDelete }: any) {
  const typeCfg = PLAN_TYPES.find((t) => t.value === plan.planType);

  return (
    <div className={
      'group rounded-3xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl transition overflow-hidden ' +
      (plan.isFeatured ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 dark:border-neutral-800')
    }>
      <div className={'relative p-6 text-white bg-gradient-to-br ' + (typeCfg?.gradient ?? 'from-slate-500 to-slate-700')}>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button onClick={onEdit} className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="h-8 w-8 rounded-lg bg-white/20 hover:bg-rose-500 flex items-center justify-center">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {plan.isFeatured && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5 shadow">
            <Star className="h-2 w-2 fill-current" /> Featured
          </div>
        )}

        <div className="text-5xl mb-2">{typeCfg?.emoji}</div>
        <div className="text-xs uppercase tracking-wider font-extrabold text-white/80">{typeCfg?.label}</div>
        <h3 className="text-2xl font-extrabold mt-1">{plan.name}</h3>
        {plan.code && <div className="text-[10px] font-mono text-white/70">{plan.code}</div>}

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold tabular-nums">{formatPKR(plan.price)}</span>
          <span className="text-xs font-bold text-white/70">/ {plan.durationDays}d</span>
        </div>
        {plan.registrationFee > 0 && (
          <div className="text-xs font-bold text-white/70">+ {formatPKR(plan.registrationFee)} registration</div>
        )}
      </div>

      <div className="p-5 space-y-3">
        {plan.description && (
          <p className="text-xs text-slate-500 font-semibold line-clamp-2">{plan.description}</p>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2">
            <div className="text-[9px] uppercase font-extrabold text-blue-700">Access</div>
            <div className="font-extrabold text-blue-800">
              {plan.accessAllHours ? '24/7' : plan.accessTimeStart + '-' + plan.accessTimeEnd}
            </div>
          </div>
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2">
            <div className="text-[9px] uppercase font-extrabold text-emerald-700">Visits</div>
            <div className="font-extrabold text-emerald-800">
              {plan.isUnlimited ? 'Unlimited' : plan.visitLimit + ' visits'}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          {plan.includesPersonalTraining && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Check className="h-3 w-3 text-emerald-600" />
              {plan.personalTrainingSessions} PT sessions
            </div>
          )}
          {plan.includesClasses && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Check className="h-3 w-3 text-emerald-600" />
              Group classes {plan.classesLimit ? '(' + plan.classesLimit + '/month)' : '(unlimited)'}
            </div>
          )}
          {plan.includesNutritionPlan && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Check className="h-3 w-3 text-emerald-600" />
              Nutrition plan
            </div>
          )}
          {plan.includesLockerFacility && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Check className="h-3 w-3 text-emerald-600" />
              Locker facility
            </div>
          )}
          {plan.includesTowelService && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Check className="h-3 w-3 text-emerald-600" />
              Towel service
            </div>
          )}
          {plan.includesSteamSauna && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Check className="h-3 w-3 text-emerald-600" />
              Steam & sauna
            </div>
          )}
          {plan.includesSwimmingPool && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Check className="h-3 w-3 text-emerald-600" />
              Swimming pool
            </div>
          )}
          {plan.includesGuestPasses > 0 && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Check className="h-3 w-3 text-emerald-600" />
              {plan.includesGuestPasses} guest passes
            </div>
          )}
          {plan.allowFreeze && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Snowflake className="h-3 w-3 text-blue-600" />
              Freeze up to {plan.maxFreezeDays} days
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-extrabold">
            <Users className="h-3 w-3" />
            {plan.totalSubscribers} subscribers
          </span>
          <span className="text-xs font-extrabold text-emerald-700">
            {formatPKR(plan.totalRevenue)}
          </span>
        </div>
      </div>
    </div>
  );
}

function PlanForm({ editing, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    name: editing?.name ?? '',
    code: editing?.code ?? '',
    description: editing?.description ?? '',
    planType: editing?.planType ?? 'MONTHLY',
    price: editing?.price ?? 0,
    registrationFee: editing?.registrationFee ?? 0,
    securityDeposit: editing?.securityDeposit ?? 0,
    durationDays: editing?.durationDays ?? 30,
    visitLimit: editing?.visitLimit ?? '',
    isUnlimited: editing?.isUnlimited ?? true,
    accessAllHours: editing?.accessAllHours ?? false,
    accessTimeStart: editing?.accessTimeStart ?? '06:00',
    accessTimeEnd: editing?.accessTimeEnd ?? '22:00',
    includesPersonalTraining: editing?.includesPersonalTraining ?? false,
    personalTrainingSessions: editing?.personalTrainingSessions ?? 0,
    includesClasses: editing?.includesClasses ?? true,
    classesLimit: editing?.classesLimit ?? '',
    includesNutritionPlan: editing?.includesNutritionPlan ?? false,
    includesLockerFacility: editing?.includesLockerFacility ?? false,
    includesTowelService: editing?.includesTowelService ?? false,
    includesSteamSauna: editing?.includesSteamSauna ?? false,
    includesSwimmingPool: editing?.includesSwimmingPool ?? false,
    includesGuestPasses: editing?.includesGuestPasses ?? 0,
    allowFreeze: editing?.allowFreeze ?? false,
    maxFreezeDays: editing?.maxFreezeDays ?? 0,
    freezeFee: editing?.freezeFee ?? 0,
    isFeatured: editing?.isFeatured ?? false,
    benefits: editing?.benefits?.join('\n') ?? '',
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        price: Number(form.price),
        registrationFee: Number(form.registrationFee) || 0,
        securityDeposit: Number(form.securityDeposit) || 0,
        durationDays: Number(form.durationDays),
        visitLimit: form.visitLimit ? Number(form.visitLimit) : undefined,
        personalTrainingSessions: Number(form.personalTrainingSessions) || 0,
        classesLimit: form.classesLimit ? Number(form.classesLimit) : undefined,
        includesGuestPasses: Number(form.includesGuestPasses) || 0,
        maxFreezeDays: Number(form.maxFreezeDays) || 0,
        freezeFee: Number(form.freezeFee) || 0,
        benefits: form.benefits ? form.benefits.split('\n').map((b: string) => b.trim()).filter(Boolean) : [],
      };
      return editing ? membershipPlansApi.update(editing.id, payload) : membershipPlansApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Plan updated' : 'Plan created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-fuchsia-300 dark:border-fuchsia-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-fuchsia-50 dark:bg-fuchsia-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">{editing ? 'Edit Plan' : 'New Membership Plan'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-3 gap-3">
          <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Plan Name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Code" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-fuchsia-500" />
          <select value={form.planType} onChange={(e) => setForm({ ...form, planType: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500">
            {PLAN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
          </select>
        </div>

        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-fuchsia-500 resize-none" />

        <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4">
          <div className="text-sm font-extrabold text-emerald-900 mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pricing
          </div>
          <div className="grid sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Price *</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-lg font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Registration Fee</label>
              <input type="number" value={form.registrationFee} onChange={(e) => setForm({ ...form, registrationFee: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Security Deposit</label>
              <input type="number" value={form.securityDeposit} onChange={(e) => setForm({ ...form, securityDeposit: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Duration (days) *</label>
              <input type="number" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
        </div>

        {/* Access */}
        <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-blue-900 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Access & Visits
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.accessAllHours} onChange={(e) => setForm({ ...form, accessAllHours: e.target.checked })} className="h-4 w-4 rounded" />
            <span className="text-sm font-extrabold">24/7 Access</span>
          </label>
          {!form.accessAllHours && (
            <div className="grid grid-cols-2 gap-2">
              <input type="time" value={form.accessTimeStart} onChange={(e) => setForm({ ...form, accessTimeStart: e.target.value })} className="h-11 rounded-xl border-2 border-blue-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
              <input type="time" value={form.accessTimeEnd} onChange={(e) => setForm({ ...form, accessTimeEnd: e.target.value })} className="h-11 rounded-xl border-2 border-blue-300 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isUnlimited} onChange={(e) => setForm({ ...form, isUnlimited: e.target.checked })} className="h-4 w-4 rounded" />
            <span className="text-sm font-extrabold">Unlimited visits</span>
          </label>
          {!form.isUnlimited && (
            <input type="number" value={form.visitLimit} onChange={(e) => setForm({ ...form, visitLimit: e.target.value })} placeholder="Visit limit" className="h-11 w-full rounded-xl border-2 border-blue-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          )}
        </div>

        {/* Features */}
        <div className="rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-4 space-y-2">
          <div className="text-sm font-extrabold text-violet-900 mb-2 flex items-center gap-2">
            <Award className="h-4 w-4" />
            Included Features
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { key: 'includesClasses', label: 'Group Classes' },
              { key: 'includesNutritionPlan', label: 'Nutrition Plan' },
              { key: 'includesLockerFacility', label: 'Locker Facility' },
              { key: 'includesTowelService', label: 'Towel Service' },
              { key: 'includesSteamSauna', label: 'Steam & Sauna' },
              { key: 'includesSwimmingPool', label: 'Swimming Pool' },
            ].map((f) => (
              <label key={f.key} className={
                'flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer ' +
                ((form as any)[f.key] ? 'border-violet-500 bg-white dark:bg-violet-950/40' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800')
              }>
                <input type="checkbox" checked={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} className="h-4 w-4 rounded" />
                <span className="text-xs font-extrabold">{f.label}</span>
              </label>
            ))}
          </div>

          <label className={
            'flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer ' +
            (form.includesPersonalTraining ? 'border-violet-500 bg-white' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800')
          }>
            <input type="checkbox" checked={form.includesPersonalTraining} onChange={(e) => setForm({ ...form, includesPersonalTraining: e.target.checked })} className="h-4 w-4 rounded" />
            <span className="text-xs font-extrabold flex-1">Personal Training</span>
            {form.includesPersonalTraining && (
              <input type="number" value={form.personalTrainingSessions} onChange={(e) => setForm({ ...form, personalTrainingSessions: e.target.value })} placeholder="Sessions" className="w-20 h-8 rounded border border-violet-300 px-2 text-xs font-extrabold tabular-nums text-center" onClick={(e) => e.stopPropagation()} />
            )}
          </label>

          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={form.classesLimit} onChange={(e) => setForm({ ...form, classesLimit: e.target.value })} placeholder="Classes/month limit" className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
            <input type="number" value={form.includesGuestPasses} onChange={(e) => setForm({ ...form, includesGuestPasses: e.target.value })} placeholder="Guest passes" className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
          </div>
        </div>

        {/* Freeze */}
        <div className="rounded-xl border-2 border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/30 p-4 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.allowFreeze} onChange={(e) => setForm({ ...form, allowFreeze: e.target.checked })} className="h-5 w-5 rounded" />
            <Snowflake className={'h-5 w-5 ' + (form.allowFreeze ? 'text-cyan-600' : 'text-slate-400')} />
            <span className="text-sm font-extrabold text-cyan-900">Allow Membership Freeze</span>
          </label>
          {form.allowFreeze && (
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={form.maxFreezeDays} onChange={(e) => setForm({ ...form, maxFreezeDays: e.target.value })} placeholder="Max freeze days" className="h-10 rounded-lg border-2 border-cyan-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-cyan-500" />
              <input type="number" value={form.freezeFee} onChange={(e) => setForm({ ...form, freezeFee: e.target.value })} placeholder="Freeze fee (Rs)" className="h-10 rounded-lg border-2 border-cyan-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-cyan-500" />
            </div>
          )}
        </div>

        <textarea rows={3} value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} placeholder="Extra benefits (one per line)" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-fuchsia-500 resize-none" />

        <label className={
          'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' +
          (form.isFeatured ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'border-slate-200 dark:border-neutral-700')
        }>
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="h-4 w-4 rounded" />
          <Star className={'h-4 w-4 ' + (form.isFeatured ? 'text-amber-500 fill-amber-500' : 'text-slate-400')} />
          <span className="text-sm font-extrabold">Featured Plan</span>
        </label>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-fuchsia-600 to-pink-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name || !form.price}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Create Plan'}
          </Button>
        </div>
      </div>
    </section>
  );
}
