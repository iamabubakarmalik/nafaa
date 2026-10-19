/**
 * Happy hours: automatic price cuts in a time window, in shop time (PKT) —
 * "chai 20% off 3–6 PM", "BBQ 200 off per plate Fri night", "buy one get
 * one". A rule can be limited to days, dates, categories, dishes, order
 * types and a minimum bill, with a cap per bill. Rules are held to the
 * shop's discount limit (Settings): a deeper one needs the discount
 * override permission. A rule that already gave discounts is switched off
 * instead of deleted. The tester prices a cart against the live rules.
 *
 * Keys: / search · N new rule · G guide · Ctrl+S save in the form.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, BadgePercent, CalendarDays, CheckCircle2, CircleSlash, Clock, Copy, Gift, GraduationCap, ListFilter, Pencil, Plus,
  Power, Search, ShieldAlert, Sparkles, Trash2, Zap,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton,
  Switch, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide, type GuideStep } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { happyHoursApi, type HappyDiscountType, type HappyHourInput, type HappyHourRule, type HappyQuote, type OrderMode } from '../api/happy-hours.api';
import { menuItemsApi } from '../api/menu-items.api';
import { DAYS, DAYS_SHORT, ORDER_MODES, clock12, daysLabel, orderModeLabel } from '../lib/menuMeta';

const KEY = 'restaurant-happy-hours';
type Status = 'all' | 'live' | 'on' | 'off';
const TYPES: Array<{ value: HappyDiscountType; label: string; hint: string; icon: typeof BadgePercent }> = [
  { value: 'PERCENTAGE', label: 'Percent off', hint: 'Maslan 20% kam', icon: BadgePercent },
  { value: 'FIXED', label: 'Har plate par Rs kam', hint: 'Maslan 100 Rs fi plate', icon: Sparkles },
  { value: 'BUY_ONE_GET_ONE', label: 'Ek ke saath ek', hint: 'Do lo, ek ke paise', icon: Gift },
];
const errText = (e: unknown, fallback: string) => (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() || fallback;
const offText = (r: Pick<HappyHourRule, 'discountType' | 'discountValue'>) =>
  r.discountType === 'PERCENTAGE' ? `${r.discountValue}% off` : r.discountType === 'FIXED' ? `${formatPKR(r.discountValue)} off fi plate` : 'Ek ke saath ek';
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

export default function HappyHoursPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canManage = usePermission(PERMISSIONS.RESTAURANT_MENU_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status>('all');
  const [editing, setEditing] = useState<HappyHourRule | HappyHourInput | null>(null);
  const [removing, setRemoving] = useState<HappyHourRule | null>(null);
  const [testing, setTesting] = useState(false);

  const q = useQuery({ queryKey: [KEY], queryFn: () => happyHoursApi.list(), refetchInterval: 60_000 });
  const cats = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 5 * 60_000 });
  const rules = q.data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: [KEY] });

  const toggle = useMutation({
    mutationFn: (id: string) => happyHoursApi.toggle(id),
    onSuccess: (r) => { toast.success(r.isActive ? 'Chalu' : 'Band'); refresh(); },
    onError: (e) => toast.error(errText(e, 'Nahi badla')),
  });
  const remove = useMutation({
    mutationFn: (id: string) => happyHoursApi.remove(id),
    onSuccess: (r) => { toast.success((r as { isActive?: boolean })?.isActive === false ? 'Discount de chuka tha — band kar diya, hisaab rahega' : 'Hata diya'); setRemoving(null); refresh(); },
    onError: (e) => toast.error(errText(e, 'Nahi hata')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'n' && canManage) { e.preventDefault(); setEditing(blank()); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage]);

  const term = search.trim().toLowerCase();
  const shown = rules.filter((r) => (!term || r.name.toLowerCase().includes(term))
    && (status === 'all' || (status === 'live' ? r.liveNow : status === 'on' ? r.isActive : !r.isActive)));
  const live = rules.filter((r) => r.liveNow);
  const catName = useMemo(() => new Map((cats.data ?? []).map((c) => [c.id, c.name])), [cats.data]);

  return (
    <PageShell>
      {guide.isOpen && <PageGuide title="Happy hours — aasaan tareeqa" steps={GUIDE} onClose={guide.close}
        tips={['Waqt hamesha dukaan ke time (PKT) me — server kahin bhi ho.', 'Raat 10 se 2 baje jaisa waqt bhi chalta hai — din wohi ginta hai jis din shuru hua.', 'Ek item par ek hi happy hour lagta hai — jo zyada bachaye.']}
        shortcuts={[['/', 'search'], ['N', 'naya'], ['G', 'guide']]} />}
      {editing && <RuleForm initial={editing} categories={cats.data ?? []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {testing && <QuoteTester onClose={() => setTesting(false)} />}
      {removing && (
        <Modal open size="sm" onClose={() => setRemoving(null)} title={`"${removing.name}" hatayein?`}
          footer={<><Button variant="secondary" onClick={() => setRemoving(null)}>Rehne dein</Button><Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(removing.id)}>Hatayein</Button></>}>
          <p className="text-[0.875rem] text-slate-600">Agar yeh pehle discount de chuka hai to sirf band hoga, taake us ka hisaab rahe.</p>
        </Modal>
      )}

      <PageHero title="Happy hours" chip={<><Zap />{live.length ? `${live.length} abhi chal rahe` : 'Abhi koi nahi'}</>} meta="Waqt ke hisaab se discount · dukaan ka time (PKT)" busy={q.isFetching && !q.isLoading} loading={q.isLoading}
        actions={<>
          <button type="button" onClick={() => setTesting(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-2.5 text-[0.8125rem] font-semibold text-white ring-1 ring-white/25 hover:bg-white/25"><Search className="h-4 w-4" />Test karein</button>
          <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setEditing(blank())} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya happy hour</button>}
        </>}
        stats={[
          { label: 'Chalu rules', value: `${rules.filter((r) => r.isActive).length} / ${rules.length}` },
          { label: 'Abhi chal rahe', value: String(live.length), hint: live.map((r) => r.name).slice(0, 2).join(', ') || undefined },
          { label: 'Ab tak bachaya', value: formatPKR(rules.reduce((s, r) => s + (r.totalSaved || 0), 0)), hint: `${rules.reduce((s, r) => s + (r.totalUsage || 0), 0)} dafa` },
        ]} />

      <KpiRow cols={4}>
        {q.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Zap} color="#16a34a" label="Abhi chal rahe" value={String(live.length)} onClick={() => setStatus(status === 'live' ? 'all' : 'live')} active={status === 'live'} />
            <KpiCard icon={CheckCircle2} color="#2563eb" label="Chalu" value={String(rules.filter((r) => r.isActive).length)} onClick={() => setStatus(status === 'on' ? 'all' : 'on')} active={status === 'on'} />
            <KpiCard icon={CircleSlash} color="#64748b" label="Band" value={String(rules.filter((r) => !r.isActive).length)} onClick={() => setStatus(status === 'off' ? 'all' : 'off')} active={status === 'off'} />
            <KpiCard icon={CalendarDays} color="#d97706" label="Tareekh guzar gayi" value={String(rules.filter((r) => r.isActive && r.validTo && r.validTo.slice(0, 10) < new Date().toISOString().slice(0, 10)).length)} hint="Chalu magar purane" />
          </>
        )}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Happy hour ka naam…" label="Happy hour search" />}
        chips={term || status !== 'all' ? <>
          {term && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          {status !== 'all' && <FilterChip onRemove={() => setStatus('all')}>{status === 'live' ? 'Abhi chal rahe' : status === 'on' ? 'Chalu' : 'Band'}</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setStatus('all'); }}>
        <FilterMenu icon={ListFilter} label="Status" value={status} active={status !== 'all'}
          options={[{ value: 'all', label: 'Sab' }, { value: 'live', label: 'Abhi chal rahe' }, { value: 'on', label: 'Chalu' }, { value: 'off', label: 'Band' }]} onChange={setStatus} />
      </FilterBar>

      {q.isLoading ? <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
        : q.isError ? <div className="rounded-3xl bg-white px-6 py-12 text-center text-[0.875rem] text-slate-500 ring-1 ring-slate-200/80">{errText(q.error, 'Happy hours nahi khule')}</div>
          : !shown.length ? (
            <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
              <Zap className="h-8 w-8 text-amber-500" />
              <p className="mt-3 font-semibold text-slate-900">{rules.length ? 'Is filter me kuch nahi' : 'Abhi koi happy hour nahi'}</p>
              <p className="mt-1 max-w-md text-[0.875rem] text-slate-500">Dopahar ke khali waqt me grahak lane ke liye: "Chai 3–6 PM 20% off" ya "Juma raat BBQ par ek ke saath ek".</p>
              {canManage && !rules.length && <Button className="mt-4" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing(blank())}>Pehla happy hour</Button>}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {shown.map((r) => (
                <article key={r.id} className={cn('flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1', r.liveNow ? 'ring-2 ring-success-400' : 'ring-slate-200/80', !r.isActive && 'opacity-70')}>
                  <header className="flex items-start gap-3">
                    <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', r.liveNow ? 'bg-success-600 text-white' : 'bg-amber-50 text-amber-700')}><Zap className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[1rem] font-bold text-slate-900">{r.name}</h3>
                      <p className="text-[0.8125rem] font-semibold text-brand-700">{offText(r)}{r.maxDiscount ? ` · bill par ${formatPKR(r.maxDiscount)} tak` : ''}</p>
                    </div>
                    <span className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-bold', r.liveNow ? 'bg-success-50 text-success-700' : r.isActive ? 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-400')}>{r.liveNow ? 'Abhi chal raha' : r.isActive ? 'Chalu' : 'Band'}</span>
                  </header>
                  <DayBar start={r.startTime} end={r.endTime} />
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[0.75rem]">
                    <div><dt className="text-slate-500">Waqt</dt><dd className="font-medium text-slate-900">{clock12(r.startTime)} – {clock12(r.endTime)}</dd></div>
                    <div><dt className="text-slate-500">Din</dt><dd className="font-medium text-slate-900">{daysLabel(r.daysOfWeek)}</dd></div>
                    <div><dt className="text-slate-500">Kis par</dt><dd className="font-medium text-slate-900">{scopeText(r, catName)}</dd></div>
                    <div><dt className="text-slate-500">Order</dt><dd className="font-medium text-slate-900">{r.orderModes.length ? r.orderModes.map(orderModeLabel).join(', ') : 'Har order'}</dd></div>
                    {(r.validFrom || r.validTo) && <div className="col-span-2"><dt className="text-slate-500">Tareekh</dt><dd className="font-medium text-slate-900">{r.validFrom?.slice(0, 10) ?? 'shuru se'} → {r.validTo?.slice(0, 10) ?? 'aage tak'}</dd></div>}
                    {r.minOrderAmount ? <div className="col-span-2"><dt className="text-slate-500">Kam se kam bill</dt><dd className="font-medium text-slate-900">{formatPKR(r.minOrderAmount)}</dd></div> : null}
                  </dl>
                  {canManage && (
                    <footer className="mt-3 flex gap-1.5 border-t border-slate-100 pt-3">
                      <Button size="sm" variant="secondary" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(r)}>Badlein</Button>
                      <Button size="sm" variant="ghost" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={() => setEditing({ ...inputOf(r), name: `${r.name} (copy)` })}>Copy</Button>
                      <Button size="sm" variant="ghost" leftIcon={<Power className="h-3.5 w-3.5" />} loading={toggle.isPending && toggle.variables === r.id} onClick={() => toggle.mutate(r.id)}>{r.isActive ? 'Band' : 'Chalu'}</Button>
                      <button type="button" onClick={() => setRemoving(r)} aria-label="Hatayein" className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                    </footer>
                  )}
                </article>
              ))}
            </div>
          )}
    </PageShell>
  );
}

function scopeText(r: Pick<HappyHourRule, 'categoryIds' | 'productIds'>, catName: Map<string, string>) {
  if (!r.categoryIds.length && !r.productIds.length) return 'Poora menu';
  const parts: string[] = [];
  if (r.categoryIds.length) parts.push(r.categoryIds.length <= 2 ? r.categoryIds.map((c) => catName.get(c) ?? 'Category').join(', ') : `${r.categoryIds.length} category`);
  if (r.productIds.length) parts.push(`${r.productIds.length} dish`);
  return parts.join(' + ');
}

/** 24-hour strip with the window shaded; a window past midnight wraps. */
function DayBar({ start, end }: { start: string; end: string }) {
  const a = (toMin(start) / 1440) * 100;
  const b = (toMin(end) / 1440) * 100;
  const parts = a < b ? [[a, b - a]] : [[a, 100 - a], [0, b]];
  return (
    <div className="mt-3">
      <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
        {parts.map(([l, w], i) => <span key={i} className="absolute inset-y-0 rounded-full bg-amber-400" style={{ left: `${l}%`, width: `${w}%` }} />)}
      </div>
      <div className="mt-0.5 flex justify-between text-[0.625rem] text-slate-400"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>12 AM</span></div>
    </div>
  );
}

const blank = (): HappyHourInput => ({
  name: '', discountType: 'PERCENTAGE', discountValue: 10, startTime: '15:00', endTime: '18:00', daysOfWeek: [],
  categoryIds: [], productIds: [], orderModes: [], isActive: true,
});
const inputOf = (r: HappyHourRule): HappyHourInput => ({
  name: r.name, description: r.description ?? undefined, discountType: r.discountType, discountValue: r.discountValue, startTime: r.startTime, endTime: r.endTime,
  daysOfWeek: r.daysOfWeek, validFrom: r.validFrom?.slice(0, 10), validTo: r.validTo?.slice(0, 10), categoryIds: r.categoryIds, productIds: r.productIds,
  minOrderAmount: r.minOrderAmount ?? undefined, maxDiscount: r.maxDiscount ?? undefined, orderModes: r.orderModes, isActive: r.isActive,
});

function RuleForm({ initial, categories, onClose, onSaved }: {
  initial: HappyHourRule | HappyHourInput; categories: Array<{ id: string; name: string; color?: string }>; onClose: () => void; onSaved: () => void;
}) {
  const id = 'id' in initial ? initial.id : null;
  const [f, setF] = useState<HappyHourInput>(() => ('id' in initial ? inputOf(initial) : initial));
  const [tried, setTried] = useState(false);
  const [dishQ, setDishQ] = useState('');
  const set = (p: Partial<HappyHourInput>) => setF((x) => ({ ...x, ...p }));
  const override = usePermission(PERMISSIONS.POS_DISCOUNT_OVERRIDE);
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get(), staleTime: 5 * 60_000, retry: false });
  const limit = settings.data?.settings?.maxDiscountPercent ?? 50;
  const dishes = useQuery({ queryKey: ['restaurant-menu-items', 'happy'], queryFn: () => menuItemsApi.list({}), staleTime: 60_000 });
  const dishName = useMemo(() => new Map((dishes.data ?? []).map((m) => [m.productId, String(m.product?.name ?? '')])), [dishes.data]);
  const scope: 'all' | 'pick' = f.categoryIds.length || f.productIds.length ? 'pick' : 'all';
  const [scopeMode, setScopeMode] = useState<'all' | 'pick'>(scope);

  const problem = (() => {
    if (!f.name.trim()) return 'Naam likhein';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(f.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(f.endTime)) return 'Waqt sahi likhein';
    if (f.startTime === f.endTime) return 'Shuru aur khatam ka waqt ek jaisa nahi ho sakta';
    if (f.discountType === 'PERCENTAGE' && !(f.discountValue > 0 && f.discountValue <= 100)) return 'Percent 1 se 100 ke beech likhein';
    if (f.discountType === 'FIXED' && !(f.discountValue > 0)) return 'Har plate par kitne rupay kam — likhein';
    if (f.validFrom && f.validTo && f.validFrom > f.validTo) return '"Kab tak" ki tareekh "kab se" se pehle hai';
    if (scopeMode === 'pick' && !f.categoryIds.length && !f.productIds.length) return 'Category ya dish chunein, ya "Poora menu" rakhein';
    return null;
  })();
  const pct = f.discountType === 'PERCENTAGE' ? f.discountValue : f.discountType === 'BUY_ONE_GET_ONE' ? 50 : null;
  const overLimit = !override && pct !== null && pct > limit + 0.01;

  const save = useMutation({
    mutationFn: () => {
      const body: HappyHourInput = {
        ...f, name: f.name.trim(), description: f.description?.trim() || undefined,
        discountValue: f.discountType === 'BUY_ONE_GET_ONE' ? 0 : f.discountValue,
        categoryIds: scopeMode === 'all' ? [] : f.categoryIds, productIds: scopeMode === 'all' ? [] : f.productIds,
        validFrom: f.validFrom || undefined, validTo: f.validTo || undefined,
        minOrderAmount: f.minOrderAmount || undefined, maxDiscount: f.maxDiscount || undefined,
      };
      return id ? happyHoursApi.update(id, body) : happyHoursApi.create(body);
    },
    onSuccess: () => { toast.success(id ? 'Save ho gaya' : 'Happy hour ban gaya'); onSaved(); },
    onError: (e) => toast.error(errText(e, 'Save nahi hua')),
  });
  const submit = () => { setTried(true); if (!problem && !save.isPending) save.mutate(); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const flip = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const dishRows = (dishes.data ?? []).filter((m) => !dishQ.trim() || String(m.product?.name ?? '').toLowerCase().includes(dishQ.trim().toLowerCase())).slice(0, 40);

  return (
    <Modal open onClose={onClose} size="xl" title={id ? `${initial.name} badlein` : 'Naya happy hour'} description="Waqt dukaan ke time (PKT) me"
      footer={<>
        {tried && problem ? <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problem}</p> : <span className="mr-auto hidden items-center gap-1 text-[0.75rem] text-slate-500 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</span>}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={save.isPending} onClick={submit}>{id ? 'Save karein' : 'Banayein'}</Button>
      </>}>
      <div className="space-y-5">
        <Input label="Naam" required autoFocus value={f.name} onChange={(e) => set({ name: e.target.value.slice(0, 60) })} placeholder="Chai time, Friday BBQ night" hint="Bill par discount ke saath yahi naam" error={tried && !f.name.trim() ? 'Naam likhein' : undefined} />

        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Discount</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {TYPES.map((t) => (
              <button key={t.value} type="button" onClick={() => set({ discountType: t.value })}
                className={cn('flex items-start gap-2 rounded-xl border p-3 text-left', f.discountType === t.value ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20' : 'border-slate-200 hover:bg-slate-50')}>
                <t.icon className="mt-0.5 h-4 w-4 text-brand-700" /><span><span className="block text-[0.8125rem] font-semibold text-slate-900">{t.label}</span><span className="block text-[0.6875rem] text-slate-500">{t.hint}</span></span>
              </button>
            ))}
          </div>
          {f.discountType !== 'BUY_ONE_GET_ONE' && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Input label={f.discountType === 'PERCENTAGE' ? 'Kitne %' : 'Fi plate kitne Rs'} inputMode="decimal" value={f.discountValue ? String(f.discountValue) : ''}
                onChange={(e) => set({ discountValue: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} className="text-right font-semibold" />
              <Input label="Bill par zyada se zyada (Rs)" inputMode="decimal" value={f.maxDiscount ? String(f.maxDiscount) : ''} onChange={(e) => set({ maxDiscount: Number(e.target.value.replace(/[^\d.]/g, '')) || undefined })} hint="Khali = koi had nahi" />
              <Input label="Kam se kam bill (Rs)" inputMode="decimal" value={f.minOrderAmount ? String(f.minOrderAmount) : ''} onChange={(e) => set({ minOrderAmount: Number(e.target.value.replace(/[^\d.]/g, '')) || undefined })} hint="Is se chhote bill par nahi" />
            </div>
          )}
          {settings.data?.settings?.allowDiscount === false && (
            <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />Settings me discount band hai — jab tak chalu na ho, orders par happy hour nahi lagega.
            </p>
          )}
          {overLimit && (
            <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />Dukaan me discount ki had {limit}% hai (Settings). Is se zyada wala happy hour malik ya "Had se zyada discount" ki permission wala bana sakta hai.
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kab se</span>
            <input type="time" value={f.startTime} onChange={(e) => set({ startTime: e.target.value })} className="h-10 w-full rounded-xl border border-slate-200 px-3" />
            <span className="mt-1 block text-xs text-slate-500">{clock12(f.startTime)}</span></label>
          <label className="block"><span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kab tak</span>
            <input type="time" value={f.endTime} onChange={(e) => set({ endTime: e.target.value })} className="h-10 w-full rounded-xl border border-slate-200 px-3" />
            <span className="mt-1 block text-xs text-slate-500">{f.endTime < f.startTime ? `${clock12(f.endTime)} — raat 12 ke baad tak` : clock12(f.endTime)}</span></label>
        </div>
        <DayBar start={f.startTime || '00:00'} end={f.endTime || '00:00'} />
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Din <span className="font-normal text-slate-500">· khali = roz</span></span>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => <button key={d} type="button" onClick={() => set({ daysOfWeek: flip(f.daysOfWeek, i).sort() })} className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-medium', f.daysOfWeek.includes(i) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>{DAYS_SHORT[i]}</button>)}
            <button type="button" onClick={() => set({ daysOfWeek: [1, 2, 3, 4, 5] })} className="h-8 rounded-full px-3 text-[0.75rem] font-semibold text-brand-700 hover:bg-brand-50">Peer–Juma</button>
            <button type="button" onClick={() => set({ daysOfWeek: [0, 6] })} className="h-8 rounded-full px-3 text-[0.75rem] font-semibold text-brand-700 hover:bg-brand-50">Weekend</button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Kis tareekh se" type="date" value={f.validFrom ?? ''} onChange={(e) => set({ validFrom: e.target.value || undefined })} hint="Khali = abhi se" />
          <Input label="Kis tareekh tak" type="date" value={f.validTo ?? ''} onChange={(e) => set({ validTo: e.target.value || undefined })} hint="Ramzan, Eid jaise mauqe ke liye" />
        </div>

        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kis par lage</span>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
            {(['all', 'pick'] as const).map((m) => <button key={m} type="button" onClick={() => setScopeMode(m)} className={cn('h-8 rounded-md px-3 text-[0.8125rem] font-semibold', scopeMode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600')}>{m === 'all' ? 'Poora menu' : 'Kuch category / dish'}</button>)}
          </div>
          {scopeMode === 'pick' && (
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-1 text-[0.75rem] font-semibold text-slate-500">Category</p>
                <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                  {categories.map((c) => <button key={c.id} type="button" onClick={() => set({ categoryIds: flip(f.categoryIds, c.id) })} className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-medium', f.categoryIds.includes(c.id) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>{c.name}</button>)}
                  {!categories.length && <span className="text-[0.8125rem] text-slate-500">Koi category nahi</span>}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[0.75rem] font-semibold text-slate-500">Dish {f.productIds.length ? `· ${f.productIds.length} chuni` : ''}</p>
                <input value={dishQ} onChange={(e) => setDishQ(e.target.value)} placeholder="Dish dhoondein…" className="mb-2 h-9 w-full rounded-lg border border-slate-200 px-3 text-[0.8125rem]" />
                <div className="flex flex-wrap gap-1.5">{f.productIds.map((p) => <span key={p} className="inline-flex h-7 items-center gap-1 rounded-full bg-slate-900 pl-2.5 pr-1 text-[0.75rem] font-medium text-white">{dishName.get(p) ?? 'Dish'}<button type="button" aria-label="Hatayein" onClick={() => set({ productIds: f.productIds.filter((x) => x !== p) })} className="h-5 w-5 rounded-full hover:bg-white/20">×</button></span>)}</div>
                <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto">
                  {dishRows.filter((m) => !f.productIds.includes(m.productId)).map((m) => (
                    <li key={m.id}><button type="button" onClick={() => set({ productIds: [...f.productIds, m.productId] })} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[0.8125rem] hover:bg-slate-50"><span>{m.product?.name}</span><span className="text-slate-500">{formatPKR(Number(m.product?.price) || 0)}</span></button></li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Order type <span className="font-normal text-slate-500">· khali = har order</span></span>
          <div className="flex flex-wrap gap-1.5">
            {ORDER_MODES.map((m) => <button key={m.value} type="button" onClick={() => set({ orderModes: flip<OrderMode>(f.orderModes, m.value) })} className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-medium', f.orderModes.includes(m.value) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>{m.label}</button>)}
          </div>
        </div>
        <Switch checked={f.isActive !== false} onChange={(e) => set({ isActive: e.target.checked })} label="Chalu" description="Band ho to waqt aane par bhi nahi lagta" />
      </div>
    </Modal>
  );
}

/** Prices a few dishes against the rules running right now. */
function QuoteTester({ onClose }: { onClose: () => void }) {
  const dishes = useQuery({ queryKey: ['restaurant-menu-items', 'happy'], queryFn: () => menuItemsApi.list({}), staleTime: 60_000 });
  const [cart, setCart] = useState<Array<{ productId: string; name: string; quantity: number }>>([]);
  const [mode, setMode] = useState<OrderMode | ''>('');
  const [q, setQ] = useState('');
  const quote = useQuery({
    queryKey: ['restaurant-happy-quote', cart, mode],
    queryFn: () => happyHoursApi.quote(cart, mode || undefined),
    enabled: cart.length > 0,
  });
  const rows = (dishes.data ?? []).filter((m) => !q.trim() || String(m.product?.name ?? '').toLowerCase().includes(q.trim().toLowerCase())).slice(0, 30);
  const res: HappyQuote | undefined = quote.data;
  const total = res?.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) ?? 0;
  return (
    <Modal open onClose={onClose} size="lg" title="Happy hour test" description="Abhi ke waqt par yeh dishes kitne ki banti hain">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dish dhoondein…" className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[0.8125rem]" />
          <ul className="mt-2 max-h-72 space-y-0.5 overflow-y-auto">
            {rows.map((m) => (
              <li key={m.id}><button type="button" onClick={() => setCart((c) => c.some((x) => x.productId === m.productId) ? c.map((x) => (x.productId === m.productId ? { ...x, quantity: x.quantity + 1 } : x)) : [...c, { productId: m.productId, name: String(m.product?.name ?? ''), quantity: 1 }])}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[0.8125rem] hover:bg-slate-50"><span>+ {m.product?.name}</span><span className="text-slate-500">{formatPKR(Number(m.product?.price) || 0)}</span></button></li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <select value={mode} onChange={(e) => setMode(e.target.value as OrderMode | '')} className="h-9 w-full rounded-lg border border-slate-200 px-2 text-[0.8125rem]">
            <option value="">Har order type</option>
            {ORDER_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          {!cart.length ? <p className="rounded-xl bg-slate-50 p-4 text-center text-[0.8125rem] text-slate-500">Baayen se dishes jorein</p> : (
            <div className="rounded-xl ring-1 ring-slate-200">
              <ul className="divide-y divide-slate-100 text-[0.8125rem]">
                {cart.map((c) => {
                  const l = res?.lines.find((x) => x.productId === c.productId);
                  return (
                    <li key={c.productId} className="flex items-center gap-2 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate">{c.name} × {c.quantity}</span>
                      {l?.discount ? <span className="text-[0.75rem] font-semibold text-success-700">−{formatPKR(l.discount)} <span className="font-normal text-slate-500">({l.ruleName})</span></span> : <span className="text-[0.75rem] text-slate-400">—</span>}
                      <button type="button" aria-label="Hatayein" onClick={() => setCart((x) => x.filter((y) => y.productId !== c.productId))} className="text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-3 py-2 text-[0.8125rem] font-semibold">
                <span>{quote.isFetching ? 'Hisaab…' : `Kul ${formatPKR(total)}`}</span>
                <span className={res?.discount ? 'text-success-700' : 'text-slate-500'}>{res?.discount ? `Discount ${formatPKR(res.discount)}` : 'Abhi koi happy hour nahi lagta'}</span>
              </div>
            </div>
          )}
          <p className="flex items-start gap-1.5 text-[0.6875rem] text-slate-500"><Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />Menu ke rate par, add-ons ke bagair. Ek dish par ek hi happy hour — jo zyada bachaye.</p>
        </div>
      </div>
    </Modal>
  );
}

const GUIDE: GuideStep[] = [
  { icon: Clock, color: '#d97706', title: 'Waqt aur din', text: 'Kab se kab tak (dukaan ka time) aur kaun se din. Raat 10 se 2 baje bhi chalta hai.' },
  { icon: BadgePercent, color: '#16a34a', title: 'Discount', text: 'Percent off, har plate par Rs kam, ya ek ke saath ek. Bill par had aur kam se kam bill bhi likh sakte hain.' },
  { icon: Sparkles, color: '#7c3aed', title: 'Kis par', text: 'Poora menu, kuch category (Chai, BBQ) ya chuni hui dishes. Sirf takeaway ya delivery par bhi.' },
  { icon: ShieldAlert, color: '#e11d48', title: 'Discount ki had', text: 'Settings me discount ki had se zyada wala happy hour sirf malik ya permission wala bana sakta hai.' },
  { icon: Search, color: '#2563eb', title: 'Test karein', text: '"Test karein" me dishes daal kar dekhein abhi kitna discount banta hai.' },
];
