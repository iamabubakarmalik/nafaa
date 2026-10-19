/**
 * One appointment: the services with stylist, rate, commission, notes and
 * products used; the customer with allergies and last visits; money
 * (advance, bill, what is due); the next step (arrived, chair, bill at the
 * counter, new time, no-show, cancel, advance, WhatsApp) and the rating
 * after the work is done.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, Armchair, CalendarClock, CheckCircle2, Clock, Droplet, History, MessageCircle, Receipt, Scissors, Star, UserCheck, UserRound, UserX, Wallet, X,
} from 'lucide-react';
import { HeroBack } from '@core/components/HeroBack';
import { Badge, Button, Card, PageHero, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr, heroButton, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { appointmentsApi } from '../api/appointments.api';
import { salonCustomerProfilesApi } from '../api/customer-profiles.api';
import { StatusBadge, dueOf, isOpen, lateBy, useAppointmentActions } from '../components/appointments';
import { CardTitle } from '../components/ui';
import { SALON_KEYS, apiError, dateOf, minutes, shortDate, timeOf } from '../lib/meta';
import { useSalonCan } from '../lib/permissions';

export default function AppointmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = useSalonCan();
  const { cost } = useMasked();
  const act = useAppointmentActions();
  const q = useQuery({ queryKey: [SALON_KEYS.appointments, 'one', id], queryFn: () => appointmentsApi.getOne(id!), enabled: !!id, refetchInterval: 30_000 });
  const a = q.data;
  const histQ = useQuery({
    queryKey: [SALON_KEYS.customers, 'history', a?.customerId],
    queryFn: () => salonCustomerProfilesApi.history(a!.customerId!),
    enabled: !!a?.customerId,
    staleTime: 60_000,
  });

  if (q.isLoading) return <PageShell><Skeleton className="h-28 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-[2fr_1fr]"><Skeleton className="h-80 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div></PageShell>;
  if (!a) {
    return (
      <PageShell>
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Ye appointment nahi mili</p>
          <Button className="mt-3" variant="secondary" onClick={() => navigate('/salon/appointments')}>Appointments par wapas</Button>
        </div>
      </PageShell>
    );
  }

  const open = isOpen(a);
  const due = dueOf(a);
  const length = Math.round((new Date(a.scheduledEnd).getTime() - new Date(a.scheduledStart).getTime()) / 60_000);
  const profile = histQ.data?.profile;
  const lastVisits = (histQ.data?.visits ?? []).filter((v) => v.id !== a.id && v.sale).slice(0, 3);
  const voidedBill = (a.internalNotes ?? '').includes('void') && !a.saleId;

  return (
    <PageShell>
      <PageHero
        title={<HeroBack to="/salon/appointments" label="Appointments">{a.customerName || 'Walk-in'}</HeroBack>}
        chip={<>{a.appointmentNumber}</>}
        meta={`${shortDate(a.scheduledStart)} · ${timeOf(a.scheduledStart)} – ${timeOf(a.scheduledEnd)} · ${minutes(length)}`}
        actions={<>
          {a.customerPhone && <button type="button" onClick={() => act.remind(a)} className={heroButton}><MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">WhatsApp</span></button>}
          {a.sale && <Link to={`/sales/${a.sale.id}/receipt`} className={heroButton}><Receipt className="h-4 w-4" /> Bill {a.sale.saleNumber}</Link>}
          {open && can.bill && <button type="button" onClick={() => act.bill(a)} className={heroPrimaryButton}><Receipt className="h-4 w-4" /> Bill banayein</button>}
        </>}
        stats={[
          { label: 'Kul', value: formatPKR(a.total) },
          { label: a.saleId ? 'Paid' : 'Advance', value: formatPKR(a.paidAmount) },
          { label: a.saleId ? 'Udhaar' : 'Baqi', value: formatPKR(due) },
        ]}
      />

      {voidedBill && (
        <p className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Is appointment ka bill void hua tha — kaam ho chuka hai, dobara bill banayein.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" flush title={<CardTitle icon={Scissors}>Services</CardTitle>} actions={<StatusBadge a={a} />}>
            <Table minWidth="36rem">
              <THead><Tr><Th>Service</Th><Th>Stylist</Th><Th align="right">Rate</Th><Th align="right">Commission</Th></Tr></THead>
              <TBody>
                {a.services.map((s, i) => (
                  <Tr key={s.id ?? i}>
                    <Td>
                      <p className="font-medium text-slate-900">{s.serviceName}</p>
                      <p className="text-[0.75rem] text-slate-500">{minutes(s.durationMinutes)}</p>
                      {s.notes && <p className="mt-1 text-[0.75rem] text-violet-700">{s.notes}</p>}
                      {!!s.productsUsed?.length && (
                        <p className="mt-1 flex flex-wrap items-center gap-1 text-[0.75rem] text-sky-700"><Droplet className="h-3 w-3" />{s.productsUsed.map((u) => `${u.name} ${u.quantity} ${u.unit}`).join(', ')}</p>
                      )}
                    </Td>
                    <Td>{s.staffName ?? <span className="text-slate-400">—</span>}</Td>
                    <Td align="right" className="tabular-nums">
                      {formatPKR(s.total)}
                      {s.discount > 0 && <p className="text-[0.6875rem] text-slate-400 line-through">{formatPKR(s.price)}</p>}
                    </Td>
                    <Td align="right" className="tabular-nums text-slate-600">{cost(s.commissionAmount ?? 0)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>

          {(a.customerNotes || a.internalNotes) && (
            <Card className="rounded-2xl" title={<CardTitle icon={History}>Notes</CardTitle>}>
              {a.customerNotes && <p className="whitespace-pre-line text-[0.875rem] text-slate-800">{a.customerNotes}</p>}
              {a.internalNotes && <p className="mt-2 whitespace-pre-line text-[0.8125rem] text-slate-500">{a.internalNotes}</p>}
            </Card>
          )}

          <Card className="rounded-2xl" title={<CardTitle icon={Clock}>Kab kya hua</CardTitle>}>
            <ol className="space-y-2 text-[0.8125rem]">
              <Step on label="Booking" at={a.createdAt} />
              <Step on={!!a.arrivedAt} label="Aa gaye" at={a.arrivedAt} />
              <Step on={!!a.actualStart} label="Chair par" at={a.actualStart} />
              {a.status === 'CANCELLED' ? <Step on label={`Cancel${a.cancellationReason ? ` — ${a.cancellationReason}` : ''}`} at={a.cancelledAt} tone="text-rose-700" />
                : a.status === 'NO_SHOW' ? <Step on label="Nahi aaye" tone="text-rose-700" />
                : <Step on={!!a.saleId} label={a.sale ? `Bill ${a.sale.saleNumber}${a.sale.status === 'VOIDED' ? ' (void)' : ''}` : 'Bill'} at={a.actualEnd} />}
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          {open && (
            <Card className="rounded-2xl" title="Agla qadam">
              <div className="grid gap-2">
                {can.book && (a.status === 'CONFIRMED' || a.status === 'RESCHEDULED') && <Button variant="secondary" leftIcon={<UserCheck className="h-4 w-4" />} onClick={() => act.arrived(a)} disabled={act.busy}>Customer aa gaye</Button>}
                {can.book && (a.status === 'ARRIVED' || a.status === 'CONFIRMED' || a.status === 'RESCHEDULED') && <Button variant="secondary" leftIcon={<Armchair className="h-4 w-4" />} onClick={() => act.start(a)} disabled={act.busy}>Chair par — kaam shuru</Button>}
                {can.bill && <Button leftIcon={<Receipt className="h-4 w-4" />} onClick={() => act.bill(a)}>Kaam ho gaya — bill banayein</Button>}
                {can.bill && due > 0 && <Button variant="secondary" leftIcon={<Wallet className="h-4 w-4" />} onClick={() => act.pay(a)}>Advance lein</Button>}
                {can.book && (a.status === 'CONFIRMED' || a.status === 'RESCHEDULED') && <Button variant="ghost" leftIcon={<CalendarClock className="h-4 w-4" />} onClick={() => act.move(a)}>Waqt badlein</Button>}
                {can.book && lateBy(a) > 0 && <Button variant="ghost" leftIcon={<UserX className="h-4 w-4" />} onClick={() => act.noShow(a)}>Nahi aaye (no-show)</Button>}
                {can.book && <Button variant="critical" leftIcon={<X className="h-4 w-4" />} onClick={() => act.cancel(a)}>Cancel</Button>}
              </div>
            </Card>
          )}

          <Card className="rounded-2xl" title={<CardTitle icon={UserRound}>Customer</CardTitle>}
            actions={a.customerId ? <Link to={`/salon/customers?customer=${a.customerId}`} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Poori history</Link> : undefined}>
            <p className="text-[0.9375rem] font-semibold text-slate-900">{a.customerName || 'Walk-in'}</p>
            <p className="text-[0.8125rem] text-slate-500">{a.customerPhone || 'Phone nahi'}</p>
            {a.customer && Number(a.customer.balance) > 0.5 && <p className="mt-1 text-[0.8125rem] font-semibold text-rose-700">Khate me udhaar {formatPKR(Number(a.customer.balance))}</p>}
            {a.customer && Number(a.customer.balance) < -0.5 && <p className="mt-1 text-[0.8125rem] font-semibold text-success-700">Khate me advance {formatPKR(-Number(a.customer.balance))}</p>}
            {!!profile?.allergies?.length && (
              <p className="mt-2 flex gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-800 ring-1 ring-rose-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Allergy: {profile.allergies.join(', ')}</p>
            )}
            {profile && (profile.hairType || profile.skinType || profile.notes) && (
              <p className="mt-2 text-[0.8125rem] text-slate-600">{[profile.hairType && `Baal: ${profile.hairType}`, profile.skinType && `Skin: ${profile.skinType}`, profile.notes].filter(Boolean).join(' · ')}</p>
            )}
            {lastVisits.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-2">
                <p className="text-[0.75rem] font-semibold text-slate-500">Pichle visit</p>
                <ul className="mt-1 space-y-1.5">
                  {lastVisits.map((v) => (
                    <li key={v.id} className="text-[0.8125rem]">
                      <span className="text-slate-500">{dateOf(v.at)} · </span>
                      <span className="text-slate-800">{v.services.map((s) => `${s.serviceName}${s.staffName ? ` (${s.staffName})` : ''}`).join(', ')}</span>
                      {v.services.filter((s) => s.notes).map((s, i) => <p key={i} className="text-[0.75rem] text-violet-700">{s.notes}</p>)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {a.status === 'COMPLETED' && <Rating id={a.id} rating={a.customerRating} feedback={a.customerFeedback} />}
        </div>
      </div>
      {act.modals}
    </PageShell>
  );
}

function Step({ on, label, at, tone }: { on: boolean; label: string; at?: string | null; tone?: string }) {
  return (
    <li className="flex items-center gap-2">
      {on ? <CheckCircle2 className={cn('h-4 w-4 shrink-0', tone ? tone : 'text-success-600')} /> : <span className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-200" />}
      <span className={cn(on ? tone ?? 'text-slate-800' : 'text-slate-400')}>{label}</span>
      {at && <span className="ml-auto text-[0.75rem] text-slate-500">{shortDate(at)} {timeOf(at)}</span>}
    </li>
  );
}

function Rating({ id, rating, feedback }: { id: string; rating?: number; feedback?: string }) {
  const qc = useQueryClient();
  const [stars, setStars] = useState(rating ?? 0);
  const [text, setText] = useState(feedback ?? '');
  const save = useMutation({
    mutationFn: () => appointmentsApi.rate(id, stars, text.trim() || undefined),
    onSuccess: () => { toast.success('Rating save ho gayi'); qc.invalidateQueries({ queryKey: [SALON_KEYS.appointments] }); },
    onError: (e) => toast.error(apiError(e, 'Rating save nahi hui')),
  });
  return (
    <Card className="rounded-2xl" title={<CardTitle icon={Star}>Customer ki rai</CardTitle>}>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n} star`} onClick={() => setStars(n)}>
            <Star className={cn('h-6 w-6', n <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
          </button>
        ))}
        {rating ? <Badge size="xs" variant="success" className="ml-2 self-center">Save hai</Badge> : null}
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={1000} placeholder="Customer ne kya kaha (marzi)"
        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-[0.8125rem]" />
      <Button className="mt-2" size="sm" variant="secondary" disabled={!stars} loading={save.isPending} onClick={() => save.mutate()}>Save</Button>
    </Card>
  );
}
