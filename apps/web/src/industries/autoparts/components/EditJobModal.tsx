/** Changes a job card while the vehicle is in the workshop: findings, mechanic, promised time, meter, discount and notes. */

import { useState } from 'react';
import { Button, Input, Modal, Select, Textarea } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import type { MechanicProfile } from '../api/mechanics.api';
import type { JobPriority, JobType, JobUpdateInput, WorkshopJob } from '../api/workshop-jobs.api';
import { JOB_TYPES, PRIORITIES, digits, jobTypeOf, localInput, money, priorityOf } from './meta';
import { t as tr } from '@core/i18n';

export function EditJobModal({ job, mechanics, pending, onSave, onClose }: {
  job: WorkshopJob;
  mechanics: MechanicProfile[];
  pending: boolean;
  onSave: (v: JobUpdateInput) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({
    complaint: job.customerComplaint ?? '', diagnosis: job.diagnosis ?? '', recommendations: job.recommendations ?? '',
    mechanicId: job.primaryMechanicId ?? '', promisedAt: job.promisedAt ? localInput(new Date(job.promisedAt)) : '', odometer: job.odometerKm ? String(job.odometerKm) : '',
    priority: job.priority, jobType: job.jobType, discount: job.discount ? String(job.discount) : '', name: job.customerName ?? '', phone: job.customerPhone ?? '',
    notes: job.internalNotes ?? '',
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const gross = Number(job.subtotal) + Number(job.taxAmount || 0);
  const disc = Number(f.discount) || 0;
  const problems = [
    disc > gross ? tr('Discount bill ({{formatPKR}}) se zyada nahi ho sakta', { formatPKR: formatPKR(gross) }) : '',
    f.phone && digits(f.phone).length < 10 ? tr('Phone number poora likhein') : '',
  ].filter(Boolean);

  const submit = () => {
    if (problems.length || pending) return;
    onSave({
      customerComplaint: f.complaint, diagnosis: f.diagnosis, recommendations: f.recommendations, primaryMechanicId: f.mechanicId,
      promisedAt: f.promisedAt ? new Date(f.promisedAt).toISOString() : '', odometerKm: f.odometer ? Number(f.odometer) : undefined,
      priority: f.priority, jobType: f.jobType, discount: disc, customerName: f.name, customerPhone: f.phone, internalNotes: f.notes,
    });
  };

  return (
    <Modal open onClose={onClose} size="lg" title={tr('Job badlein — {{jobNumber}}', { jobNumber: job.jobNumber })}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button>
        <Button onClick={submit} disabled={problems.length > 0} loading={pending}>{tr('Save')}</Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Textarea label={tr('Shikayat')} rows={2} value={f.complaint} onChange={(e) => set({ complaint: e.target.value })} />
          <Textarea label={tr('Check me kya nikla')} rows={2} value={f.diagnosis} onChange={(e) => set({ diagnosis: e.target.value })} placeholder={tr('Mechanic ne kya dekha')} />
        </div>
        <Textarea label={tr('Customer ke liye mashwara')} rows={2} value={f.recommendations} onChange={(e) => set({ recommendations: e.target.value })} placeholder={tr('Agli dafa tyre badal lein…')} hint={tr('Parchi par nahi, WhatsApp me bata sakte hain')} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label={tr('Mechanic')} value={f.mechanicId} onChange={(e) => set({ mechanicId: e.target.value })} placeholder={tr('Koi nahi')}
            options={mechanics.map((m) => ({ value: m.id, label: m.staff?.fullName ?? tr('Mechanic') }))} />
          <Select label={tr('Kaam')} value={f.jobType} onChange={(e) => set({ jobType: e.target.value as JobType })} options={JOB_TYPES.map((t) => ({ value: t, label: jobTypeOf(t) }))} />
          <Select label={tr('Jaldi')} value={f.priority} onChange={(e) => set({ priority: e.target.value as JobPriority })} options={PRIORITIES.map((p) => ({ value: p, label: priorityOf(p).label }))} />
          <Input label={tr('Gaari kab deni hai')} type="datetime-local" value={f.promisedAt} onChange={(e) => set({ promisedAt: e.target.value })} />
          <Input label={tr('Meter (km)')} inputMode="numeric" value={f.odometer} onChange={(e) => set({ odometer: digits(e.target.value) })} />
          <Input label={tr('Discount (Rs)')} inputMode="decimal" value={f.discount} onChange={(e) => set({ discount: money(e.target.value) })} placeholder="0"
            error={disc > gross ? tr('Bill se zyada') : undefined} hint={tr('Bill {{gross}}', { gross: formatPKR(gross) })} />
          <Input label={tr('Customer ka naam')} value={f.name} onChange={(e) => set({ name: e.target.value })} />
          <Input label={tr('Phone')} inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} error={f.phone && digits(f.phone).length < 10 ? tr('Poora likhein') : undefined} />
          <Input label={tr('Andar ka note')} value={f.notes} onChange={(e) => set({ notes: e.target.value })} hint={tr('Sirf staff ke liye')} />
        </div>
      </form>
    </Modal>
  );
}
