/**
 * One service: rate, time and commission; the last 90 days from billed
 * appointments (how often, billed amount, commission) by stylist, and the
 * latest visits with their notes.
 */

import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarPlus, Clock, History, Pencil, Percent, Power, Receipt, Scissors, Users, Wallet } from 'lucide-react';
import { HeroBack } from '@core/components/HeroBack';
import { Badge, Button, Card, PageHero, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr, heroButton, heroPrimaryButton } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { salonServicesApi } from '../api/services.api';
import { CardTitle, RankedBars, StatTile } from '../components/ui';
import { SALON_KEYS, apiError, categoryLabel, dateOf, minutes } from '../lib/meta';
import { useSalonCan } from '../lib/permissions';

export default function SalonServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const can = useSalonCan();
  const { sales, cost } = useMasked();
  const q = useQuery({ queryKey: [SALON_KEYS.services, 'stats', id], queryFn: () => salonServicesApi.stats(id!), enabled: !!id });
  const toggle = useMutation({
    mutationFn: () => (q.data!.service.isActive ? salonServicesApi.remove(id!) : salonServicesApi.update(id!, { isActive: true })),
    onSuccess: () => { toast.success('Badal gaya'); qc.invalidateQueries({ queryKey: [SALON_KEYS.services] }); },
    onError: (e) => toast.error(apiError(e, 'Badla nahi')),
  });

  if (q.isLoading) return <PageShell><Skeleton className="h-28 rounded-3xl" /><Skeleton className="h-80 rounded-2xl" /></PageShell>;
  if (!q.data) {
    return (
      <PageShell>
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Ye service nahi mili</p>
          <Button className="mt-3" variant="secondary" onClick={() => navigate('/salon/services')}>Services par wapas</Button>
        </div>
      </PageShell>
    );
  }
  const { service: s, last90, staff, recent } = q.data;
  const rate = Number(s.discountPrice ?? s.price);
  const who = [s.forMen && 'Mard', s.forWomen && 'Khawateen', s.forKids && 'Bachay'].filter(Boolean).join(' / ');

  return (
    <PageShell>
      <PageHero
        title={<HeroBack to="/salon/services" label="Services">{s.name}</HeroBack>}
        chip={<><Scissors /> {categoryLabel(s.category)}</>}
        meta={`${who || '—'}${s.code ? ` · ${s.code}` : ''}`}
        actions={<>
          {can.catalog && <button type="button" onClick={() => toggle.mutate()} className={heroButton} disabled={toggle.isPending}><Power className="h-4 w-4" /> {s.isActive ? 'Band karein' : 'Chalu karein'}</button>}
          {can.catalog && <Link to={`/salon-services/${s.id}/edit`} className={heroButton}><Pencil className="h-4 w-4" /> Badlein</Link>}
          {can.book && s.isActive && <Link to="/salon/appointments/new" className={heroPrimaryButton}><CalendarPlus className="h-4 w-4" /> Booking</Link>}
        </>}
        stats={[
          { label: 'Rate', value: formatPKR(rate), hint: s.discountPrice != null ? `asal ${formatPKR(s.price)}` : undefined },
          { label: 'Waqt', value: minutes(s.durationMinutes), hint: s.bufferAfter ? `+${s.bufferAfter} min gap` : undefined },
          { label: 'Kul bookings', value: s.totalBookings, hint: sales(s.totalRevenue) },
        ]}
      />
      {!s.isActive && <p className="rounded-2xl bg-slate-100 px-4 py-2.5 text-[0.8125rem] text-slate-700 ring-1 ring-slate-200">Ye service band hai — counter aur booking me nahi aati. History neeche maujood hai.</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Receipt} label="90 din me" value={last90.count} sub="bill wale visits" />
        <StatTile icon={Wallet} tone="green" label="Bill ki amount" value={sales(last90.revenue)} sub="90 din" />
        <StatTile icon={Percent} tone="amber" label="Commission" value={cost(last90.commission)} sub={s.commissionPct || s.commissionFixed ? `${s.commissionPct ? `${s.commissionPct}%` : ''}${s.commissionFixed ? ` + ${formatPKR(s.commissionFixed)}` : ''}` : 'Stylist ka rate'} />
        <StatTile icon={Clock} tone="sky" label="Dukaan ki Cost" value={cost(s.costPrice ?? 0)} sub="har dafa" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card title={<CardTitle icon={Users}>Stylist — 90 din</CardTitle>}>
          <RankedBars empty="Abhi kisi bill me nahi" rows={staff.map((x) => ({ key: x.staffProfileId || 'none', label: `${x.name} · ${x.count}`, value: x.revenue, display: sales(x.revenue) }))} />
        </Card>
        <Card flush title={<CardTitle icon={History}>Pichle visit</CardTitle>}>
          {!recent.length ? <p className="px-5 py-10 text-center text-[0.875rem] text-slate-500">Abhi koi visit nahi</p> : (
            <Table minWidth="32rem">
              <THead><Tr><Th>Kab</Th><Th>Customer</Th><Th>Stylist</Th><Th align="right">Amount</Th></Tr></THead>
              <TBody>
                {recent.map((r) => (
                  <Tr key={`${r.appointmentId}${r.at}`}>
                    <Td><Link to={`/salon/appointments/${r.appointmentId}`} className="text-brand-700 hover:underline">{dateOf(r.at)}</Link></Td>
                    <Td>{r.customerName ?? 'Walk-in'}{r.notes && <p className="text-[0.75rem] text-violet-700">{r.notes}</p>}</Td>
                    <Td>{r.staffName ?? '—'}</Td>
                    <Td align="right" className="tabular-nums">{r.total ? formatPKR(r.total) : <Badge size="xs" variant="success">Package</Badge>}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
