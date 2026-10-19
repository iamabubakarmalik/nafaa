/**
 * Hands a finished vehicle back from the counter: takes what is left, closes
 * the job and posts its bill (sales, cash register, khata) in one step, the
 * same as "Gaari dein" on the job's own page.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@core/stores/auth.store';
import { workshopJobsApi, type DeliverInput, type WorkshopJob } from '../api/workshop-jobs.api';
import { DeliverJobModal } from '../components/DeliverJobModal';
import { JOB_KEY, MONEY_KEYS, REMINDER_KEY, VEHICLE_KEY, apiError } from '../components/meta';
import { printJobCard } from '../components/slips';

export function JobHandover({ job, onClose }: { job: WorkshopJob; onClose: () => void }) {
  const qc = useQueryClient();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const deliver = useMutation({
    mutationFn: (v: DeliverInput) => workshopJobsApi.deliver(job.id, v),
    onSuccess: (r) => {
      toast.success(r.sale ? `${job.jobNumber} — gaari de di, bill ${r.sale.saleNumber}` : `${job.jobNumber} — gaari de di`, {
        action: { label: 'Print', onClick: () => printJobCard(r, shopName) },
      });
      [JOB_KEY, VEHICLE_KEY, REMINDER_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Gaari wapas nahi hui')),
  });
  return <DeliverJobModal job={job} pending={deliver.isPending} onClose={onClose} onConfirm={(v) => { if (!deliver.isPending) deliver.mutate(v); }} />;
}
