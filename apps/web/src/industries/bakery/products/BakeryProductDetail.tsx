/**
 * Bakery product detail: made or bought, shelf life, extra rates, the recipe
 * re-costed at today's ingredient prices with how many can be made from the
 * store, fresh batches, and allergy and cake details.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CakeSlice, ChefHat, Clock, Leaf, Snowflake, Wheat } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { ProductDetailPage, type DetailConfig } from '@modules/inventory/products/detail/ProductDetailPage';
import { bakeryProductsApi } from '../api/products.api';
import { freshnessApi, type FreshnessLog } from '../api/freshness.api';
import { ingredientsApi, type Ingredient } from '../api/ingredients.api';
import { priceField } from '../lib/bakeryUnits';

interface RecipeLine { ingredientId: string; name: string; qty: number; unit: string; costPerUnit: number }
interface Extra { profile: Record<string, any> | null; fresh: FreshnessLog[]; ingredients: Ingredient[] }

const fmt = (n: number) => String(Number(Number(n).toFixed(2)));
const UNIT_LABEL: Record<string, string> = { pcs: 'piece', dozen: 'darjan', slice: 'slice', kg: 'kilo', pound: 'pound', box: 'dabba', tray: 'thaal' };

function recipeOf(extra?: Extra) {
  const ing = extra?.profile?.ingredients;
  const lines: RecipeLine[] = ing?.lines ?? [];
  const yieldQty = Number(ing?.yield) || 1;
  const byId = new Map((extra?.ingredients ?? []).map((i) => [i.id, i]));
  const rows = lines.map((l) => {
    const now = byId.get(l.ingredientId);
    const rate = now?.costPerUnit ?? l.costPerUnit;
    const batches = now && l.qty > 0 ? Math.floor(now.currentStock / l.qty) : null;
    return { ...l, rate, cost: l.qty * rate, stock: now?.currentStock ?? null, batches };
  });
  const batchCost = rows.reduce((s, r) => s + r.cost, 0);
  const capacityBatches = rows.length && rows.every((r) => r.batches !== null) ? Math.min(...rows.map((r) => r.batches!)) : null;
  const limiting = capacityBatches !== null ? rows.find((r) => r.batches === capacityBatches) : null;
  return { rows, yieldQty, perUnit: batchCost / yieldQty, batchCost, canMake: capacityBatches !== null ? capacityBatches * yieldQty : null, limiting };
}

const kindOf = (productType: unknown, profile: Record<string, any> | null) =>
  productType === 'MADE' || productType === 'BOUGHT' ? productType : profile?.isCustomizable || profile?.isCakeCustomizable || profile?.ingredients?.lines?.length ? 'MADE' : 'BOUGHT';

/** Raw material and production pages, for those allowed to open them. */
function RecipeLinks() {
  const raw = usePermission(PERMISSIONS.BAKERY_INGREDIENTS_VIEW);
  const make = usePermission(PERMISSIONS.BAKERY_PRODUCTION_VIEW);
  return (
    <div className="mt-2 flex flex-wrap gap-3">
      {raw && <Link to="/bakery/ingredients" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Raw material →</Link>}
      {make && <Link to="/bakery/production" className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline"><ChefHat className="h-3.5 w-3.5" />Production →</Link>}
    </div>
  );
}

const config: DetailConfig<Extra> = {
  label: 'Bakery',
  guide: [
    { icon: Wheat, color: '#a16207', title: 'Recipe', text: 'Recipe tab aaj ke raw material rate se cost aur godown ke maal se kitne ban sakte hain dikhata hai.' },
    { icon: Clock, color: '#ea580c', title: 'Freshness', text: 'Har banaye hue batch ka hisaab — kitna bika, kitna waste. Purana maal pehle bechein.' },
  ],
  paths: { list: '/products', edit: (id) => `/bakery-products/${id}/edit` },
  stockChips: [1, 6, 12, 24, 50],
  extra: {
    // Own cache key: other screens keep the bare profile under 'bakery-profile-by-product'.
    key: 'bakery-product-detail-extra',
    load: async (id) => {
      const [profile, fresh, ingredients] = await Promise.all([
        bakeryProductsApi.byProduct(id).catch(() => null),
        freshnessApi.list({ productId: id }).catch(() => [] as FreshnessLog[]),
        ingredientsApi.list({}).catch(() => [] as Ingredient[]),
      ]);
      const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : Array.isArray((v as { items?: T[] })?.items) ? (v as { items: T[] }).items : []);
      return { profile: (profile as Record<string, any> | null) ?? null, fresh: list<FreshnessLog>(fresh), ingredients: list<Ingredient>(ingredients) };
    },
  },
  badges: ({ product, extra }) => {
    const kind = kindOf((product as { productType?: string }).productType, extra?.profile ?? null);
    return (
      <>
        <span className={cn('rounded-md px-2 py-0.5 text-[0.75rem] font-semibold', kind === 'MADE' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-700')}>{kind === 'MADE' ? 'Khud banti hai' : 'Khareed kar'}</span>
        {extra?.profile?.requiresRefrigeration && <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[0.75rem] font-semibold text-sky-700"><Snowflake className="h-3 w-3" />Fridge</span>}
        {extra?.profile?.isSeasonalItem && <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[0.75rem] font-semibold text-violet-700">{extra.profile.seasonName || 'Mausami'}</span>}
      </>
    );
  },
  facts: ({ extra, money, product }) => {
    const p = extra?.profile;
    if (!p) return [];
    const facts: Array<[string, ReactNode]> = [];
    const life = p.shelfLifeDays ? `${p.shelfLifeDays} din` : p.shelfLifeHours ? `${p.shelfLifeHours} ghante` : null;
    if (life) facts.push(['Chalti hai', life]);
    if (p.weightGrams) facts.push(['Wazan', `${p.weightGrams} g`]);
    if (p.numberOfSlices) facts.push(['Slice', p.numberOfSlices]);
    for (const [k, field] of Object.entries(priceField)) {
      if (k !== product.unit && p[field]) facts.push([`Fi ${UNIT_LABEL[k] ?? k}`, money(Number(p[field]))]);
    }
    return facts;
  },
  tile: ({ extra }) => {
    const p = extra?.profile;
    const life = p?.shelfLifeDays ? `${p.shelfLifeDays} din` : p?.shelfLifeHours ? `${p.shelfLifeHours} ghante` : null;
    return life ? { label: 'Freshness', value: life, hint: p?.requiresRefrigeration ? 'fridge mein' : undefined } : null;
  },
  alerts: ({ extra, product, cost }) => {
    const p = extra?.profile;
    const kind = kindOf((product as { productType?: string }).productType, p ?? null);
    const r = recipeOf(extra);
    const now = Date.now();
    const expired = (extra?.fresh ?? []).filter((f) => f.currentQty > 0 && new Date(f.expiryDate ?? f.bestBefore).getTime() < now);
    const notes: string[] = [];
    if (!product.costPrice) notes.push('Cost nahi likhi — profit ka hisaab ghalat hoga');
    if (kind === 'MADE' && !p?.shelfLifeDays && !p?.shelfLifeHours) notes.push('Kitne din chalti hai, yeh nahi likha');
    if (r.rows.length && product.costPrice && Math.abs(r.perUnit - product.costPrice) / product.costPrice > 0.05) {
      notes.push(`Aaj ke rate se recipe ki cost ${cost(r.perUnit)} hai, product par ${cost(product.costPrice)} likhi hai`);
    }
    if (!notes.length && !expired.length) return null;
    return (
      <>
        {expired.length > 0 && (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-[0.875rem] font-medium text-rose-900 ring-1 ring-rose-200">
            {expired.reduce((s, f) => s + f.currentQty, 0)} {product.unit} purana maal shelf par hai — expire ho chuka. Hata dein ya sasta bechein.
          </div>
        )}
        {notes.map((n) => <div key={n} className="rounded-2xl bg-amber-50 px-4 py-3 text-[0.875rem] font-medium text-amber-900 ring-1 ring-amber-200">{n}</div>)}
      </>
    );
  },
  tabs: [
    {
      id: 'recipe', label: 'Recipe', icon: Wheat, when: ({ extra }) => (extra?.profile?.ingredients?.lines?.length ?? 0) > 0,
      render: (ctx) => {
        const r = recipeOf(ctx.extra);
        const apply = async () => {
          try { await productsApi.update(ctx.product.id, { costPrice: Math.round(r.perUnit * 100) / 100 }); toast.success('Nayi cost laga di'); ctx.refresh(); }
          catch (e) { toast.error((e as Error).message || 'Nahi hua'); }
        };
        return (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="rounded-2xl lg:col-span-2" flush title="Kya lagta hai" description={`Ek dafa mein ${fmt(r.yieldQty)} ${ctx.product.unit} — aaj ke rate se`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-[0.8125rem]">
                  <thead><tr className="bg-slate-50 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5">Cheez</th><th className="px-3 py-2.5 text-right">Quantity</th><th className="px-3 py-2.5 text-right">Rate</th><th className="px-3 py-2.5 text-right">Kharch</th><th className="px-5 py-2.5 text-right">Godown mein</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {r.rows.map((l) => (
                      <tr key={l.ingredientId} className={cn(r.limiting?.ingredientId === l.ingredientId && 'bg-amber-50/60')}>
                        <td className="px-5 py-2 font-medium text-slate-900">{l.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(l.qty)} {l.unit}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">{ctx.cost(l.rate)}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{ctx.cost(l.cost)}</td>
                        <td className="px-5 py-2 text-right tabular-nums text-slate-600">{l.stock === null ? '—' : `${fmt(l.stock)} ${l.unit}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <div className="space-y-4">
              <Card className="rounded-2xl" title="Cost">
                <p className="text-[0.8125rem] text-slate-500">Poori dafa: <strong className="tabular-nums text-slate-900">{ctx.cost(r.batchCost)}</strong></p>
                <p className="mt-1 text-[1.5rem] font-bold tabular-nums">{ctx.cost(r.perUnit)} <span className="text-[0.8125rem] font-medium text-slate-500">fi {ctx.product.unit}</span></p>
                {!ctx.costHidden && Math.abs(r.perUnit - ctx.product.costPrice) > 0.5 && (
                  <button type="button" onClick={() => void apply()} className="mt-3 h-9 rounded-xl bg-brand-600 px-3 text-[0.8125rem] font-semibold text-white">Yehi cost product par laga dein</button>
                )}
              </Card>
              <Card className="rounded-2xl" title="Kitne ban sakte hain">
                {r.canMake === null ? <p className="text-[0.8125rem] text-slate-500">Kuch cheezein godown mein nahi mili</p> : (
                  <>
                    <p className="text-[1.5rem] font-bold tabular-nums">{fmt(r.canMake)} <span className="text-[0.8125rem] font-medium text-slate-500">{ctx.product.unit}</span></p>
                    {r.limiting && <p className="text-[0.8125rem] text-amber-800">Sab se pehle <strong>{r.limiting.name}</strong> khatam hoga</p>}
                    <RecipeLinks />
                  </>
                )}
              </Card>
            </div>
          </div>
        );
      },
    },
    {
      id: 'fresh', label: 'Freshness', icon: Clock, when: ({ extra }) => (extra?.fresh?.length ?? 0) > 0,
      render: ({ extra, product }) => {
        const logs = [...extra!.fresh].sort((a, b) => new Date(a.bestBefore).getTime() - new Date(b.bestBefore).getTime());
        const sum = (k: 'initialQty' | 'soldQty' | 'wastedQty' | 'discountedQty') => logs.reduce((s, l) => s + Number(l[k] ?? 0), 0);
        const made = sum('initialQty');
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[['Bana', made], ['Bika', sum('soldQty')], ['Sasta becha', sum('discountedQty')], ['Waste', sum('wastedQty')]].map(([l, v]) => (
                <div key={l as string} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80"><p className="text-[0.75rem] text-slate-500">{l}</p><p className="text-[1.375rem] font-bold tabular-nums">{fmt(v as number)}</p></div>
              ))}
            </div>
            {made > 0 && <p className="text-[0.8125rem] text-slate-600">Waste hone ki sharah: <strong className={cn(sum('wastedQty') / made > 0.1 ? 'text-rose-600' : 'text-success-700')}>{((sum('wastedQty') / made) * 100).toFixed(1)}%</strong></p>}
            <Card className="rounded-2xl" flush title="Batches" description="Jo pehle kharab hoga woh upar">
              <ul className="divide-y divide-slate-100">
                {logs.map((l) => {
                  const start = new Date(l.productionDate).getTime();
                  const end = new Date(l.expiryDate ?? l.bestBefore).getTime();
                  const pct = Math.min(100, Math.max(0, ((Date.now() - start) / Math.max(1, end - start)) * 100));
                  return (
                    <li key={l.id} className="px-5 py-3 text-[0.8125rem]">
                      <div className="flex justify-between"><span className="font-medium text-slate-900">{l.batchNumber ?? new Date(l.productionDate).toLocaleDateString('en-PK')}</span><span className="tabular-nums">{fmt(l.currentQty)} / {fmt(l.initialQty)} {product.unit}</span></div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', pct >= 100 ? 'bg-rose-500' : pct > 75 ? 'bg-amber-400' : 'bg-success-500')} style={{ width: `${pct}%` }} /></div>
                      <p className="mt-1 text-[0.75rem] text-slate-500">Behtar {new Date(l.bestBefore).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric' })} tak · {l.status}</p>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        );
      },
    },
    {
      id: 'details', label: 'Details', icon: Leaf, when: ({ extra }) => !!extra?.profile,
      render: ({ extra }) => {
        const p = extra!.profile!;
        const yes = (v: boolean, t: string) => (v ? <span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.8125rem] text-slate-700">{t}</span> : null);
        const custom = p.ingredients?.custom ?? {};
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Leaf className="h-4 w-4 text-brand-600" />Kya shamil hai</span>}>
              <div className="flex flex-wrap gap-1.5">
                {yes(p.containsEgg, 'Anda')}{yes(p.containsDairy, 'Doodh')}{yes(p.containsNuts, 'Nuts')}{yes(p.containsGluten, 'Gluten')}
                {yes(p.isHalal, 'Halal')}{yes(p.isEggless, 'Anday ke bagair')}{yes(p.isVegan, 'Vegan')}{yes(p.isSugarFree, 'Cheeni ke bagair')}
                {(p.allergens ?? []).map((a: string) => <span key={a} className="rounded-full bg-rose-50 px-2.5 py-1 text-[0.8125rem] text-rose-700">{a}</span>)}
              </div>
              {p.ingredientList && <p className="mt-3 text-[0.8125rem] text-slate-600">{p.ingredientList}</p>}
              {p.caloriesPerServing && <p className="mt-2 text-[0.8125rem] text-slate-500">{p.caloriesPerServing} calories fi serving</p>}
            </Card>
            {(p.isCakeCustomizable || p.defaultFlavor) && (
              <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><CakeSlice className="h-4 w-4 text-brand-600" />Cake</span>}>
                <dl className="space-y-1.5 text-[0.8125rem]">
                  {[['Flavour', custom.flavor || p.defaultFlavor], ['Shakal', custom.shape || p.defaultShape], ['Cream', custom.cream || p.defaultCreamType],
                    ['Banane mein', p.prepTimeHours ? `${p.prepTimeHours} ghante` : null], ['Order kitna pehle', p.advanceOrderHours ? `${p.advanceOrderHours} ghante` : null]]
                    .filter(([, v]) => v).map(([l, v]) => <div key={l as string} className="flex justify-between"><dt className="text-slate-500">{l}</dt><dd className="font-medium">{String(v).replace(/_/g, ' ').toLowerCase()}</dd></div>)}
                </dl>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {yes(p.allowsMessageOnCake, 'Message')}{yes(p.allowsPhotoOnCake, 'Photo')}{yes(p.allowsFlavorChoice, 'Flavour chunna')}{yes(p.allowsSizeChoice, 'Size chunna')}{yes(p.allowsCustomShape, 'Apni shakal')}
                  {(p.ingredients?.decorations ?? []).map((d: string) => <span key={d} className="rounded-full bg-pink-50 px-2.5 py-1 text-[0.8125rem] text-pink-700">{d}</span>)}
                </div>
              </Card>
            )}
          </div>
        );
      },
    },
  ],
};

export default function BakeryProductDetail() {
  return <ProductDetailPage config={config} />;
}
