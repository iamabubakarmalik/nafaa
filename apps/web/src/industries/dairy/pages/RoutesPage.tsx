/**
 * Delivery routes: a rider's round (area, morning or evening, vehicle) that
 * groups delivery customers and splits the day sheet. A route is switched
 * off, never deleted; its customers keep their history.
 */

import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bike, Clock, GraduationCap, MapPin, Milk, Pencil, Plus, PowerOff, Route as RouteIcon, Truck, Users } from 'lucide-react';
import {
  Button, FilterBar, FilterChip, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Switch, Textarea, ViewTabs,
  heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { routesApi, type DairyRoute, type RouteInput } from '../api/routes.api';
import { Empty, ListCard, ListLoading, Pill } from '../components/ui';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { DAIRY_KEYS, errorText, liters, numIn, slotLabel } from '../lib/meta';
import { t } from '@core/i18n';

type Tab = 'active' | 'off';
const STATUS: Record<string, { label: string; tone: string }> = {
  ACTIVE: { label: t('Chalu'), tone: 'bg-success-50 text-success-700 ring-success-200' },
  PAUSED: { label: t('Ruka hua'), tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  DISCONTINUED: { label: t('Band'), tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

export default function RoutesPage() {
  const guide = usePageGuide();
  const canEdit = usePermission(PERMISSIONS.CUSTOMERS_EDIT);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [form, setForm] = useState<DairyRoute | 'new' | null>(null);
  const listQ = useQuery({ queryKey: [DAIRY_KEYS.routes, 'all', q], queryFn: () => routesApi.all({ search: q || undefined }) });
  const all = useMemo(() => listQ.data ?? [], [listQ.data]);
  const rows = all.filter((r) => (tab === 'active' ? r.isActive : !r.isActive));
  const live = all.filter((r) => r.isActive);
  usePageKeys(searchRef, canEdit ? { n: () => setForm('new') } : {});

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title={t('Routes — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: RouteIcon, color: '#2563eb', title: t('Route kya hai'), text: t('Ek rider ka chakkar — jaise "Model Town subah". Customer form me route chunein.') },
            { icon: Truck, color: '#16a34a', title: t('Rider ki list'), text: t('Delivery page par route chun kar sirf us rider ki list banti aur print hoti hai.') },
            { icon: PowerOff, color: '#64748b', title: t('Band karein'), text: t('Purana route band karein — customers aur hisaab rehte hain, naye customer us me nahi jurte.') },
          ]}
          shortcuts={[['/', 'search'], ['N', t('naya route')], ['G', 'guide']]} />
      )}

      <PageHero title={t('Delivery routes')} busy={listQ.isFetching && !listQ.isLoading} loading={listQ.isLoading}
        meta={t('Rider ke chakkar — area, waqt aur gaari')}
        actions={<>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setForm('new')} className={heroPrimaryButton}><Plus className="h-4 w-4" />{t('Naya route')}</button>}
        </>}
        stats={[
          { label: t('Chalu routes'), value: String(live.length) },
          { label: t('Customers'), value: String(live.reduce((s, r) => s + r.totalCustomers, 0)) },
          { label: t('Roz ka doodh'), value: liters(live.reduce((s, r) => s + r.totalDailyLiters, 0)) },
        ]} />

      <KpiRow cols={3}>
        {listQ.isLoading ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={RouteIcon} color="#2563eb" label={t('Chalu')} value={live.length} onClick={() => setTab('active')} active={tab === 'active'} />
            <KpiCard icon={Users} color="#16a34a" label={t('Route par customers')} value={live.reduce((s, r) => s + r.totalCustomers, 0)} />
            <KpiCard icon={PowerOff} color="#64748b" label={t('Band')} value={all.length - live.length} onClick={() => setTab('off')} active={tab === 'off'} />
          </>
        )}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={t('Route ka naam, number, area ya gaari…')} />}
        chips={search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined} onClear={() => setSearch('')} />
      <ViewTabs value={tab} onChange={setTab} tabs={[{ id: 'active', label: t('Chalu'), icon: RouteIcon, count: live.length }, { id: 'off', label: t('Band'), icon: PowerOff, count: all.length - live.length }]} />

      <ListCard>
        {listQ.isLoading ? <ListLoading rows={4} /> : rows.length === 0 ? (
          <Empty icon={RouteIcon} title={tab === 'active' ? t('Abhi koi route nahi') : t('Koi band route nahi')} text={t('Ek dukaan me ek hi rider ho to route ki zaroorat nahi — sab customers ek list me aate hain.')}
            action={canEdit && tab === 'active' ? <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setForm('new')}>{t('Naya route')}</Button> : undefined} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => (
              <li key={r.id} className="grid gap-2 px-4 py-3 sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_10rem_10rem_minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900"><span className="me-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: r.color || '#64748b' }} />{r.name} <span className="font-mono text-[0.75rem] font-normal text-slate-400">{r.routeNumber}</span></p>
                  <p className="truncate text-[0.75rem] text-slate-500"><MapPin className="me-1 inline h-3 w-3" />{r.areaName || '—'}</p>
                </div>
                <p className="text-[0.8125rem] text-slate-700"><Clock className="me-1 inline h-3.5 w-3.5 text-slate-400" />{slotLabel(r.slot)}{r.startTime ? ` · ${r.startTime}` : ''}</p>
                <p className="text-[0.8125rem] text-slate-700"><Milk className="me-1 inline h-3.5 w-3.5 text-sky-500" />{t('{{totalCustomers}} ghar · {{totalDailyLiters}}', { totalCustomers: r.totalCustomers, totalDailyLiters: liters(r.totalDailyLiters) })}</p>
                <p className="truncate text-[0.8125rem] text-slate-600"><Bike className="me-1 inline h-3.5 w-3.5 text-slate-400" />{[r.vehicleType, r.vehicleNumber].filter(Boolean).join(' · ') || '—'}</p>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Pill tone={STATUS[r.status]?.tone ?? ''}>{STATUS[r.status]?.label ?? r.status}</Pill>
                  <Link to={`/dairy/deliveries?route=${r.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Truck className="h-4 w-4" />{t('Aaj ki list')}</Link>
                  {canEdit && <Button size="sm" variant="ghost" aria-label={t('Badlein')} onClick={() => setForm(r)}><Pencil className="h-4 w-4" /></Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </ListCard>

      {form && <RouteFormModal route={form === 'new' ? undefined : form} onClose={() => setForm(null)} />}
    </PageShell>
  );
}

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#e11d48', '#7c3aed', '#0891b2', '#64748b'];

function RouteFormModal({ route, onClose }: { route?: DairyRoute; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: route?.name ?? '', areaName: route?.areaName ?? '', slot: route?.slot ?? 'MORNING', status: route?.status ?? 'ACTIVE',
    vehicleType: route?.vehicleType ?? '', vehicleNumber: route?.vehicleNumber ?? '', startTime: route?.startTime ?? '',
    estimatedDurationMin: route?.estimatedDurationMin ? String(route.estimatedDurationMin) : '', description: route?.description ?? '',
    color: route?.color ?? COLORS[0], isActive: route?.isActive ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const save = useMutation({
    mutationFn: () => {
      const body: Partial<RouteInput> = {
        name: f.name.trim(), areaName: f.areaName.trim() || undefined, slot: f.slot, status: f.status as RouteInput['status'],
        vehicleType: f.vehicleType.trim() || undefined, vehicleNumber: f.vehicleNumber.trim() || undefined, startTime: f.startTime || undefined,
        estimatedDurationMin: numIn(f.estimatedDurationMin) != null ? Math.round(numIn(f.estimatedDurationMin)!) : undefined,
        description: f.description.trim() || undefined, color: f.color, ...(route && { isActive: f.isActive }),
      };
      return routesApi.save(route?.id, body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [DAIRY_KEYS.routes] }); toast.success(route ? t('Route save') : t('Route ban gaya')); onClose(); },
    onError: (e) => toast.error(errorText(e, t('Save nahi hua'))),
  });
  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = t('Route ka naam likhein');
    if (f.startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(f.startTime)) e.startTime = t('Waqt 06:30 jaisa likhein');
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate();
  };
  return (
    <Modal open onClose={onClose} size="md" title={route ? t('{{name}} — badlein', { name: route.name }) : t('Naya route')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Wapas')}</Button><Button loading={save.isPending} onClick={submit}>{t('Save')}</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('Naam *')} autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} placeholder={t('Model Town subah')} />
          <Input label={t('Area')} value={f.areaName} onChange={(e) => set({ areaName: e.target.value })} />
          <Select label={t('Waqt')} value={f.slot} onChange={(e) => set({ slot: e.target.value })} options={[{ value: 'MORNING', label: t('Subah') }, { value: 'EVENING', label: t('Shaam') }, { value: 'AFTERNOON', label: t('Dopahar') }, { value: 'NIGHT', label: t('Raat') }]} />
          <Input label={t('Nikalne ka waqt')} value={f.startTime} onChange={(e) => set({ startTime: e.target.value })} error={errors.startTime} placeholder="06:00" />
          <Input label={t('Gaari')} value={f.vehicleType} onChange={(e) => set({ vehicleType: e.target.value })} placeholder={t('Motorcycle, cycle, rickshaw')} />
          <Input label={t('Gaari number')} value={f.vehicleNumber} onChange={(e) => set({ vehicleNumber: e.target.value })} />
          <Input label={t('Kitni der (minute)')} inputMode="numeric" value={f.estimatedDurationMin} onChange={(e) => set({ estimatedDurationMin: e.target.value })} />
          <Select label={t('Status')} value={f.status} onChange={(e) => set({ status: e.target.value as typeof f.status })} options={Object.entries(STATUS).map(([value, x]) => ({ value, label: x.label }))} />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{t('Rang')}</span>
          <div className="flex gap-2">{COLORS.map((c) => <button key={c} type="button" aria-label={c} onClick={() => set({ color: c })} className={`h-7 w-7 rounded-full ring-2 ${f.color === c ? 'ring-slate-900' : 'ring-transparent'}`} style={{ background: c }} />)}</div>
        </div>
        <Textarea label={t('Note')} rows={2} value={f.description} onChange={(e) => set({ description: e.target.value })} />
        {route && <Switch checked={f.isActive} onChange={(e) => set({ isActive: e.target.checked })} label={t('Chalu hai')} description={t('Band route customer form me nahi aata')} />}
      </form>
    </Modal>
  );
}
