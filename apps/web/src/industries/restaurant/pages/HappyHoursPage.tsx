import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Zap, Plus, Clock, Calendar, Percent, DollarSign, X, Save,
  Edit3, Trash2, RefreshCw, Sparkles, Eye, EyeOff, Tag,
  TrendingUp, Award,
} from 'lucide-react';
import { happyHoursApi, type HappyHourRule } from '../api/happy-hours.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const DAYS = [
  { i: 0, s: 'Sun', f: 'Sunday' },
  { i: 1, s: 'Mon', f: 'Monday' },
  { i: 2, s: 'Tue', f: 'Tuesday' },
  { i: 3, s: 'Wed', f: 'Wednesday' },
  { i: 4, s: 'Thu', f: 'Thursday' },
  { i: 5, s: 'Fri', f: 'Friday' },
  { i: 6, s: 'Sat', f: 'Saturday' },
];

const DISCOUNT_TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage %', icon: Percent },
  { value: 'FIXED', label: 'Fixed Amount (Rs)', icon: DollarSign },
  { value: 'BUY_ONE_GET_ONE', label: 'Buy 1 Get 1 Free', icon: Sparkles },
];

const ORDER_MODES = [
  { value: 'DINE_IN', label: 'Dine-in' },
  { value: 'TAKEAWAY', label: 'Takeaway' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'DRIVE_THRU', label: 'Drive-thru' },
  { value: 'ROOM_SERVICE', label: 'Room Service' },
  { value: 'PICKUP', label: 'Pickup' },
];

export default function HappyHoursPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HappyHourRule | null>(null);
  const [activeOnly, setActiveOnly] = useState(false);

  const { data: rules = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['happy-hours', activeOnly],
    queryFn: () => happyHoursApi.list(activeOnly),
  });

  const { data: activeNow = [] } = useQuery({
    queryKey: ['happy-hours-active-now'],
    queryFn: () => happyHoursApi.activeNow(),
    refetchInterval: 60_000,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => happyHoursApi.toggle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['happy-hours'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => happyHoursApi.remove(id),
    onSuccess: () => {
      toast.success('Happy hour rule deleted');
      queryClient.invalidateQueries({ queryKey: ['happy-hours'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-orange-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-orange-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              Time-based Discounts
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              ⚡ Happy Hours
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Off-peak hours discount — Ramzan special, weekday deals
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20"
            >
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button
              className="bg-white text-slate-900 hover:bg-slate-100"
              onClick={() => { setEditing(null); setShowForm(true); }}
            >
              <Plus className="h-4 w-4" />
              New Rule
            </Button>
          </div>
        </div>
      </section>

      {/* ACTIVE NOW BANNER */}
      {activeNow.length > 0 && (
        <section className="rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white p-4 shadow-lg border-2 border-emerald-300 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Zap className="h-6 w-6 fill-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider font-extrabold text-white/90">🎉 Active Right Now</div>
              <div className="text-lg font-extrabold">{activeNow.length} happy hour rule{activeNow.length !== 1 ? 's' : ''} active</div>
              <div className="text-xs font-semibold text-white/85 mt-0.5">
                {activeNow.map((r) => r.name).join(', ')}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FILTER */}
      <section className="flex gap-2">
        <button
          onClick={() => setActiveOnly(false)}
          className={
            'px-4 py-2 rounded-xl text-sm font-extrabold transition ' +
            (!activeOnly ? 'bg-rose-600 text-white shadow' : 'bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-300')
          }
        >
          All Rules
        </button>
        <button
          onClick={() => setActiveOnly(true)}
          className={
            'px-4 py-2 rounded-xl text-sm font-extrabold transition ' +
            (activeOnly ? 'bg-rose-600 text-white shadow' : 'bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-300')
          }
        >
          Active Only
        </button>
      </section>

      {showForm && (
        <HappyHourForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ['happy-hours'] });
          }}
        />
      )}

      {/* RULES LIST */}
      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <div className="h-20 w-20 rounded-3xl bg-rose-100 dark:bg-rose-950/40 mx-auto flex items-center justify-center">
            <Zap className="h-10 w-10 text-rose-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">No happy hour rules</h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">Discount rules banao off-peak sales badhane ke liye</p>
          <Button
            className="mt-4 bg-gradient-to-r from-rose-600 to-orange-700"
            onClick={() => { setEditing(null); setShowForm(true); }}
          >
            <Plus className="h-4 w-4" />
            Create First Rule
          </Button>
        </div>
      ) : (
        <section className="grid gap-3">
          {rules.map((rule) => {
            const isActiveNow = activeNow.some((r) => r.id === rule.id);
            return (
              <RuleCard
                key={rule.id}
                rule={rule}
                isActiveNow={isActiveNow}
                onEdit={() => { setEditing(rule); setShowForm(true); }}
                onToggle={() => toggleMutation.mutate(rule.id)}
                onDelete={() => {
                  if (confirm('Delete "' + rule.name + '"?')) removeMutation.mutate(rule.id);
                }}
              />
            );
          })}
        </section>
      )}
    </div>
  );
}

function RuleCard({ rule, isActiveNow, onEdit, onToggle, onDelete }: {
  rule: HappyHourRule;
  isActiveNow: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const typeCfg = DISCOUNT_TYPES.find((t) => t.value === rule.discountType);
  const TypeIcon = typeCfg?.icon || Percent;

  return (
    <div className={
      'rounded-2xl border-2 shadow-sm hover:shadow-lg transition p-4 ' +
      (isActiveNow
        ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-200 dark:ring-emerald-900'
        : rule.isActive
          ? 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800'
          : 'bg-slate-50 dark:bg-neutral-900/50 border-slate-200 dark:border-neutral-800 opacity-70')
    }>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-600 text-white flex items-center justify-center shadow-lg shrink-0">
            <TypeIcon className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">{rule.name}</h3>
              {isActiveNow && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500 text-white animate-pulse inline-flex items-center gap-1">
                  <Zap className="h-2 w-2 fill-white" />
                  Live Now
                </span>
              )}
              <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/40 text-rose-700 text-[9px] font-extrabold uppercase">
                {typeCfg?.label}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-700 text-[9px] font-extrabold">
                {rule.discountType === 'PERCENTAGE' ? rule.discountValue + '% OFF' : rule.discountType === 'FIXED' ? formatPKR(rule.discountValue) + ' OFF' : 'BOGO'}
              </span>
            </div>

            {rule.description && (
              <p className="text-xs text-slate-500 font-semibold mt-1">{rule.description}</p>
            )}

            <div className="mt-2 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-bold flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {rule.startTime} – {rule.endTime}
              </span>
              {rule.daysOfWeek?.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {rule.daysOfWeek.map((d) => DAYS[d].s).join(', ')}
                </span>
              )}
              {rule.minOrderAmount && (
                <span>Min: {formatPKR(rule.minOrderAmount)}</span>
              )}
              {rule.maxDiscount && (
                <span>Max off: {formatPKR(rule.maxDiscount)}</span>
              )}
            </div>

            {rule.orderModes?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {rule.orderModes.map((m) => (
                  <span key={m} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300 text-[9px] font-extrabold uppercase">
                    {ORDER_MODES.find((om) => om.value === m)?.label || m}
                  </span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-slate-50 dark:bg-neutral-800/50 p-2">
                <div className="text-[9px] uppercase font-extrabold text-slate-500">Total Usage</div>
                <div className="font-extrabold text-slate-900 dark:text-white tabular-nums">{rule.totalUsage}</div>
              </div>
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2">
                <div className="text-[9px] uppercase font-extrabold text-emerald-700">Customer Saved</div>
                <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(rule.totalSaved)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-1 shrink-0">
          <button
            onClick={onToggle}
            className={
              'h-9 w-9 rounded-lg flex items-center justify-center transition ' +
              (rule.isActive ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700' : 'bg-slate-100 dark:bg-neutral-800 text-slate-500')
            }
            title={rule.isActive ? 'Active' : 'Inactive'}
          >
            {rule.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            onClick={onEdit}
            className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function HappyHourForm({ editing, onClose, onSaved }: {
  editing: HappyHourRule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    description: editing?.description ?? '',
    discountType: editing?.discountType ?? 'PERCENTAGE',
    discountValue: editing?.discountValue ?? 10,
    startTime: editing?.startTime ?? '17:00',
    endTime: editing?.endTime ?? '19:00',
    daysOfWeek: editing?.daysOfWeek ?? [],
    validFrom: editing?.validFrom ? editing.validFrom.slice(0, 10) : '',
    validTo: editing?.validTo ? editing.validTo.slice(0, 10) : '',
    minOrderAmount: editing?.minOrderAmount ?? '',
    maxDiscount: editing?.maxDiscount ?? '',
    orderModes: editing?.orderModes ?? [],
    isActive: editing?.isActive ?? true,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        validFrom: form.validFrom || undefined,
        validTo: form.validTo || undefined,
      };
      return editing ? happyHoursApi.update(editing.id, payload) : happyHoursApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Rule updated' : 'Rule created');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day) ? f.daysOfWeek.filter((d) => d !== day) : [...f.daysOfWeek, day],
    }));
  };

  const toggleMode = (mode: string) => {
    setForm((f) => ({
      ...f,
      orderModes: f.orderModes.includes(mode) ? f.orderModes.filter((m) => m !== mode) : [...f.orderModes, mode],
    }));
  };

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-rose-300 dark:border-rose-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-rose-50 dark:bg-rose-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">
          {editing ? 'Edit Happy Hour Rule' : 'New Happy Hour Rule'}
        </h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-neutral-800 flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
        {/* Basic */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Rule Name *</label>
          <input
            autoFocus
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Ramzan Iftar Special, Weekday Lunch Deal"
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Description</label>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional — shown to staff"
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500"
          />
        </div>

        {/* Discount */}
        <div className="rounded-xl border-2 border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 space-y-3">
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">Discount</div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2 block">Discount Type</label>
            <div className="grid grid-cols-3 gap-2">
              {DISCOUNT_TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    onClick={() => setForm({ ...form, discountType: t.value })}
                    className={
                      'p-3 rounded-xl border-2 text-center transition ' +
                      (form.discountType === t.value
                        ? 'border-rose-500 bg-rose-100 dark:bg-rose-950/60 shadow'
                        : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-rose-300')
                    }
                  >
                    <Icon className="h-5 w-5 text-rose-600 mx-auto mb-1" />
                    <div className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">{t.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {form.discountType !== 'BUY_ONE_GET_ONE' && (
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-rose-700 mb-1 block">
                Discount Value {form.discountType === 'PERCENTAGE' ? '(%)' : '(Rs)'} *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                className="h-14 w-full rounded-xl border-2 border-rose-300 dark:border-rose-700 bg-white dark:bg-neutral-800 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-rose-500"
              />
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Min Order Amount (Rs)</label>
              <input
                type="number"
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value as any })}
                placeholder="Optional"
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Max Discount (Rs)</label>
              <input
                type="number"
                value={form.maxDiscount}
                onChange={(e) => setForm({ ...form, maxDiscount: e.target.value as any })}
                placeholder="Cap on discount"
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Time Window */}
        <div className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 p-4 space-y-3">
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">Active Time Window</div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Start Time *</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">End Time *</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2 block">Days of Week (empty = all days)</label>
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((day) => {
                const active = form.daysOfWeek.includes(day.i);
                return (
                  <button
                    key={day.i}
                    onClick={() => toggleDay(day.i)}
                    className={
                      'py-2 rounded-lg text-xs font-extrabold transition ' +
                      (active
                        ? 'bg-rose-600 text-white shadow'
                        : 'bg-white dark:bg-neutral-800 border-2 border-slate-200 dark:border-neutral-700 text-slate-600 hover:border-rose-300')
                    }
                  >
                    {day.s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Valid From (date)</label>
              <input
                type="date"
                value={form.validFrom}
                onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Valid To (date)</label>
              <input
                type="date"
                value={form.validTo}
                onChange={(e) => setForm({ ...form, validTo: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Order Modes */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2 block">Applicable Order Modes (empty = all modes)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ORDER_MODES.map((mode) => {
              const active = form.orderModes.includes(mode.value);
              return (
                <button
                  key={mode.value}
                  onClick={() => toggleMode(mode.value)}
                  className={
                    'p-2 rounded-lg text-xs font-extrabold transition border-2 ' +
                    (active
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                      : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 dark:text-slate-300 hover:border-rose-300')
                  }
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active */}
        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="h-5 w-5 rounded"
          />
          <div className="flex-1">
            <div className="text-sm font-extrabold text-emerald-900 dark:text-emerald-300">Enable rule</div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">Rule sirf enabled hone par apply hoga</div>
          </div>
        </label>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-gradient-to-r from-rose-600 to-orange-700"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!form.name.trim() || (form.discountType !== 'BUY_ONE_GET_ONE' && form.discountValue <= 0)}
          >
            <Save className="h-4 w-4" />
            {editing ? 'Update Rule' : 'Create Rule'}
          </Button>
        </div>
      </div>
    </section>
  );
}
