import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Stethoscope, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { repairsApi } from '../api/repairs.api';

interface Props {
  ticketId: string;
  ticketNumber: string;
  initialEstimate?: number;
  onClose: () => void;
}

export function DiagnoseModal({ ticketId, ticketNumber, initialEstimate, onClose }: Props) {
  const queryClient = useQueryClient();
  const [diagnosedIssue, setDiagnosedIssue] = useState('');
  const [diagnosisNotes, setDiagnosisNotes] = useState('');
  const [recommendedActions, setRecommendedActions] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(String(initialEstimate || ''));
  const [partsCost, setPartsCost] = useState('');
  const [laborCost, setLaborCost] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      repairsApi.diagnose(ticketId, {
        diagnosedIssue: diagnosedIssue.trim(),
        diagnosisNotes: diagnosisNotes.trim() || undefined,
        recommendedActions: recommendedActions.trim() || undefined,
        estimatedCost: Number(estimatedCost) || 0,
        partsCost: Number(partsCost) || 0,
        laborCost: Number(laborCost) || 0,
      }),
    onSuccess: () => {
      toast.success('Diagnosis added');
      queryClient.invalidateQueries({ queryKey: ['repair-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['repair-tickets'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 bg-indigo-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-indigo-700 font-bold">Diagnosis</div>
              <h3 className="font-bold text-slate-900">{ticketNumber}</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Diagnosed Issue * (Technical finding)
            </label>
            <textarea
              autoFocus
              rows={2}
              value={diagnosedIssue}
              onChange={(e) => setDiagnosedIssue(e.target.value)}
              placeholder="LCD damaged, IC issue, battery swollen..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Diagnosis Notes
            </label>
            <textarea
              rows={2}
              value={diagnosisNotes}
              onChange={(e) => setDiagnosisNotes(e.target.value)}
              placeholder="Additional technical details..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Recommended Actions
            </label>
            <textarea
              rows={2}
              value={recommendedActions}
              onChange={(e) => setRecommendedActions(e.target.value)}
              placeholder="Replace screen, change battery, software flash..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
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
              onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="5000"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!diagnosedIssue.trim()) return toast.error('Diagnosis required');
              if (!estimatedCost || Number(estimatedCost) <= 0) return toast.error('Estimate required');
              mutation.mutate();
            }}
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
