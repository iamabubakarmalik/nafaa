/**
 * One stay, start to end: the reservation and its advance, check-in with
 * the guest's ID, room service / laundry / minibar charges on the folio,
 * extend, room change, check-out with the folio bill (split payment or
 * company khata), cancel / no-show and the advance refund. Prints the
 * folio and the guest registration card.
 *
 * Keys: I check-in · O check-out · C charge · P payment · E extend · G guide.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowLeft, Ban, BedDouble, BookOpen, Building2, CalendarPlus, GraduationCap, IdCard, LogIn, LogOut, MessageCircle, Pencil, Phone,
  Plus, Receipt, Repeat, Trash2, Undo2, UserX, Users, Wallet,
} from 'lucide-react';
import {
  Badge, Button, Card, Kbd, KpiCard, KpiRow, PageHero, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { bookingsApi } from '../api/bookings.api';
import { folioApi } from '../api/folio.api';
import {
  CancelModal, ChangeRoomModal, ChargeModal, CheckInModal, CheckOutModal, EditBookingModal, ExtendModal, PayModal, RefundModal,
} from '../components/StayModals';
import { useConfirm } from '../components/useConfirm';
import {
  ALL_HOTEL_KEYS, HOTEL_KEYS, apiError, clock, folioLabel, isClosed, isInHouse, isOpen, mealLabel, roomsOf, sourceLabel, statusOf, stayDay, stayRange, waLink,
} from '../components/meta';
import { t } from '@core/i18n';

type Dialog = 'pay' | 'checkin' | 'extend' | 'room' | 'charge' | 'edit' | 'cancel' | 'noshow' | 'refund' | 'checkout' | null;

export default function HotelBookingDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canManage = usePermission(PERMISSIONS.SERVICE_BOOKINGS_MANAGE);
  const canTill = usePermission(PERMISSIONS.POS_USE);
  const canRefund = usePermission(PERMISSIONS.RETURNS_CREATE);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [ask, confirmDialog] = useConfirm();

  const q = useQuery({ queryKey: [HOTEL_KEYS.booking, id], queryFn: () => bookingsApi.getOne(id), enabled: !!id });
  const b = q.data;
  const refresh = () => { ALL_HOTEL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); setDialog(null); };

  const voidCharge = useMutation({
    mutationFn: ({ chargeId, reason }: { chargeId: string; reason: string }) => folioApi.void(chargeId, reason),
    onSuccess: () => { toast.success(t('Charge hat gaya')); refresh(); },
    onError: (e) => toast.error(apiError(e, t('Charge nahi hata'))),
  });

  const open = b ? isOpen(b.status) : false;
  const inHouse = b ? isInHouse(b.status) : false;
  const can = {
    checkIn: !!b && canManage && open && b.checkInDate.slice(0, 10) <= b.today,
    checkOut: !!b && canTill && inHouse,
    pay: !!b && canTill && !['CANCELLED', 'NO_SHOW'].includes(b.status) && b.money.due > 0.005,
    charge: !!b && canManage && (open || inHouse),
    extend: !!b && canManage && (open || inHouse),
    room: !!b && canManage && (open || inHouse),
    edit: !!b && canManage && (open || inHouse),
    cancel: !!b && canManage && open,
    noShow: !!b && canManage && open && b.checkInDate.slice(0, 10) <= b.today,
    refund: !!b && canManage && canRefund && isClosed(b.status) && b.money.advanceLeft > 0.005,
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen() || dialog) return;
      const k = e.key.toLowerCase();
      const map: Record<string, [boolean, Dialog]> = { i: [can.checkIn, 'checkin'], o: [can.checkOut, 'checkout'], c: [can.charge, 'charge'], p: [can.pay, 'pay'], e: [can.extend, 'extend'] };
      if (map[k]?.[0]) { e.preventDefault(); setDialog(map[k][1]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (q.isLoading) return <PageShell><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /></PageShell>;
  if (!b) {
    return (
      <PageShell>
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">{t('Booking nahi mili')}</p>
          <Button className="mt-3" variant="secondary" onClick={() => navigate('/hotel/bookings')}>{t('Bookings par wapas')}</Button>
        </div>
      </PageShell>
    );
  }

  const st = statusOf(b.status);
  const live = b.folioCharges.filter((c) => !c.isVoid);
  const liveSale = b.sales.find((s) => s.status !== 'VOIDED');
  const wa = waLink(b.guestPhone, `Assalam o alaikum ${b.guestName}, aap ki booking ${b.bookingNumber} — ${stayRange(b)}, Room ${roomsOf(b)}. Kul ${formatPKR(b.grandTotal)}, advance ${formatPKR(b.paidAmount)}, baqi ${formatPKR(b.money.due)}. Shukriya!`);

  const folioDoc = (): PrintDoc => ({
    title: b.status === 'CHECKED_OUT' ? 'Hotel bill' : 'Folio (abhi tak)', // i18n-ignore
    subtitle: `${b.bookingNumber} · ${b.guestName}`,
    meta: [['Room', roomsOf(b)], ['Stay', stayRange(b)], ...(b.bookedBy ? [['Company', b.bookedBy] as [string, string]] : []), ['Phone', b.guestPhone]],
    sections: [
      { kind: 'table', columns: [{ label: 'Tafseel' }, { label: 'Tadaad', align: 'right', wideOnly: true }, { label: 'Rs', align: 'right' }], rows: b.bill.lines.map((l) => [l.label, String(l.quantity ?? 1), formatPKR(l.amount)]) }, // i18n-ignore
      {
        kind: 'rows', rows: [
          ...(b.bill.discount > 0 ? [{ label: 'Discount', value: `−${formatPKR(b.bill.discount)}` }] : []), // i18n-ignore
          { label: 'Kul bill', value: formatPKR(b.bill.total), strong: true }, // i18n-ignore
          { label: 'Jama (advance / paid)', value: formatPKR(b.paidAmount) }, // i18n-ignore
          { label: 'Baqi', value: formatPKR(b.money.due), strong: true }, // i18n-ignore
        ],
      },
    ],
    footer: 'Hamare saath thehrne ka shukriya.', // i18n-ignore
  });
  const cardDoc = (): PrintDoc => ({
    title: 'Guest registration card', // i18n-ignore
    subtitle: `${b.bookingNumber} · Room ${roomsOf(b)}`, // i18n-ignore
    sections: [{
      kind: 'rows', rows: [
        { label: 'Naam', value: b.guestName }, { label: 'Phone', value: b.guestPhone }, // i18n-ignore
        { label: b.guest?.idType ?? 'CNIC', value: b.guest?.idNumber ?? '—' }, { label: 'Pata', value: [b.guest?.address, b.guest?.city].filter(Boolean).join(', ') || '—' }, // i18n-ignore
        { label: 'Qaumiyat', value: b.guest?.nationality ?? '—' }, { label: 'Log', value: `${b.totalAdults} bade, ${b.totalChildren} bachay` }, // i18n-ignore
        { label: 'Aamad', value: b.actualCheckIn ? clock(b.actualCheckIn) : stayDay(b.checkInDate, { year: true }) }, { label: 'Rawangi', value: stayDay(b.checkOutDate, { year: true }) }, // i18n-ignore
        { label: 'Wajah', value: b.purposeOfVisit ?? '—' }, { label: 'Company', value: b.bookedBy ?? '—' }, // i18n-ignore
      ],
    }, { kind: 'text', text: 'Guest ke dastakhat: ____________________        Reception: ____________________' }], // i18n-ignore
  });

  const removeCharge = async (chargeId: string, label: string) => {
    if (!(await ask({ title: t('Charge hatayein?'), text: t('{{label}} bill se hat jayega. Stock wala item wapas stock me aa jayega.', { label }), yes: t('Haan, hatayein'), danger: true }))) return;
    voidCharge.mutate({ chargeId, reason: 'Desk ne hataya' }); // i18n-ignore
  };

  const primary = can.checkIn
    ? <button type="button" onClick={() => setDialog('checkin')} className={heroPrimaryButton} title={t('Check-in (I)')}><LogIn className="h-4 w-4 rtl-flip" /> {' '}{t('Check-in')}</button>
    : can.checkOut
      ? <button type="button" onClick={() => setDialog(b.overdueNights > 0 ? 'extend' : 'checkout')} className={heroPrimaryButton} title={t('Check-out (O)')}><LogOut className="h-4 w-4 rtl-flip" /> {b.overdueNights > 0 ? t('Pehle stay barhayein') : t('Check-out')}</button>
      : liveSale ? <Link to={`/sales/${liveSale.id}/receipt`} className={heroPrimaryButton}><Receipt className="h-4 w-4" /> {' '}{t('Bill dekhein')}</Link> : null;

  return (
    <PageShell>
      <PageHero
        title={<span className="inline-flex items-center gap-2"><Link to="/hotel/bookings" className="rounded-lg p-1 hover:bg-white/15" aria-label={t('Wapas')}><ArrowLeft className="h-5 w-5 rtl-flip" /></Link>{b.guestName}</span>}
        chip={<><st.icon /> {st.label}</>}
        meta={`${b.bookingNumber} · ${sourceLabel(b.source)}${b.bookedBy ? ` · ${b.bookedBy}` : ''}`}
        busy={q.isFetching}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={folioDoc} label={t('Bill')} /></span>
          {b.actualCheckIn && <span className="hidden sm:inline [&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={cardDoc} label={t('Card')} /></span>}
          {wa && <a href={wa} target="_blank" rel="noreferrer" className={heroIconButton} title={t('WhatsApp')}><MessageCircle className="h-4 w-4" /></a>}
          {can.edit && <button type="button" onClick={() => setDialog('edit')} className={heroIconButton} title={t('Badlein')}><Pencil className="h-4 w-4" /></button>}
          <button type="button" onClick={guide.open} className={heroIconButton} title={t('Guide (G)')}><GraduationCap className="h-4 w-4" /></button>
          {primary}
        </>}
        stats={[
          { label: t('Kul bill'), value: formatPKR(b.grandTotal), hint: b.extraCharges > 0 ? t('{{extraCharges}} charges', { extraCharges: formatPKR(b.extraCharges) }) : undefined },
          { label: t('Jama'), value: formatPKR(b.paidAmount) },
          { label: t('Baqi'), value: formatPKR(b.money.due) },
          { label: t('Stay'), value: stayRange(b) },
        ]}
      />

      {(b.overdueNights > 0 || (open && b.checkInDate.slice(0, 10) < b.today) || b.guest?.isBlacklisted) && (
        <div className="flex gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[0.875rem] text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {b.overdueNights > 0 && t('Check-out ki date guzar gayi — guest {{overdueNights}} raat zyada ruka. Stay barhayein, phir check-out karein. ', { overdueNights: b.overdueNights })}
            {open && b.checkInDate.slice(0, 10) < b.today && t('Guest abhi tak nahi aaya — check-in karein ya no-show lagayein. ')}
            {b.guest?.isBlacklisted && t('Guest blacklist me hai: {{value}}', { value: b.guest.blacklistReason ?? '' })}
          </span>
        </div>
      )}

      <KpiRow cols={5}>
        <KpiCard icon={BedDouble} color="#4f46e5" label={t('Room')} value={roomsOf(b)} hint={b.bookedRooms.map((r) => r.roomTypeName).filter(Boolean).join(', ')} />
        <KpiCard icon={Users} color="#0891b2" label={t('Log')} value={`${b.totalAdults + b.totalChildren}`} hint={t('{{totalAdults}} bade · {{totalChildren}} bachay', { totalAdults: b.totalAdults, totalChildren: b.totalChildren })} />
        <KpiCard icon={Receipt} color="#7c3aed" label={t('Room charges')} value={formatPKR(b.roomTotal)} hint={t('{{nights}} raat · {{mealPlan}}', { nights: b.nights, mealPlan: mealLabel(b.mealPlan) })} />
        <KpiCard icon={Plus} color="#ea580c" label={t('Folio charges')} value={formatPKR(b.extraCharges)} hint={t('{{count}} cheezein', { count: live.length })} onClick={can.charge ? () => setDialog('charge') : undefined} />
        <KpiCard icon={Wallet} color={b.money.due > 0 ? '#e11d48' : '#16a34a'} label={t('Baqi')} value={formatPKR(b.money.due)} hint={b.money.khataPaid > 0 ? t('{{khataPaid}} advance khate me', { khataPaid: formatPKR(b.money.khataPaid) }) : t('Koi advance nahi')} onClick={can.pay ? () => setDialog('pay') : undefined} />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Card className="p-0">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <h2 className="text-[0.9375rem] font-semibold text-slate-900">{t('Rooms')}</h2>
              {can.room && <Button size="sm" variant="secondary" leftIcon={<Repeat className="h-4 w-4" />} onClick={() => setDialog('room')}>{t('Room badlein')}</Button>}
            </div>
            <ul className="divide-y divide-slate-100">
              {b.bookedRooms.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="flex h-11 w-14 items-center justify-center rounded-xl bg-brand-50 text-[1rem] font-bold text-brand-800 ring-1 ring-brand-100">{r.roomNumber ?? '—'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.875rem] font-medium text-slate-900">{r.roomTypeName ?? t('Room')}{r.isComplimentary && <Badge variant="success" className="ms-2">{t('Free')}</Badge>}</span>
                    <span className="block text-[0.75rem] text-slate-500">{t('{{ratePerNight}} fi raat · {{totalNights}} raat · {{adults}} bade{{value}}{{value2}}', { ratePerNight: formatPKR(r.ratePerNight), totalNights: r.totalNights, adults: r.adults, value: r.children ? t(', {{children}} bachay', { children: r.children }) : '', value2: r.extraBeds ? t(' · {{extraBeds}} extra bed', { extraBeds: r.extraBeds }) : '' })}</span>
                    {r.notes && <span className="block whitespace-pre-line text-[0.75rem] text-slate-400">{r.notes}</span>}
                  </span>
                  <span className="text-end text-[0.875rem] font-semibold tabular-nums text-slate-900">{formatPKR(r.totalAmount - r.discount)}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-0">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-[0.9375rem] font-semibold text-slate-900">{t('Folio — room ke bill me')}</h2>
                <p className="text-[0.75rem] text-slate-500">{t('Room service, restaurant, laundry, minibar — check-out par ek bill')}</p>
              </div>
              {can.charge && <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setDialog('charge')}>{t('Charge likhein')}</Button>}
            </div>
            {b.folioCharges.length === 0 ? (
              <p className="px-4 py-8 text-center text-[0.8125rem] text-slate-500">{t('Abhi koi charge nahi. Chai, khana ya laundry di ho to "Charge likhein"')}{' '} <Kbd>C</Kbd>.</p>
            ) : (
              <Table minWidth="36rem">
                <THead><Tr><Th>{t('Kab')}</Th><Th>{t('Kya')}</Th><Th align="right">{t('Tadaad')}</Th><Th align="right">Rs</Th><Th /></Tr></THead>
                <TBody>
                  {b.folioCharges.map((c) => (
                    <Tr key={c.id} className={cn(c.isVoid && 'opacity-50')}>
                      <Td className="whitespace-nowrap text-[0.75rem] text-slate-500">{clock(c.chargeDate)}</Td>
                      <Td>
                        <span className={cn('block text-[0.8125rem] text-slate-900', c.isVoid && 'line-through')}>{c.description}</span>
                        <span className="block text-[0.6875rem] text-slate-500">{folioLabel(c.chargeType)} · {c.chargeNumber}{c.isVoid && c.voidReason ? t(' · hataya: {{voidReason}}', { voidReason: c.voidReason }) : ''}</span>
                      </Td>
                      <Td align="right" className="tabular-nums">{c.quantity}</Td>
                      <Td align="right" className="font-semibold tabular-nums">{formatPKR(c.totalAmount)}</Td>
                      <Td align="right">{!c.isVoid && can.charge && (
                        <button type="button" onClick={() => removeCharge(c.id, c.description)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={t('Hatayein')}><Trash2 className="h-4 w-4" /></button>
                      )}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="mb-2 text-[0.9375rem] font-semibold text-slate-900">{t('Bill ka hisaab')}</h2>
            <ul className="space-y-1 text-[0.8125rem]">
              {b.bill.lines.map((l, i) => <li key={i} className="flex justify-between gap-3"><span className="truncate text-slate-600">{l.label}</span><span className="tabular-nums">{formatPKR(l.amount)}</span></li>)}
              {b.bill.discount > 0 && <li className="flex justify-between text-success-700"><span>{t('Discount')}</span><span className="tabular-nums">−{formatPKR(b.bill.discount)}</span></li>}
              <li className="flex justify-between border-t border-slate-100 pt-1.5 font-semibold"><span>{t('Kul')}</span><span className="tabular-nums">{formatPKR(b.bill.total)}</span></li>
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-2 p-4 text-[0.8125rem]">
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">{t('Guest')}</h2>
            <p className="flex items-center gap-2 text-slate-700"><Phone className="h-4 w-4 text-slate-400" /><a href={`tel:${b.guestPhone}`} className="hover:underline">{b.guestPhone}</a></p>
            <p className="flex items-center gap-2 text-slate-700"><IdCard className="h-4 w-4 text-slate-400" />{b.guest?.idNumber ? `${b.guest.idType ?? 'CNIC'} ${b.guest.idNumber}` : <span className="text-amber-700">{t('ID abhi nahi li')}</span>}</p>
            {b.bookedBy && <p className="flex items-center gap-2 text-slate-700"><Building2 className="h-4 w-4 text-slate-400" />{b.bookedBy}</p>}
            {b.guest && <Link to={`/hotel/guests/${b.guest.id}`} className="inline-block text-brand-700 hover:underline">{t('Profile · {{totalStays}} stays', { totalStays: b.guest.totalStays })}</Link>}
            {b.specialRequests && <p className="rounded-lg bg-slate-50 px-2.5 py-2 text-slate-700">{t('Farmaish: {{specialRequests}}', { specialRequests: b.specialRequests })}</p>}
            {b.arrivalTime && <p className="text-slate-500">{t('Aane ka waqt: {{arrivalTime}}', { arrivalTime: b.arrivalTime })}</p>}
          </Card>

          <Card className="space-y-2 p-4 text-[0.8125rem]">
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">{t('Paisa')}</h2>
            <div className="flex justify-between"><span className="text-slate-500">{t('Advance khate me')}</span><span className="tabular-nums">{formatPKR(b.money.khataPaid)}</span></div>
            {b.money.refunded > 0 && <div className="flex justify-between"><span className="text-slate-500">{t('Wapas diya')}</span><span className="tabular-nums">{formatPKR(b.money.refunded)}</span></div>}
            <div className="flex justify-between font-semibold"><span>{t('Baqi')}</span><span className="tabular-nums">{formatPKR(b.money.due)}</span></div>
            {b.billTo && b.billTo.id !== b.khata?.id && <Link to={`/customers/${b.billTo.id}`} className="flex items-center gap-1.5 text-brand-700 hover:underline"><BookOpen className="h-4 w-4" />{t('Bill ka khata: {{name}}', { name: b.billTo.name })}</Link>}
            {b.khata && <Link to={`/customers/${b.khata.id}`} className="flex items-center gap-1.5 text-brand-700 hover:underline"><BookOpen className="h-4 w-4" />{t('Khata: {{name}} ({{value}})', { name: b.khata.name, value: b.khata.balance < 0 ? t('{{formatPKR}} jama', { formatPKR: formatPKR(-b.khata.balance) }) : t('{{balance}} lena', { balance: formatPKR(b.khata.balance) }) })}</Link>}
            {b.sales.map((s) => (
              <Link key={s.id} to={`/sales/${s.id}/receipt`} className={cn('flex justify-between rounded-lg px-2 py-1.5 ring-1 ring-slate-200 hover:bg-slate-50', s.status === 'VOIDED' && 'opacity-50 line-through')}>
                <span>{s.saleNumber}</span><span className="tabular-nums">{formatPKR(s.total)}</span>
              </Link>
            ))}
            {b.cancellationReason && <p className="text-rose-700">{t('Cancel: {{cancellationReason}}', { cancellationReason: b.cancellationReason })}</p>}
          </Card>

          <Card className="grid gap-2 p-4">
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">{t('Kaam')}</h2>
            {can.pay && <Button variant="secondary" leftIcon={<Wallet className="h-4 w-4" />} onClick={() => setDialog('pay')}>{b.status === 'CHECKED_OUT' ? t('Baqi paisa mila') : t('Advance mila')} <Kbd className="ms-auto">P</Kbd></Button>}
            {can.extend && <Button variant="secondary" leftIcon={<CalendarPlus className="h-4 w-4" />} onClick={() => setDialog('extend')}>{t('Stay barhayein')}{' '} <Kbd className="ms-auto">E</Kbd></Button>}
            {can.checkOut && <Button variant="success" leftIcon={<LogOut className="h-4 w-4 rtl-flip" />} onClick={() => setDialog(b.overdueNights > 0 ? 'extend' : 'checkout')}>{t('Check-out')}{' '} <Kbd className="ms-auto">O</Kbd></Button>}
            {can.noShow && <Button variant="secondary" leftIcon={<UserX className="h-4 w-4" />} onClick={() => setDialog('noshow')}>{t('No-show')}</Button>}
            {can.cancel && <Button variant="ghost" className="text-rose-700" leftIcon={<Ban className="h-4 w-4" />} onClick={() => setDialog('cancel')}>{t('Booking cancel')}</Button>}
            {can.refund && <Button variant="secondary" leftIcon={<Undo2 className="h-4 w-4" />} onClick={() => setDialog('refund')}>{t('Advance wapas ({{advanceLeft}})', { advanceLeft: formatPKR(b.money.advanceLeft) })}</Button>}
            {isClosed(b.status) && !can.refund && <p className="text-[0.75rem] text-slate-500">{t('Ye booking band hai. Bill ghalat ho to sale record se void karein — stay dobara khul jayega.')}</p>}
          </Card>
          <p className="px-1 text-[0.75rem] text-slate-400">{t('Bani {{createdAt}}{{value}}{{value2}}', { createdAt: clock(b.createdAt), value: b.actualCheckIn ? t(' · andar {{actualCheckIn}}', { actualCheckIn: clock(b.actualCheckIn) }) : '', value2: b.actualCheckOut ? t(' · bahar {{actualCheckOut}}', { actualCheckOut: clock(b.actualCheckOut) }) : '' })}</p>
        </div>
      </div>

      {dialog === 'pay' && <PayModal b={b} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog === 'checkin' && <CheckInModal b={b} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog === 'extend' && <ExtendModal b={b} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog === 'room' && <ChangeRoomModal b={b} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog === 'charge' && <ChargeModal b={b} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog === 'edit' && <EditBookingModal b={b} onClose={() => setDialog(null)} onDone={refresh} />}
      {(dialog === 'cancel' || dialog === 'noshow') && <CancelModal b={b} noShow={dialog === 'noshow'} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog === 'refund' && <RefundModal b={b} onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog === 'checkout' && <CheckOutModal b={b} onClose={() => setDialog(null)} onDone={(r) => { refresh(); if (r?.sale?.id) navigate(`/sales/${r.sale.id}/receipt`); }} />}
      {confirmDialog}

      {guide.isOpen && (
        <PageGuide title={t('Stay — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: LogIn, color: '#4f46e5', title: t('Check-in'), text: t('Guest aaye to CNIC ya passport number likhein (police record), kitne log hain, shehar. Room "Guest hai" ho jata hai.') },
            { icon: Plus, color: '#ea580c', title: t('Charge likhein'), text: t('Chai, khana, laundry, minibar — sab room ke bill me. Maal se chunein to stock bhi kat jata hai.') },
            { icon: CalendarPlus, color: '#0891b2', title: t('Stay barhayein / room badlein'), text: t('Guest ruk gaya to nayi date; AC kharab ho to doosra room — rate apne aap bill me.') },
            { icon: LogOut, color: '#16a34a', title: t('Check-out'), text: t('Raatein + charges − advance. Cash, card, JazzCash mila kar le sakte hain, ya company ke khate me likh dein.') },
            { icon: Undo2, color: '#e11d48', title: t('Cancel / no-show'), text: t('Charge advance se kat jata hai; baqi advance khate me rehta hai — "Advance wapas" se cash dein.') },
          ]}
          tips={[
            t('Advance usi din drawer / bank me aur guest ke khate me jata hai — day book me dikhta hai.'),
            t('Bill ghalat ho to sale record se void karein; stay dobara "andar" ho jata hai aur dobara check-out karein.'),
            t('Check-out aur payment ke liye POS ki permission, refund ke liye returns ki permission chahiye.'),
          ]}
          shortcuts={[['I', 'check-in'], ['O', 'check-out'], ['C', 'charge'], ['P', 'payment'], ['E', t('stay barhayein')], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

