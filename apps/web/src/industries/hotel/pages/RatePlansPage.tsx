/**
 * Season rates: Eid, summer holidays, off-season, corporate or long-stay
 * rates over a date range, as the room type's season price or a +/- change.
 * The first active plan covering a night sets its rate; bookings already
 * made keep their price. Plans are switched off, never deleted.
 *
 * Keys: N new plan · G guide.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Award, CalendarRange, GraduationCap, Layers, Pencil, Percent, Plus, Power } from 'lucide-react';
import {
  Button, Checkbox, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, Select, Skeleton, Switch, Textarea, ViewTabs, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { ratePlansApi, type PlanType, type RatePlan } from '../api/rate-plans.api';
import { roomTypesApi } from '../api/room-types.api';
import type { BookingSource } from '../api/bookings.api';
import { useConfirm } from '../components/useConfirm';
import { ALL_HOTEL_KEYS, HOTEL_KEYS, SOURCES, addDaysKey, apiError, stayDay, todayKey } from '../components/meta';

const PLAN_TYPES: Array<{ id: PlanType; label: string; hint: string }> = [
  { id: 'PEAK', label: 'Season (peak)', hint: 'Room type ka season rate, ya % / Rs barhayein' },
  { id: 'OFF_SEASON', label: 'Off-season', hint: 'Room type ka off-season rate, ya kam karein' },
  { id: 'SEASON', label: 'Khaas dates', hint: 'Eid, shadi ka season, mela' },
  { id: 'WEEKEND', label: 'Weekend', hint: 'Sirf chune hue din' },
  { id: 'CORPORATE', label: 'Company rate', hint: 'Sirf company bookings par' },
  { id: 'LONG_STAY', label: 'Lamba stay', hint: 'Kam az kam raaton par kam rate' },
  { id: 'PROMO', label: 'Offer', hint: 'Thori der ka offer' },
];
const DAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];
const planLabel = (t: string) => PLAN_TYPES.find((p) => p.id === t)?.label ?? t;
const change = (p: RatePlan) => (!p.adjustment ? (p.planType === 'PEAK' ? 'Season rate' : p.planType === 'OFF_SEASON' ? 'Off-season rate' : 'Wohi rate') : p.isPercentage ? `${p.adjustment > 0 ? '+' : ''}${p.adjustment}%` : `${p.adjustment > 0 ? '+' : '−'}${formatPKR(Math.abs(p.adjustment))}`);

function PlanForm({ plan, onClose, onDone }: { plan: RatePlan | null; onClose: () => void; onDone: () => void }) {
  const types = useQuery({ queryKey: [HOTEL_KEYS.roomTypes, 'active'], queryFn: () => roomTypesApi.list({ active: true }) });
  const [f, setF] = useState({
    name: plan?.name ?? '', planType: plan?.planType ?? ('PEAK' as PlanType), startDate: plan?.startDate.slice(0, 10) ?? todayKey(), endDate: plan?.endDate.slice(0, 10) ?? addDaysKey(todayKey(), 30),
    mode: plan ? (plan.adjustment ? (plan.isPercentage ? 'pct' : 'rs') : 'fixed') : 'fixed', adjustment: plan?.adjustment ? String(plan.adjustment) : '',
    minNights: plan?.minNights ? String(plan.minNights) : '', days: plan?.applicableDays ?? [], roomTypeIds: plan?.applicableRoomTypeIds ?? [], sources: plan?.applicableSources ?? [],
    description: plan?.description ?? '', isActive: plan?.isActive ?? true,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const flip = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const [tried, setTried] = useState(false);
  const bad = !f.name.trim() ? 'Plan ka naam likhein' : f.endDate < f.startDate ? 'Aakhri date shuru se pehle nahi ho sakti' : f.mode !== 'fixed' && !Number(f.adjustment) ? 'Kitna badalna hai likhein (minus se kam)' : null;
  const go = useMutation({
    mutationFn: () => {
      const body = {
        name: f.name.trim(), planType: f.planType, startDate: f.startDate, endDate: f.endDate, description: f.description.trim() || undefined,
        isPercentage: f.mode === 'pct', adjustment: f.mode === 'fixed' ? 0 : Number(f.adjustment), minNights: f.minNights ? Number(f.minNights) : null,
        applicableDays: f.days, applicableRoomTypeIds: f.roomTypeIds, applicableSources: f.sources, isActive: f.isActive,
      };
      return plan ? ratePlansApi.update(plan.id, body) : ratePlansApi.create(body);
    },
    onSuccess: () => { toast.success('Rate plan save ho gaya'); onDone(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  const submit = () => { setTried(true); if (!bad) go.mutate(); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const chip = (on: boolean) => cn('h-8 rounded-full px-3 text-[0.75rem] font-semibold ring-1', on ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50');
  return (
    <Modal open onClose={onClose} size="lg" title={plan ? `${plan.name} badlein` : 'Naya rate plan'} description="Ctrl+S se save · pehle se bani bookings ka rate nahi badalta"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={go.isPending} onClick={submit}>Save</Button></>}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input data-autofocus label="Naam" required value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Eid season, Murree garmiyan…" error={tried && !f.name.trim() ? 'Plan ka naam likhein' : undefined} />
          <Select label="Kis tarah ka" value={f.planType} onChange={(e) => set('planType', e.target.value as PlanType)} options={PLAN_TYPES.map((p) => ({ value: p.id, label: p.label }))} hint={PLAN_TYPES.find((p) => p.id === f.planType)?.hint} />
          <Input type="date" label="Kab se" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} />
          <Input type="date" label="Kab tak" value={f.endDate} min={f.startDate} onChange={(e) => set('endDate', e.target.value)} error={tried && f.endDate < f.startDate ? 'Aakhri date shuru se pehle nahi' : undefined} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Rate kaise" value={f.mode} onChange={(e) => set('mode', e.target.value)} options={[
            { value: 'fixed', label: 'Room type ka season / off-season rate' }, { value: 'pct', label: '% se badlein' }, { value: 'rs', label: 'Rs se badlein' },
          ]} />
          {f.mode !== 'fixed' && <Input label={f.mode === 'pct' ? 'Kitna %' : 'Kitne Rs fi raat'} inputMode="decimal" value={f.adjustment} onChange={(e) => set('adjustment', e.target.value.replace(/[^\d.-]/g, ''))} hint="Barhana: 20 · kam karna: -15" error={tried && f.mode !== 'fixed' && !Number(f.adjustment) ? 'Kitna badalna hai likhein' : undefined} />}
          <Input label="Kam az kam raatein" inputMode="numeric" value={f.minNights} onChange={(e) => set('minNights', e.target.value.replace(/\D/g, ''))} hint="Lamba stay plan ke liye" />
        </div>
        <div>
          <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Din (khaali = har din)</p>
          <div className="flex flex-wrap gap-1.5">{DAYS.map((d, i) => <button key={d} type="button" className={chip(f.days.includes(i))} onClick={() => set('days', flip(f.days, i))}>{d}</button>)}</div>
        </div>
        <div>
          <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Room types (khaali = sab)</p>
          <div className="grid grid-cols-2 gap-1.5">{(types.data ?? []).map((t) => <Checkbox key={t.id} label={t.name} checked={f.roomTypeIds.includes(t.id)} onChange={() => set('roomTypeIds', flip(f.roomTypeIds, t.id))} />)}</div>
        </div>
        <div>
          <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Booking kahan se (khaali = sab)</p>
          <div className="flex flex-wrap gap-1.5">{SOURCES.map((s) => <button key={s.id} type="button" className={chip(f.sources.includes(s.id))} onClick={() => set('sources', flip(f.sources, s.id as BookingSource))}>{s.label}</button>)}</div>
        </div>
        <Textarea rows={2} label="Note" value={f.description} onChange={(e) => set('description', e.target.value)} />
        {plan && <Switch checked={f.isActive} onChange={(e) => set('isActive', e.target.checked)} label="Chalu" />}
      </div>
    </Modal>
  );
}

export default function RatePlansPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const [ask, confirmDialog] = useConfirm();
  const [tab, setTab] = useState<'active' | 'all'>('active');
  const [form, setForm] = useState<RatePlan | null | 'new'>(null);
  const q = useQuery({ queryKey: [HOTEL_KEYS.ratePlans], queryFn: () => ratePlansApi.list() });
  const types = useQuery({ queryKey: [HOTEL_KEYS.roomTypes, 'all'], queryFn: () => roomTypesApi.list() });
  const refresh = () => { ALL_HOTEL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); setForm(null); };
  const toggle = useMutation({
    mutationFn: (p: RatePlan) => (p.isActive ? ratePlansApi.remove(p.id) : ratePlansApi.update(p.id, { isActive: true })),
    onSuccess: () => refresh(),
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canEdit) { e.preventDefault(); setForm('new'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEdit]);

  const today = todayKey();
  const all = q.data ?? [];
  const live = all.filter((p) => p.isActive && p.startDate.slice(0, 10) <= today && p.endDate.slice(0, 10) >= today);
  const coming = all.filter((p) => p.isActive && p.startDate.slice(0, 10) > today);
  const rows = tab === 'active' ? all.filter((p) => p.isActive && p.endDate.slice(0, 10) >= today) : all;
  const typeName = new Map((types.data ?? []).map((t) => [t.id, t.name]));

  return (
    <PageShell>
      <PageHero
        title="Season rates"
        chip={<><Award /> Rate plans</>}
        meta="Date ke hisaab se rate — nayi bookings par khud lagta hai"
        loading={q.isLoading}
        actions={<>
          <Link to="/hotel/room-types" className={heroButton}><Layers className="h-4 w-4" /><span className="hidden sm:inline">Room types</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setForm('new')} title="Naya plan (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya plan</button>}
        </>}
        stats={[{ label: 'Aaj chal rahe', value: live.length }, { label: 'Aane wale', value: coming.length }]}
      />
      <KpiRow cols={3}>
        <KpiCard icon={CalendarRange} color="#16a34a" label="Aaj chal rahe" value={live.length} hint={live.map((p) => p.name).join(', ') || 'Koi nahi — aam rate'} />
        <KpiCard icon={Award} color="#0891b2" label="Aane wale" value={coming.length} hint={coming[0] ? `${coming[0].name} · ${stayDay(coming[0].startDate)}` : undefined} />
        <KpiCard icon={Percent} color="#64748b" label="Band" value={all.filter((p) => !p.isActive).length} />
      </KpiRow>
      <ViewTabs value={tab} onChange={setTab} hint={canEdit ? <><Kbd>N</Kbd> naya plan</> : undefined}
        tabs={[{ id: 'active', label: 'Chalu', icon: CalendarRange, count: all.filter((p) => p.isActive && p.endDate.slice(0, 10) >= today).length }, { id: 'all', label: 'Sab', icon: Award, count: all.length }]} />

      {q.isLoading ? <Skeleton className="h-48 rounded-3xl" /> : !rows.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <Award className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">Koi season rate nahi</p>
          <p className="mt-1 text-sm text-slate-500">Room ka aam aur weekend rate lag raha hai. Eid ya season me rate barhana ho to plan banayein.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {rows.map((p) => {
            const now = p.isActive && p.startDate.slice(0, 10) <= today && p.endDate.slice(0, 10) >= today;
            return (
              <li key={p.id} className={cn('flex flex-wrap items-center gap-3 px-4 py-3', !p.isActive && 'opacity-60')}>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-[0.9375rem] font-semibold text-slate-900">{p.name}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-slate-600">{planLabel(p.planType)}</span>
                    {now && <span className="rounded-full bg-success-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-success-700 ring-1 ring-success-200">Aaj chal raha</span>}
                    {!p.isActive && <span className="text-[0.75rem] text-slate-500">band</span>}
                  </span>
                  <span className="block truncate text-[0.75rem] text-slate-500">
                    {stayDay(p.startDate, { year: true })} → {stayDay(p.endDate, { year: true })}
                    {p.applicableDays.length ? ` · ${p.applicableDays.map((d) => DAYS[d]).join(', ')}` : ''}
                    {p.applicableRoomTypeIds.length ? ` · ${p.applicableRoomTypeIds.map((id) => typeName.get(id) ?? '?').join(', ')}` : ' · sab room'}
                    {p.minNights ? ` · ${p.minNights}+ raat` : ''}
                  </span>
                </span>
                <span className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{change(p)}</span>
                {canEdit && <span className="flex">
                  <button type="button" onClick={() => setForm(p)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Badlein"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={async () => { if (!p.isActive || await ask({ title: `${p.name} band karein?`, text: 'Nayi bookings par ye rate nahi lagega.', yes: 'Band', danger: true })) toggle.mutate(p); }} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label={p.isActive ? 'Band' : 'Chalu'}><Power className="h-4 w-4" /></button>
                </span>}
              </li>
            );
          })}
        </ul>
      )}
      {form && <PlanForm plan={form === 'new' ? null : form} onClose={() => setForm(null)} onDone={refresh} />}
      {confirmDialog}
      {guide.isOpen && (
        <PageGuide title="Season rates — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: CalendarRange, color: '#4f46e5', title: 'Dates', text: 'Plan kab se kab tak chale. In raaton ki nayi booking par rate khud badal jata hai.' },
            { icon: Percent, color: '#16a34a', title: 'Rate', text: 'Room type ka season rate, ya % / Rs se barhayein ya kam karein (minus likhein).' },
            { icon: Layers, color: '#ea580c', title: 'Kis par', text: 'Kuch room types, din ya booking ke zariye (jaise sirf company) chun sakte hain.' },
          ]}
          tips={['Do plan ek hi raat par hon to list me upar wala lagta hai.', 'Pehle se bani booking ka rate nahi badalta.', 'Rate plan ke liye "Products badalna" ki permission chahiye.']}
          shortcuts={[['N', 'naya plan'], ['Ctrl+S', 'save (form me)'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
