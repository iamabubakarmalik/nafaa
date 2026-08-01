import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cake, Plus, Search, X, RefreshCw, User, Phone, Calendar,
  ArrowRight, Save, Trash2, Sparkles, Gift, TrendingUp,
  Users, Baby, DollarSign, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { toyBirthdaysApi, type ToyBirthdayReminder } from '../api/birthday-reminders.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

export default function BirthdayRemindersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [genderFilter, setGenderFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);

  const { data: reminders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['birthday-reminders-list', activeOnly, genderFilter],
    queryFn: () => toyBirthdaysApi.list({
      active: activeOnly ? true : undefined,
      gender: genderFilter === 'all' ? undefined : genderFilter,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['birthday-summary'],
    queryFn: () => toyBirthdaysApi.summary(),
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return reminders;
    return reminders.filter((r) =>
      r.customerName.toLowerCase().includes(q) ||
      r.childName.toLowerCase().includes(q) ||
      r.customerPhone.includes(q)
    );
  }, [reminders, search]);

  const remove = useMutation({
    mutationFn: (id: string) => toyBirthdaysApi.remove(id),
    onSuccess: () => {
      toast.success('Birthday reminder deleted');
      qc.invalidateQueries({ queryKey: ['birthday-reminders-list'] });
    },
  });

  return (
    <div className="space-y-5">
      {showForm && (
        <NewBirthdayModal
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ['birthday-reminders-list'] });
            qc.invalidateQueries({ queryKey: ['birthday-summary'] });
          }} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Cake className="h-3.5 w-3.5 text-amber-300" /> Repeat-customer engine
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🎂 Birthday Reminders</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.totalRegistered ?? 0} children • {summary?.birthdaysThisWeek ?? 0} this week •{' '}
              <strong className="text-emerald-300">{formatPKR(summary?.lifetimeRevenue || 0)}</strong> lifetime revenue
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Add Birthday
            </Button>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total" value={summary.totalRegistered} icon={Cake} tone="pink" />
          <StatCard label="This Week" value={summary.birthdaysThisWeek} icon={AlertTriangle} tone="amber" />
          <StatCard label="This Month" value={summary.birthdaysThisMonth} icon={Calendar} tone="violet" />
          <StatCard label="Avg Spend" value={formatPKR(summary.avgSpendPerPurchase)} icon={DollarSign} tone="emerald" />
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Customer / child name / phone..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={() => setActiveOnly(!activeOnly)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
              activeOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700'}`}>
            Active Only
          </button>
          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}
            className="h-10 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:border-pink-500">
            <option value="all">All genders</option>
            <option value="BOYS">👦 Boys</option>
            <option value="GIRLS">👧 Girls</option>
            <option value="UNISEX">⚧️ Unisex</option>
          </select>
          <div className="ml-auto text-xs font-extrabold text-slate-500">{filtered.length} children</div>
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Cake className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No birthdays registered</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            Add customers' children's birthdays to send gift reminders and boost repeat sales
          </p>
          <Button className="mt-4 bg-gradient-to-r from-pink-600 to-rose-700" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Register First Birthday
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <BirthdayCard key={r.id} reminder={r}
              onDelete={() => { if (confirm(`Delete birthday reminder for ${r.childName}?`)) remove.mutate(r.id); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function BirthdayCard({ reminder: r, onDelete }: any) {
  const days = r.computed?.daysUntilBirthday ?? 0;
  const isToday = days === 0;
  const isSoon = days > 0 && days <= 7;

  return (
    <Link to={`/toystore/birthdays/${r.id}`}
      className={`block rounded-2xl bg-white border-2 shadow-sm p-4 hover:shadow-lg transition ${
        isToday ? 'border-rose-400 ring-2 ring-rose-200' :
        isSoon ? 'border-amber-300' : 'border-slate-200 hover:border-pink-300'}`}>
      <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 font-extrabold text-white text-lg ${
          isToday ? 'bg-rose-500' : isSoon ? 'bg-amber-500' : 'bg-pink-500'}`}>
          {isToday ? '🎉' : days}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-slate-900 text-lg">{r.childName}</h3>
            <span className="text-xs font-extrabold text-pink-700">turning {r.computed?.turningAge}</span>
            {r.childGender && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-extrabold uppercase">
                {r.childGender === 'BOYS' ? '👦' : r.childGender === 'GIRLS' ? '👧' : '⚧️'} {r.childGender}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 font-bold flex-wrap">
            <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {r.customerName}</span>
            <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {r.customerPhone}</span>
            {r.parentRelation && (<><span>•</span><span>{r.parentRelation}</span></>)}
          </div>

          {r.childInterests?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {r.childInterests.slice(0, 4).map((i: string) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[10px] font-extrabold">{i}</span>
              ))}
            </div>
          )}

          {r.lastGiftGiven && (
            <div className="mt-2 text-[11px] text-slate-500 font-semibold italic">
              Last gift: "{r.lastGiftGiven}"
            </div>
          )}
        </div>

        <div className="text-right shrink-0 flex flex-col items-end gap-2">
          <div>
            <div className={`text-xs font-extrabold uppercase ${
              isToday ? 'text-rose-700' : isSoon ? 'text-amber-700' : 'text-pink-700'}`}>
              {isToday ? '🎉 Today!' : days === 1 ? 'Tomorrow' : `${days} days`}
            </div>
            {r.budgetRange && <div className="text-[10px] font-bold text-slate-500 mt-0.5">Budget: {r.budgetRange}</div>}
          </div>
          {r.totalPurchases > 0 && (
            <div className="text-right">
              <div className="text-[10px] uppercase font-extrabold text-slate-500">Lifetime</div>
              <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(r.totalSpent)}</div>
              <div className="text-[10px] font-bold text-slate-500">{r.totalPurchases} orders</div>
            </div>
          )}
          <div className="flex gap-1.5">
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
              className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <ArrowRight className="h-4 w-4 text-slate-400 self-center" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function NewBirthdayModal({ onClose, onSaved }: any) {
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    childName: '',
    childBirthDate: '',
    childGender: 'UNISEX',
    parentRelation: '',
    budgetRange: '',
    childInterests: [] as string[],
    reminderDaysBefore: 7,
    notes: '',
  });
  const [interestInput, setInterestInput] = useState('');

  const save = useMutation({
    mutationFn: () => toyBirthdaysApi.create(form as any),
    onSuccess: () => {
      toast.success('Birthday reminder added');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const addInterest = () => {
    const t = interestInput.trim();
    if (t && !form.childInterests.includes(t)) {
      setForm({ ...form, childInterests: [...form.childInterests, t] });
      setInterestInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-pink-600 to-rose-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">🎂 New Birthday Reminder</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl bg-pink-50 border-2 border-pink-200 p-3 text-xs text-pink-900 font-semibold">
            💡 <strong>Repeat-customer magic:</strong> When you register a child's birthday, you can send reminders + gift suggestions to the parent before every birthday.
          </div>

          <div>
            <Lbl>Parent Name *</Lbl>
            <input autoFocus value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              placeholder="Parent's full name"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
          </div>
          <div>
            <Lbl>Parent Phone *</Lbl>
            <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
              placeholder="03XX XXXXXXX"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Child's Name *</Lbl>
              <input value={form.childName} onChange={(e) => setForm({ ...form, childName: e.target.value })}
                placeholder="Child's name"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <Lbl>Child's Birth Date *</Lbl>
              <input type="date" value={form.childBirthDate} onChange={(e) => setForm({ ...form, childBirthDate: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Child's Gender</Lbl>
              <select value={form.childGender} onChange={(e) => setForm({ ...form, childGender: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-pink-500">
                <option value="UNISEX">⚧️ Prefer not to say</option>
                <option value="BOYS">👦 Boy</option>
                <option value="GIRLS">👧 Girl</option>
              </select>
            </div>
            <div>
              <Lbl>Parent's Relation</Lbl>
              <input value={form.parentRelation} onChange={(e) => setForm({ ...form, parentRelation: e.target.value })}
                placeholder="Mother, Father, Aunt..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
            </div>
          </div>

          <div>
            <Lbl>Child's Interests</Lbl>
            <div className="flex gap-2 mb-2">
              <input value={interestInput} onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                placeholder="Add interest (dinosaurs, cars, dolls...)"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
              <button type="button" onClick={addInterest}
                className="h-11 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-sm">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {form.childInterests.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.childInterests.map((i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-100 text-violet-800 text-xs font-extrabold">
                    {i}
                    <button onClick={() => setForm({ ...form, childInterests: form.childInterests.filter((x) => x !== i) })}
                      className="hover:text-rose-700">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Lbl>Budget Range</Lbl>
              <input value={form.budgetRange} onChange={(e) => setForm({ ...form, budgetRange: e.target.value })}
                placeholder="e.g. 2000-5000"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <Lbl>Remind days before</Lbl>
              <input type="number" min="1" max="60" value={form.reminderDaysBefore}
                onChange={(e) => setForm({ ...form, reminderDaysBefore: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-pink-500" />
            </div>
          </div>

          <div>
            <Lbl>Notes</Lbl>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any special notes about the child or family..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-pink-500" />
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-pink-600 to-rose-700"
            onClick={() => save.mutate()} loading={save.isPending}
            disabled={!form.customerName.trim() || !form.customerPhone.trim() || !form.childName.trim() || !form.childBirthDate}>
            <Save className="h-4 w-4" /> Save Birthday
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    pink: 'from-pink-500 to-rose-700', amber: 'from-amber-500 to-orange-600',
    violet: 'from-violet-500 to-purple-700', emerald: 'from-emerald-500 to-emerald-700',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
