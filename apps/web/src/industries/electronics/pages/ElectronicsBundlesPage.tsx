/**
 * Bundle deals (TV + soundbar, laptop + bag + mouse). Each card shows the
 * deal price against the separate prices, the profit, how many deals the
 * branch stock can make and how many bills sold it. The POS shows only
 * bundles that are on, inside their dates and fully in the catalog.
 *
 * Keys: N new bundle · / search · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Barcode, CalendarClock, Eye, EyeOff, Filter, GraduationCap, Layers, Package, Pencil, Plus, ShoppingCart, Star,
  Trash2, TrendingUp,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton,
  heroIconButton, heroPrimaryButton, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useShopParam } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { electronicsBundlesApi, type ElectronicsBundle } from '../api/bundles.api';
import { apiError, shortDate } from '../components/meta';

type Show = 'all' | 'live' | 'off' | 'nostock' | 'expired';
const SHOW: Array<{ value: Show; label: string }> = [
  { value: 'all', label: 'Sab' },
  { value: 'live', label: 'POS par chal rahe' },
  { value: 'nostock', label: 'Stock kam' },
  { value: 'expired', label: 'Date khatam / aane wale' },
  { value: 'off', label: 'Band' },
];
const BUNDLE_KEYS = ['electronics-bundles', 'electronics-pos-catalog'];

const matches = (b: ElectronicsBundle, show: Show) =>
  show === 'all' ? true
    : show === 'live' ? !!b.sellable
      : show === 'off' ? !b.isActive
        : show === 'nostock' ? b.isActive && (b.canMake ?? 0) === 0
          : !!(b.expired || b.upcoming);

export default function ElectronicsBundlesPage() {
  const navigate = useNavigate();
  const shopId = useShopParam();
  const { cost: money } = useMasked();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const canDelete = usePermission(PERMISSIONS.PRODUCTS_DELETE);
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [show, setShow] = useState<Show>('all');

  const q = useQuery({ queryKey: ['electronics-bundles', shopId], queryFn: () => electronicsBundlesApi.list() });
  const all = useMemo(() => q.data ?? [], [q.data]);
  const term = search.trim().toLowerCase();
  const rows = all.filter((b) => matches(b, show) && (!term || b.name.toLowerCase().includes(term) || b.items.some((i) => i.product?.name.toLowerCase().includes(term))));
  const n = (s: Show) => all.filter((b) => matches(b, s)).length;
  const sold = all.reduce((s, b) => s + (b.soldBills ?? 0), 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canEdit) { e.preventDefault(); navigate('/electronics/bundles/new'); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEdit, navigate]);

  return (
    <PageShell>
      <PageHero
        title="Bundles"
        chip={<><Layers /> Deal packs</>}
        meta="Kai cheezein ek rate par — POS par ek click"
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <Link to="/electronics/bundles/new" title="Naya bundle (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya bundle</Link>}
        </>}
        stats={[
          { label: 'POS par chal rahe', value: n('live') },
          { label: 'Kul bundles', value: all.length },
          { label: 'Bills mein bike', value: sold },
        ]}
      />

      <KpiRow cols={4}>
        {q.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={ShoppingCart} color="#059669" label="Chal rahe" value={n('live')} hint="POS par nazar aate hain" onClick={() => setShow('live')} active={show === 'live'} />
          <KpiCard icon={Package} color="#d97706" label="Stock kam" value={n('nostock')} hint="Ek bhi deal nahi ban sakti" onClick={() => setShow('nostock')} active={show === 'nostock'} />
          <KpiCard icon={CalendarClock} color="#7c3aed" label="Date se bahar" value={n('expired')} hint="Khatam ya abhi shuru nahi" onClick={() => setShow('expired')} active={show === 'expired'} />
          <KpiCard icon={EyeOff} color="#64748b" label="Band" value={n('off')} hint="POS par nahi" onClick={() => setShow('off')} active={show === 'off'} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Bundle ya us ki kisi cheez ka naam…" label="Search" />}
        chips={show !== 'all' || term ? <>
          {show !== 'all' && <FilterChip onRemove={() => setShow('all')}>{SHOW.find((s) => s.value === show)?.label}</FilterChip>}
          {term && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
        </> : undefined}
        onClear={() => { setShow('all'); setSearch(''); }}>
        <FilterMenu icon={Filter} label="Dikhayein" value={show} active={show !== 'all'} onChange={setShow} options={SHOW.map((s) => ({ ...s, hint: `${n(s.value)} bundles` }))} />
      </FilterBar>

      <p className="hidden items-center gap-1.5 text-[0.75rem] text-slate-500 sm:flex"><Kbd>/</Kbd> search{canEdit && <> · <Kbd>N</Kbd> naya bundle</>} · <Kbd>G</Kbd> guide</p>

      {q.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-3xl" />)}</div>
      ) : !rows.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <Layers className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{all.length ? 'Is filter mein koi bundle nahi' : 'Abhi koi bundle nahi'}</p>
          <p className="mt-1 text-sm text-slate-500">TV ke saath wall bracket, laptop ke saath bag aur mouse — ek rate par bechein. Customer ko bachat, aap ka maal nikle.</p>
          {canEdit && <Button className="mt-4" onClick={() => navigate('/electronics/bundles/new')} leftIcon={<Plus className="h-4 w-4" />}>Naya bundle</Button>}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((b) => <BundleCard key={b.id} b={b} money={money} canEdit={canEdit} canDelete={canDelete} />)}
        </div>
      )}

      {guide.isOpen && (
        <PageGuide title="Bundles — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Bundle banayein', text: 'Cheezein chunein, har ek ki quantity, phir deal ka rate. Alag alag rate aur bachat khud nikal aati hai.' },
            { icon: ShoppingCart, color: '#059669', title: 'POS par', text: 'POS ke Combos tab (F8) mein bundle dikhta hai. Click karein — bill par ek line, checkout par har cheez apne hisse ke rate se stock se nikalti hai.' },
            { icon: TrendingUp, color: '#7c3aed', title: 'Profit', text: 'Card par deal ka profit aur kitni deals stock se ban sakti hain likha hai. Profit kam ho to rate badlein.' },
            { icon: Barcode, color: '#e11d48', title: 'Serial wali cheez', text: 'Bundle mein serial wali cheez ho to POS par bundle dabate hi us ka unit chunna hota hai (tap ya scan). Bill par serial aur warranty usi unit par lagti hai.' },
          ]}
          tips={['Bika hua bundle hataya nahi jata — band ho jata hai taake purane bill parhe ja sakein.', 'Date khatam hone par bundle POS se khud hat jata hai.']}
          shortcuts={[['N', 'naya bundle'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function BundleCard({ b, money, canEdit, canDelete }: { b: ElectronicsBundle; money: (n: number) => string; canEdit: boolean; canDelete: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const refresh = () => BUNDLE_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const toggle = useMutation({
    mutationFn: (patch: { isActive?: boolean; isFeatured?: boolean }) => electronicsBundlesApi.update(b.id, patch),
    onSuccess: refresh,
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const remove = useMutation({
    mutationFn: () => electronicsBundlesApi.remove(b.id),
    onSuccess: (r) => { toast.success(r.archived ? 'Bundle bik chuka tha — band kar diya' : 'Bundle hata diya'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Hataya nahi ja saka')),
  });
  const serial = b.items.some((i) => i.serial);
  const state = !b.isActive ? { t: 'Band', c: 'bg-slate-100 text-slate-600 ring-slate-200' }
    : b.broken ? { t: 'Koi cheez band hai', c: 'bg-rose-50 text-rose-700 ring-rose-200' }
      : b.expired ? { t: 'Date khatam', c: 'bg-slate-100 text-slate-600 ring-slate-200' }
        : b.upcoming ? { t: `${shortDate(b.validFrom)} se`, c: 'bg-violet-50 text-violet-700 ring-violet-200' }
          : { t: 'POS par', c: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };

  return (
    <div className={cn('flex flex-col rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80', !b.isActive && 'opacity-75')}>
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          {b.imageUrl ? <img src={b.imageUrl} alt="" className="h-full w-full object-cover" /> : <Layers className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate font-semibold text-slate-900">{b.isFeatured && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}{b.name}</p>
          <span className={cn('mt-1 inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', state.c)}>{state.t}</span>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tabular-nums text-slate-900">{formatPKR(b.bundlePrice)}</p>
          {b.savings > 0 && <p className="text-[0.75rem] tabular-nums text-slate-400 line-through">{formatPKR(b.originalPrice)}</p>}
        </div>
      </div>
      <ul className="mt-3 space-y-1 text-[0.8125rem]">
        {b.items.map((i) => (
          <li key={i.productId} className="flex items-center justify-between gap-2">
            <span className={cn('min-w-0 truncate', !i.product && 'text-rose-600')}>{i.quantity} × {i.product?.name ?? 'Product hata diya gaya'}{i.serial && <Barcode className="ml-1 inline h-3 w-3 text-violet-600" />}</span>
            <span className={cn('shrink-0 tabular-nums text-[0.75rem]', (i.stock ?? 0) < i.quantity ? 'font-semibold text-rose-600' : 'text-slate-500')}>stock {i.stock ?? 0}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-2 text-center text-[0.75rem]">
        <div><dt className="text-slate-500">Bachat</dt><dd className="font-semibold tabular-nums text-emerald-700">{b.savings > 0 ? `${Math.round(b.savingsPct)}%` : '—'}</dd></div>
        <div><dt className="text-slate-500">Profit</dt><dd className={cn('font-semibold tabular-nums', (b.profit ?? 0) < 0 ? 'text-rose-600' : 'text-slate-900')}>{money(b.profit ?? 0)}</dd></div>
        <div><dt className="text-slate-500">Ban sakti</dt><dd className="font-semibold tabular-nums text-slate-900">{b.canMake ?? 0}</dd></div>
      </dl>
      {serial && <p className="mt-2 flex items-start gap-1.5 text-[0.75rem] text-violet-800"><Barcode className="mt-0.5 h-3.5 w-3.5 shrink-0" />POS par serial wali cheez ka unit chunna hoga</p>}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
        <span className="mr-auto text-[0.75rem] text-slate-500">{b.soldBills ?? 0} bills{b.validUntil ? ` · ${shortDate(b.validUntil)} tak` : ''}</span>
        {canEdit && <>
          <button type="button" onClick={() => toggle.mutate({ isFeatured: !b.isFeatured })} title={b.isFeatured ? 'Upar se hatayein' : 'POS par upar dikhayein'} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Star className={cn('h-4 w-4', b.isFeatured && 'fill-amber-400 text-amber-400')} /></button>
          <button type="button" onClick={() => toggle.mutate({ isActive: !b.isActive })} title={b.isActive ? 'Band karein' : 'Chalu karein'} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">{b.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          <button type="button" onClick={() => navigate(`/electronics/bundles/${b.id}/edit`)} title="Badlein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
        </>}
        {canDelete && (
          <button type="button" onClick={async () => { if ((await confirmDialog({ title: `"${b.name}" hata dein?`, text: 'Bika hua ho to sirf band hoga.', danger: true }))) remove.mutate(); }} title="Hatayein" className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
        )}
      </div>
    </div>
  );
}
