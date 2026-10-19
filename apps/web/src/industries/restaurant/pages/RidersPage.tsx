/**
 * Riders: who delivers, who is on duty or on a trip, and how much cash each
 * one still has to hand over. Add or edit a rider, put them on or off duty,
 * take their cash on the delivery board. A removed rider is kept with
 * history and only leaves the list.
 *
 * Keys: / search · A add rider · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Bike, Coffee, GraduationCap, HandCoins, Pencil, Phone, Plus, Power, Trash2, Users } from 'lucide-react';
import {
  Button, FilterBar, KpiCard, KpiRow, Kbd, Modal, PageHero, PageShell, SearchField, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { ridersApi, type Rider, type RiderStatus } from '../api/riders.api';
import { apiError } from '../lib/orderMeta';

const STATUS: Record<RiderStatus, { label: string; tone: string }> = {
  ACTIVE: { label: 'Duty par · free', tone: 'bg-emerald-50 text-emerald-700' },
  BUSY: { label: 'Trip par', tone: 'bg-violet-50 text-violet-700' },
  ON_BREAK: { label: 'Break', tone: 'bg-amber-50 text-amber-800' },
  OFFLINE: { label: 'Chhutti / off', tone: 'bg-slate-100 text-slate-600' },
  INACTIVE: { label: 'Hata diya', tone: 'bg-rose-50 text-rose-700' },
};
type View = 'all' | 'duty' | 'off';

export default function RidersPage() {
  const qc = useQueryClient();
  const canManage = usePermission(PERMISSIONS.RESTAURANT_ORDERS_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<View>('all');
  const [edit, setEdit] = useState<Rider | 'new' | null>(null);
  const [guide, setGuide] = useState(false);

  const q = useQuery({ queryKey: ['restaurant-riders', 'active'], queryFn: () => ridersApi.list({ active: true }), refetchInterval: 30_000 });
  const riders = q.data ?? [];
  const onDuty = riders.filter((r) => r.status === 'ACTIVE' || r.status === 'BUSY');
  const cash = riders.reduce((n, r) => n + (r.cashDue ?? 0), 0);
  const shown = useMemo(() => {
    const s = search.trim().toLowerCase();
    return riders.filter((r) => (view === 'all' || (view === 'duty' ? r.status === 'ACTIVE' || r.status === 'BUSY' : r.status === 'OFFLINE' || r.status === 'ON_BREAK'))
      && (!s || r.name.toLowerCase().includes(s) || r.phone.includes(s) || (r.vehicleNumber ?? '').toLowerCase().includes(s)));
  }, [riders, search, view]);

  const refresh = () => ['restaurant-riders', 'restaurant-delivery-board', 'restaurant-rider-cash'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const act = useMutation({
    mutationFn: (run: () => Promise<unknown>) => run(),
    onSuccess: () => { refresh(); setEdit(null); },
    onError: (e) => toast.error(apiError(e)),
  });
  const run = (fn: () => Promise<unknown>, ok: string) => act.mutate(async () => { await fn(); toast.success(ok); });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (k === 'a' && canManage) setEdit('new');
      if (k === 'g') setGuide(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage]);

  return (
    <PageShell>
      {edit && <RiderForm rider={edit === 'new' ? null : edit} saving={act.isPending} onClose={() => setEdit(null)}
        onSave={(d) => run(() => (edit === 'new' ? ridersApi.create(d) : ridersApi.update(edit.id, d)), edit === 'new' ? `${d.name} jur gaya` : 'Rider save ho gaya')} />}
      {guide && (
        <Modal open onClose={() => setGuide(false)} size="md" title="Riders — aasaan tareeqa">
          <ul className="space-y-2 text-[0.875rem] text-slate-700">
            <li><b>Duty par</b>: sirf yehi riders delivery order par lag sakte hain. Shift khatam ho to "Off".</li>
            <li><b>Trip par</b>: order uthaya hua hai. Deliver hote hi khud free.</li>
            <li><b>Cash</b>: deliver kiye orders ka paisa jo abhi rider ke paas hai. Delivery board par "Cash lein".</li>
            <li><Kbd>A</Kbd> naya rider · <Kbd>/</Kbd> search</li>
          </ul>
        </Modal>
      )}
      <PageHero
        title="Riders"
        chip={<><Bike />{riders.length} rider</>}
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <Link to="/restaurant/delivery" className={heroButton}><Bike className="h-4 w-4" />Delivery board</Link>
          {canManage && <button type="button" onClick={() => setEdit('new')} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya rider <Kbd className="hidden md:inline-flex">A</Kbd></button>}
          <button type="button" onClick={() => setGuide(true)} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: 'Riders ke paas cash', value: formatPKR(cash) },
          { label: 'Duty par', value: `${onDuty.length} / ${riders.length}` },
          { label: 'Trip par', value: String(riders.filter((r) => r.status === 'BUSY').length) },
          { label: 'Kul deliveries', value: String(riders.reduce((n, r) => n + (r.totalDeliveries ?? 0), 0)) },
        ]}
      />
      <KpiRow cols={3}>
        <KpiCard icon={Users} color="#16a34a" label="Duty par" value={String(onDuty.length)} hint="Order par lag sakte hain" onClick={() => setView(view === 'duty' ? 'all' : 'duty')} active={view === 'duty'} />
        <KpiCard icon={Coffee} color="#64748b" label="Off / break" value={String(riders.length - onDuty.length)} onClick={() => setView(view === 'off' ? 'all' : 'off')} active={view === 'off'} />
        <KpiCard icon={HandCoins} color="#d97706" label="Cash lena hai" value={formatPKR(cash)} hint={`${riders.filter((r) => (r.cashDue ?? 0) > 0).length} rider`} />
      </KpiRow>
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, phone ya bike number…" label="Rider search" />} />
      <ViewTabs value={view} onChange={setView} tabs={[{ id: 'all', label: 'Sab', count: riders.length }, { id: 'duty', label: 'Duty par', count: onDuty.length }, { id: 'off', label: 'Off', count: riders.length - onDuty.length }]} />

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {q.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div> : !shown.length ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <Bike className="h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{riders.length ? 'Is filter me koi rider nahi' : 'Abhi koi rider nahi'}</p>
            {canManage && !riders.length && <Button className="mt-4" onClick={() => setEdit('new')}><Plus className="h-4 w-4" />Pehla rider</Button>}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {shown.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Bike className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.9375rem] font-semibold text-slate-900">{r.name} <span className={cn('ml-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold', STATUS[r.status].tone)}>{r.status === 'BUSY' ? `${r.activeTrips ?? 1} trip par` : STATUS[r.status].label}</span></p>
                  <p className="text-[0.75rem] text-slate-500"><Phone className="mr-1 inline h-3 w-3" /><a href={`tel:${r.phone}`} className="hover:underline">{r.phone}</a>{r.vehicleNumber ? ` · ${r.vehicleType ? `${r.vehicleType} ` : ''}${r.vehicleNumber}` : ''} · {r.totalDeliveries} delivery</p>
                </div>
                {(r.cashDue ?? 0) > 0 && <Link to="/restaurant/delivery" className="rounded-xl bg-amber-50 px-3 py-1.5 text-[0.8125rem] font-bold tabular-nums text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100">{formatPKR(r.cashDue ?? 0)} cash</Link>}
                {canManage && (
                  <div className="flex items-center gap-1">
                    {r.status !== 'BUSY' && (r.status === 'ACTIVE'
                      ? <Button size="sm" variant="secondary" onClick={() => run(() => ridersApi.update(r.id, { status: 'OFFLINE' }), `${r.name} off`)}><Power className="h-4 w-4" />Off</Button>
                      : <Button size="sm" onClick={() => run(() => ridersApi.update(r.id, { status: 'ACTIVE' }), `${r.name} duty par`)}><Power className="h-4 w-4" />Duty par</Button>)}
                    {r.status === 'ACTIVE' && <Button size="sm" variant="ghost" onClick={() => run(() => ridersApi.update(r.id, { status: 'ON_BREAK' }), `${r.name} break par`)}><Coffee className="h-4 w-4" /></Button>}
                    <Button size="sm" variant="ghost" onClick={() => setEdit(r)} aria-label="Badlein"><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-rose-600" aria-label="Hatayein"
                      onClick={() => { if (window.confirm(`${r.name} ko list se hata dein? Purani deliveries record me rahengi.`)) run(() => ridersApi.remove(r.id), 'Rider hata diya'); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}

type RiderDraft = Pick<Rider, 'name' | 'phone'> & Partial<Pick<Rider, 'cnic' | 'vehicleType' | 'vehicleNumber' | 'isEmployee' | 'commissionType' | 'commissionValue' | 'notes'>>;

function RiderForm({ rider, saving, onSave, onClose }: { rider: Rider | null; saving: boolean; onSave: (d: RiderDraft) => void; onClose: () => void }) {
  const [f, setF] = useState({
    name: rider?.name ?? '', phone: rider?.phone ?? '', cnic: rider?.cnic ?? '', vehicleType: rider?.vehicleType ?? 'Bike', vehicleNumber: rider?.vehicleNumber ?? '',
    isEmployee: rider?.isEmployee ?? true, commissionType: rider?.commissionType ?? 'PER_DELIVERY', commissionValue: rider?.commissionValue ? String(rider.commissionValue) : '', notes: rider?.notes ?? '',
  });
  const [tried, setTried] = useState(false);
  const errors = {
    name: f.name.trim().length < 2 ? 'Rider ka naam likhein' : '',
    phone: !/^[0-9+\-\s]{7,20}$/.test(f.phone.trim()) ? 'Phone number theek likhein (jaise 03001234567)' : '',
    cnic: f.cnic && f.cnic.replace(/\D/g, '').length !== 13 ? 'CNIC 13 hindsay ka hota hai' : '',
  };
  const ok = !errors.name && !errors.phone && !errors.cnic;
  const submit = () => {
    setTried(true);
    if (!ok) return;
    onSave({
      name: f.name.trim(), phone: f.phone.trim(), cnic: f.cnic.trim() || undefined, vehicleType: f.vehicleType.trim() || undefined, vehicleNumber: f.vehicleNumber.trim() || undefined,
      isEmployee: f.isEmployee, commissionType: f.commissionType, commissionValue: Number(f.commissionValue) || 0, notes: f.notes.trim() || undefined,
    });
  };
  const input = (k: keyof typeof f, label: string, opts: { hint?: string; error?: string; required?: boolean; placeholder?: string; mode?: 'tel' | 'numeric' | 'decimal' } = {}) => (
    <label className="text-[0.8125rem] font-medium text-slate-700">{label}{opts.required && <span className="text-rose-500"> *</span>}
      <input value={String(f[k])} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={opts.placeholder} inputMode={opts.mode}
        className={cn('mt-1 h-10 w-full rounded-xl border px-3 text-[0.875rem] font-normal outline-none focus:ring-2', tried && opts.error ? 'border-rose-400 focus:ring-rose-500/20' : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/20')} />
      {tried && opts.error ? <span className="mt-1 block text-[0.75rem] text-rose-600">{opts.error}</span> : opts.hint && <span className="mt-1 block text-[0.75rem] font-normal text-slate-500">{opts.hint}</span>}
    </label>
  );
  return (
    <Modal open onClose={onClose} size="lg" title={rider ? `${rider.name} badlein` : 'Naya rider'}
      footer={<div className="flex w-full items-center justify-between"><span className="text-[0.75rem] text-slate-400">Ctrl+S se save</span><div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={saving} onClick={submit}>Save karein</Button></div></div>}>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        {input('name', 'Naam', { required: true, error: errors.name })}
        {input('phone', 'Phone', { required: true, error: errors.phone, placeholder: '03xx xxxxxxx', mode: 'tel', hint: 'Customer aur counter isi number par call karte hain' })}
        {input('vehicleType', 'Sawari', { placeholder: 'Bike' })}
        {input('vehicleNumber', 'Number plate', { placeholder: 'LEA-1234' })}
        {input('cnic', 'CNIC', { error: errors.cnic, placeholder: '35202-1234567-1', hint: 'Marzi — record ke liye' })}
        <label className="text-[0.8125rem] font-medium text-slate-700">Kiraya kaise
          <select value={f.commissionType} onChange={(e) => setF({ ...f, commissionType: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-2 text-[0.875rem] font-normal">
            <option value="PER_DELIVERY">Har delivery ka fixed</option><option value="PERCENTAGE">Bill ka %</option><option value="FIXED">Mahana tankhwah</option>
          </select>
        </label>
        {input('commissionValue', f.commissionType === 'PERCENTAGE' ? 'Kitna %' : 'Kitne Rs', { mode: 'decimal', hint: 'Sirf record — payment Expense ya Staff se' })}
        <label className="flex items-center gap-2 self-end pb-2 text-[0.875rem] text-slate-700">
          <input type="checkbox" checked={f.isEmployee} onChange={(e) => setF({ ...f, isEmployee: e.target.checked })} className="h-4 w-4 accent-[rgb(var(--brand-600))]" />Dukaan ka apna rider
        </label>
        <label className="text-[0.8125rem] font-medium text-slate-700 sm:col-span-2">Note
          <input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value.slice(0, 300) })} className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-[0.875rem] font-normal outline-none focus:border-brand-500" />
        </label>
      </form>
    </Modal>
  );
}
