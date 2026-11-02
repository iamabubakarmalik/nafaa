/**
 * Add-on groups: the choices a waiter asks for with a dish — extras (cheese
 * +100), removals (no onion), spice, cooking style, a size step, or a free
 * note. Each group has rules (required, how many may be picked) and is put
 * on dishes here or from the dish editor. Groups used on past orders are
 * switched off instead of deleted, so old bills keep their lines.
 *
 * Keys: / search · N new group · G guide · Ctrl+S save in the form.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, CheckCircle2, ChefHat, CircleSlash, Copy, GraduationCap, Layers, ListChecks, ListFilter, MinusCircle, Package, Pencil, Plus,
  PlusCircle, Power, Search, Sparkles, Trash2, UtensilsCrossed,
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
import { menuItemsApi } from '../api/menu-items.api';
import { modifiersApi, type ModifierGroup, type ModifierGroupInput, type ModifierOption, type ModifierType } from '../api/modifiers.api';
import { MODIFIER_TYPES, modifierTypeOf } from '../lib/menuMeta';
import { AddOnIngredient } from '../components/AddOnIngredient';
import { t as tr, Trans } from '@core/i18n';

const KEY = 'restaurant-modifiers';
type Status = 'all' | 'on' | 'off';

const PRESETS: Array<{ label: string; group: ModifierGroupInput }> = [
  { label: tr('Extra'), group: { name: 'Extra', type: 'ADDON', isRequired: false, minSelections: 0, maxSelections: 5, options: [{ name: 'Extra cheese', priceAdjustment: 100 }, { name: 'Raita', priceAdjustment: 50 }, { name: 'Salad', priceAdjustment: 50 }, { name: 'Extra boti', priceAdjustment: 150 }] } },
  { label: tr('Bagair'), group: { name: 'Bagair', type: 'REMOVAL', isRequired: false, minSelections: 0, maxSelections: 5, options: [{ name: 'Pyaaz nahi' }, { name: 'Mayo nahi' }, { name: 'Hari mirch nahi' }] } },
  { label: tr('Teekhapan'), group: { name: 'Teekhapan', type: 'SPICE_LEVEL', isRequired: false, minSelections: 0, maxSelections: 1, options: [{ name: 'Halka' }, { name: 'Darmiyana', isDefault: true }, { name: 'Teekha' }] } },
  { label: tr('Roti / Naan'), group: { name: 'Roti / Naan', type: 'ADDON', isRequired: false, minSelections: 0, maxSelections: 3, options: [{ name: 'Roti', priceAdjustment: 25 }, { name: 'Naan', priceAdjustment: 40 }, { name: 'Roghni naan', priceAdjustment: 70 }] } },
  { label: tr('Drink size'), group: { name: 'Drink size', type: 'VARIATION', isRequired: true, minSelections: 1, maxSelections: 1, options: [{ name: 'Regular', isDefault: true }, { name: 'Large', priceAdjustment: 80 }] } },
];

const errText = (e: unknown, fallback: string) => (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() || fallback;

export default function ModifiersPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canManage = usePermission(PERMISSIONS.RESTAURANT_MENU_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<ModifierType | 'all'>('all');
  const [status, setStatus] = useState<Status>('all');
  const [editing, setEditing] = useState<ModifierGroup | ModifierGroupInput | null>(null);
  const [assigning, setAssigning] = useState<ModifierGroup | null>(null);
  const [removing, setRemoving] = useState<ModifierGroup | null>(null);

  const groupsQ = useQuery({ queryKey: [KEY], queryFn: () => modifiersApi.list() });
  const groups = groupsQ.data ?? [];
  const refresh = () => [KEY, 'restaurant-menu-board', 'restaurant-menu-items', 'restaurant-product-extra'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const toggle = useMutation({
    mutationFn: (id: string) => modifiersApi.toggle(id),
    onSuccess: (g) => { toast.success(g.isActive ? tr('Chalu — order par poocha jayega') : tr('Band — order par nahi aayega')); refresh(); },
    onError: (e) => toast.error(errText(e, tr('Nahi badla'))),
  });
  const remove = useMutation({
    mutationFn: (id: string) => modifiersApi.remove(id),
    onSuccess: (r) => {
      toast.success((r as { isActive?: boolean })?.isActive === false ? tr('Purane order me laga tha — band kar diya, history rahegi') : tr('Group hata diya'));
      setRemoving(null); refresh();
    },
    onError: (e) => toast.error(errText(e, tr('Nahi hata'))),
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
  const shown = useMemo(() => groups.filter((g) => (type === 'all' || g.type === type)
    && (status === 'all' || (status === 'on' ? g.isActive : !g.isActive))
    && (!term || g.name.toLowerCase().includes(term) || g.options.some((o) => o.name.toLowerCase().includes(term)))), [groups, type, status, term]);
  const stats = useMemo(() => ({
    on: groups.filter((g) => g.isActive).length,
    dishes: new Set(groups.flatMap((g) => (g.menuItems ?? []).map((m) => m.menuItemId))).size,
    options: groups.reduce((s, g) => s + g.options.filter((o) => o.isActive !== false).length, 0),
    unused: groups.filter((g) => g.isActive && !(g._count?.menuItems ?? 0)).length,
    required: groups.filter((g) => g.isActive && g.isRequired).length,
  }), [groups]);
  const hasFilters = !!(term || type !== 'all' || status !== 'all');

  return (
    <PageShell>
      {guide.isOpen && <PageGuide title={tr('Add-ons — aasaan tareeqa')} steps={GUIDE} onClose={guide.close}
        tips={[tr('Ek group kai dishes par lag sakta hai — "Extra" ek dafa banayein, sab burgers par lagayein.'), tr('Half / Full jaisa size jis ka rate alag ho, dish ke "Size" me rakhein; yahan wala size tab jab har dish par ek jaisa farq ho.')]}
        shortcuts={[['/', 'search'], ['N', tr('naya group')], ['G', 'guide']]} />}
      {editing && <GroupForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {assigning && <AssignDishes group={assigning} onClose={() => setAssigning(null)} onSaved={() => { setAssigning(null); refresh(); }} />}
      {removing && (
        <Modal open onClose={() => setRemoving(null)} title={tr('"{{name}}" hatayein?', { name: removing.name })} size="sm"
          footer={<><Button variant="secondary" onClick={() => setRemoving(null)}>{tr('Rehne dein')}</Button><Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(removing.id)}>{tr('Hatayein')}</Button></>}>
          <p className="text-[0.875rem] text-slate-600">{tr('{{value}}Agar purane order me laga tha to sirf band hoga — bill waise hi rahenge.', { value: removing._count?.menuItems ? tr('{{menuItems}} dish se bhi hat jayega. ', { menuItems: removing._count.menuItems }) : '' })}</p>
        </Modal>
      )}

      <PageHero title={tr('Add-ons')} chip={<><Sparkles />{groups.length} group</>} meta={tr('Extra, bagair, teekhapan — order lete waqt')} busy={groupsQ.isFetching && !groupsQ.isLoading} loading={groupsQ.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} aria-label={tr('Guide')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setEditing(blank())} className={heroPrimaryButton}><Plus className="h-4 w-4" />{tr('Naya group')}</button>}
        </>}
        stats={[
          { label: tr('Chalu group'), value: `${stats.on} / ${groups.length}` },
          { label: tr('Dishes par lage'), value: String(stats.dishes), hint: 'dish' },
          { label: tr('Options'), value: String(stats.options) },
        ]} />

      <KpiRow cols={4}>
        {groupsQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={CheckCircle2} color="#16a34a" label={tr('Chalu')} value={String(stats.on)} onClick={() => setStatus(status === 'on' ? 'all' : 'on')} active={status === 'on'} />
            <KpiCard icon={CircleSlash} color="#64748b" label={tr('Band')} value={String(groups.length - stats.on)} onClick={() => setStatus(status === 'off' ? 'all' : 'off')} active={status === 'off'} />
            <KpiCard icon={AlertTriangle} color="#d97706" label={tr('Kisi dish par nahi')} value={String(stats.unused)} hint={tr('Order par kabhi nahi aayenge')} />
            <KpiCard icon={ListChecks} color="#7c3aed" label={tr('Zaroori')} value={String(stats.required)} hint={tr('Bina chune order nahi banta')} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Group ya option ka naam…')} label={tr('Add-on search')} />}
        chips={hasFilters ? <>
          {term && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          {type !== 'all' && <FilterChip onRemove={() => setType('all')}>{modifierTypeOf(type).label}</FilterChip>}
          {status !== 'all' && <FilterChip onRemove={() => setStatus('all')}>{status === 'on' ? tr('Chalu') : tr('Band')}</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setType('all'); setStatus('all'); }}>
        <FilterMenu icon={Layers} label={tr('Type')} value={type} active={type !== 'all'} width="w-72"
          options={[{ value: 'all' as const, label: tr('Har type') }, ...MODIFIER_TYPES.map((t) => ({ value: t.value, label: t.label, hint: t.hint }))]} onChange={setType} />
        <FilterMenu icon={ListFilter} label={tr('Status')} value={status} active={status !== 'all'}
          options={[{ value: 'all', label: tr('Sab') }, { value: 'on', label: tr('Chalu') }, { value: 'off', label: tr('Band') }]} onChange={setStatus} />
      </FilterBar>

      {canManage && !groups.length && !groupsQ.isLoading && (
        <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">{tr('Jaldi shuru karein')}</p>
          <p className="text-[0.8125rem] text-slate-500">{tr('Ek dabayein, rate apne hisaab se badlein aur save karein.')}</p>
          <div className="mt-3 flex flex-wrap gap-2">{PRESETS.map((p) => <Button key={p.label} variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing(structuredClone(p.group))}>{p.label}</Button>)}</div>
        </div>
      )}

      {groupsQ.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
      ) : groupsQ.isError ? (
        <div className="rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">{tr('Add-ons nahi khule')}</p><p className="mt-1 text-[0.875rem] text-slate-500">{errText(groupsQ.error, tr('Dobara koshish karein'))}</p></div>
      ) : !shown.length ? (
        groups.length ? <div className="rounded-3xl bg-white px-6 py-12 text-center text-[0.875rem] text-slate-500 ring-1 ring-slate-200/80">{tr('Is filter me koi group nahi')}</div> : null
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((g) => {
            const t = modifierTypeOf(g.type);
            const opts = g.options.filter((o) => o.isActive !== false);
            const dishes = g._count?.menuItems ?? 0;
            return (
              <article key={g.id} className={cn('flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80', !g.isActive && 'opacity-70')}>
                <header className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[1rem] font-bold text-slate-900">{g.name}</h3>
                    <p className="text-[0.75rem] text-slate-500">{t.label} · {g.isRequired ? tr('zaroori, {{minSelections}}–{{maxSelections}}', { minSelections: g.minSelections, maxSelections: g.maxSelections }) : g.maxSelections > 1 ? tr('marzi, {{maxSelections}} tak', { maxSelections: g.maxSelections }) : tr('marzi, ek')}</p>
                  </div>
                  <span className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-bold', g.isActive ? 'bg-success-50 text-success-700' : 'bg-slate-100 text-slate-500')}>{g.isActive ? tr('Chalu') : tr('Band')}</span>
                </header>
                <ul className="mt-3 flex-1 space-y-1">
                  {opts.slice(0, 6).map((o) => (
                    <li key={o.id ?? o.name} className="flex items-center justify-between gap-2 text-[0.8125rem]">
                      <span className="truncate text-slate-700">{o.emoji ? `${o.emoji} ` : ''}{o.name}{o.isDefault && <span className="ms-1 text-[0.6875rem] text-brand-700">{tr('(pehle se)')}</span>}
                        {o.ingredient && o.ingredientQty ? <span className="ms-1 text-[0.6875rem] text-amber-700">· {o.ingredientQty} {o.ingredientUnit ?? o.ingredient.unit} {o.ingredient.name}</span> : null}</span>
                      <span className={cn('shrink-0 tabular-nums', (o.priceAdjustment ?? 0) > 0 ? 'text-slate-900' : (o.priceAdjustment ?? 0) < 0 ? 'text-success-700' : 'text-slate-400')}>
                        {o.priceAdjustment ? `${o.priceAdjustment > 0 ? '+' : '−'}${formatPKR(Math.abs(o.priceAdjustment))}` : 'free'}
                      </span>
                    </li>
                  ))}
                  {opts.length > 6 && <li className="text-[0.75rem] text-slate-500">{tr('+{{value}} aur', { value: opts.length - 6 })}</li>}
                  {!opts.length && <li className="text-[0.8125rem] text-slate-500">{g.type === 'NOTE' ? tr('Grahak apni baat likhwata hai') : tr('Koi chalu option nahi')}</li>}
                </ul>
                <button type="button" onClick={() => canManage && setAssigning(g)} disabled={!canManage}
                  className={cn('mt-3 flex items-center gap-1.5 rounded-xl px-3 py-2 text-start text-[0.8125rem] font-medium ring-1', dishes ? 'bg-slate-50 text-slate-700 ring-slate-200' : 'bg-amber-50 text-amber-900 ring-amber-200', canManage && 'hover:bg-brand-50')}>
                  <UtensilsCrossed className="h-4 w-4" />{dishes ? tr('{{dishes}} dish par laga', { dishes }) : tr('Kisi dish par nahi — lagayein')}
                </button>
                {canManage && (
                  <footer className="mt-3 flex gap-1.5 border-t border-slate-100 pt-3">
                    <Button size="sm" variant="secondary" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(g)}>{tr('Badlein')}</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={() => setEditing(copyOf(g))}>{tr('Copy')}</Button>
                    <Button size="sm" variant="ghost" leftIcon={<Power className="h-3.5 w-3.5" />} loading={toggle.isPending && toggle.variables === g.id} onClick={() => toggle.mutate(g.id)}>{g.isActive ? tr('Band') : tr('Chalu')}</Button>
                    <button type="button" onClick={() => setRemoving(g)} aria-label={tr('Hatayein')} className="ms-auto flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                  </footer>
                )}
              </article>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

const blank = (): ModifierGroupInput => ({ name: '', type: 'ADDON', isRequired: false, minSelections: 0, maxSelections: 3, options: [{ name: '', priceAdjustment: 0 }] });
const copyOf = (g: ModifierGroup): ModifierGroupInput => ({
  name: `${g.name} (copy)`, description: g.description, type: g.type, isRequired: g.isRequired, minSelections: g.minSelections, maxSelections: g.maxSelections,
  options: g.options.filter((o) => o.isActive !== false).map((o) => ({
    name: o.name, priceAdjustment: o.priceAdjustment, isDefault: o.isDefault, emoji: o.emoji,
    ingredientProductId: o.ingredientProductId ?? null, ingredientQty: o.ingredientQty ?? null, ingredientUnit: o.ingredientUnit ?? null, ingredient: o.ingredient ?? null,
  })),
});

/** Mirrors the API rules so the cashier never meets a group that cannot be filled. */
function problemOf(f: ModifierGroupInput): string | null {
  if (!f.name.trim()) return tr('Group ka naam likhein');
  const live = f.options.filter((o) => o.isActive !== false);
  if (f.options.some((o) => !o.name.trim())) return tr('Har option ka naam likhein');
  const names = f.options.map((o) => o.name.trim().toLowerCase());
  if (new Set(names).size !== names.length) return tr('Do option ka naam ek jaisa hai');
  if (f.type !== 'NOTE' && !live.length) return tr('Kam se kam ek option daalein');
  const min = f.isRequired ? Math.max(f.minSelections ?? 0, 1) : f.minSelections ?? 0;
  const max = f.maxSelections ?? 1;
  if (min > max) return tr('"Kam se kam" "zyada se zyada" se barh nahi sakta');
  if (f.type !== 'NOTE' && min > live.length) return tr('Sirf {{count}} option hain — kam se kam {{min}} nahi chune ja sakte', { count: live.length, min });
  if ((f.type === 'VARIATION' || f.type === 'SPICE_LEVEL') && max > 1) return tr('Size ya teekhapan me ek hi chuna jata hai');
  if (live.filter((o) => o.isDefault).length > max) return tr('Pehle se chune option zyada se zyada se barh gaye');
  const noQty = f.options.find((o) => o.ingredientProductId && !(Number(o.ingredientQty) > 0));
  if (noQty) return tr('{{value}}: saamaan kitna lagta hai likhein', { value: noQty.name.trim() || 'Option' });
  return null;
}

function GroupForm({ initial, onClose, onSaved }: { initial: ModifierGroup | ModifierGroupInput; onClose: () => void; onSaved: () => void }) {
  const id = 'id' in initial ? initial.id : null;
  const [f, setF] = useState<ModifierGroupInput>(() => ({
    name: initial.name, description: initial.description ?? '', type: initial.type ?? 'ADDON', isRequired: !!initial.isRequired,
    minSelections: initial.minSelections ?? 0, maxSelections: initial.maxSelections ?? 1,
    options: initial.options.map((o) => ({
      id: o.id, name: o.name, priceAdjustment: o.priceAdjustment ?? 0, isDefault: !!o.isDefault, isActive: o.isActive !== false, emoji: o.emoji ?? '',
      ingredientProductId: o.ingredientProductId ?? null, ingredientQty: o.ingredientQty ?? null, ingredientUnit: o.ingredientUnit ?? null, ingredient: o.ingredient ?? null,
    })),
  }));
  const [stockAt, setStockAt] = useState<number | null>(null);
  const set = (p: Partial<ModifierGroupInput>) => setF((x) => ({ ...x, ...p }));
  const setOpt = (i: number, p: Partial<ModifierOption>) => set({ options: f.options.map((o, j) => (j === i ? { ...o, ...p } : o)) });
  const single = f.type === 'VARIATION' || f.type === 'SPICE_LEVEL';
  const problem = problemOf(f);
  const [tried, setTried] = useState(false);

  const save = useMutation({
    mutationFn: () => {
      const body: ModifierGroupInput = {
        ...f, name: f.name.trim(), description: f.description?.trim() || undefined,
        minSelections: f.isRequired ? Math.max(f.minSelections ?? 0, 1) : f.minSelections, maxSelections: single ? 1 : f.maxSelections,
        options: f.options.map(({ ingredient: _shown, ...o }, i) => ({ ...o, name: o.name.trim(), emoji: o.emoji || undefined, displayOrder: i })),
      };
      return id ? modifiersApi.update(id, body) : modifiersApi.create(body);
    },
    onSuccess: () => { toast.success(id ? tr('Group save ho gaya') : tr('Group ban gaya — ab dishes par lagayein')); onSaved(); },
    onError: (e) => toast.error(errText(e, tr('Save nahi hua'))),
  });
  const submit = () => { setTried(true); if (!problem && !save.isPending) save.mutate(); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <Modal open onClose={onClose} size="lg" title={id ? tr('"{{name}}" badlein', { name: initial.name }) : tr('Naya add-on group')} description={tr('Order lete waqt waiter yahi options dekhega')}
      footer={<>
        {tried && problem ? <p className="me-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problem}</p> : <span className="me-auto hidden items-center gap-1 text-[0.75rem] text-slate-500 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> {' '}{tr('save')}</span>}
        <Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button>
        <Button loading={save.isPending} onClick={submit}>{id ? tr('Save karein') : tr('Group banayein')}</Button>
      </>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={tr('Group ka naam')} required autoFocus value={f.name} onChange={(e) => set({ name: e.target.value.slice(0, 60) })} placeholder={tr('Extra, Bagair, Roti…')} hint={tr('Waiter ko yahi naam dikhega')} error={tried && !f.name.trim() ? tr('Naam likhein') : undefined} />
          <Input label={tr('Note (marzi)')} value={f.description ?? ''} onChange={(e) => set({ description: e.target.value.slice(0, 200) })} placeholder={tr('Maslan: sirf burger ke saath')} />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{tr('Type')}</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MODIFIER_TYPES.map((t) => (
              <button key={t.value} type="button" onClick={() => set({ type: t.value, ...(t.value === 'VARIATION' || t.value === 'SPICE_LEVEL' ? { maxSelections: 1 } : {}) })}
                className={cn('rounded-xl border p-2.5 text-start transition', f.type === t.value ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20' : 'border-slate-200 hover:bg-slate-50')}>
                <span className="block text-[0.8125rem] font-semibold text-slate-900">{t.label}</span>
                <span className="block text-[0.6875rem] leading-snug text-slate-500">{t.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Switch checked={!!f.isRequired} onChange={(e) => set({ isRequired: e.target.checked, minSelections: e.target.checked ? Math.max(f.minSelections ?? 0, 1) : 0 })} label={tr('Zaroori')} description={tr('Bina chune order nahi banega')} />
          <Input label={tr('Kam se kam')} inputMode="numeric" value={String(f.isRequired ? Math.max(f.minSelections ?? 0, 1) : f.minSelections ?? 0)} disabled={!f.isRequired}
            onChange={(e) => set({ minSelections: Number(e.target.value.replace(/\D/g, '')) || 0 })} hint={f.isRequired ? tr('Kitne chunna lazmi') : tr('Marzi wale me 0')} />
          <Input label={tr('Zyada se zyada')} inputMode="numeric" value={String(single ? 1 : f.maxSelections ?? 1)} disabled={single}
            onChange={(e) => set({ maxSelections: Math.max(Number(e.target.value.replace(/\D/g, '')) || 1, 1) })} hint={single ? tr('Size / teekhapan me ek') : tr('Kitne tak chun sakte hain')} />
        </div>
        {f.type !== 'NOTE' && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[0.8125rem] font-medium text-slate-700">{tr('Options')}</span>
              <span className="text-[0.6875rem] text-slate-500">{tr('Rate me farq: + mehnga, − sasta, 0 free')}</span>
            </div>
            <ul className="space-y-2">
              {f.options.map((o, i) => (
                <li key={o.id ?? `n${i}`} className={cn('flex flex-wrap items-center gap-2 rounded-xl border p-2', o.isActive === false ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-slate-200')}>
                  <input value={o.emoji ?? ''} onChange={(e) => setOpt(i, { emoji: e.target.value.slice(0, 8) })} placeholder="🧀" aria-label={tr('Emoji')} className="h-9 w-12 rounded-lg border border-slate-200 text-center" />
                  <input value={o.name} onChange={(e) => setOpt(i, { name: e.target.value.slice(0, 60) })} placeholder={tr('Extra cheese')} aria-label={tr('Option ka naam')}
                    className={cn('h-9 min-w-[8rem] flex-1 rounded-lg border px-2.5 text-[0.875rem]', tried && !o.name.trim() ? 'border-rose-400' : 'border-slate-200')} />
                  <div className="flex items-center">
                    <button type="button" onClick={() => setOpt(i, { priceAdjustment: -Math.abs(o.priceAdjustment ?? 0) })} aria-label={tr('Sasta')} className={cn('flex h-9 w-8 items-center justify-center rounded-s-lg border border-e-0', (o.priceAdjustment ?? 0) < 0 ? 'bg-success-50 text-success-700' : 'text-slate-400')}><MinusCircle className="h-4 w-4" /></button>
                    <input inputMode="decimal" value={o.priceAdjustment ? String(Math.abs(o.priceAdjustment)) : ''} placeholder="0" aria-label={tr('Rate me farq')}
                      onChange={(e) => { const v = Number(e.target.value.replace(/[^\d.]/g, '')) || 0; setOpt(i, { priceAdjustment: (o.priceAdjustment ?? 0) < 0 ? -v : v }); }}
                      className="h-9 w-20 border border-slate-200 px-2 text-end tabular-nums" />
                    <button type="button" onClick={() => setOpt(i, { priceAdjustment: Math.abs(o.priceAdjustment ?? 0) })} aria-label={tr('Mehnga')} className={cn('flex h-9 w-8 items-center justify-center rounded-e-lg border border-s-0', (o.priceAdjustment ?? 0) > 0 ? 'bg-brand-50 text-brand-700' : 'text-slate-400')}><PlusCircle className="h-4 w-4" /></button>
                  </div>
                  <label className="inline-flex items-center gap-1 text-[0.75rem] text-slate-600"><input type="checkbox" checked={!!o.isDefault} onChange={(e) => setOpt(i, { isDefault: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />{tr('Default')}</label>
                  <button type="button" onClick={() => setStockAt(stockAt === i ? null : i)} title={tr('Bikne par kaunsa saamaan stock se nikle')} aria-label={tr('Saamaan')}
                    className={cn('inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.6875rem] font-semibold ring-1', o.ingredientProductId ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'text-slate-500 ring-slate-200 hover:bg-slate-50')}>
                    <Package className="h-3.5 w-3.5" />{o.ingredient && o.ingredientQty ? `${o.ingredientQty} ${o.ingredientUnit ?? o.ingredient.unit}` : tr('Saamaan')}
                  </button>
                  {o.id
                    ? <button type="button" onClick={() => setOpt(i, { isActive: o.isActive === false })} className={cn('h-8 rounded-lg px-2 text-[0.6875rem] font-semibold ring-1', o.isActive === false ? 'bg-slate-100 text-slate-500 ring-slate-200' : 'bg-success-50 text-success-700 ring-success-200')}>{o.isActive === false ? tr('Band') : tr('Chalu')}</button>
                    : <button type="button" onClick={() => set({ options: f.options.filter((_, j) => j !== i) })} aria-label={tr('Hatayein')} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}
                  {(stockAt === i || (tried && o.ingredientProductId && !(Number(o.ingredientQty) > 0))) && (
                    <div className="w-full rounded-lg bg-slate-50 p-2">
                      <AddOnIngredient invalid={tried && !!o.ingredientProductId && !(Number(o.ingredientQty) > 0)}
                        value={{ ingredient: o.ingredient ?? null, qty: o.ingredientQty ?? null, unit: o.ingredientUnit ?? null }}
                        onChange={(v) => setOpt(i, { ingredient: v.ingredient, ingredientProductId: v.ingredient?.id ?? null, ingredientQty: v.qty, ingredientUnit: v.unit })} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <Button className="mt-2" size="sm" variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => set({ options: [...f.options, { name: '', priceAdjustment: 0 }] })}>{tr('Option jorein')}</Button>
            <p className="mt-2 text-[0.6875rem] text-slate-500">{tr('"Saamaan": extra cheese jaisa add-on bikne par us ka raw material (maslan 30 gram cheese) stock se nikalta hai.')}</p>
            {id && <p className="mt-1 text-[0.6875rem] text-slate-500">{tr('Purane option hatte nahi, band hote hain — jin bills me lage the woh waise rahenge.')}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}

function AssignDishes({ group, onClose, onSaved }: { group: ModifierGroup; onClose: () => void; onSaved: () => void }) {
  const [q, setQ] = useState('');
  const [onlyPicked, setOnlyPicked] = useState(false);
  const menu = useQuery({ queryKey: ['restaurant-menu-items', 'assign'], queryFn: () => menuItemsApi.list({}) });
  const [picked, setPicked] = useState<Set<string>>(() => new Set((group.menuItems ?? []).map((m) => m.menuItemId)));
  const term = q.trim().toLowerCase();
  const rows = (menu.data ?? []).filter((m) => (!term || String(m.product?.name ?? '').toLowerCase().includes(term) || String(m.product?.category?.name ?? '').toLowerCase().includes(term))
    && (!onlyPicked || picked.has(m.id)));
  const flip = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const save = useMutation({
    mutationFn: () => modifiersApi.assignDishes(group.id, [...picked]),
    onSuccess: (r) => { toast.success(tr('{{added}} dish par laga, {{removed}} se hata', { added: r.added, removed: r.removed })); onSaved(); },
    onError: (e) => toast.error(errText(e, tr('Save nahi hua'))),
  });
  const cats = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of rows) { const c = r.product?.category?.name ?? tr('Baghair category'); m.set(c, [...(m.get(c) ?? []), r.id]); }
    return [...m.entries()];
  }, [rows]);
  return (
    <Modal open onClose={onClose} size="lg" title={tr('"{{name}}" kin dishes par?', { name: group.name })} description={tr('Chuni hui dish ka order lete waqt yeh group poocha jayega')}
      footer={<><span className="me-auto text-[0.8125rem] text-slate-600">{tr('{{size}} chuni', { size: picked.size })}</span><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button loading={save.isPending} onClick={() => save.mutate()}>{tr('Save karein')}</Button></>}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Dish ya category…')} className="h-10 w-full rounded-xl border border-slate-200 ps-9 pe-3 text-[0.875rem]" />
          </label>
          <Button size="sm" variant={onlyPicked ? 'primary' : 'secondary'} onClick={() => setOnlyPicked((v) => !v)}>{tr('Sirf chuni')}</Button>
        </div>
        {menu.isLoading ? <Skeleton className="h-60 rounded-xl" /> : !rows.length ? <p className="py-8 text-center text-[0.8125rem] text-slate-500">{tr('Koi dish nahi mili')}</p> : (
          <div className="max-h-[55vh] space-y-3 overflow-y-auto pe-1">
            {cats.map(([cat, ids]) => {
              const all = ids.every((x) => picked.has(x));
              return (
                <div key={cat}>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{cat}</p>
                    <button type="button" onClick={() => setPicked((p) => { const n = new Set(p); ids.forEach((x) => (all ? n.delete(x) : n.add(x))); return n; })} className="text-[0.75rem] font-semibold text-brand-700 hover:underline">{all ? tr('Sab hatayein') : tr('Sab chunein')}</button>
                  </div>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {rows.filter((r) => ids.includes(r.id)).map((m) => (
                      <li key={m.id}>
                        <label className={cn('flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[0.8125rem]', picked.has(m.id) ? 'border-brand-400 bg-brand-50/60' : 'border-slate-200 hover:bg-slate-50')}>
                          <input type="checkbox" checked={picked.has(m.id)} onChange={() => flip(m.id)} className="h-4 w-4 rounded border-slate-300" />
                          <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{m.product?.name}</span>
                          {!m.isAvailable && <span className="text-[0.6875rem] text-rose-600">{tr('Band hai')}</span>}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[0.75rem] text-slate-500"><Trans text="Nayi dish? {{link}} — wahan bhi add-ons chun sakte hain." values={{ link: <Link to="/restaurant-menu-items/new" className="font-semibold text-brand-700 hover:underline">{tr('Dish banayein')}</Link> }} /></p>
      </div>
    </Modal>
  );
}

const GUIDE: GuideStep[] = [
  { icon: Plus, color: '#16a34a', title: tr('Group banayein'), text: tr('"Extra" jaisa group, us me options aur rate ka farq: cheese +100, raita +50. Bagair pyaaz jaisi cheez 0 par.') },
  { icon: ListChecks, color: '#7c3aed', title: tr('Zaroori ya marzi'), text: tr('Zaroori group ke bagair order nahi banta (maslan drink ka size). Marzi wale me kitne tak chun sakte hain likhein.') },
  { icon: UtensilsCrossed, color: '#2563eb', title: tr('Dishes par lagayein'), text: tr('"Kisi dish par nahi" dabayein aur dishes chunein — ek group kai dishes par. Dish ke editor se bhi lag jata hai.') },
  { icon: ChefHat, color: '#ea580c', title: tr('Kitchen tak'), text: tr('Chuna hua option order aur KOT par chhapta hai, aur rate ka farq bill me judta hai.') },
  { icon: Power, color: '#64748b', title: tr('Band karein'), text: tr('Kuch din ke liye nahi dena (cheese khatam) to group band karein — dishes par laga rahega, wapas chalu kar sakte hain.') },
];
