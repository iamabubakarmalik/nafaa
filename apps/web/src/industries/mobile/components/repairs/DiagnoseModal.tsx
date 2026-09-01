import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Stethoscope, CheckCircle2, Sparkles, AlertTriangle, Lightbulb, Calculator,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { toast } from 'sonner';
import { repairsApi } from '../../api/repairs.api';
import { formatPKR } from '@core/lib/format';

interface Props {
  ticketId: string;
  ticketNumber: string;
  initialEstimate?: number;
  initialDiagnosed?: string;
  initialNotes?: string;
  initialRecommendations?: string;
  onClose: () => void;
}

const QUICK_DIAGNOSES = [
  { label: 'LCD Damaged', parts: 3500, labor: 500 },
  { label: 'Battery Fail', parts: 1500, labor: 300 },
  { label: 'Charging Port Issue', parts: 500, labor: 800 },
  { label: 'Speaker Damaged', parts: 400, labor: 500 },
  { label: 'Water Damage', parts: 2000, labor: 1500 },
  { label: 'Software / IC Issue', parts: 0, labor: 1000 },
  { label: 'Camera Faulty', parts: 1800, labor: 700 },
  { label: 'Motherboard Fault', parts: 5000, labor: 2000 },
];

export function DiagnoseModal({
  ticketId, ticketNumber, initialEstimate,
  initialDiagnosed, initialNotes, initialRecommendations, onClose,
}: Props) {
  const queryClient = useQueryClient();
  const [diagnosedIssue, setDiagnosedIssue] = useState(initialDiagnosed || '');
  const [diagnosisNotes, setDiagnosisNotes] = useState(initialNotes || '');
  const [recommendedActions, setRecommendedActions] = useState(initialRecommendations || '');
  const [estimatedCost, setEstimatedCost] = useState(String(initialEstimate || ''));
  const [partsCost, setPartsCost] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [autoCalc, setAutoCalc] = useState(true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Auto-calc total when parts + labor changes
  useEffect(() => {
    if (autoCalc) {
      const total = (Number(partsCost) || 0) + (Number(laborCost) || 0);
      if (total > 0) setEstimatedCost(String(total));
    }
  }, [partsCost, laborCost, autoCalc]);

  const total = Number(estimatedCost) || 0;
  const parts = Number(partsCost) || 0;
  const labor = Number(laborCost) || 0;
  const mismatch = Math.abs(total - (parts + labor)) > 1 && parts + labor > 0;

  const applyQuick = (q: (typeof QUICK_DIAGNOSES)[number]) => {
    setDiagnosedIssue((prev) => (prev ? `${prev}\n${q.label}` : q.label));
    setPartsCost(String((Number(partsCost) || 0) + q.parts));
    setLaborCost(String((Number(laborCost) || 0) + q.labor));
    toast.success(`${q.label} lag gaya`);
  };

  const mutation = useMutation({
    mutationFn: () =>
      repairsApi.diagnose(ticketId, {
        diagnosedIssue: diagnosedIssue.trim(),
        diagnosisNotes: diagnosisNotes.trim() || undefined,
        recommendedActions: recommendedActions.trim() || undefined,
        estimatedCost: total,
        partsCost: parts,
        laborCost: labor,
      }),
    onSuccess: () => {
      toast.success(initialDiagnosed ? 'Diagnosis update ho gaya' : 'Diagnosis save ho gaya');
      queryClient.invalidateQueries({ queryKey: ['repair-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['repair-tickets'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const submit = () => {
    if (!diagnosedIssue.trim()) return toast.error('Diagnosis required');
    if (total <= 0) return toast.error('Estimate required');
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-indigo-700 dark:text-indigo-300 font-bold">
                {initialDiagnosed ? 'Edit Diagnosis' : 'New Diagnosis'}
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{ticketNumber}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center"
          >
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Quick suggestions */}
          <div>
            <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Quick Diagnosis Presets
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_DIAGNOSES.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => applyQuick(q)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 hover:bg-indigo-200 dark:hover:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-[10px] font-bold transition"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Diagnosed Issue * (Technical finding)
            </label>
            <textarea
              autoFocus
              rows={2}
              value={diagnosedIssue}
              onChange={(e) => setDiagnosedIssue(e.target.value)}
              placeholder="LCD damaged, IC issue, battery swollen..."
              className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Diagnosis Notes
            </label>
            <textarea
              rows={2}
              value={diagnosisNotes}
              onChange={(e) => setDiagnosisNotes(e.target.value)}
              placeholder="Additional technical details..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 items-center gap-1">
              <Lightbulb className="h-3 w-3 text-amber-500" /> Recommended Actions
            </label>
            <textarea
              rows={2}
              value={recommendedActions}
              onChange={(e) => setRecommendedActions(e.target.value)}
              placeholder="Screen replace, battery change, software flash..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCalc}
                onChange={(e) => setAutoCalc(e.target.checked)}
                className="rounded"
              />
              <Calculator className="h-3.5 w-3.5" /> Auto-calc total (parts + labor)
            </label>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <Input
              label="Parts Cost (PKR)"
              type="number"
              value={partsCost}
              onChange={(e) => setPartsCost(e.target.value)}
              placeholder="0"
            />
            <Input
              label="Labor Cost (PKR)"
              type="number"
              value={laborCost}
              onChange={(e) => setLaborCost(e.target.value)}
              placeholder="0"
            />
            <Input
              label="Total Estimate * (PKR)"
              type="number"
              value={estimatedCost}
              onChange={(e) => {
                setAutoCalc(false);
                setEstimatedCost(e.target.value);
              }}
              placeholder="5000"
            />
          </div>

          {mismatch && !autoCalc && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2 flex items-start gap-2 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-amber-900 dark:text-amber-200">
                Parts + Labor = <strong>{formatPKR(parts + labor)}</strong> but Total ={' '}
                <strong>{formatPKR(total)}</strong>. Farq: {formatPKR(Math.abs(total - (parts + labor)))}
              </div>
            </div>
          )}

          {total > 0 && (
            <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 border-2 border-indigo-200 dark:border-indigo-800 p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300">
                Estimate for Customer
              </div>
              <div className="text-3xl font-extrabold text-indigo-900 dark:text-indigo-100">
                {formatPKR(total)}
              </div>
              <div className="text-[10px] text-indigo-700 dark:text-indigo-300 mt-1">
                Parts {formatPKR(parts)} + Labor {formatPKR(labor)}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={submit}
            loading={mutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <CheckCircle2 className="h-4 w-4" /> Save Diagnosis
          </Button>
        </div>
      </div>
    </div>
  );
}
