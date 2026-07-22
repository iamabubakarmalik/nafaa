import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChefHat, Plus, X, Save, RefreshCw, Sparkles, Clock, User, Package,
  Play, CheckCircle2, Flame, Thermometer, Trash2, ArrowRight, Award,
} from 'lucide-react';
import { productionApi, type ProductionPlan } from '../api/production.api';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  PLANNED: 'bg-slate-500', IN_PROGRESS: 'bg-blue-500', BAKING: 'bg-orange-500',
  COOLING: 'bg-cyan-500', DECORATING: 'bg-fuchsia-500', QUALITY_CHECK: 'bg-violet-500',
  COMPLETED: 'bg-emerald-600', FAILED: 'bg-rose-500', ON_HOLD: 'bg-amber-500',
};

export default function ProductionPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [showForm, setShowForm] = useState(false);

  const { data: plans = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['production-plans', statusFilter],
    queryFn: () => productionApi.listPlans({ status: statusFilter === 'all' || statusFilter === 'active' ? undefined : statusFilter }),
  });

  const filtered = statusFilter === 'active'
    ? plans.filter((p) => ['PLANNED', 'IN_PROGRESS', 'BAKING', 'DECORATING'].includes(p.status))
    : plans;

  const startMutation = useMutation({
    mutationFn: (id: string) => productionApi.startPlan(id),
    onSuccess: () => { toast.success('Plan started'); queryClient.invalidateQueries({ queryKey: ['production-plans'] }); },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => productionApi.completePlan(id),
    onSuccess: () => { toast.success('Plan completed'); queryClient.invalidateQueries({ queryKey: ['production-plans'] }); },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <ChefHat className="h-3.5 w-3.5 text-amber-300" />
              Kitchen Workflow
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">👨‍🍳 Production Planning</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Daily baking plans, oven tracking, batch numbers</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              New Plan
            </Button>
          </div>
        </div>
      </section>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {['active', 'all', 'PLANNED', 'IN_PROGRESS', 'BAKING', 'COMPLETED'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (statusFilter === s ? 'bg-orange-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>{s === 'active' ? '🔥 Active' : s === 'all' ? 'All' : s.replace('_', ' ')}</button>
        ))}
      </div>

      {showForm && (
        <PlanForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['production-plans'] }); }} />
      )}

      {isLoading ? (
        <div className="grid gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <ChefHat className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No production plans</p>
        </div>
      ) : (
        <section className="grid gap-3">
          {filtered.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onStart={() => startMutation.mutate(plan.id)}
              onComplete={() => completeMutation.mutate(plan.id)}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['production-plans'] })}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function PlanCard({ plan, onStart, onComplete, onRefresh }: any) {
  const [expanded, setExpanded] = useState(false);
  const isActive = ['IN_PROGRESS', 'BAKING', 'DECORATING'].includes(plan.status);
  const completedPct = plan.totalItems > 0 ? (plan.completedItems / plan.totalItems) * 100 : 0;

  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shadow">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-slate-900 dark:text-white">{plan.planNumber}</span>
                <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + STATUS_COLORS[plan.status]}>{plan.status.replace('_', ' ')}</span>
                {plan.shift && <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 text-[9px] font-extrabold uppercase">{plan.shift}</span>}
              </div>
              <div className="mt-1 text-xs font-bold text-slate-600 inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(plan.planDate), 'dd MMM yyyy')}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {plan.status === 'PLANNED' && (
              <Button size="sm" onClick={onStart} className="bg-gradient-to-r from-blue-600 to-cyan-700">
                <Play className="h-3.5 w-3.5" />
                Start
              </Button>
            )}
            {isActive && (
              <Button size="sm" onClick={onComplete} className="bg-gradient-to-r from-emerald-600 to-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Complete
              </Button>
            )}
            <button onClick={() => setExpanded(!expanded)} className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
              <ArrowRight className={'h-4 w-4 transition-transform ' + (expanded ? 'rotate-90' : '')} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="rounded-lg bg-slate-50 dark:bg-neutral-800/50 p-2 text-center">
            <div className="text-[9px] uppercase font-extrabold text-slate-500">Total</div>
            <div className="text-lg font-extrabold tabular-nums">{plan.totalItems}</div>
          </div>
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 text-center">
            <div className="text-[9px] uppercase font-extrabold text-emerald-700">Done</div>
            <div className="text-lg font-extrabold text-emerald-800 tabular-nums">{plan.completedItems}</div>
          </div>
          <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 p-2 text-center">
            <div className="text-[9px] uppercase font-extrabold text-rose-700">Failed</div>
            <div className="text-lg font-extrabold text-rose-800 tabular-nums">{plan.failedItems}</div>
          </div>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2 text-center">
            <div className="text-[9px] uppercase font-extrabold text-blue-700">Progress</div>
            <div className="text-lg font-extrabold text-blue-800 tabular-nums">{completedPct.toFixed(0)}%</div>
          </div>
        </div>

        <div className="h-2 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-500 to-emerald-600" style={{ width: completedPct + '%' }} />
        </div>
      </div>

      {expanded && plan.items?.length > 0 && (
        <div className="border-t border-slate-100 dark:border-neutral-800 divide-y divide-slate-100 dark:divide-neutral-800">
          {plan.items.map((item: any) => (
            <ProductionItemRow key={item.id} item={item} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductionItemRow({ item, onRefresh }: any) {
  const [showComplete, setShowComplete] = useState(false);

  const startMutation = useMutation({
    mutationFn: () => productionApi.startBaking(item.id, {}),
    onSuccess: () => { toast.success('Baking started'); onRefresh(); },
  });

  return (
    <div className="p-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-sm text-slate-900 dark:text-white">{item.productName}</span>
            <span className={'px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase text-white ' + STATUS_COLORS[item.status]}>
              {item.status.replace('_', ' ')}
            </span>
            {item.batchNumber && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-mono font-bold">#{item.batchNumber}</span>}
            {item.ovenNumber && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold">🔥 Oven {item.ovenNumber}</span>}
          </div>
          {item.bakerName && (
            <div className="text-xs text-slate-500 font-bold mt-0.5">
              <User className="h-3 w-3 inline mr-0.5" />
              {item.bakerName}
            </div>
          )}
          {item.bakingTempC && (
            <div className="text-xs text-slate-500 font-bold">
              <Thermometer className="h-3 w-3 inline mr-0.5" />
              {item.bakingTempC}°C
              {item.bakingDurationMin && ' • ' + item.bakingDurationMin + 'min'}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs font-bold">
            <span className="text-slate-500">Planned:</span> <span className="font-extrabold">{item.plannedQty}</span>
          </div>
          {item.producedQty > 0 && (
            <div className="text-xs font-bold text-emerald-700">
              <span className="text-slate-500">Made:</span> {item.producedQty}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {item.status === 'PLANNED' && (
            <Button size="sm" onClick={() => startMutation.mutate()} className="bg-gradient-to-r from-orange-600 to-amber-700">
              <Flame className="h-3 w-3" />
              Start
            </Button>
          )}
          {['BAKING', 'IN_PROGRESS'].includes(item.status) && (
            <Button size="sm" onClick={() => setShowComplete(true)} className="bg-gradient-to-r from-emerald-600 to-green-700">
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </Button>
          )}
        </div>
      </div>

      {showComplete && (
        <CompleteItemModal item={item} onClose={() => setShowComplete(false)} onDone={() => { setShowComplete(false); onRefresh(); }} />
      )}
    </div>
  );
}

function CompleteItemModal({ item, onClose, onDone }: any) {
  const [producedQty, setProducedQty] = useState(item.plannedQty);
  const [failedQty, setFailedQty] = useState(0);
  const [qualityGrade, setQualityGrade] = useState('A');
  const [qualityNotes, setQualityNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () => productionApi.completeItem(item.id, { producedQty, failedQty, qualityGrade, qualityNotes }),
    onSuccess: () => { toast.success('Item completed'); onDone(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
          <h3 className="font-extrabold">Complete Production</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Produced Qty *</label>
              <input type="number" min="0" value={producedQty} onChange={(e) => setProducedQty(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-rose-700 mb-1 block">Failed Qty</label>
              <input type="number" min="0" value={failedQty} onChange={(e) => setFailedQty(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-rose-300 bg-rose-50 dark:bg-rose-950/30 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-rose-500" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Quality Grade</label>
            <div className="grid grid-cols-4 gap-2">
              {['A+', 'A', 'B', 'C'].map((g) => (
                <button key={g} onClick={() => setQualityGrade(g)} className={
                  'py-2 rounded-lg text-sm font-extrabold border-2 ' +
                  (qualityGrade === g ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600')
                }>{g}</button>
              ))}
            </div>
          </div>
          <textarea rows={2} value={qualityNotes} onChange={(e) => setQualityNotes(e.target.value)} placeholder="Quality notes..." className="w-full rounded-xl border-2 border-slate-200 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700" onClick={() => mutation.mutate()} loading={mutation.isPending}>
              <Save className="h-4 w-4" />
              Complete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    planDate: new Date().toISOString().split('T')[0],
    shift: 'MORNING',
    notes: '',
    items: [{ productName: '', plannedQty: 1, bakerName: '', batchNumber: '', ovenNumber: '' }],
  });

  const addItem = () => setForm({ ...form, items: [...form.items, { productName: '', plannedQty: 1, bakerName: '', batchNumber: '', ovenNumber: '' }] });
  const removeItem = (i: number) => setForm({ ...form, items: form.items.filter((_: any, idx: number) => idx !== i) });
  const updateItem = (i: number, patch: any) => setForm({ ...form, items: form.items.map((it: any, idx: number) => idx === i ? { ...it, ...patch } : it) });

  const saveMutation = useMutation({
    mutationFn: () => productionApi.createPlan({
      ...form,
      items: form.items.filter((it: any) => it.productName && Number(it.plannedQty) > 0),
    }),
    onSuccess: () => { toast.success('Plan created'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-orange-300 dark:border-orange-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-orange-50 dark:bg-orange-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">New Production Plan</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Plan Date *</label>
            <input type="date" value={form.planDate} onChange={(e) => setForm({ ...form, planDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Shift</label>
            <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500">
              <option>MORNING</option><option>AFTERNOON</option><option>EVENING</option><option>NIGHT</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 dark:bg-neutral-800/50 flex items-center justify-between">
            <span className="text-sm font-extrabold">Items ({form.items.length})</span>
            <Button size="sm" onClick={addItem} className="bg-gradient-to-r from-orange-600 to-amber-700">
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
          <div className="p-3 space-y-2">
            {form.items.map((item: any, i: number) => (
              <div key={i} className="rounded-lg border-2 border-slate-200 dark:border-neutral-700 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold text-slate-600">Item #{i + 1}</span>
                  {form.items.length > 1 && (
                    <button onClick={() => removeItem(i)} className="h-6 w-6 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <input value={item.productName} onChange={(e) => updateItem(i, { productName: e.target.value })} placeholder="Product name" className="col-span-2 h-10 rounded-lg border-2 border-slate-200 bg-white dark:bg-neutral-800 px-2 text-sm font-bold focus:outline-none focus:border-orange-500" />
                  <input type="number" min="1" value={item.plannedQty} onChange={(e) => updateItem(i, { plannedQty: Number(e.target.value) })} placeholder="Qty" className="h-10 rounded-lg border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/30 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-blue-500" />
                  <input value={item.batchNumber} onChange={(e) => updateItem(i, { batchNumber: e.target.value })} placeholder="Batch #" className="h-10 rounded-lg border-2 border-slate-200 bg-white dark:bg-neutral-800 px-2 text-sm font-mono font-bold focus:outline-none focus:border-orange-500" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={item.bakerName} onChange={(e) => updateItem(i, { bakerName: e.target.value })} placeholder="Baker name" className="h-9 rounded-lg border border-slate-200 bg-white dark:bg-neutral-800 px-2 text-xs font-bold focus:outline-none focus:border-orange-500" />
                  <input value={item.ovenNumber} onChange={(e) => updateItem(i, { ovenNumber: e.target.value })} placeholder="Oven #" className="h-9 rounded-lg border border-slate-200 bg-white dark:bg-neutral-800 px-2 text-xs font-bold focus:outline-none focus:border-orange-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." className="w-full rounded-xl border-2 border-slate-200 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-orange-500 resize-none" />

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-orange-600 to-amber-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
            <Save className="h-4 w-4" />
            Create Plan
          </Button>
        </div>
      </div>
    </section>
  );
}
