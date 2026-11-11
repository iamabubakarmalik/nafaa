/**
 * One lead: contact actions, stage path, details, follow-up, notes, Demo /
 * Lost, and every visit with its photo and map link. A shop that signed up
 * shows only its plan name and dates, never its business data.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, CalendarClock, Check, CheckCircle2, Lock, MapPin, MapPinPlus, MessageCircle, Phone, Presentation, RotateCcw, Save, XCircle,
} from 'lucide-react';
import { Badge, Button, Input, Modal, PageHero, PageShell, Textarea, heroButton, heroPrimaryButton } from '@/design-system/components';
import { errorText } from '@/api/client';
import { partnerApi } from '@/api/partner.api';
import type { Interest, Lead, LeadInput } from '@/api/types';
import { INTEREST, STAGE, STAGE_PATH, VISIT_FLAG } from '@/lib/labels';
import { day, dayTime, dateInputToIso, isoToDateInput, todayInput } from '@/lib/format';
import { mapLink, prettyPhone, telLink, waLink } from '@/lib/phone';
import { cn } from '@/lib/cn';
import { Section } from '@/ui/Section';
import { PageSkeleton, QueryError } from '@/ui/QueryState';

const LOST_REASONS = ['Pehle se koi aur software', 'Qeemat zyada lagi', 'Abhi zaroorat nahi', 'Dukaan band ho gayi', 'Rabta nahi ho raha'];

function StagePath({ lead }: { lead: Lead }) {
  const reachedAt: Record<string, string | null> = { VISITED: lead.createdAt, DEMO: null, SIGNED_UP: lead.signedUpAt, ACTIVATED: lead.activatedAt, PAID: lead.paidAt };
  const idx = STAGE_PATH.indexOf(lead.stage);
  return (
    <div>
      <ol className="flex items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
        {STAGE_PATH.map((s, i) => {
          const done = lead.stage !== 'LOST' ? i <= idx : i === 0;
          return (
            <li key={s} className="flex shrink-0 items-center gap-1">
              {i > 0 && <span className={cn('h-0.5 w-4 rounded-full', done ? 'bg-brand-500' : 'bg-slate-200')} />}
              <span className={cn('inline-flex h-8 items-center gap-1 rounded-full px-3 text-[0.8125rem] font-semibold',
                done ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500')}>
                {done && <Check className="h-3.5 w-3.5" />}{STAGE[s].label}
              </span>
            </li>
          );
        })}
      </ol>
      {lead.stage === 'LOST' && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[0.8125rem] font-semibold text-rose-700 ring-1 ring-rose-200">
          <XCircle className="h-4 w-4" />Lost{lead.lostReason ? `: ${lead.lostReason}` : ''}
        </p>
      )}
      {(lead.signedUpAt || lead.activatedAt || lead.paidAt) && (
        <p className="mt-2 text-[0.8125rem] text-slate-500">
          {(['SIGNED_UP', 'ACTIVATED', 'PAID'] as const).filter((s) => reachedAt[s]).map((s) => `${STAGE[s].label}: ${day(reachedAt[s])}`).join(' · ')}
        </p>
      )}
    </div>
  );
}

export default function LeadDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['lead', id], queryFn: () => partnerApi.lead(id) });
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!q.data) return;
    setNotes(q.data.notes ?? '');
    setFollowUp(isoToDateInput(q.data.followUpAt));
  }, [q.data]);

  const m = useMutation({
    mutationFn: (body: LeadInput) => partnerApi.updateLead(id, body),
    onSuccess: (lead) => {
      qc.setQueryData(['lead', id], lead);
      void qc.invalidateQueries({ queryKey: ['leads'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Save ho gaya');
    },
    onError: (e) => toast.error(errorText(e)),
  });

  if (q.isPending) return <PageShell><PageSkeleton /></PageShell>;
  if (q.isError) return <PageShell><QueryError error={q.error} onRetry={() => void q.refetch()} /></PageShell>;
  const lead = q.data;
  const open = lead.stage === 'VISITED' || lead.stage === 'DEMO';
  const visits = lead.visits ?? [];
  const info: Array<[string, string | null]> = [
    ['Malik', lead.ownerName],
    ['Mobile', prettyPhone(lead.phone)],
    ['Qisam', lead.category],
    ['Shehar', lead.city],
    ['Pata', lead.address],
    ['Lead bani', day(lead.createdAt)],
  ];

  return (
    <PageShell>
      <PageHero title={lead.shopName} back={() => (window.history.length > 1 ? navigate(-1) : navigate('/leads'))}
        chip={STAGE[lead.stage].label}
        subtitle={[lead.ownerName, lead.city].filter(Boolean).join(' · ') || prettyPhone(lead.phone)}
        actions={<>
          <a href={telLink(lead.phone)} className={heroButton}><Phone className="h-4 w-4" />Call</a>
          <a href={waLink(lead.phone)} target="_blank" rel="noreferrer" className={heroButton}><MessageCircle className="h-4 w-4" />WhatsApp</a>
          {(open || lead.stage === 'LOST') && <button type="button" className={heroPrimaryButton} onClick={() => navigate(`/visit/new?lead=${lead.id}`)}><MapPinPlus className="h-4 w-4" />Naya Visit</button>}
        </>} />

      {lead.signedUp && (
        <section className="flex items-center gap-3 rounded-3xl bg-gradient-to-br from-brand-50 to-emerald-50 p-4 ring-1 ring-brand-200">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-600 ring-1 ring-brand-100"><CheckCircle2 className="h-6 w-6" /></span>
          <div className="min-w-0">
            <p className="font-bold text-brand-900">Nafaa par aa gayi</p>
            <p className="text-[0.875rem] text-brand-900/75">{[lead.planName ? `Plan: ${lead.planName}` : null, lead.signedUpAt ? `Signup ${day(lead.signedUpAt)}` : null].filter(Boolean).join(' · ')}</p>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Section title="Stage">
            <StagePath lead={lead} />
            {open && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="secondary" size="lg" disabled={lead.stage === 'DEMO' || m.isPending} onClick={() => m.mutate({ stage: 'DEMO' })} leftIcon={<Presentation className="h-4 w-4 text-blue-600" />}>
                  {lead.stage === 'DEMO' ? 'Demo ho gaya' : 'Demo diya'}
                </Button>
                <Button variant="critical" size="lg" disabled={m.isPending} onClick={() => { setLostReason(''); setLostOpen(true); }} leftIcon={<XCircle className="h-4 w-4" />}>Lost</Button>
              </div>
            )}
            {lead.stage === 'LOST' && (
              <Button className="mt-4" variant="secondary" size="lg" fullWidth loading={m.isPending} onClick={() => m.mutate({ stage: 'VISITED' })} leftIcon={<RotateCcw className="h-4 w-4" />}>Dobara kholein</Button>
            )}
          </Section>

          <Section title="Maloomat">
            <dl className="divide-y divide-slate-100">
              {info.filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4 py-2.5 text-[0.9375rem]">
                  <dt className="shrink-0 text-slate-500">{k}</dt>
                  <dd className="min-w-0 text-end font-semibold text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
            {lead.locked && !lead.signedUp && (
              <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">
                <Lock className="h-3.5 w-3.5 shrink-0" />Ye dukaan {day(lead.lockedUntil)} tak sirf aap ki lead hai
              </p>
            )}
          </Section>

          {open && (
            <Section title={<span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-brand-600" />Follow-up aur dilchaspi</span>}>
              <div className="grid grid-cols-3 gap-2">
                {(['HOT', 'WARM', 'COLD'] as Interest[]).map((i) => (
                  <button key={i} type="button" onClick={() => m.mutate({ interest: lead.interest === i ? '' : i })} aria-pressed={lead.interest === i} disabled={m.isPending}
                    className={cn('h-11 rounded-xl text-[0.9375rem] font-semibold ring-1 transition', lead.interest === i ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200')}>
                    {INTEREST[i].label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-end gap-2">
                <Input label="Follow-up ki tareekh" size="lg" type="date" min={todayInput()} value={followUp} onChange={(e) => setFollowUp(e.target.value)} wrapperClassName="flex-1" />
                <Button size="lg" disabled={followUp === isoToDateInput(lead.followUpAt) || m.isPending} onClick={() => m.mutate({ followUpAt: followUp ? dateInputToIso(followUp) : null })}>Save</Button>
              </div>
            </Section>
          )}

          <Section title="Notes">
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Is dukaan ke baare me yaad rakhne wali baatein" maxLength={1000} aria-label="Notes" />
            <Button className="mt-2" variant="secondary" disabled={notes === (lead.notes ?? '') || m.isPending} loading={m.isPending} onClick={() => m.mutate({ notes })} leftIcon={<Save className="h-4 w-4" />}>Notes save karein</Button>
          </Section>
        </div>

        <Section title={`Visits (${visits.length})`}>
          {visits.length === 0 ? <p className="text-[0.875rem] text-slate-500">Abhi koi visit nahi.</p> : (
            <ol className="relative space-y-4 border-s-2 border-slate-100 ps-5">
              {visits.map((v) => (
                <li key={v.id} className="relative">
                  <span className="absolute -start-[1.6875rem] top-1 h-3 w-3 rounded-full bg-brand-500 ring-4 ring-white" />
                  <p className="text-[0.875rem] font-semibold text-slate-900">{dayTime(v.visitedAt)}</p>
                  {v.note && <p className="mt-0.5 whitespace-pre-line text-[0.9375rem] text-slate-700">{v.note}</p>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {v.lat != null && v.lng != null
                      ? <a href={mapLink(v.lat, v.lng)} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-full bg-slate-100 px-3 text-[0.8125rem] font-semibold text-slate-700"><MapPin className="h-3.5 w-3.5 text-brand-600" />Naqshe par dekhein</a>
                      : null}
                    {(v.flags ?? []).map((f) => <Badge key={f} size="sm" variant="warning"><AlertTriangle className="me-1 h-3 w-3" />{VISIT_FLAG[f] ?? f}</Badge>)}
                  </div>
                  {v.photoUrl && (
                    <button type="button" onClick={() => setPhoto(v.photoUrl)} className="mt-2 block overflow-hidden rounded-xl ring-1 ring-slate-200">
                      <img src={v.photoUrl} alt="Visit ki photo" loading="lazy" className="h-28 w-40 object-cover" />
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Section>
      </div>

      <Modal open={lostOpen} onClose={() => setLostOpen(false)} title="Lead Lost karein?" description="Wajah likhein taa ke baad me yaad rahe"
        footer={<>
          <Button variant="secondary" onClick={() => setLostOpen(false)}>Rehne dein</Button>
          <Button variant="danger" loading={m.isPending} onClick={() => m.mutate({ stage: 'LOST', lostReason: lostReason.trim() }, { onSuccess: () => setLostOpen(false) })}>Lost karein</Button>
        </>}>
        <div className="flex flex-wrap gap-2">
          {LOST_REASONS.map((r) => (
            <button key={r} type="button" onClick={() => setLostReason(r)} aria-pressed={lostReason === r}
              className={cn('h-9 rounded-full px-3 text-[0.8125rem] font-semibold ring-1', lostReason === r ? 'bg-rose-600 text-white ring-rose-600' : 'bg-white text-slate-700 ring-slate-200')}>{r}</button>
          ))}
        </div>
        <Textarea wrapperClassName="mt-3" rows={2} value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Ya apni wajah likhein" maxLength={300} aria-label="Wajah" />
      </Modal>

      <Modal open={!!photo} onClose={() => setPhoto(null)} title="Visit ki photo" size="lg">
        {photo && <img src={photo} alt="Visit ki photo" className="max-h-[70vh] w-full rounded-xl object-contain" />}
      </Modal>
    </PageShell>
  );
}
