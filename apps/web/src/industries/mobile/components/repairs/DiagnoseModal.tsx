/**
 * The technician's finding: what is wrong, what will be done, the labour and
 * the estimate to tell the customer. Parts are added on the job one by one;
 * until then the estimate is the bill.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Input, Modal, Textarea } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { repairsApi, type RepairTicket } from '../../api/repairs.api';
import { REPAIR_KEY, apiError, money } from '../meta';
import { t } from '@core/i18n';

const COMMON = ['Screen / LCD', 'Battery', 'Charging port', 'Speaker', 'Mic', 'Camera', 'Paani laga', 'Software / dead', 'Board', 'Back glass', 'Button'];

export function DiagnoseModal({ ticket, onClose }: { ticket: RepairTicket; onClose: () => void }) {
  const qc = useQueryClient();
  const [issue, setIssue] = useState(ticket.diagnosedIssue ?? '');
  const [notes, setNotes] = useState(ticket.diagnosisNotes ?? '');
  const [plan, setPlan] = useState(ticket.recommendedActions ?? '');
  const [labour, setLabour] = useState(ticket.laborCost ? String(ticket.laborCost) : '');
  const [estimate, setEstimate] = useState(ticket.estimatedCost ? String(ticket.estimatedCost) : '');
  const partsOnJob = (ticket.parts ?? []).reduce((s, p) => s + Number(p.totalPrice || 0), 0);
  const paid = Number(ticket.paidAmount) || 0;
  const problem = !issue.trim() ? t('Kharabi likhein') : !(Number(estimate) > 0) ? t('Andaza likhein') : Number(estimate) + 0.01 < paid ? t('{{paid}} advance mil chuka — andaza is se kam nahi', { paid: formatPKR(paid) }) : null;

  const save = useMutation({
    mutationFn: () => repairsApi.diagnose(ticket.id, {
      diagnosedIssue: issue.trim(), diagnosisNotes: notes.trim() || undefined, recommendedActions: plan.trim() || undefined,
      estimatedCost: Number(estimate) || 0, laborCost: Number(labour) || 0,
    }),
    onSuccess: () => { toast.success(t('Check save ho gaya — customer ko andaza batayein')); qc.invalidateQueries({ queryKey: [REPAIR_KEY] }); onClose(); },
    onError: (e) => toast.error(apiError(e, t('Save nahi hua'))),
  });

  return (
    <Modal open onClose={onClose} size="md" title={t('Check — {{ticketNumber}}', { ticketNumber: ticket.ticketNumber })} description={t('Customer ne kaha: {{reportedIssue}}', { reportedIssue: ticket.reportedIssue })}
      footer={<>
        {problem && issue && <span className="me-auto text-[0.8125rem] text-amber-800">{problem}</span>}
        <Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button onClick={() => save.mutate()} disabled={!!problem} loading={save.isPending}>{t('Save karein')}</Button>
      </>}>
      <div className="space-y-3">
        <div>
          <Input label={t('Asal kharabi')} required value={issue} onChange={(e) => setIssue(e.target.value)} placeholder={t('LCD toota, touch nahi chal raha')} autoFocus />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {COMMON.map((c) => <button key={c} type="button" onClick={() => setIssue((x) => (x ? `${x}, ${c}` : c))} className="h-7 rounded-lg bg-slate-100 px-2 text-[0.75rem] font-medium text-slate-700 hover:bg-slate-200">{c}</button>)}
          </div>
        </div>
        <Textarea label={t('Kya karna hai')} rows={2} value={plan} onChange={(e) => setPlan(e.target.value)} placeholder={t('Screen badalni hai, 2 ghante')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('Mazdoori')} inputMode="decimal" value={labour} onChange={(e) => setLabour(money(e.target.value))} hint={t('Parts alag se jodein')} />
          <Input label={t('Customer ko andaza')} required inputMode="decimal" value={estimate} onChange={(e) => setEstimate(money(e.target.value))}
            hint={partsOnJob ? t('Parts {{partsOnJob}} + mazdoori = {{formatPKR}}', { partsOnJob: formatPKR(partsOnJob), formatPKR: formatPKR(partsOnJob + (Number(labour) || 0)) }) : t('Parts + mazdoori')} />
        </div>
        <Textarea label={t('Andar ka note')} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} hint={t('Sirf dukaan ke liye — parchi par nahi aata')} />
      </div>
    </Modal>
  );
}
