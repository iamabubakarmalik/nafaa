/**
 * Stations: each PS5, PC, simulator or room with its hourly rates (normal,
 * half hour, peak, off-peak), minimum billed minutes and installed games.
 * Stations are switched off, never deleted, so their sessions stay. A
 * station under repair is marked so it cannot be started.
 *
 * Keys: N new station · / search · G guide.
 */

import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, Gamepad2, GraduationCap, Monitor, Pencil, Plus, Power, Timer, Wallet, Wrench } from 'lucide-react';
import {
  Button, FilterBar, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Textarea,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { gamingStationsApi, type GamingStation, type GamingStationType } from '../api/stations.api';
import { Empty, ListCard, Pill } from '../components/ui';
import { usePageKeys, useSaveKey } from '../hooks/usePageKeys';
import { GAMING_KEYS, PLATFORMS, STATION_TYPES, errorText, moneyText, numIn } from '../lib/meta';
import { t as tr } from '@core/i18n';

const SHOW = [{ value: 'on', label: tr('Chalu') }, { value: 'off', label: tr('Band') }, { value: 'all', label: tr('Sab') }];

export default function GamingStationsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const canWork = usePermission(PERMISSIONS.POS_USE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [show, setShow] = useState('on');
  const [form, setForm] = useState<GamingStation | 'new' | null>(null);
  const [repair, setRepair] = useState<GamingStation | null>(null);

  const listQ = useQuery({ queryKey: [GAMING_KEYS.stations, 'all'], queryFn: () => gamingStationsApi.list() });
  const all = listQ.data ?? [];
  const rows = useMemo(() => {
    const t = search.trim().toLowerCase();
    return all
      .filter((s) => (show === 'all' ? true : show === 'on' ? s.isActive : !s.isActive))
      .filter((s) => !t || [s.name, s.stationNumber, STATION_TYPES[s.stationType], s.location, ...s.installedGames].some((v) => v?.toLowerCase().includes(t)));
  }, [all, search, show]);
  const on = all.filter((s) => s.isActive);
  const totals = {
    busy: on.filter((s) => s.currentSession).length,
    repair: on.filter((s) => s.isUnderMaintenance).length,
    hours: on.reduce((a, s) => a + s.totalHoursUsed, 0),
    money: on.reduce((a, s) => a + s.totalRevenue, 0),
  };
  usePageKeys(searchRef, { n: () => { if (canEdit) setForm('new'); } });

  const refresh = () => [GAMING_KEYS.stations, GAMING_KEYS.active, GAMING_KEYS.counter].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const save = useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<GamingStation> }) => (id ? gamingStationsApi.update(id, data) : gamingStationsApi.create(data)),
    onSuccess: (s) => { toast.success(tr('{{name}} save ho gaya', { name: s.name })); setForm(null); refresh(); },
    onError: (e) => toast.error(errorText(e, tr('Save nahi hua'))),
  });
  const power = useMutation({
    mutationFn: (s: GamingStation) => (s.isActive ? gamingStationsApi.remove(s.id) : gamingStationsApi.update(s.id, { ...editable(s), isActive: true })),
    onSuccess: (s) => { toast.success(s.isActive ? `${s.name} chalu` : tr('{{name}} band — purane session waise hi', { name: s.name })); refresh(); },
    onError: (e) => toast.error(errorText(e, tr('Nahi hua'))),
  });
  const fix = useMutation({
    mutationFn: ({ s, notes }: { s: GamingStation; notes?: string }) => gamingStationsApi.toggleMaintenance(s.id, notes),
    onSuccess: (s) => { toast.success(s.isUnderMaintenance ? tr('{{name}} repair par', { name: s.name }) : tr('{{name}} phir chalu', { name: s.name })); setRepair(null); refresh(); },
    onError: (e) => toast.error(errorText(e, tr('Nahi hua'))),
  });

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title={tr('Stations — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Monitor, color: '#2563eb', title: tr('Station'), text: tr('Har PS5, PC, simulator ya room ek station hai — number (PS-1) aur naam likhein. Cafe Live par yahi dikhte hain.') },
            { icon: Wallet, color: '#16a34a', title: tr('Rate'), text: tr('Ghante ka rate zaroori hai. Aadhe ghante, rush (peak) aur khali waqt (off-peak) ke rate session shuru karte waqt chunne ko milte hain.') },
            { icon: Clock, color: '#d97706', title: tr('Kam se kam'), text: tr('"Kam se kam minute" — is se kam khelne par bhi itne minute ka bill banta hai (aam tor par 15 ya 30).') },
            { icon: Wrench, color: '#64748b', title: tr('Repair'), text: tr('Kharab station "Repair" par lagayein — Cafe Live par shuru nahi hota. Band karne se history nahi mit-ti.') },
          ]}
          shortcuts={[['N', tr('naya station')], ['/', 'search'], ['G', 'guide']]} />
      )}

      <PageHero title={tr('Stations')} chip={<><Monitor /> {' '}{tr('Gaming zone')}</>} loading={listQ.isLoading}
        meta={tr('PS5, PC aur simulator — rate, kam se kam minute aur games')}
        actions={<>
          {canWork && <Link to="/gaming/cafe" className={heroButton}><Timer className="h-4 w-4" /><span className="hidden sm:inline">{tr('Cafe Live')}</span></Link>}
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setForm('new')} title={tr('Naya station (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" />{tr('Station')}</button>}
        </>}
        stats={[
          { label: tr('Chalu stations'), value: String(on.length) },
          { label: tr('Abhi khel rahe'), value: String(totals.busy) },
          { label: tr('Kul kamai'), value: money(totals.money) },
        ]} />

      <KpiRow cols={4}>
        <KpiCard icon={Monitor} color="#2563eb" label={tr('Stations')} value={on.length} hint={tr('{{value}} band', { value: all.length - on.length })} />
        <KpiCard icon={Timer} color="#16a34a" label={tr('Khel rahe')} value={totals.busy} />
        <KpiCard icon={Wrench} color="#64748b" label={tr('Repair par')} value={totals.repair} onClick={() => setShow('on')} />
        <KpiCard icon={Clock} color="#7c3aed" label={tr('Kul ghante')} value={Math.round(totals.hours)} hint={money(totals.money)} />
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Station, number, jagah ya game…')} />}>
        <FilterMenu icon={Power} label={SHOW.find((x) => x.value === show)?.label ?? tr('Chalu')} value={show} active={show !== 'on'} options={SHOW} onChange={setShow} />
      </FilterBar>

      {listQ.isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-3xl" />)}</div>
        : rows.length === 0 ? (
          <ListCard><Empty icon={Monitor} title={search ? tr('Koi station nahi mila') : tr('Abhi koi station nahi')} text={tr('PS5, PC ya simulator jorein — har ek ka ghante ka rate likhein.')}
            action={canEdit && !search ? <Button onClick={() => setForm('new')}><Plus className="h-4 w-4" />{tr('Station jorein')}</Button> : undefined} /></ListCard>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((s) => (
              <li key={s.id} className={cn('rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80', !s.isActive && 'opacity-60')}>
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Gamepad2 className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{s.name} <span className="font-mono text-[0.75rem] font-normal text-slate-400">{s.stationNumber}</span></p>
                    <p className="truncate text-[0.75rem] text-slate-500">{[STATION_TYPES[s.stationType], s.platform ? PLATFORMS[s.platform] : null, s.location].filter(Boolean).join(' · ')}</p>
                  </div>
                  {!s.isActive ? <Pill tone="bg-slate-100 text-slate-600 ring-slate-200">{tr('Band')}</Pill>
                    : s.isUnderMaintenance ? <Pill tone="bg-amber-50 text-amber-800 ring-amber-200">{tr('Repair')}</Pill>
                      : s.currentSession ? <Pill tone="bg-emerald-50 text-emerald-700 ring-emerald-200">{tr('Khel rahe')}</Pill>
                        : <Pill tone="bg-sky-50 text-sky-700 ring-sky-200">{tr('Khali')}</Pill>}
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-2.5 text-center text-[0.75rem]">
                  <div><dt className="text-slate-500">{tr('Ghanta')}</dt><dd className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{money(s.pricePerHour)}</dd></div>
                  <div><dt className="text-slate-500">{tr('Kam se kam')}</dt><dd className="text-[0.9375rem] font-bold text-slate-900">{tr('{{minimumMinutes}} min', { minimumMinutes: s.minimumMinutes })}</dd></div>
                  <div><dt className="text-slate-500">{tr('Kamai')}</dt><dd className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{money(s.totalRevenue)}</dd></div>
                </dl>
                {(s.peakHourPrice || s.offPeakPrice || s.pricePerHalfHour) && (
                  <p className="mt-2 text-[0.75rem] text-slate-500">{[s.pricePerHalfHour && `Aadha ghanta ${money(s.pricePerHalfHour)}`, s.peakHourPrice && `Rush ${money(s.peakHourPrice)}`, s.offPeakPrice && `Khali waqt ${money(s.offPeakPrice)}`].filter(Boolean).join(' · ')}</p>
                )}
                {s.isUnderMaintenance && s.maintenanceNotes && <p className="mt-2 text-[0.75rem] text-amber-800">{s.maintenanceNotes}</p>}
                {s.installedGames.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{s.installedGames.slice(0, 6).map((g) => <span key={g} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-700">{g}</span>)}</div>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {canEdit && <Button size="sm" variant="ghost" onClick={() => setForm(s)}><Pencil className="h-3.5 w-3.5" />{tr('Badlein')}</Button>}
                  {canWork && s.isActive && <Button size="sm" variant="ghost" onClick={() => (s.isUnderMaintenance ? fix.mutate({ s }) : setRepair(s))}><Wrench className="h-3.5 w-3.5" />{s.isUnderMaintenance ? tr('Theek ho gaya') : tr('Repair')}</Button>}
                  {canEdit && <Button size="sm" variant="ghost" className="ms-auto" loading={power.isPending && power.variables?.id === s.id} onClick={() => power.mutate(s)}><Power className="h-3.5 w-3.5" />{s.isActive ? tr('Band') : tr('Chalu')}</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}

      {form && <StationModal station={form === 'new' ? null : form} pending={save.isPending} onSave={(data) => save.mutate({ id: form === 'new' ? undefined : form.id, data })} onClose={() => setForm(null)} />}
      {repair && <RepairModal station={repair} pending={fix.isPending} onSave={(notes) => fix.mutate({ s: repair, notes })} onClose={() => setRepair(null)} />}
    </PageShell>
  );
}

/** Fields the API accepts back on update. */
function editable(s: GamingStation): Partial<GamingStation> {
  return {
    stationNumber: s.stationNumber, name: s.name, stationType: s.stationType, location: s.location, platform: s.platform, installedGames: s.installedGames,
    pricePerHour: s.pricePerHour, pricePerHalfHour: s.pricePerHalfHour ?? undefined, peakHourPrice: s.peakHourPrice ?? undefined,
    offPeakPrice: s.offPeakPrice ?? undefined, minimumMinutes: s.minimumMinutes, notes: s.notes,
  };
}

function StationModal({ station, pending, onSave, onClose }: { station: GamingStation | null; pending: boolean; onSave: (d: Partial<GamingStation>) => void; onClose: () => void }) {
  const [v, setV] = useState({
    stationNumber: station?.stationNumber ?? '', name: station?.name ?? '', stationType: (station?.stationType ?? 'PS5_STATION') as GamingStationType,
    platform: station?.platform ?? '', location: station?.location ?? '', pricePerHour: station ? String(station.pricePerHour) : '',
    pricePerHalfHour: station?.pricePerHalfHour ? String(station.pricePerHalfHour) : '', peakHourPrice: station?.peakHourPrice ? String(station.peakHourPrice) : '',
    offPeakPrice: station?.offPeakPrice ? String(station.offPeakPrice) : '', minimumMinutes: String(station?.minimumMinutes ?? 15),
    games: (station?.installedGames ?? []).join(', '), notes: station?.notes ?? '',
  });
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));
  const rate = numIn(v.pricePerHour);
  const mins = Number(v.minimumMinutes);
  const errors = {
    stationNumber: !v.stationNumber.trim() ? tr('Number likhein (PS-1)') : undefined,
    name: !v.name.trim() ? tr('Naam likhein') : undefined,
    pricePerHour: rate === null ? tr('Ghante ka rate likhein') : undefined,
    minimumMinutes: !Number.isFinite(mins) || mins < 0 || mins > 600 ? tr('0 se 600 tak') : undefined,
  };
  const bad = Object.values(errors).some(Boolean);
  const [tried, setTried] = useState(false);
  const submit = () => {
    setTried(true);
    if (bad || pending) return;
    const opt = (s: string) => (numIn(s) ?? undefined);
    onSave({
      stationNumber: v.stationNumber.trim(), name: v.name.trim(), stationType: v.stationType, platform: v.platform || undefined, location: v.location.trim() || undefined,
      pricePerHour: rate ?? 0, pricePerHalfHour: opt(v.pricePerHalfHour), peakHourPrice: opt(v.peakHourPrice), offPeakPrice: opt(v.offPeakPrice),
      minimumMinutes: Math.round(mins), installedGames: v.games.split(',').map((g) => g.trim()).filter(Boolean), notes: v.notes.trim() || undefined,
    });
  };
  useSaveKey(submit);
  const e = (k: keyof typeof errors) => (tried ? errors[k] : undefined);
  return (
    <Modal open onClose={onClose} size="lg" title={station ? tr('{{name}} — badlein', { name: station.name }) : tr('Naya station')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button loading={pending} onClick={submit}>{tr('Save (Ctrl+S)')}</Button></>}>
      <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={tr('Number')} required autoFocus value={v.stationNumber} onChange={(x) => set({ stationNumber: x.target.value.toUpperCase() })} placeholder={tr('PS-1')} error={e('stationNumber')} hint={tr('Har station ka alag')} />
          <Input label={tr('Naam')} required value={v.name} onChange={(x) => set({ name: x.target.value })} placeholder={tr('PS5 — Screen 1')} error={e('name')} />
          <Select label={tr('Kis tarah ka')} value={v.stationType} onChange={(x) => set({ stationType: x.target.value as GamingStationType })} options={Object.entries(STATION_TYPES).map(([value, label]) => ({ value, label }))} />
          <Select label={tr('Platform')} value={v.platform} onChange={(x) => set({ platform: x.target.value })} options={[{ value: '', label: '—' }, ...Object.entries(PLATFORMS).map(([value, label]) => ({ value, label }))]} hint={tr('Marzi hai')} />
          <Input label={tr('Jagah')} value={v.location} onChange={(x) => set({ location: x.target.value })} placeholder={tr('Upar wala hall')} hint={tr('Marzi hai')} />
          <Input label={tr('Kam se kam minute')} inputMode="numeric" value={v.minimumMinutes} onChange={(x) => set({ minimumMinutes: x.target.value.replace(/\D/g, '') })} error={e('minimumMinutes')} hint={tr('Is se kam khelne par bhi itne ka bill')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label={tr('Ghante ka rate (Rs)')} required inputMode="decimal" value={v.pricePerHour} onChange={(x) => set({ pricePerHour: moneyText(x.target.value) })} error={e('pricePerHour')} />
          <Input label={tr('Aadha ghanta (Rs)')} inputMode="decimal" value={v.pricePerHalfHour} onChange={(x) => set({ pricePerHalfHour: moneyText(x.target.value) })} hint={tr('Marzi hai')} />
          <Input label={tr('Rush ka rate')} inputMode="decimal" value={v.peakHourPrice} onChange={(x) => set({ peakHourPrice: moneyText(x.target.value) })} hint={tr('Shaam / weekend')} />
          <Input label={tr('Khali waqt ka rate')} inputMode="decimal" value={v.offPeakPrice} onChange={(x) => set({ offPeakPrice: moneyText(x.target.value) })} hint={tr('Subah / raat')} />
        </div>
        <Input label={tr('Games (comma se alag)')} value={v.games} onChange={(x) => set({ games: x.target.value })} placeholder={tr('FIFA 25, Tekken 8, GTA V')} hint={tr('Session shuru karte waqt chunne ko milte hain')} />
        <Textarea label={tr('Note')} rows={2} value={v.notes} onChange={(x) => set({ notes: x.target.value })} hint={tr('Sirf andar ke liye')} />
      </form>
    </Modal>
  );
}

function RepairModal({ station, pending, onSave, onClose }: { station: GamingStation; pending: boolean; onSave: (notes?: string) => void; onClose: () => void }) {
  const [notes, setNotes] = useState('');
  return (
    <Modal open onClose={onClose} size="sm" title={tr('{{name}} — repair par', { name: station.name })} description={tr('Cafe Live par ye station shuru nahi hoga jab tak \'Theek ho gaya\' na dabayein')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Wapas')}</Button><Button loading={pending} onClick={() => onSave(notes.trim() || undefined)}><Wrench className="h-4 w-4" />{tr('Repair par lagayein')}</Button></>}>
      <Textarea label={tr('Kya kharab hai')} autoFocus rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tr('Controller ka button, HDMI…')} />
    </Modal>
  );
}
