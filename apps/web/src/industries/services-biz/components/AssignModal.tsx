/**
 * Gives a job to a technician (and helpers). Technicians on duty with the
 * job's skill and area come first, with how many jobs each already has.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, UserCheck } from 'lucide-react';
import { Button, Checkbox, Modal, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { dispatchApi } from '../api/dispatch.api';
import { techniciansApi } from '../api/technicians.api';
import { TECH_KEY, levelOf, techStatusOf } from './meta';

export function AssignModal({ jobId, jobNumber, current, assistants = [], pending, onAssign, onClose }: {
  jobId: string;
  jobNumber: string;
  /** Staff id of the technician on the job now. */
  current?: string | null;
  assistants?: string[];
  pending: boolean;
  onAssign: (primaryId: string, assistantIds: string[]) => void;
  onClose: () => void;
}) {
  const techQ = useQuery({ queryKey: [TECH_KEY], queryFn: () => techniciansApi.list(), staleTime: 60_000 });
  const suggestQ = useQuery({ queryKey: [TECH_KEY, 'suggest', jobId], queryFn: () => dispatchApi.suggest(jobId), staleTime: 30_000 });
  const [primary, setPrimary] = useState(current ?? '');
  const [helpers, setHelpers] = useState<string[]>(assistants);
  const score = new Map((suggestQ.data ?? []).map((s) => [s.staffId, s]));
  const list = [...(techQ.data ?? [])].sort((a, b) => (score.get(b.staffId)?.matchScore ?? -1) - (score.get(a.staffId)?.matchScore ?? -1));

  return (
    <Modal open onClose={onClose} size="md" title={`Technician lagayein — ${jobNumber}`} description="Upar wale is kaam ke liye behtar hain (duty par, hunar, area)"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button disabled={!primary} loading={pending} leftIcon={<UserCheck className="h-4 w-4" />} onClick={() => primary && onAssign(primary, helpers.filter((h) => h !== primary))}>Lagayein</Button>
      </>}>
      {techQ.isLoading ? <Skeleton className="h-48 rounded-xl" /> : !list.length ? (
        <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-[0.875rem] text-slate-600">Abhi koi technician nahi — Technicians page par staff ko technician banayein.</p>
      ) : (
        <ul className="max-h-[26rem] divide-y divide-slate-100 overflow-auto rounded-xl ring-1 ring-slate-200">
          {list.map((t) => {
            const s = score.get(t.staffId);
            const st = techStatusOf(t.status);
            const on = primary === t.staffId;
            return (
              <li key={t.id} className={cn('flex items-center gap-3 px-3 py-2.5', on && 'bg-brand-50')}>
                <button type="button" onClick={() => setPrimary(t.staffId)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-pressed={on}>
                  <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-2', on ? 'bg-brand-600 ring-brand-600' : 'ring-slate-300')}>{on && <span className="h-2 w-2 rounded-full bg-white" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">{t.staff?.fullName ?? 'Technician'}</span>
                    <span className="block truncate text-[0.75rem] text-slate-500">
                      {[levelOf(t.level), `${t.openJobs ?? 0} jobs haath me`, t.avgRating ? `★ ${t.avgRating.toFixed(1)}` : null].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  {s && s.matchScore > 0 && <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-emerald-700"><Star className="h-3 w-3" />Behtar</span>}
                  <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}>{st.label}</span>
                </button>
                {!on && (
                  <Checkbox aria-label="Helper" label="Helper" checked={helpers.includes(t.staffId)}
                    onChange={(e) => setHelpers(e.target.checked ? [...helpers, t.staffId] : helpers.filter((h) => h !== t.staffId))} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
