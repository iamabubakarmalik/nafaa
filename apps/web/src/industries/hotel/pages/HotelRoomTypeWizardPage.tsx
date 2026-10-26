/**
 * Room type form (new and edit): name, rate per night with weekend and
 * season rates, how many people, beds and extra bed, amenities, and — for a
 * new type — its room numbers, saved together in one step.
 *
 * Keys: Ctrl+S save · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BedDouble, GraduationCap, Hash, Loader2, Save, Sparkles, Users, Wallet, X } from 'lucide-react';
import { Button, Card, Checkbox, Input, Kbd, PageHero, PageShell, Select, Skeleton, Switch, Textarea, heroButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { formatPKR } from '@core/lib/format';
import { roomTypesApi, type BedType, type RoomType, type RoomTypeInput } from '../api/room-types.api';
import { ALL_HOTEL_KEYS, HOTEL_KEYS, apiError, moneyInput, num } from '../components/meta';

const TYPES: Array<{ id: RoomType; label: string }> = [
  { id: 'SINGLE', label: 'Single' }, { id: 'DOUBLE', label: 'Double' }, { id: 'TWIN', label: 'Twin' }, { id: 'TRIPLE', label: 'Triple' },
  { id: 'FAMILY', label: 'Family' }, { id: 'DELUXE', label: 'Deluxe' }, { id: 'EXECUTIVE', label: 'Executive' }, { id: 'SUITE', label: 'Suite' },
  { id: 'DORMITORY', label: 'Dormitory / hostel' }, { id: 'APARTMENT', label: 'Apartment' }, { id: 'VILLA', label: 'Villa / cottage' }, { id: 'OTHER', label: 'Doosra' },
];
const BEDS: Array<{ id: BedType; label: string }> = [
  { id: 'SINGLE_BED', label: 'Single bed' }, { id: 'DOUBLE_BED', label: 'Double bed' }, { id: 'QUEEN_BED', label: 'Queen bed' }, { id: 'KING_BED', label: 'King bed' },
  { id: 'TWIN_BEDS', label: 'Do single bed' }, { id: 'BUNK_BED', label: 'Bunk bed' }, { id: 'SOFA_BED', label: 'Sofa bed' }, { id: 'CUSTOM', label: 'Doosra' },
];
const AMENITIES: Array<{ key: keyof Pick<RoomTypeInput, 'hasAC' | 'hasHeater' | 'hasTV' | 'hasWifi' | 'hasBalcony' | 'hasKitchen' | 'hasBathtub' | 'hasSafe' | 'hasMinibar' | 'isSmoking'>; label: string }> = [
  { key: 'hasAC', label: 'AC' }, { key: 'hasHeater', label: 'Heater / geyser' }, { key: 'hasTV', label: 'TV' }, { key: 'hasWifi', label: 'WiFi' },
  { key: 'hasMinibar', label: 'Minibar / fridge' }, { key: 'hasBalcony', label: 'Balcony' }, { key: 'hasKitchen', label: 'Kitchen' },
  { key: 'hasBathtub', label: 'Bathtub' }, { key: 'hasSafe', label: 'Locker' }, { key: 'isSmoking', label: 'Smoking allowed' },
];

type Form = Record<'name' | 'code' | 'description' | 'maxAdults' | 'maxChildren' | 'maxOccupancy' | 'bedCount' | 'extraBedPrice' | 'basePrice' | 'weekendPrice' | 'peakPrice' | 'offSeasonPrice' | 'hourlyPrice', string>
  & { type: RoomType; bedType: BedType; extraBedAllowed: boolean; isActive: boolean; flags: Record<string, boolean>; amenities: string[] };

const blank: Form = {
  name: '', code: '', description: '', maxAdults: '2', maxChildren: '1', maxOccupancy: '3', bedCount: '1', extraBedPrice: '', basePrice: '', weekendPrice: '',
  peakPrice: '', offSeasonPrice: '', hourlyPrice: '', type: 'DOUBLE', bedType: 'DOUBLE_BED', extraBedAllowed: false, isActive: true,
  flags: { hasAC: true, hasTV: true, hasWifi: true }, amenities: [],
};

/** "101-110" or "101, 102, 201" → room numbers. */
function parseRooms(text: string) {
  const out: string[] = [];
  for (const part of text.split(/[,\s]+/).filter(Boolean)) {
    const m = /^([A-Za-z]*)(\d+)-([A-Za-z]*)?(\d+)$/.exec(part);
    if (m && Number(m[4]) >= Number(m[2]) && Number(m[4]) - Number(m[2]) < 300) {
      for (let n = Number(m[2]); n <= Number(m[4]); n++) out.push(`${m[1]}${String(n).padStart(m[2].length, '0')}`);
    } else out.push(part);
  }
  return [...new Set(out)];
}

export default function HotelRoomTypeWizardPage() {
  const { id } = useParams();
  const edit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [f, setF] = useState<Form>(blank);
  const [roomsText, setRoomsText] = useState('');
  const [floor, setFloor] = useState('');
  const [newAmenity, setNewAmenity] = useState('');
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const existing = useQuery({ queryKey: [HOTEL_KEYS.roomTypes, 'one', id], queryFn: () => roomTypesApi.getOne(id!), enabled: edit });
  useEffect(() => {
    const t = existing.data;
    if (!t) return;
    const s = (v?: number | null) => (v != null && v > 0 ? String(v) : '');
    setF({
      name: t.name, code: t.code, description: t.description ?? '', maxAdults: String(t.maxAdults), maxChildren: String(t.maxChildren), maxOccupancy: String(t.maxOccupancy),
      bedCount: String(t.bedCount), extraBedPrice: s(t.extraBedPrice), basePrice: s(t.basePrice), weekendPrice: s(t.weekendPrice), peakPrice: s(t.peakPrice),
      offSeasonPrice: s(t.offSeasonPrice), hourlyPrice: s(t.hourlyPrice), type: t.type, bedType: t.bedType, extraBedAllowed: t.extraBedAllowed, isActive: t.isActive,
      flags: Object.fromEntries(AMENITIES.map((a) => [a.key, !!t[a.key]])), amenities: t.amenities ?? [],
    });
  }, [existing.data]);

  const rooms = useMemo(() => parseRooms(roomsText), [roomsText]);
  const errors = {
    name: !f.name.trim() ? 'Room type ka naam likhein' : null,
    basePrice: !(num(f.basePrice) > 0) ? 'Ek raat ka rate likhein' : null,
    occupancy: num(f.maxOccupancy) < (num(f.maxAdults) || 1) ? 'Kul log, bado se kam nahi ho sakte' : null,
    extraBed: f.extraBedAllowed && !(num(f.extraBedPrice) > 0) ? 'Extra bed ka rate likhein' : null,
  };
  const firstError = Object.values(errors).find(Boolean) ?? null;
  const opt = (v: string) => (v ? num(v) : null);

  const save = useMutation({
    mutationFn: () => {
      const body: RoomTypeInput = {
        name: f.name.trim(), code: f.code.trim().toUpperCase() || undefined, type: f.type, description: f.description.trim() || undefined,
        maxAdults: num(f.maxAdults) || 1, maxChildren: num(f.maxChildren), maxOccupancy: num(f.maxOccupancy) || 1,
        bedType: f.bedType, bedCount: num(f.bedCount) || 1, extraBedAllowed: f.extraBedAllowed, extraBedPrice: f.extraBedAllowed ? num(f.extraBedPrice) : 0,
        basePrice: num(f.basePrice), weekendPrice: opt(f.weekendPrice), peakPrice: opt(f.peakPrice), offSeasonPrice: opt(f.offSeasonPrice), hourlyPrice: opt(f.hourlyPrice),
        ...Object.fromEntries(AMENITIES.map((a) => [a.key, !!f.flags[a.key]])), amenities: f.amenities, isActive: f.isActive,
      };
      return edit ? roomTypesApi.update(id!, body) : roomTypesApi.create({ ...body, rooms: rooms.map((n) => ({ roomNumber: n, floor: floor.trim() || undefined })) });
    },
    onSuccess: (t) => {
      ALL_HOTEL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(edit ? `${t.name} save ho gaya` : `${t.name} ban gaya${rooms.length ? ` · ${rooms.length} room` : ''}`);
      navigate(`/hotel-room-types/${t.id}`);
    },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  const submit = () => { setTried(true); if (firstError) { toast.error(firstError); return; } save.mutate(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (edit && existing.isLoading) return <PageShell><Skeleton className="h-96 rounded-3xl" /></PageShell>;
  const err = (k: keyof typeof errors) => (tried ? errors[k] ?? undefined : undefined);

  return (
    <PageShell>
      <PageHero
        back={edit ? `/hotel-room-types/${id}` : '/hotel/room-types'}
        title={edit ? `${existing.data?.name ?? ''} badlein` : 'Naya room type'}
        subtitle="Rate, log, bed, sahulat aur room numbers"
        meta={<span className="inline-flex items-center gap-1"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save · <Kbd>G</Kbd> guide</span>}
        actions={<>
          <button type="button" onClick={guide.open} className={heroButton}><GraduationCap className="h-4 w-4" />Guide</button>
          <button type="button" onClick={submit} disabled={save.isPending} className={heroPrimaryButton}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save karein
          </button>
        </>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={<span className="flex items-center gap-2"><BedDouble className="h-4 w-4 text-slate-400" />Pehchan</span>}>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <Input label="Naam" required value={f.name} onChange={(e) => set('name', e.target.value)} error={err('name')} placeholder="Deluxe Double" hint="Bill aur booking par yahi naam" />
              <Input label="Code" value={f.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="DLX" hint="Khaali chhorein to khud" />
            </div>
            <Select label="Kis tarah ka" value={f.type} onChange={(e) => set('type', e.target.value as RoomType)} options={TYPES.map((t) => ({ value: t.id, label: t.label }))} />
            <Textarea label="Tafseel" rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Sarak ki taraf, attached bath…" />
            {edit && <Switch checked={f.isActive} onChange={(e) => set('isActive', e.target.checked)} label="Chalu" description="Band type ke room nayi booking nahi lete" />}
          </div>
        </Card>

        <Card title={<span className="flex items-center gap-2"><Wallet className="h-4 w-4 text-slate-400" />Rate</span>}>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Ek raat ka rate" required inputMode="decimal" value={f.basePrice} onChange={(e) => set('basePrice', moneyInput(e.target.value))} error={err('basePrice')} placeholder="8000" />
              <Input label="Weekend rate" inputMode="decimal" value={f.weekendPrice} onChange={(e) => set('weekendPrice', moneyInput(e.target.value))} hint="Juma aur Hafta ki raat; khaali = wohi rate" />
              <Input label="Season (peak) rate" inputMode="decimal" value={f.peakPrice} onChange={(e) => set('peakPrice', moneyInput(e.target.value))} hint="Season rates me 'Peak' plan par lagta hai" />
              <Input label="Off-season rate" inputMode="decimal" value={f.offSeasonPrice} onChange={(e) => set('offSeasonPrice', moneyInput(e.target.value))} />
              <Input label="Ghante ka rate" inputMode="decimal" value={f.hourlyPrice} onChange={(e) => set('hourlyPrice', moneyInput(e.target.value))} hint="Din me thori der ke liye (marzi)" />
            </div>
            {num(f.basePrice) > 0 && <p className="text-[0.75rem] text-slate-500">Hafte ke 7 raat: {formatPKR(num(f.basePrice) * 5 + (num(f.weekendPrice) || num(f.basePrice)) * 2)}</p>}
          </div>
        </Card>

        <Card title={<span className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-400" />Log aur bed</span>}>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Input label="Bade" inputMode="numeric" value={f.maxAdults} onChange={(e) => set('maxAdults', e.target.value.replace(/\D/g, ''))} />
              <Input label="Bachay" inputMode="numeric" value={f.maxChildren} onChange={(e) => set('maxChildren', e.target.value.replace(/\D/g, ''))} />
              <Input label="Kul log" inputMode="numeric" value={f.maxOccupancy} onChange={(e) => set('maxOccupancy', e.target.value.replace(/\D/g, ''))} error={err('occupancy')} />
            </div>
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <Select label="Bed" value={f.bedType} onChange={(e) => set('bedType', e.target.value as BedType)} options={BEDS.map((b) => ({ value: b.id, label: b.label }))} />
              <Input label="Kitne" inputMode="numeric" value={f.bedCount} onChange={(e) => set('bedCount', e.target.value.replace(/\D/g, ''))} />
            </div>
            <Switch checked={f.extraBedAllowed} onChange={(e) => set('extraBedAllowed', e.target.checked)} label="Extra bed lag sakta hai" description="Har extra bed se ek banda zyada" />
            {f.extraBedAllowed && <Input label="Extra bed fi raat" inputMode="decimal" value={f.extraBedPrice} onChange={(e) => set('extraBedPrice', moneyInput(e.target.value))} error={err('extraBed')} />}
          </div>
        </Card>

        <Card title={<span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-slate-400" />Sahulat</span>}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {AMENITIES.map((a) => <Checkbox key={a.key} label={a.label} checked={!!f.flags[a.key]} onChange={(e) => set('flags', { ...f.flags, [a.key]: e.target.checked })} />)}
            </div>
            <div className="flex gap-2">
              <Input wrapperClassName="flex-1" value={newAmenity} onChange={(e) => setNewAmenity(e.target.value)} placeholder="Aur: nashta, parking…"
                onKeyDown={(e) => { if (e.key === 'Enter' && newAmenity.trim()) { e.preventDefault(); set('amenities', [...new Set([...f.amenities, newAmenity.trim()])]); setNewAmenity(''); } }} />
              <Button variant="secondary" disabled={!newAmenity.trim()} onClick={() => { set('amenities', [...new Set([...f.amenities, newAmenity.trim()])]); setNewAmenity(''); }}>Jorein</Button>
            </div>
            {f.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {f.amenities.map((a) => <span key={a} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2.5 pr-1 text-[0.75rem]">{a}<button type="button" onClick={() => set('amenities', f.amenities.filter((x) => x !== a))} className="rounded-full p-0.5 hover:bg-slate-200" aria-label="Hatayein"><X className="h-3 w-3" /></button></span>)}
              </div>
            )}
          </div>
        </Card>

        {!edit && (
          <Card className="lg:col-span-2" title={<span className="flex items-center gap-2"><Hash className="h-4 w-4 text-slate-400" />Room numbers</span>}>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
                <Input label="Is type ke room" value={roomsText} onChange={(e) => setRoomsText(e.target.value)} placeholder="101-110 ya 101, 102, 205" hint="Range (101-110) ya comma se. Baad me Room board → setup se bhi jor sakte hain." />
                <Input label="Manzil" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="1" />
              </div>
              {rooms.length > 0 && <p className="text-[0.8125rem] text-slate-700">{rooms.length} room banenge: <span className="font-semibold">{rooms.slice(0, 30).join(', ')}{rooms.length > 30 ? '…' : ''}</span></p>}
            </div>
          </Card>
        )}
      </div>

      {guide.isOpen && (
        <PageGuide title="Room type — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: BedDouble, color: '#4f46e5', title: 'Naam', text: 'Ek jaise room ek type. Jaise "Standard Single", "Deluxe Double", "Family Suite".' },
            { icon: Wallet, color: '#16a34a', title: 'Rate', text: 'Ek raat ka rate zaroori. Weekend rate Juma aur Hafta ki raat par khud lagta hai.' },
            { icon: Users, color: '#0891b2', title: 'Log', text: 'Kitne log thehar sakte hain — booking me zyada log likhe to system rokta hai (extra bed se barh sakte hain).' },
            { icon: Hash, color: '#ea580c', title: 'Room numbers', text: '101-110 likhein to 10 room ek saath ban jate hain.' },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
