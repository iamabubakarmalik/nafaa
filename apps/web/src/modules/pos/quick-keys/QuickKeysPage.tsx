/**
 * Quick keys setup for every industry: the one-tap buttons on the POS
 * "Quick" tab. The editor grid mirrors the POS layout; drag a key (or use
 * the arrows) to change its place, click it to edit. Keys can be shared,
 * limited to one branch or personal. The preview tab shows exactly what
 * the counter sees.
 *
 * Keys: N new key · / search · P preview · G guide.
 */

import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Eye, EyeOff, Filter, GraduationCap, GripVertical, LayoutGrid, Lock, MapPin, MousePointerClick, Move, Palette, Plus,
  ShoppingCart, Store, TriangleAlert, User, Zap,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { combosApi } from '@modules/inventory/combos/api/combos.api';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { usePurchaseSources } from '@modules/purchasing/purchases/editor/sources';
import { PosEmptyState, PosQuickKeyTile } from '../components';
import { quickKeysApi, type QuickKey } from '../api/quick-keys.api';
import { QuickKeyEditor } from './QuickKeyEditor';
import { DEFAULT_GROUP, POS_QK_KEY, QK_KEY, groupOf, grouped } from './meta';

type Tab = 'editor' | 'preview';
type Where = 'all' | 'everywhere' | 'branch' | 'personal';
type State = 'all' | 'on' | 'off' | 'broken';

/** Same grid as the POS Quick tab. */
const GRID = 'grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-6';

export default function QuickKeysPage() {
  const qc = useQueryClient();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const shopParam = useShopParam();
  const userId = useAuthStore((s) => s.user?.id);
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('editor');
  const [search, setSearch] = useState('');
  const [where, setWhere] = useState<Where>('all');
  const [state, setState] = useState<State>('all');
  const [editor, setEditor] = useState<{ key: QuickKey | null } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const keysQ = useQuery({ queryKey: [QK_KEY, shopParam ?? 'all'], queryFn: quickKeysApi.manage });
  const { sources, byCode, loading: sourcesLoading } = usePurchaseSources(false);
  const combosQ = useQuery({ queryKey: ['combos', 'active'], queryFn: () => combosApi.list({ status: 'ACTIVE' }), staleTime: 60_000 });
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000 });

  const keys = useMemo(() => [...(keysQ.data ?? [])].sort((a, b) => a.position - b.position), [keysQ.data]);
  const combos = useMemo(() => combosQ.data ?? [], [combosQ.data]);
  const productIds = useMemo(() => new Set(sources.map((s) => s.id)), [sources]);
  const shopName = useMemo(() => new Map((shopsQ.data ?? []).map((s) => [s.id, s.name])), [shopsQ.data]);
  const shop = shopParam ? { id: shopParam, name: shopName.get(shopParam) ?? 'is branch' } : null;
  const groups = useMemo(() => [...new Set(keys.map(groupOf))], [keys]);

  /** A key whose product or combo is gone or not loaded. */
  const broken = (k: QuickKey) => (k.productId ? !sourcesLoading && !productIds.has(k.productId) : k.comboId ? !combosQ.isLoading && !combos.some((c) => c.id === k.comboId) : true);

  const q = search.trim().toLowerCase();
  const visible = keys.filter((k) =>
    (!q || `${k.label} ${k.group ?? ''}`.toLowerCase().includes(q))
    && (where === 'all' || (where === 'everywhere' ? !k.shopId && !k.userId : where === 'branch' ? !!k.shopId : !!k.userId))
    && (state === 'all' || (state === 'on' ? k.isActive : state === 'off' ? !k.isActive : broken(k))));
  const filtered = !!q || where !== 'all' || state !== 'all';
  const canMove = canEdit && !filtered;
  const sections = grouped(visible);

  const reorder = useMutation({
    mutationFn: async ({ order, regroup }: { order: QuickKey[]; regroup?: { id: string; group: string | null } }) => {
      if (regroup) await quickKeysApi.update(regroup.id, { group: regroup.group ?? '' });
      return quickKeysApi.reorder(order.map((k, i) => ({ id: k.id, position: i })));
    },
    onMutate: ({ order, regroup }) => {
      const key = [QK_KEY, shopParam ?? 'all'];
      const prev = qc.getQueryData<QuickKey[]>(key);
      qc.setQueryData<QuickKey[]>(key, order.map((k, i) => ({ ...k, position: i, ...(regroup?.id === k.id && { group: regroup.group }) })));
      return { prev, key };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev);
      const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(m || 'Sort save nahi hui');
    },
    onSettled: () => { qc.invalidateQueries({ queryKey: [QK_KEY] }); qc.invalidateQueries({ queryKey: [POS_QK_KEY] }); },
  });

  const toggle = useMutation({
    mutationFn: (k: QuickKey) => quickKeysApi.update(k.id, { isActive: !k.isActive }),
    onSuccess: (_d, k) => { toast.success(k.isActive ? `${k.label} POS se chhup gayi` : `${k.label} POS par wapas`); qc.invalidateQueries({ queryKey: [QK_KEY] }); qc.invalidateQueries({ queryKey: [POS_QK_KEY] }); },
    onError: () => toast.error('Badal nahi saka'),
  });

  /** Flat order as the POS shows it (group by group), after moving `id` before `targetId` (or to the end of `targetGroup`). */
  const move = (id: string, targetId: string | null, targetGroup: string) => {
    const dragged = keys.find((k) => k.id === id);
    if (!dragged || id === targetId) return;
    const sec = grouped(keys).map(([g, list]) => [g, list.filter((k) => k.id !== id)] as const);
    const at = sec.findIndex(([g]) => g === targetGroup);
    const stored = targetGroup === DEFAULT_GROUP ? null : targetGroup;
    const regroup = groupOf(dragged) !== targetGroup ? { id, group: stored } : undefined;
    const moved = regroup ? { ...dragged, group: stored } : dragged;
    if (at < 0) return;
    const list = [...sec[at][1]];
    const idx = targetId ? list.findIndex((k) => k.id === targetId) : list.length;
    list.splice(idx < 0 ? list.length : idx, 0, moved);
    const order = sec.flatMap(([g, l], i) => (i === at ? list : l));
    reorder.mutate({ order, regroup });
  };
  const step = (k: QuickKey, dir: -1 | 1) => {
    const list = grouped(keys).find(([g]) => g === groupOf(k))?.[1] ?? [];
    const i = list.findIndex((x) => x.id === k.id);
    const target = list[i + dir];
    if (!target) return;
    if (dir === -1) move(k.id, target.id, groupOf(k));
    else move(k.id, list[i + 2]?.id ?? null, groupOf(k));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canEdit) { e.preventDefault(); setEditor({ key: null }); }
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); setTab((t) => (t === 'preview' ? 'editor' : 'preview')); }
      if (e.key === '/') { e.preventDefault(); setTab('editor'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEdit]);

  // Base price and stock, as the POS tile shows them.
  const tileProducts = useMemo(() => sources.map((s) => ({ id: s.id, price: s.price ?? 0, stock: s.stock })), [sources]);
  const tileCombos = combos.map((c) => ({ id: c.id, comboPrice: c.comboPrice }));
  // The counter sees active keys that are shared or its own, for this branch or every branch.
  const posKeys = keys.filter((k) => k.isActive && (!k.userId || k.userId === userId) && (!k.shopId || !shopParam || k.shopId === shopParam));

  const total = keys.length;
  const on = keys.filter((k) => k.isActive).length;
  const brokenCount = keys.filter(broken).length;
  const clear = () => { setSearch(''); setWhere('all'); setState('all'); };

  const onDrop = (e: DragEvent, targetId: string | null, g: string) => {
    e.preventDefault();
    const id = dragId ?? e.dataTransfer.getData('text/plain');
    setDragId(null); setOverId(null);
    if (id) move(id, targetId, g);
  };

  return (
    <PageShell>
      <PageHero
        title="Quick keys"
        chip={<><Zap /> POS ke shortcut</>}
        meta="Counter par ek tap me bikne wali cheezein — sort, rang aur group"
        busy={keysQ.isFetching && !keysQ.isLoading || reorder.isPending}
        loading={keysQ.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setEditor({ key: null })} title="Nayi key (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Nayi key</button>}
        </>}
        stats={[
          { label: 'POS par chalu', value: on, hint: `${total} me se` },
          { label: 'Groups', value: groups.length },
          { label: shop ? `${shop.name} ka POS` : 'Sab branches', value: posKeys.length, hint: 'keys dikhti hain' },
        ]}
      />

      <KpiRow cols={4}>
        {keysQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Zap} color="#2563eb" label="Kul keys" value={total} hint={`${on} chalu`} onClick={() => setState('all')} active={state === 'all' && where === 'all'} />
          <KpiCard icon={EyeOff} color="#64748b" label="Band keys" value={total - on} hint="POS par nahi dikhti" onClick={() => setState(state === 'off' ? 'all' : 'off')} active={state === 'off'} />
          <KpiCard icon={MapPin} color="#0891b2" label="Sirf ek branch ki" value={keys.filter((k) => k.shopId).length} hint="Baqi har branch par" onClick={() => setWhere(where === 'branch' ? 'all' : 'branch')} active={where === 'branch'} />
          <KpiCard icon={TriangleAlert} color="#e11d48" label="Kharab keys" value={brokenCount} hint={brokenCount ? 'Product ya combo nahi mila' : 'Sab theek'} onClick={() => setState(state === 'broken' ? 'all' : 'broken')} active={state === 'broken'} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Key ka naam ya group…" label="Search" />}
        chips={filtered ? <>
          {q && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          {where !== 'all' && <FilterChip onRemove={() => setWhere('all')}>{WHERE.find((w) => w.value === where)?.label}</FilterChip>}
          {state !== 'all' && <FilterChip onRemove={() => setState('all')}>{STATES.find((s) => s.value === state)?.label}</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <FilterMenu icon={Store} label="Kahan dikhe" value={where} active={where !== 'all'} onChange={setWhere} options={WHERE} />
        <FilterMenu icon={Filter} label="Haal" value={state} active={state !== 'all'} onChange={setState} options={STATES} align="right" />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        hint={filtered && tab === 'editor' ? 'Filter laga hai — sort badalne ke liye filter hatayein' : <><Kbd>N</Kbd> nayi · <Kbd>P</Kbd> preview · <Kbd>/</Kbd> search</>}
        tabs={[{ id: 'editor', label: 'Keys', icon: LayoutGrid, count: visible.length }, { id: 'preview', label: 'POS preview', icon: ShoppingCart }]} />

      {!canEdit && (
        <p className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <Lock className="h-4 w-4 shrink-0" /> Aap keys dekh sakte hain. Badalne ke liye "Products edit" ki permission chahiye.
        </p>
      )}

      {tab === 'preview' ? (
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
          <p className="mb-4 text-[0.8125rem] text-slate-500">{shop ? `${shop.name} ke` : 'Har'} counter par "Quick" tab (F10) bilkul aisa dikhta hai. Tile dabane se cheez bill me jaati hai.</p>
          {!posKeys.length ? <PosEmptyState icon={Zap} title="Koi quick key nahi" hint="Quick keys setup page se banayein" /> : (
            <div className="space-y-5">
              {grouped(posKeys).map(([g, list]) => (
                <div key={g}>
                  <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{g}</h3>
                  <div className={GRID}>
                    {list.map((k) => <PosQuickKeyTile key={k.id} qk={k} products={tileProducts} combos={tileCombos} onClick={() => toast(k.label, { duration: 800 })} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : keysQ.isLoading ? (
        <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200/80"><div className={GRID}>{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}</div></div>
      ) : !visible.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <Zap className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{filtered ? 'Is filter me koi key nahi' : 'Abhi koi quick key nahi'}</p>
          <p className="mt-1 text-sm text-slate-500">Roz zyada bikne wali cheezon ki keys banayein — doodh, double roti, cold drink. Counter par ek tap me bill me.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {canEdit && <Button onClick={() => setEditor({ key: null })} leftIcon={<Plus className="h-4 w-4" />}>Pehli key banayein</Button>}
            {filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map(([g, list]) => (
            <section key={g} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5"
              onDragOver={(e) => { if (canMove && dragId) e.preventDefault(); }} onDrop={(e) => canMove && onDrop(e, null, g)}>
              <h3 className="mb-3 flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">
                {g}<span className="rounded-full bg-slate-100 px-1.5 text-[0.6875rem] tabular-nums text-slate-500">{list.length}</span>
              </h3>
              <div className={GRID}>
                {list.map((k, i) => (
                  <EditorTile key={k.id} k={k} first={i === 0} last={i === list.length - 1} canEdit={canEdit} canMove={canMove} broken={broken(k)}
                    where={k.userId ? 'personal' : k.shopId ? shopName.get(k.shopId) ?? 'Ek branch' : null}
                    dragging={dragId === k.id} over={overId === k.id && dragId !== k.id}
                    tile={<PosQuickKeyTile qk={k} products={tileProducts} combos={tileCombos} onClick={() => canEdit && setEditor({ key: k })} />}
                    onDragStart={(e) => { setDragId(k.id); e.dataTransfer.setData('text/plain', k.id); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragEnd={() => { setDragId(null); setOverId(null); }}
                    onDragOver={(e) => { if (dragId) { e.preventDefault(); e.stopPropagation(); setOverId(k.id); } }}
                    onDrop={(e) => { e.stopPropagation(); onDrop(e, k.id, g); }}
                    onStep={(d) => step(k, d)} onToggle={() => toggle.mutate(k)} onEdit={() => setEditor({ key: k })} />
                ))}
                {canEdit && !filtered && (
                  <button type="button" onClick={() => setEditor({ key: null })}
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 text-[0.75rem] font-medium text-slate-400 transition hover:border-brand-400 hover:text-brand-700">
                    <Plus className="h-5 w-5" /> Nayi key
                  </button>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {editor && (
        <QuickKeyEditor editing={editor.key} sources={sources} byCode={byCode} sourcesLoading={sourcesLoading} combos={combos} groups={groups}
          shop={shop} nextPosition={keys.length ? Math.max(...keys.map((k) => k.position)) + 1 : 0} onClose={() => setEditor(null)} />
      )}

      {guide.isOpen && (
        <PageGuide title="Quick keys — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Key banayein', text: '"Nayi key" dabayein, product search ya scan karein. Dozen ya carton chun sakte hain, type (variant) bhi. Combo ki key bhi banti hai.' },
            { icon: Palette, color: '#db2777', title: 'Naam, emoji, rang', text: 'Chhota naam, ek emoji aur rang dein. Ek group (maslan "Doodh") ki sab keys ek rang ki hon to counter par jaldi milti hain.' },
            { icon: Move, color: '#16a34a', title: 'Sort badlein', text: 'Key ko pakar kar (drag) nayi jagah chhorein, ya teer wale button dabayein. Doosre group me chhorne se group bhi badal jata hai.' },
            { icon: MapPin, color: '#0891b2', title: 'Kahan dikhe', text: 'Key har branch par dikhti hai. "Sirf is branch" on karein to sirf us branch ke POS par. "Sirf mere liye" se sirf aap ko.' },
            { icon: Eye, color: '#7c3aed', title: 'Preview dekhein', text: '"POS preview" tab me bilkul wahi dikhta hai jo cashier ko F10 dabane par Quick tab me dikhta hai.' },
            { icon: MousePointerClick, color: '#d97706', title: 'Counter par', text: 'POS me "Quick" tab (F10) kholein aur key dabayein — cheez seedha bill me. Stock khatam ho to key halki ho jati hai.' },
          ]}
          tips={[
            'Band ki hui key POS se chhup jati hai magar yahan rehti hai — mausam wali cheezon ke liye acha hai.',
            'Laal nishan wali key ka product ya combo hat chuka hai — key badlein ya hata dein.',
            'Filter laga ho to sort nahi badalti — pehle filter hatayein.',
            'Keys badalne ke liye "Products edit" ki permission chahiye.',
          ]}
          shortcuts={[['N', 'nayi key'], ['P', 'POS preview'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

const WHERE: Array<{ value: Where; label: string; icon?: typeof Store; color?: string }> = [
  { value: 'all', label: 'Sab' },
  { value: 'everywhere', label: 'Har branch, sab ke liye', icon: Store, color: '#2563eb' },
  { value: 'branch', label: 'Sirf ek branch', icon: MapPin, color: '#0891b2' },
  { value: 'personal', label: 'Sirf mere liye', icon: User, color: '#7c3aed' },
];

const STATES: Array<{ value: State; label: string; icon?: typeof Store; color?: string }> = [
  { value: 'all', label: 'Sab' },
  { value: 'on', label: 'Chalu', icon: Eye, color: '#16a34a' },
  { value: 'off', label: 'Band', icon: EyeOff, color: '#64748b' },
  { value: 'broken', label: 'Kharab (product nahi mila)', icon: TriangleAlert, color: '#e11d48' },
];

function EditorTile({ k, tile, first, last, canEdit, canMove, broken, where, dragging, over, onDragStart, onDragEnd, onDragOver, onDrop, onStep, onToggle, onEdit }: {
  k: QuickKey; tile: ReactNode; first: boolean; last: boolean; canEdit: boolean; canMove: boolean; broken: boolean; where: string | null;
  dragging: boolean; over: boolean;
  onDragStart: (e: DragEvent) => void; onDragEnd: () => void; onDragOver: (e: DragEvent) => void; onDrop: (e: DragEvent) => void;
  onStep: (d: -1 | 1) => void; onToggle: () => void; onEdit: () => void;
}) {
  return (
    <div draggable={canMove} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver} onDrop={onDrop}
      className={cn('group relative rounded-xl transition', dragging && 'opacity-40', over && 'ring-2 ring-brand-500 ring-offset-2', !k.isActive && 'opacity-60 grayscale')}>
      {tile}
      {canMove && <GripVertical className="pointer-events-none absolute left-1 top-1 h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500" aria-hidden />}
      <span className="pointer-events-none absolute right-1 top-1 flex gap-0.5">
        {broken && <span title="Product ya combo nahi mila" className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white"><TriangleAlert className="h-3 w-3" /></span>}
        {where && <span title={where === 'personal' ? 'Sirf aap ke liye' : `Sirf ${where}`} className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-white">{where === 'personal' ? <User className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}</span>}
        {!k.isActive && <span title="Band" className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-500 text-white"><EyeOff className="h-3 w-3" /></span>}
      </span>
      {canEdit && (
        <span className="absolute inset-x-1 bottom-1 hidden justify-between gap-0.5 group-focus-within:flex group-hover:flex">
          {canMove && <TileBtn label="Pehle" disabled={first} onClick={() => onStep(-1)}><ArrowLeft className="h-3 w-3" /></TileBtn>}
          <TileBtn label={k.isActive ? 'Band karein' : 'Chalu karein'} onClick={onToggle}>{k.isActive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</TileBtn>
          <TileBtn label="Badlein" onClick={onEdit}><Palette className="h-3 w-3" /></TileBtn>
          {canMove && <TileBtn label="Baad me" disabled={last} onClick={() => onStep(1)}><ArrowRight className="h-3 w-3" /></TileBtn>}
        </span>
      )}
    </div>
  );
}

function TileBtn({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled} onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="flex h-6 flex-1 items-center justify-center rounded-md bg-slate-900/75 text-white transition hover:bg-slate-900 disabled:opacity-30">
      {children}
    </button>
  );
}
