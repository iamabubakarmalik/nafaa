/**
 * All recipes: what each product takes, its cost per unit, margin, and how
 * much the stock can make. "Nayi Recipe" picks the product to make.
 *
 * Keys: / search · N new recipe.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FlaskConical, LayoutGrid, List, Plus, Zap } from 'lucide-react';
import { Badge, EmptyState, Modal, PageHero, PageShell, SearchField, Segmented, Skeleton, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { ProductSearch } from '@modules/inventory/stock-adjustments/components/ProductSearch';
import { usePurchaseSources } from '@modules/purchasing/purchases/editor/sources';
import { MFG_KEY, manufacturingApi, qty } from '../api';
import { useManufacturingSwitch } from '../hooks';
import { MfgNav, MfgOff } from '../components/MfgNav';
import { RecipeTile } from './ManufacturingPage';
import { wholeUnits } from '../units';

function NewRecipeModal({ onClose, existing }: { onClose: () => void; existing: Set<string> }) {
  const navigate = useNavigate();
  const { sources, byCode, loading } = usePurchaseSources(false);
  return (
    <Modal open onClose={onClose} size="md" title="Nayi Recipe — kya banate hain?" description="Woh product chunein jo aap raw maal se banate hain. Product na ho to pehle Products me banayein.">
      <ProductSearch sources={sources.filter((s) => !s.isRaw)} byCode={byCode} loading={loading} showUnits={false} placeholder="Product ka naam — jaise Mix daal 1kg…"
        onPick={(s) => {
          if (s.hasVariants) { toast.error('Variants wale product ki Recipe abhi nahi banti'); return; }
          if (existing.has(s.id)) toast.message('Is ki Recipe pehle se hai — wahi khul rahi hai');
          navigate(`/manufacturing/recipes/${s.id}`);
        }} />
      <p className="mt-3 text-[0.75rem] text-slate-500">Raw maal (jo sirf banane me lagta hai) yahan nahi dikhta.</p>
    </Modal>
  );
}

export default function RecipesPage() {
  const sw = useManufacturingSwitch();
  const enabled = sw === 'on';
  const [params, setParams] = useSearchParams();
  const { cost: money } = useMasked();
  const canManage = usePermission(PERMISSIONS.MANUFACTURING_MANAGE);
  const canProduce = usePermission(PERMISSIONS.MANUFACTURING_PRODUCE);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const searchRef = useRef<HTMLInputElement>(null);
  const q = useQuery({ queryKey: [MFG_KEY, 'recipes'], queryFn: () => manufacturingApi.recipes(), enabled });
  const creating = params.get('new') === '1';
  const setCreating = (v: boolean) => setParams((p) => { const n = new URLSearchParams(p); if (v) n.set('new', '1'); else n.delete('new'); return n; }, { replace: true });

  const rows = useMemo(() => {
    const t = search.trim().toLowerCase();
    return (q.data ?? []).filter((r) => !t || r.product.name.toLowerCase().includes(t) || r.lines.some((l) => l.name.toLowerCase().includes(t)));
  }, [q.data, search]);
  const existing = useMemo(() => new Set((q.data ?? []).map((r) => r.productId)), [q.data]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); setCreating(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (sw === 'loading') return <PageShell><Skeleton className="h-28 rounded-3xl" /><Skeleton className="h-72 rounded-2xl" /></PageShell>;
  if (!enabled) return <PageShell><MfgOff /></PageShell>;

  return (
    <PageShell>
      {creating && canManage && <NewRecipeModal onClose={() => setCreating(false)} existing={existing} />}
      <PageHero back="/manufacturing" backLabel="Banayein" title="Recipes" subtitle="Har banaye jane wale product ka raw maal, batch aur Cost"
        actions={canManage ? <button type="button" onClick={() => setCreating(true)} title="N" aria-label="Nayi Recipe" className={heroPrimaryButton}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Nayi Recipe</span></button> : undefined}
        stats={q.data ? [
          { label: 'Recipes', value: String(q.data.length) },
          { label: 'Chalu', value: String(q.data.filter((r) => r.isActive).length) },
          { label: 'Bikte waqt', value: String(q.data.filter((r) => r.makeOnSale).length) },
          { label: 'Raw maal kam', value: String(q.data.filter((r) => r.isActive && r.canMake.units <= 0).length), hint: 'Recipes jo abhi nahi ban saktin' },
        ] : undefined} loading={q.isLoading} />
      <MfgNav />

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1"><SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Product ya raw item dhoondein…" label="Recipes search" /></div>
        <Segmented<'grid' | 'list'> label="View" value={view} onChange={setView} items={[{ value: 'grid', label: <span className="inline-flex items-center gap-1"><LayoutGrid className="h-4 w-4" />Cards</span> }, { value: 'list', label: <span className="inline-flex items-center gap-1"><List className="h-4 w-4" />List</span> }]} />
      </div>

      {q.isLoading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
        : !rows.length ? (
          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <EmptyState icon={<FlaskConical className="h-6 w-6" />} title={search ? 'Kuch nahi mila' : 'Abhi koi Recipe nahi'}
              description={search ? 'Doosra naam likh kar dekhein.' : 'Jo cheez aap khud banate hain us ki Recipe banayein — Cost khud nikalegi.'} />
          </div>
        ) : view === 'grid' ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{rows.map((r) => <RecipeTile key={r.id} r={r} money={money} canProduce={canProduce} />)}</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <table className="w-full min-w-[44rem] text-[0.875rem]">
              <thead className="bg-slate-50 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-2.5">Product</th><th className="px-3 py-2.5">Raw maal</th><th className="px-3 py-2.5 text-right">1 batch</th><th className="px-3 py-2.5 text-right">Cost / unit</th><th className="px-3 py-2.5 text-right">Price</th><th className="px-3 py-2.5 text-right">Profit %</th><th className="px-3 py-2.5 text-right">Ban sakta</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className={cn('hover:bg-slate-50', !r.isActive && 'opacity-60')}>
                    <td className="px-3 py-2.5"><Link to={`/manufacturing/recipes/${r.productId}`} className="font-semibold text-slate-900 hover:text-brand-700">{r.product.name}</Link>{r.makeOnSale && <Badge className="ml-2" size="xs" variant="warning"><Zap className="h-3 w-3" />Bikte waqt</Badge>}</td>
                    <td className="max-w-[16rem] truncate px-3 py-2.5 text-slate-600">{r.lines.map((l) => l.name).join(', ')}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{qty(r.yieldQty)} {r.product.unit}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.unitCost != null ? money(r.unitCost) : '—'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(r.product.price)}</td>
                    <td className={cn('px-3 py-2.5 text-right tabular-nums', (r.margins?.retail ?? 0) < 0 && 'text-rose-600')}>{r.margins?.retail == null ? '—' : `${r.margins.retail.toFixed(1)}%`}</td>
                    <td className={cn('px-3 py-2.5 text-right tabular-nums', r.canMake.units < 1 && 'text-rose-600')}>{qty(wholeUnits(r.canMake.units, r.product.unit))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </PageShell>
  );
}
