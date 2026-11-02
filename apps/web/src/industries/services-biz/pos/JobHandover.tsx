/**
 * Bills a finished job from the counter: takes what is left (split too),
 * closes the job and posts its bill (sales, cash register, khata) in one
 * step, the same as "Bill banayein" on the job's own page.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { jobsApi, type BillInput, type ServiceJob } from '../api/jobs.api';
import { BillJobModal } from '../components/BillJobModal';
import { printJobCard } from '../components/slips';
import { JOB_KEY, MONEY_KEYS, apiError } from '../components/meta';
import { t } from '@core/i18n';

export function JobHandover({ job, onClose }: { job: ServiceJob; onClose: () => void }) {
  const qc = useQueryClient();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const detail = useQuery({ queryKey: [JOB_KEY, 'one', job.id], queryFn: () => jobsApi.getOne(job.id), staleTime: 10_000 });
  const bill = useMutation({
    mutationFn: (v: BillInput) => jobsApi.bill(job.id, v),
    onSuccess: (r) => {
      toast.success(r.sale ? t('{{jobNumber}} — bill {{saleNumber}}{{value}}', { jobNumber: job.jobNumber, saleNumber: r.sale.saleNumber, value: r.change > 0 ? t(' · {{change}} wapas dein', { change: formatPKR(r.change) }) : '' }) : `${job.jobNumber} mukammal`, {
        action: { label: t('Print'), onClick: () => printJobCard(r, shopName) },
      });
      [JOB_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => toast.error(apiError(e, t('Bill nahi bana'))),
  });
  if (detail.isLoading) return null;
  return <BillJobModal job={detail.data ?? job} pending={bill.isPending} onClose={onClose} onConfirm={(v) => { if (!bill.isPending) bill.mutate(v); }} />;
}
