/**
 * Room board: every room by floor with what the desk needs now — guest in
 * it, today's arrival, cleaning or repair — and one tap to book, check in a
 * walk-in, open the stay or change the room's state. The Setup tab adds,
 * edits and switches off rooms.
 *
 * Keys: / search · 1 board · 2 setup · N new room · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, BedDouble, CalendarCheck, CalendarPlus, DoorOpen, Filter, GraduationCap, Layers, LayoutGrid, LogIn, Pencil, Plus, Power, Settings2, Sparkles, Wrench,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Table, TBody, Td, Textarea, Th, THead, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { roomsApi, type BoardRoom, type HotelRoom, type RoomStatus } from '../api/rooms.api';
import { roomTypesApi } from '../api/room-types.api';
import { useConfirm } from '../components/useConfirm';
import { ALL_HOTEL_KEYS, HK_STATUS, HOTEL_KEYS, MANUAL_ROOM_STATUS, ROOM_STATUS, apiError, moneyInput, num, roomStatusOf, stayDay, todayKey } from '../components/meta';

type Tab = 'board' | 'setup';

function RoomTile({ r, onClick }: { r: BoardRoom; onClick: () => void }) {
  const st = roomStatusOf(r.live);
  const stay = r.current ?? r.arrival;
  return (
    <button type="button" onClick={onClick}
      className={cn('relative flex min-h-[6.5rem] flex-col rounded-2xl p-3 text-left ring-1 transition hover:-translate-y-0.5 hover:shadow-md', st.tile)}>
      <span className="flex items-start justify-between gap-2">
        <span className="text-[1.25rem] font-bold leading-none text-slate-900">{r.roomNumber}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[0.625rem] font-semibold text-slate-700"><span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}</span>
      </span>
      <span className="mt-0.5 truncate text-[0.6875rem] text-slate-500">{r.roomType?.name}</span>
      {stay && <span className="mt-auto truncate pt-1 text-[0.8125rem] font-medium text-slate-800">{stay.guestName}</span>}
      <span className="flex flex-wrap gap-1 pt-0.5 text-[0.625rem] font-semibold">
        {r.overdue && <span className="rounded bg-rose-600 px-1 text-white">Late</span>}
        {!r.overdue && r.departingToday && <span className="rounded bg-rose-100 px-1 text-rose-700">Aaj ja raha</span>}
        {r.current && !r.departingToday && r.nightsLeft != null && <span className="text-slate-500">{r.nightsLeft} raat baqi</span>}
        {!r.current && !r.arrival && r.next && <span className="text-slate-500">Agli: {stayDay(r.next.checkInDate)}</span>}
        {r.housekeepingStatus === 'DIRTY' && <span className="rounded bg-amber-100 px-1 text-amber-800">Ganda</span>}
      </span>
    </button>
  );
}

function RoomActions({ r, canManage, onClose, onDone }: { r: BoardRoom; canManage: boolean; onClose: () => void; onDone: () => void }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<RoomStatus>(MANUAL_ROOM_STATUS.includes(r.status) ? r.status : 'AVAILABLE');
  const [notes, setNotes] = useState(r.maintenanceNotes ?? '');
  const save = useMutation({
    mutationFn: () => roomsApi.updateStatus(r.id, status, notes.trim() || undefined),
    onSuccess: () => { toast.success(`Room ${r.roomNumber}: ${roomStatusOf(status).label}`); onDone(); },
    onError: (e) => toast.error(apiError(e, 'Status nahi badla')),
  });
  const clean = useMutation({
    mutationFn: () => roomsApi.updateHousekeeping(r.id, 'CLEAN'),
    onSuccess: () => { toast.success(`Room ${r.roomNumber} saaf`); onDone(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const stay = r.current ?? r.arrival;
  const free = !r.current && !['MAINTENANCE', 'OUT_OF_ORDER', 'BLOCKED'].includes(r.status);
  return (
    <Modal open onClose={onClose} size="sm" title={`Room ${r.roomNumber}`} description={`${r.roomType?.name ?? ''} · ${roomStatusOf(r.live).label} · ${HK_STATUS[r.housekeepingStatus]?.label ?? ''}`}>
      <div className="space-y-3">
        {stay && (
          <Link to={`/hotel/bookings/${stay.id}`} className="block rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200 hover:bg-slate-100">
            <span className="block text-[0.875rem] font-semibold text-slate-900">{stay.guestName} · {stay.bookingNumber}</span>
            <span className="block text-[0.75rem] text-slate-500">{stayDay(stay.checkInDate)} → {stayDay(stay.checkOutDate)} · {r.current ? 'andar hai' : 'aaj aana hai'}{stay.balanceAmount > 0 ? ` · ${formatPKR(stay.balanceAmount)} baqi` : ''}</span>
          </Link>
        )}
        {canManage && free && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" leftIcon={<CalendarPlus className="h-4 w-4" />} onClick={() => navigate(`/hotel/bookings/new?roomId=${r.id}&checkIn=${todayKey()}`)}>Booking</Button>
            <Button leftIcon={<LogIn className="h-4 w-4" />} onClick={() => navigate(`/hotel/bookings/new?roomId=${r.id}&checkIn=${todayKey()}&walkin=1`)}>Walk-in</Button>
          </div>
        )}
        {canManage && r.housekeepingStatus !== 'CLEAN' && r.housekeepingStatus !== 'INSPECTED' && (
          <Button fullWidth variant="success" loading={clean.isPending} leftIcon={<Sparkles className="h-4 w-4" />} onClick={() => clean.mutate()}>Saaf ho gaya</Button>
        )}
        {canManage && !r.current && (
          <div className="space-y-2 rounded-xl p-3 ring-1 ring-slate-200">
            <Select label="Room ki halat" value={status} onChange={(e) => setStatus(e.target.value as RoomStatus)} options={MANUAL_ROOM_STATUS.map((s) => ({ value: s, label: ROOM_STATUS[s].label }))} />
            {['MAINTENANCE', 'OUT_OF_ORDER', 'BLOCKED'].includes(status) && <Textarea rows={2} label="Kya masla hai" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="AC ki gas, nalka tapak raha…" />}
            <Button fullWidth variant="secondary" loading={save.isPending} disabled={status === r.status && notes === (r.maintenanceNotes ?? '')} onClick={() => save.mutate()}>Save</Button>
          </div>
        )}
        {r.current && <p className="text-[0.75rem] text-slate-500">Guest andar hai — room ki halat check-out ya room change se badalti hai.</p>}
        {r.maintenanceNotes && <p className="flex gap-2 text-[0.8125rem] text-orange-800"><Wrench className="mt-0.5 h-4 w-4 shrink-0" />{r.maintenanceNotes}</p>}
      </div>
    </Modal>
  );
}

function RoomForm({ room, onClose, onDone }: { room: HotelRoom | null; onClose: () => void; onDone: () => void }) {
  const types = useQuery({ queryKey: [HOTEL_KEYS.roomTypes, 'active'], queryFn: () => roomTypesApi.list({ active: true }) });
  const [f, setF] = useState({
    roomTypeId: room?.roomTypeId ?? '', roomNumber: room?.roomNumber ?? '', floor: room?.floor ?? '', building: room?.building ?? '',
    viewType: room?.viewType ?? '', customPrice: room?.customPrice ? String(room.customPrice) : '', customNotes: room?.customNotes ?? '',
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  useEffect(() => { if (!f.roomTypeId && types.data?.[0]) set('roomTypeId', types.data[0].id); }, [types.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const [tried, setTried] = useState(false);
  const bad = !f.roomNumber.trim() ? 'Room number likhein' : !f.roomTypeId ? 'Room type chunein' : null;
  const go = useMutation({
    mutationFn: () => {
      const body = { roomTypeId: f.roomTypeId, roomNumber: f.roomNumber.trim(), floor: f.floor.trim() || undefined, building: f.building.trim() || undefined, viewType: f.viewType.trim() || undefined, customPrice: f.customPrice ? num(f.customPrice) : null, customNotes: f.customNotes.trim() || undefined };
      return room ? roomsApi.update(room.id, body) : roomsApi.create(body);
    },
    onSuccess: () => { toast.success(room ? 'Room badal gaya' : `Room ${f.roomNumber} ban gaya`); onDone(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  const submit = () => { setTried(true); if (!bad) go.mutate(); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <Modal open onClose={onClose} size="md" title={room ? `Room ${room.roomNumber} badlein` : 'Naya room'} description="Ctrl+S se save"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={go.isPending} onClick={submit}>Save</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input data-autofocus label="Room number" required value={f.roomNumber} onChange={(e) => set('roomNumber', e.target.value)} placeholder="101" error={tried && !f.roomNumber.trim() ? 'Room number likhein' : undefined} />
        <Select label="Room type" required value={f.roomTypeId} onChange={(e) => set('roomTypeId', e.target.value)} options={(types.data ?? []).map((t) => ({ value: t.id, label: `${t.name} · ${formatPKR(t.basePrice)}` }))} error={tried && !f.roomTypeId ? 'Room type chunein' : undefined} />
        <Input label="Manzil" value={f.floor} onChange={(e) => set('floor', e.target.value)} placeholder="1" hint="Board par manzil ke hisaab se lagte hain" />
        <Input label="Block / building" value={f.building} onChange={(e) => set('building', e.target.value)} />
        <Input label="Is room ka apna rate" inputMode="decimal" value={f.customPrice} onChange={(e) => set('customPrice', moneyInput(e.target.value))} hint="Khaali chhorein to room type ka rate" />
        <Input label="View" value={f.viewType} onChange={(e) => set('viewType', e.target.value)} placeholder="Pahar, sarak…" />
        <Textarea wrapperClassName="sm:col-span-2" rows={2} label="Note" value={f.customNotes} onChange={(e) => set('customNotes', e.target.value)} />
      </div>
    </Modal>
  );
}

export default function RoomsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canManage = usePermission(PERMISSIONS.SERVICE_BOOKINGS_MANAGE);
  const canCreate = usePermission(PERMISSIONS.PRODUCTS_CREATE);
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const canDelete = usePermission(PERMISSIONS.PRODUCTS_DELETE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [ask, confirmDialog] = useConfirm();
  const [tab, setTab] = useState<Tab>('board');
  const [status, setStatus] = useState<'' | RoomStatus>('');
  const [typeId, setTypeId] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<BoardRoom | null>(null);
  const [form, setForm] = useState<HotelRoom | null | 'new'>(null);

  const board = useQuery({ queryKey: [HOTEL_KEYS.board], queryFn: () => roomsApi.board(), refetchInterval: 30_000 });
  const all = useQuery({ queryKey: [HOTEL_KEYS.rooms, 'setup'], queryFn: () => roomsApi.list({ includeInactive: true }), enabled: tab === 'setup' });
  const refresh = () => { ALL_HOTEL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); setOpen(null); setForm(null); };
  const off = useMutation({
    mutationFn: (r: HotelRoom) => (r.isActive ? roomsApi.remove(r.id) : roomsApi.update(r.id, { isActive: true })),
    onSuccess: (_, r) => { toast.success(r.isActive ? `Room ${r.roomNumber} band` : `Room ${r.roomNumber} chalu`); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });

  const rooms = useMemo(() => board.data?.rooms ?? [], [board.data]);
  const count = (s: RoomStatus) => rooms.filter((r) => r.live === s).length;
  const occupied = count('OCCUPIED');
  const types = useMemo(() => [...new Map(rooms.map((r) => [r.roomTypeId, r.roomType?.name ?? '—'])).entries()], [rooms]);
  const q = search.trim().toLowerCase();
  const shown = rooms.filter((r) => (!status || r.live === status || (status === 'MAINTENANCE' && ['OUT_OF_ORDER', 'BLOCKED'].includes(r.live)))
    && (!typeId || r.roomTypeId === typeId)
    && (!q || r.roomNumber.toLowerCase().includes(q) || (r.current ?? r.arrival)?.guestName.toLowerCase().includes(q) || (r.current ?? r.arrival)?.guestPhone.includes(q)));
  const floors = [...new Map(shown.map((r) => [r.floor || '—', 0])).keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const filtered = !!status || !!typeId || !!q;
  const late = rooms.filter((r) => r.overdue).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '1') setTab('board');
      if (e.key === '2') setTab('setup');
      if ((e.key === 'n' || e.key === 'N') && canCreate) { e.preventDefault(); setForm('new'); }
      if (e.key === '/') { e.preventDefault(); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canCreate]);

  const toggleRoom = async (r: HotelRoom) => {
    if (r.isActive && !(await ask({ title: `Room ${r.roomNumber} band karein?`, text: 'Nayi booking nahi le ga. Purana record rehta hai; baad me dobara chalu kar sakte hain.', yes: 'Band karein', danger: true }))) return;
    off.mutate(r);
  };

  return (
    <PageShell>
      <PageHero
        title="Room board"
        chip={<><LayoutGrid /> {stayDay(board.data?.today ?? todayKey(), { day: true })}</>}
        meta="Har room ka haal — guest, aamad, safai, marammat"
        busy={board.isFetching && !board.isLoading}
        loading={board.isLoading}
        actions={<>
          <Link to="/hotel/housekeeping" className={heroButton}><Sparkles className="h-4 w-4" /><span className="hidden sm:inline">Housekeeping</span></Link>
          <Link to="/hotel/room-types" className={heroButton}><Layers className="h-4 w-4" /><span className="hidden sm:inline">Room types</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <Link to="/hotel/bookings/new" className={heroPrimaryButton}><CalendarPlus className="h-4 w-4" /> Nayi booking</Link>}
        </>}
        stats={[
          { label: 'Occupancy', value: rooms.length ? `${Math.round((occupied / rooms.length) * 100)}%` : '—', hint: `${occupied}/${rooms.length} room` },
          { label: 'Khaali', value: count('AVAILABLE') },
          { label: 'Safai baqi', value: count('CLEANING') },
        ]}
      />

      <KpiRow cols={5}>
        {board.isLoading ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={DoorOpen} color="#16a34a" label="Khaali" value={count('AVAILABLE')} hint="Abhi bik sakte hain" onClick={() => setStatus(status === 'AVAILABLE' ? '' : 'AVAILABLE')} active={status === 'AVAILABLE'} />
          <KpiCard icon={BedDouble} color="#4f46e5" label="Guest hai" value={occupied} hint={late ? `${late} late check-out` : 'Andar guests'} onClick={() => setStatus(status === 'OCCUPIED' ? '' : 'OCCUPIED')} active={status === 'OCCUPIED'} />
          <KpiCard icon={CalendarCheck} color="#d97706" label="Aaj aane wale" value={count('RESERVED')} hint="Room tayyar rakhein" onClick={() => setStatus(status === 'RESERVED' ? '' : 'RESERVED')} active={status === 'RESERVED'} />
          <KpiCard icon={Sparkles} color="#0284c7" label="Safai" value={count('CLEANING')} hint={`${rooms.filter((r) => r.housekeepingStatus === 'DIRTY').length} ganday`} onClick={() => setStatus(status === 'CLEANING' ? '' : 'CLEANING')} active={status === 'CLEANING'} />
          <KpiCard icon={Wrench} color="#ea580c" label="Marammat / band" value={count('MAINTENANCE') + count('OUT_OF_ORDER') + count('BLOCKED')} hint="Bik nahi sakte" onClick={() => setStatus(status === 'MAINTENANCE' ? '' : 'MAINTENANCE')} active={status === 'MAINTENANCE'} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Room number, guest ka naam ya phone…" label="Search" />}
        chips={filtered ? <>
          {status && <FilterChip onRemove={() => setStatus('')}>{roomStatusOf(status).label}</FilterChip>}
          {typeId && <FilterChip onRemove={() => setTypeId('')}>{types.find(([id]) => id === typeId)?.[1]}</FilterChip>}
          {q && <FilterChip onRemove={() => setSearch('')}>"{search}"</FilterChip>}
        </> : undefined}
        onClear={() => { setStatus(''); setTypeId(''); setSearch(''); }}>
        <FilterMenu icon={Filter} label={status ? roomStatusOf(status).label : 'Halat'} value={status} active={!!status} onChange={setStatus}
          options={[{ value: '' as const, label: 'Sab' }, ...(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE'] as RoomStatus[]).map((s) => ({ value: s, label: ROOM_STATUS[s].label }))]} />
        <FilterMenu icon={Layers} label={typeId ? types.find(([id]) => id === typeId)?.[1] ?? 'Type' : 'Room type'} value={typeId} active={!!typeId} onChange={setTypeId} align="right"
          options={[{ value: '', label: 'Sab types' }, ...types.map(([id, name]) => ({ value: id, label: name }))]} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        hint={<><Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs{canCreate && <> · <Kbd>N</Kbd> naya room</>}</>}
        tabs={[{ id: 'board', label: 'Board', icon: LayoutGrid, count: shown.length }, { id: 'setup', label: 'Rooms setup', icon: Settings2 }]} />

      {tab === 'board' ? (
        board.isLoading ? <Skeleton className="h-72 rounded-3xl" /> : !rooms.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <BedDouble className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">Abhi koi room nahi</p>
            <p className="mt-1 text-sm text-slate-500">Pehle room type banayein (rate, kitne log) aur us ke room numbers.</p>
            {canCreate && <Link to="/hotel-room-types/new"><Button className="mt-4" leftIcon={<Plus className="h-4 w-4" />}>Room type + rooms</Button></Link>}
          </div>
        ) : !shown.length ? (
          <div className="rounded-3xl bg-white px-6 py-10 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">Is filter me koi room nahi</div>
        ) : (
          <div className="space-y-4">
            {floors.map((fl) => (
              <section key={fl} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
                <h3 className="mb-2 text-[0.8125rem] font-semibold text-slate-500">{fl === '—' ? 'Manzil nahi likhi' : `Manzil ${fl}`}</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8">
                  {shown.filter((r) => (r.floor || '—') === fl).map((r) => <RoomTile key={r.id} r={r} onClick={() => setOpen(r)} />)}
                </div>
              </section>
            ))}
            {late > 0 && <p className="flex items-center gap-2 text-[0.8125rem] text-rose-700"><AlertTriangle className="h-4 w-4" />{late} guest ki check-out date guzar chuki — stay barhayein ya check-out karein.</p>}
          </div>
        )
      ) : (
        <div className="space-y-3">
          {canCreate && <div className="flex justify-end"><Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setForm('new')}>Naya room</Button></div>}
          {all.isLoading ? <Skeleton className="h-60 rounded-3xl" /> : (
            <Table minWidth="40rem">
              <THead><Tr><Th>Room</Th><Th>Type</Th><Th>Manzil</Th><Th align="right">Rate</Th><Th>Halat</Th><Th /></Tr></THead>
              <TBody>
                {(all.data ?? []).filter((r) => !q || r.roomNumber.toLowerCase().includes(q)).map((r) => (
                  <Tr key={r.id} className={cn(!r.isActive && 'opacity-50')}>
                    <Td className="font-semibold text-slate-900">{r.roomNumber}</Td>
                    <Td>{r.roomType?.name}</Td>
                    <Td>{r.floor ?? '—'}</Td>
                    <Td align="right" className="tabular-nums">{formatPKR(r.customPrice || r.roomType?.basePrice || 0)}{r.customPrice ? ' *' : ''}</Td>
                    <Td>{r.isActive ? roomStatusOf(r.status).label : 'Band'}</Td>
                    <Td align="right" className="whitespace-nowrap">
                      {canEdit && <button type="button" onClick={() => setForm(r)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Badlein"><Pencil className="h-4 w-4" /></button>}
                      {(r.isActive ? canDelete : canEdit) && <button type="button" onClick={() => toggleRoom(r)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label={r.isActive ? 'Band karein' : 'Chalu karein'}><Power className="h-4 w-4" /></button>}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
          <p className="text-[0.75rem] text-slate-500">* is room ka apna rate. Band room ka record rehta hai; wo nayi booking nahi leta.</p>
        </div>
      )}

      {open && <RoomActions r={open} canManage={canManage} onClose={() => setOpen(null)} onDone={refresh} />}
      {form && <RoomForm room={form === 'new' ? null : form} onClose={() => setForm(null)} onDone={refresh} />}
      {confirmDialog}

      {guide.isOpen && (
        <PageGuide title="Room board — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: LayoutGrid, color: '#4f46e5', title: 'Rang se haal', text: 'Hara khaali, neela-jamni guest hai, peela aaj aane wala, aasmani safai, naranji marammat.' },
            { icon: LogIn, color: '#16a34a', title: 'Room par tap', text: 'Khaali room: booking ya walk-in. Bhara room: stay kholein (charges, check-out).' },
            { icon: Sparkles, color: '#0284c7', title: 'Safai', text: 'Check-out ke baad room khud "Safai" me jata hai aur housekeeping ka kaam banta hai. "Saaf ho gaya" se room dobara khaali.' },
            { icon: Wrench, color: '#ea580c', title: 'Marammat', text: 'AC, nalka — room ko marammat ya band karein; wo booking me nahi aata.' },
          ]}
          tips={['Rooms setup (naya room, rate, band karna) ke liye products ki permission chahiye.', 'Board har 30 second me khud taaza hota hai.']}
          shortcuts={[['/', 'dhoondein'], ['1', 'board'], ['2', 'setup'], ['N', 'naya room'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
