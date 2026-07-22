import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Thermometer, Plus, Sparkles, RefreshCw, X, Save, MapPin,
  CheckCircle2, AlertTriangle, Droplets, TrendingDown, TrendingUp,
} from 'lucide-react';
import { temperatureApi } from '../api/temperature.api';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function TemperatureLogPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['temperature-logs'],
    queryFn: () => temperatureApi.list(),
    refetchInterval: 60_000,
  });

  const { data: summary } = useQuery({
    queryKey: ['temperature-summary'],
    queryFn: () => temperatureApi.summary(7),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Cold Chain
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🌡️ Temperature Log</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Refrigerator + freezer temperature monitoring</p>
          </div>
          <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Log Reading
          </Button>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5">
            <div className="text-xs uppercase font-extrabold text-slate-500">Compliance</div>
            <div className="text-3xl font-extrabold text-emerald-700 tabular-nums mt-1">{summary.compliancePct?.toFixed(1)}%</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">Last 7 days</div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5">
            <div className="text-xs uppercase font-extrabold text-slate-500">Total Readings</div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums mt-1">{summary.total}</div>
          </div>
          <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-rose-200 dark:border-rose-800 p-5">
            <div className="text-xs uppercase font-extrabold text-rose-700">Breaches</div>
            <div className="text-3xl font-extrabold text-rose-700 tabular-nums mt-1">{summary.breaches}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">Out-of-range readings</div>
          </div>
        </section>
      )}

      {showForm && (
        <TempLogForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['temperature-logs'] }); queryClient.invalidateQueries({ queryKey: ['temperature-summary'] }); }}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : (
        <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-3 flex items-center gap-3">
                <div className={
                  'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white ' +
                  (log.isWithinRange ? 'bg-emerald-500' : 'bg-rose-500')
                }>
                  {log.isWithinRange ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{log.temperature}°</span>
                    {log.humidity !== undefined && log.humidity !== null && (
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-blue-700">
                        <Droplets className="h-3.5 w-3.5" />
                        {log.humidity}%
                      </span>
                    )}
                    {log.location && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-bold">
                        <MapPin className="h-3 w-3" />
                        {log.location}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold">
                    {format(new Date(log.logDate), 'dd MMM yyyy, HH:mm')}
                    {log.minLimit !== undefined && log.maxLimit !== undefined && ' • Range: ' + log.minLimit + '° to ' + log.maxLimit + '°'}
                  </div>
                  {log.notes && <div className="text-xs italic text-amber-700 mt-0.5">{log.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TempLogForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState({
    temperature: '',
    humidity: '',
    location: 'Fridge 1',
    minLimit: 2,
    maxLimit: 8,
    notes: '',
  });

  const saveMutation = useMutation({
    mutationFn: () => temperatureApi.create({
      temperature: Number(form.temperature),
      humidity: form.humidity ? Number(form.humidity) : undefined,
      location: form.location,
      minLimit: Number(form.minLimit),
      maxLimit: Number(form.maxLimit),
      notes: form.notes || undefined,
    }),
    onSuccess: () => { toast.success('Reading logged'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-neutral-800 bg-blue-50 dark:bg-blue-950/30 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 dark:text-white">Log Temperature Reading</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-1 block">Temperature (°C) *</label>
            <input type="number" step="0.1" autoFocus value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} placeholder="5.5" className="h-14 w-full rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Humidity (%)</label>
            <input type="number" step="0.1" value={form.humidity} onChange={(e) => setForm({ ...form, humidity: e.target.value })} placeholder="Optional" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Location</label>
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Fridge 1 / Freezer / Storage Room" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Min °C</label>
              <input type="number" step="0.1" value={form.minLimit} onChange={(e) => setForm({ ...form, minLimit: Number(e.target.value) })} className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Max °C</label>
              <input type="number" step="0.1" value={form.maxLimit} onChange={(e) => setForm({ ...form, maxLimit: Number(e.target.value) })} className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums" />
            </div>
          </div>
          <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes (if breach — action taken)" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.temperature}>
              <Save className="h-4 w-4" />
              Log Reading
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
