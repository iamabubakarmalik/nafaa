/**
 * One room type: rates, capacity and amenities, its rooms with their state
 * now, and the last 90 days of stays (nights sold, room revenue, ADR).
 */

import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BedDouble, CalendarRange, Check, DoorOpen, Pencil, TrendingUp, Users } from 'lucide-react';
import { Button, Card, KpiCard, KpiRow, PageHero, PageShell, Skeleton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { roomTypesApi } from '../api/room-types.api';
import { HK_STATUS, HOTEL_KEYS, roomStatusOf } from '../components/meta';

const FLAGS: Array<[string, string]> = [
  ['hasAC', 'AC'], ['hasHeater', 'Heater / geyser'], ['hasTV', 'TV'], ['hasWifi', 'WiFi'], ['hasMinibar', 'Minibar / fridge'], ['hasBalcony', 'Balcony'],
  ['hasKitchen', 'Kitchen'], ['hasBathtub', 'Bathtub'], ['hasSafe', 'Locker'], ['isSmoking', 'Smoking allowed'],
];

export default function HotelRoomTypeDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const canBook = usePermission(PERMISSIONS.SERVICE_BOOKINGS_MANAGE);
  const { sales } = useMasked();
  const q = useQuery({ queryKey: [HOTEL_KEYS.roomTypes, 'one', id], queryFn: () => roomTypesApi.getOne(id), enabled: !!id });
  const t = q.data;

  if (q.isLoading) return <PageShell><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /></PageShell>;
  if (!t) {
    return (
      <PageShell>
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Room type nahi mila</p>
          <Button className="mt-3" variant="secondary" onClick={() => navigate('/hotel/room-types')}>Room types par wapas</Button>
        </div>
      </PageShell>
    );
  }
  const active = t.rooms.filter((r) => r.isActive);
  const flags = FLAGS.filter(([k]) => (t as unknown as Record<string, unknown>)[k]).map(([, l]) => l);

  return (
    <PageShell>
      <PageHero
        title={<span className="inline-flex items-center gap-2"><Link to="/hotel/room-types" className="rounded-lg p-1 hover:bg-white/15" aria-label="Wapas"><ArrowLeft className="h-5 w-5" /></Link>{t.name}</span>}
        chip={<><BedDouble /> {t.code}{!t.isActive && ' · band'}</>}
        meta={t.description ?? undefined}
        actions={<>
          {canEdit && <Link to={`/hotel-room-types/${t.id}/edit`} className={heroIconButton} title="Badlein"><Pencil className="h-4 w-4" /></Link>}
          {canBook && t.isActive && <Link to="/hotel/bookings/new" className={heroPrimaryButton}>Booking</Link>}
        </>}
        stats={[
          { label: 'Ek raat', value: formatPKR(t.basePrice) },
          { label: 'Weekend', value: t.weekendPrice ? formatPKR(t.weekendPrice) : '—' },
          { label: 'Extra bed', value: t.extraBedAllowed ? formatPKR(t.extraBedPrice) : 'Nahi' },
        ]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={DoorOpen} color="#16a34a" label="Room" value={active.length} hint={`${active.filter((r) => r.status === 'AVAILABLE').length} khaali abhi`} />
        <KpiCard icon={CalendarRange} color="#4f46e5" label="90 din ki raatein" value={t.last90.nights} hint={`${t.last90.stays} stays`} />
        <KpiCard icon={TrendingUp} color="#7c3aed" label="90 din ki kamai" value={sales(t.last90.revenue)} />
        <KpiCard icon={Users} color="#0891b2" label="ADR (ausat rate)" value={sales(t.last90.adr)} hint={`${t.maxOccupancy} log tak`} />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card className="p-4">
          <h2 className="mb-3 text-[0.9375rem] font-semibold text-slate-900">Room</h2>
          {!t.rooms.length ? <p className="text-[0.8125rem] text-slate-500">Is type ka koi room nahi. Room board → setup se jorein.</p> : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {t.rooms.map((r) => {
                const st = roomStatusOf(r.status);
                return (
                  <div key={r.id} className={cn('rounded-xl p-2.5 ring-1', r.isActive ? st.tile : 'bg-slate-50 opacity-50 ring-slate-200')}>
                    <p className="text-[1rem] font-bold text-slate-900">{r.roomNumber}</p>
                    <p className="text-[0.6875rem] text-slate-600">{r.isActive ? st.label : 'Band'}{r.floor ? ` · manzil ${r.floor}` : ''}</p>
                    <p className={cn('text-[0.6875rem]', HK_STATUS[r.housekeepingStatus]?.tone)}>{HK_STATUS[r.housekeepingStatus]?.label}</p>
                    {r.customPrice ? <p className="text-[0.6875rem] font-semibold text-slate-700">{formatPKR(r.customPrice)}</p> : null}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <Card className="space-y-3 p-4 text-[0.8125rem]">
          <h2 className="text-[0.9375rem] font-semibold text-slate-900">Tafseel</h2>
          <p className="text-slate-700">{t.maxAdults} bade · {t.maxChildren} bachay · kul {t.maxOccupancy} log · {t.bedCount} bed</p>
          {(t.peakPrice || t.offSeasonPrice || t.hourlyPrice) && (
            <p className="text-slate-700">{[t.peakPrice && `Season ${formatPKR(t.peakPrice)}`, t.offSeasonPrice && `Off-season ${formatPKR(t.offSeasonPrice)}`, t.hourlyPrice && `Ghanta ${formatPKR(t.hourlyPrice)}`].filter(Boolean).join(' · ')}</p>
          )}
          <ul className="grid grid-cols-2 gap-1">
            {[...flags, ...t.amenities].map((a) => <li key={a} className="flex items-center gap-1.5 text-slate-700"><Check className="h-3.5 w-3.5 text-success-600" />{a}</li>)}
          </ul>
          <Link to="/hotel/rate-plans" className="inline-block text-brand-700 hover:underline">Season rates dekhein</Link>
        </Card>
      </div>
    </PageShell>
  );
}
