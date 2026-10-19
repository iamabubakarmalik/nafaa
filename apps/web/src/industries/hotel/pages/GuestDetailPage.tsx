/**
 * Guest profile: contact and ID, company, preferences, every stay with its
 * bill and balance, the khata it is linked to, and VIP / blacklist.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Ban, BedDouble, BookOpen, Building2, CalendarPlus, IdCard, MapPin, MessageCircle, Pencil, Phone, ShieldCheck, Star, Trash2, Wallet } from 'lucide-react';
import {
  Button, Card, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { guestsApi } from '../api/guests.api';
import { GuestForm } from '../components/GuestForm';
import { useConfirm } from '../components/useConfirm';
import { HOTEL_KEYS, apiError, statusOf, stayDay, waLink } from '../components/meta';

export default function GuestDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canEdit = usePermission(PERMISSIONS.CUSTOMERS_EDIT);
  const canBook = usePermission(PERMISSIONS.SERVICE_BOOKINGS_MANAGE);
  const { sales } = useMasked();
  const [ask, confirmDialog] = useConfirm();
  const [editing, setEditing] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [reason, setReason] = useState('');
  const q = useQuery({ queryKey: [HOTEL_KEYS.guests, 'one', id], queryFn: () => guestsApi.getOne(id), enabled: !!id });
  const g = q.data;
  const refresh = () => qc.invalidateQueries({ queryKey: [HOTEL_KEYS.guests] });

  const block = useMutation({
    mutationFn: () => (g!.isBlacklisted ? guestsApi.unblacklist(id) : guestsApi.blacklist(id, reason.trim())),
    onSuccess: () => { toast.success(g!.isBlacklisted ? 'Blacklist se hata diya' : 'Blacklist kar diya'); setBlocking(false); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const vip = useMutation({
    mutationFn: () => guestsApi.update(id, { isVIP: !g!.isVIP }),
    onSuccess: () => refresh(),
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const hide = useMutation({
    mutationFn: () => guestsApi.remove(id),
    onSuccess: () => { toast.success('Guest list se hat gaya'); refresh(); navigate('/hotel/guests'); },
    onError: (e) => toast.error(apiError(e, 'Nahi hata')),
  });

  if (q.isLoading) return <PageShell><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /></PageShell>;
  if (!g) {
    return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Guest nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/hotel/guests')}>Guests par wapas</Button></div></PageShell>;
  }
  const wa = waLink(g.phone, `Assalam o alaikum ${g.fullName}, `);
  const due = g.stays.reduce((s, b) => s + (['CANCELLED', 'NO_SHOW'].includes(b.status) ? 0 : b.balanceAmount), 0);

  return (
    <PageShell>
      <PageHero
        title={<span className="inline-flex items-center gap-2"><Link to="/hotel/guests" className="rounded-lg p-1 hover:bg-white/15" aria-label="Wapas"><ArrowLeft className="h-5 w-5" /></Link>{g.fullName}{g.isVIP && <Star className="h-5 w-5 fill-amber-300 text-amber-300" />}</span>}
        chip={<><IdCard /> {g.guestNumber}</>}
        meta={g.isBlacklisted ? `Blacklist: ${g.blacklistReason ?? ''}` : g.companyName ?? undefined}
        actions={<>
          {wa && <a href={wa} target="_blank" rel="noreferrer" className={heroIconButton} title="WhatsApp"><MessageCircle className="h-4 w-4" /></a>}
          {canEdit && <button type="button" onClick={() => setEditing(true)} className={heroIconButton} title="Badlein"><Pencil className="h-4 w-4" /></button>}
          {canBook && !g.isBlacklisted && <Link to="/hotel/bookings/new" className={heroPrimaryButton}><CalendarPlus className="h-4 w-4" /> Booking</Link>}
        </>}
        stats={[{ label: 'Stays', value: g.totalStays }, { label: 'Raatein', value: g.totalNights }, { label: 'Kul kharch', value: sales(g.totalSpent) }]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={BedDouble} color="#4f46e5" label="Stays" value={g.totalStays} hint={g.lastStayAt ? `Aakhri ${stayDay(g.lastStayAt)}` : 'Abhi tak koi nahi'} />
        <KpiCard icon={Wallet} color={due > 0 ? '#e11d48' : '#16a34a'} label="Bookings par baqi" value={sales(due)} />
        <KpiCard icon={BookOpen} color="#0891b2" label="Khata" value={g.khata ? sales(Math.abs(g.khata.balance)) : '—'} hint={g.khata ? (g.khata.balance < 0 ? 'Jama (advance)' : g.khata.balance > 0 ? 'Lena hai' : 'Barabar') : 'Pehle advance par khulta hai'} onClick={g.khata ? () => navigate(`/customers/${g.khata!.id}`) : undefined} />
        <KpiCard icon={IdCard} color={g.idNumber ? '#16a34a' : '#e11d48'} label="ID" value={g.idNumber ? g.idType ?? 'CNIC' : 'Nahi'} hint={g.idNumber ?? 'Check-in par zaroor lein'} />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card className="p-0">
          <h2 className="border-b border-slate-100 px-4 py-3 text-[0.9375rem] font-semibold text-slate-900">Stays</h2>
          {!g.stays.length ? <p className="px-4 py-8 text-center text-[0.8125rem] text-slate-500">Abhi koi stay nahi</p> : (
            <Table minWidth="34rem">
              <THead><Tr><Th>Booking</Th><Th>Room</Th><Th>Dates</Th><Th>Halat</Th><Th align="right">Bill</Th><Th align="right">Baqi</Th></Tr></THead>
              <TBody>
                {g.stays.map((b) => (
                  <Tr key={b.id} interactive onClick={() => navigate(`/hotel/bookings/${b.id}`)}>
                    <Td className="font-medium text-slate-900">{b.bookingNumber}</Td>
                    <Td>{b.bookedRooms.map((r) => r.roomNumber).filter(Boolean).join(', ')}</Td>
                    <Td className="whitespace-nowrap">{stayDay(b.checkInDate)} → {stayDay(b.checkOutDate)}</Td>
                    <Td>{statusOf(b.status).label}</Td>
                    <Td align="right" className="tabular-nums">{sales(b.grandTotal)}</Td>
                    <Td align="right" className={cn('tabular-nums', b.balanceAmount > 0 && 'text-amber-700')}>{sales(b.balanceAmount)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
        <div className="space-y-4">
          <Card className="space-y-2 p-4 text-[0.8125rem] text-slate-700">
            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{g.phone}{g.altPhone ? ` · ${g.altPhone}` : ''}</p>
            <p className="flex items-center gap-2"><IdCard className="h-4 w-4 text-slate-400" />{g.idNumber ? `${g.idType ?? 'CNIC'} ${g.idNumber}` : 'ID nahi'}</p>
            {(g.address || g.city) && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" />{[g.address, g.city, g.nationality].filter(Boolean).join(', ')}</p>}
            {g.companyName && <p className="flex items-center gap-2"><Building2 className="h-4 w-4 text-slate-400" />{g.companyName}{g.designation ? ` · ${g.designation}` : ''}</p>}
            {g.specialRequests && <p className="rounded-lg bg-slate-50 px-2.5 py-2">Pasand: {g.specialRequests}</p>}
            {g.notes && <p className="rounded-lg bg-slate-50 px-2.5 py-2">{g.notes}</p>}
          </Card>
          {canEdit && (
            <Card className="grid gap-2 p-4">
              <Button variant="secondary" leftIcon={<Star className="h-4 w-4" />} loading={vip.isPending} onClick={() => vip.mutate()}>{g.isVIP ? 'VIP hatayein' : 'VIP banayein'}</Button>
              <Button variant="secondary" leftIcon={g.isBlacklisted ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />} onClick={() => (g.isBlacklisted ? block.mutate() : setBlocking(true))}>{g.isBlacklisted ? 'Blacklist se hatayein' : 'Blacklist karein'}</Button>
              <Button variant="ghost" className="text-rose-700" leftIcon={<Trash2 className="h-4 w-4" />} loading={hide.isPending}
                onClick={async () => { if (await ask({ title: 'Guest list se hatayein?', text: 'Purani stays aur bill rehte hain; sirf list se chhup jata hai.', yes: 'Hatayein', danger: true })) hide.mutate(); }}>List se hatayein</Button>
            </Card>
          )}
        </div>
      </div>

      {editing && <GuestForm guest={g} onClose={() => setEditing(false)} onDone={() => { setEditing(false); refresh(); }} />}
      {blocking && (
        <Modal open onClose={() => setBlocking(false)} size="sm" title="Blacklist karein?" description={g.fullName}
          footer={<><Button variant="secondary" onClick={() => setBlocking(false)}>Rehne dein</Button><Button variant="danger" disabled={!reason.trim()} loading={block.isPending} onClick={() => block.mutate()}>Blacklist</Button></>}>
          <Input data-autofocus label="Wajah" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Bill nahi diya, room ka nuqsan…" hint="Check-in par ye wajah dikhegi aur system rok dega" />
        </Modal>
      )}
      {confirmDialog}
    </PageShell>
  );
}
