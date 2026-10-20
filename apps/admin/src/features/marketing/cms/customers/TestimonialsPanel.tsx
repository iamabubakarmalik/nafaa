/**
 * Testimonials of one customer: add/edit, publish (needs QUOTE consent and a
 * public customer), unpublish and delete.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Quote } from 'lucide-react';
import { TESTIMONIAL_SOURCE_TYPES, createTestimonialBodySchema, type AdminCustomer, type AdminTestimonial, type TestimonialSourceType } from '../contract/cms-contract';
import { errorIssues, errorMessage, formatPkt, pktDateInput, zodFieldErrors, type FieldErrors } from '../dashboard/shared/cms-http';
import { CmsStatusBadge, Chip, Field, IssueList, Spinner, btn, inputCls, selectCls } from '../dashboard/shared/ui';
import { MediaPicker } from '../media/MediaPicker';
import { testimonialsApi } from './customers.api';

const SOURCE_LABELS: Record<TestimonialSourceType, string> = {
  DIRECT: 'Seedha customer se',
  GOOGLE: 'Google review',
  PLAY_STORE: 'Play Store',
  G2: 'G2',
  CAPTERRA: 'Capterra',
  OTHER: 'Kuch aur',
};

export function TestimonialsPanel({ customer }: { customer: AdminCustomer }) {
  const [editing, setEditing] = useState<AdminTestimonial | 'new' | null>(null);
  const list = useQuery({ queryKey: ['cms-testimonials', customer.id], queryFn: () => testimonialsApi.list({ customerId: customer.id, limit: 100 }) });
  const canPublish = customer.consentScope.includes('QUOTE') && customer.isPublic;

  if (editing) return <TestimonialForm customer={customer} testimonial={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />;

  return (
    <div className="space-y-3">
      {!canPublish && (
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          Publish ke liye customer ki "Quote" ijazat aur "Site par dikhayein" dono zaroori hain. Draft abhi bhi save ho sakta hai.
        </p>
      )}
      <button className={btn.secondary} onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Naya testimonial</button>
      {list.isLoading ? (
        <Spinner />
      ) : !list.data?.items.length ? (
        <p className="text-sm text-neutral-500">Abhi koi testimonial nahi.</p>
      ) : (
        <ul className="space-y-2">
          {list.data.items.map((t) => (
            <li key={t.id}>
              <button className="w-full rounded-xl border border-neutral-200 p-3 text-left hover:border-emerald-300" onClick={() => setEditing(t)}>
                <p className="flex gap-2 text-sm text-neutral-800"><Quote className="h-4 w-4 shrink-0 text-neutral-300" /> <span className="line-clamp-3">{t.quote}</span></p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span>{t.personName}{t.personRole ? `, ${t.personRole}` : ''}</span>
                  <Chip>{SOURCE_LABELS[t.sourceType]}</Chip>
                  <CmsStatusBadge status={t.status} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TestimonialForm({ customer, testimonial, onDone }: { customer: AdminCustomer; testimonial: AdminTestimonial | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    personName: testimonial?.personName ?? '',
    personRole: testimonial?.personRole ?? '',
    quote: testimonial?.quote ?? '',
    photoId: testimonial?.photoId ?? null,
    sourceType: testimonial?.sourceType ?? ('DIRECT' as TestimonialSourceType),
    sourceUrl: testimonial?.sourceUrl ?? '',
    collectedAt: pktDateInput(testimonial?.collectedAt),
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [current, setCurrent] = useState(testimonial);
  const canPublish = customer.consentScope.includes('QUOTE') && customer.isPublic;
  const photoAllowed = customer.consentScope.includes('PHOTO');

  const refresh = (t: AdminTestimonial) => {
    setCurrent(t);
    qc.invalidateQueries({ queryKey: ['cms-testimonials'] });
    qc.invalidateQueries({ queryKey: ['cms-customers'] });
  };

  const save = useMutation({
    mutationFn: () => {
      const parsed = createTestimonialBodySchema.safeParse({
        customerId: customer.id,
        personName: f.personName,
        personRole: f.personRole.trim() || null,
        quote: f.quote,
        photoId: f.photoId,
        sourceType: f.sourceType,
        sourceUrl: f.sourceUrl.trim() || null,
        collectedAt: f.collectedAt || null,
      });
      if (!parsed.success) throw { fieldErrors: zodFieldErrors(parsed.error) };
      return current ? testimonialsApi.update(current.id, parsed.data) : testimonialsApi.create(parsed.data);
    },
    onSuccess: (t) => { setErrors({}); toast.success('Testimonial save ho gaya'); refresh(t); },
    onError: (e: unknown) => {
      const fe = (e as { fieldErrors?: FieldErrors }).fieldErrors;
      if (fe) return setErrors(fe);
      toast.error(errorMessage(e));
    },
  });
  const publish = useMutation({
    mutationFn: () => testimonialsApi.publish(current!.id),
    onSuccess: (t) => { toast.success('Testimonial publish ho gaya'); refresh(t); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const unpublish = useMutation({
    mutationFn: () => testimonialsApi.unpublish(current!.id),
    onSuccess: (t) => { toast.success('Testimonial unpublish ho gaya'); refresh(t); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => testimonialsApi.remove(current!.id),
    onSuccess: () => { toast.success('Testimonial delete ho gaya'); qc.invalidateQueries({ queryKey: ['cms-testimonials'] }); qc.invalidateQueries({ queryKey: ['cms-customers'] }); onDone(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const busy = save.isPending || publish.isPending || unpublish.isPending || remove.isPending;

  return (
    <div className="space-y-4">
      <button className="text-sm text-emerald-700 hover:underline" onClick={onDone}>← Wapas list</button>
      {current && (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <CmsStatusBadge status={current.status} /> Aakhri tabdeeli: {formatPkt(current.updatedAt)}
        </div>
      )}
      <Field label="Quote" required error={errors.quote} hint="Customer ke apne alfaaz, badle baghair"><textarea className={inputCls} rows={4} maxLength={1500} value={f.quote} onChange={(e) => setF({ ...f, quote: e.target.value })} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kis ne kaha" required error={errors.personName}><input className={inputCls} value={f.personName} onChange={(e) => setF({ ...f, personName: e.target.value })} /></Field>
        <Field label="Ohda" error={errors.personRole} hint="misal: Owner"><input className={inputCls} value={f.personRole} onChange={(e) => setF({ ...f, personRole: e.target.value })} /></Field>
        <Field label="Source" required error={errors.sourceType}>
          <select className={selectCls + ' w-full'} value={f.sourceType} onChange={(e) => setF({ ...f, sourceType: e.target.value as TestimonialSourceType })}>
            {TESTIMONIAL_SOURCE_TYPES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
          </select>
        </Field>
        <Field label="Kab mila" error={errors.collectedAt}><input type="date" className={inputCls} value={f.collectedAt} onChange={(e) => setF({ ...f, collectedAt: e.target.value })} /></Field>
      </div>
      <Field label="Source link" error={errors.sourceUrl} hint="Review ka link (agar online hai)"><input className={inputCls} value={f.sourceUrl} placeholder="https://…" onChange={(e) => setF({ ...f, sourceUrl: e.target.value })} /></Field>
      <Field label="Photo" error={errors.photoId} hint={photoAllowed ? undefined : 'Photo ke liye customer ki "Photo" ijazat zaroori hai'}>
        <MediaPicker value={f.photoId} media={testimonial?.photo} disabled={!photoAllowed && !f.photoId} onChange={(id) => setF({ ...f, photoId: id })} />
      </Field>
      {publish.error && <IssueList issues={errorIssues(publish.error)} />}
      <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-100 pt-4">
        {current && current.status !== 'PUBLISHED' && <button className={btn.danger} disabled={busy} onClick={() => confirm('Ye testimonial delete karein?') && remove.mutate()}>Delete</button>}
        {current?.status === 'PUBLISHED' && <button className={btn.secondary} disabled={busy} onClick={() => unpublish.mutate()}>Unpublish</button>}
        <button className={btn.secondary} disabled={busy} onClick={() => save.mutate()}>Save</button>
        {current && current.status !== 'PUBLISHED' && (
          <button className={btn.primary} disabled={busy || !canPublish} title={canPublish ? undefined : 'Quote ijazat + site par dikhana zaroori'} onClick={() => publish.mutate()}>Publish</button>
        )}
      </div>
    </div>
  );
}
