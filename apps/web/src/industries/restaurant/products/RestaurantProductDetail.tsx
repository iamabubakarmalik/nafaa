/**
 * Restaurant item detail on the shared product detail page: whether the
 * dish is on the menu today, its serving hours, sizes and add-ons, the
 * recipe at today's ingredient rates with how many plates the store can
 * still make, and for raw material the dishes that use it.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ChefHat, CircleSlash, Clock, Plus, Power, UtensilsCrossed, Wheat } from 'lucide-react';
import { Button, Card } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { ProductDetailPage, type DetailConfig, type DetailContext } from '@modules/inventory/products/detail/ProductDetailPage';
import { menuItemsApi, type RestaurantMenuItem } from '../api/menu-items.api';
import { recipesApi, type Cookability, type RecipeRow } from '../api/recipes.api';
import { convertQty } from '../lib/recipeUnits';
import { clock12, daysLabel, dietLabel, foodCostTone, modifierTypeOf, offLabel, spiceOf } from '../lib/menuMeta';

interface Extra {
  menu: RestaurantMenuItem | null;
  cook: Cookability | null;
  /** Recipes that use this product as an ingredient. */
  usedIn: RecipeRow[];
}
type Ctx = DetailContext<Extra>;

const fmt = (n: number) => String(Number(Number(n).toFixed(3)));
const isRaw = (c: Ctx) => !!(c.product as unknown as { isRawMaterial?: boolean }).isRawMaterial;
const isDish = (c: Ctx) => !isRaw(c) && ((c.product as unknown as { productType?: string | null }).productType !== 'BOUGHT' || !!c.extra?.menu?.recipe);

function hoursText(m: RestaurantMenuItem) {
  const days = m.availableDays?.length === 7 ? [] : m.availableDays ?? [];
  if (!m.availableFrom && !m.availableTo && !days.length) return 'Jab tak menu par hai, har waqt';
  const time = m.availableFrom || m.availableTo ? `${clock12(m.availableFrom) || 'shuru se'} – ${clock12(m.availableTo) || 'band hone tak'}` : 'Poora din';
  return `${time} · ${daysLabel(days)}`;
}

/* ── Menu tab: on/off today, hours and add-ons ── */
function MenuTab({ ctx }: { ctx: Ctx }) {
  const qc = useQueryClient();
  const canManage = usePermission(PERMISSIONS.RESTAURANT_MENU_MANAGE);
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const m = ctx.extra?.menu;
  const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      ['restaurant-product-extra', 'restaurant-menu-board', 'restaurant-menu-items'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    } catch (e) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Nahi hua');
    } finally { setBusy(false); }
  };

  if (!m) {
    return (
      <Card className="rounded-2xl">
        <div className="flex flex-col items-center px-4 py-8 text-center">
          <UtensilsCrossed className="h-7 w-7 text-slate-400" />
          <p className="mt-2 font-semibold text-slate-900">Menu par nahi</p>
          <p className="mt-1 max-w-md text-[0.8125rem] text-slate-500">Restaurant counter par sirf woh cheez aati hai jo menu par ho. Cold drink, paani jaisi cheezein bhi menu par daal dein.</p>
          {canManage && <Button className="mt-4" loading={busy} leftIcon={<Plus className="h-4 w-4" />} onClick={() => void run(() => menuItemsApi.addToMenu([ctx.product.id]), 'Menu par aa gayi')}>Menu par daalein</Button>}
        </div>
      </Card>
    );
  }
  const spice = m.isSpicy ? spiceOf(m.spiceLevel) : null;
  const onNow = m.isAvailable && !m.offHere;
  const groups = [...(m.modifiers ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-2xl" title="Aaj">
        <div className={cn('flex items-center gap-3 rounded-xl p-3 ring-1', onNow ? 'bg-success-50 ring-success-200' : 'bg-rose-50 ring-rose-200')}>
          <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', onNow ? 'bg-success-600 text-white' : 'bg-rose-600 text-white')}>
            {onNow ? <Power className="h-5 w-5" /> : <CircleSlash className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">{onNow ? 'Mil rahi hai' : m.offHere ? offLabel(m.offUntil) : 'Menu se band hai'}</p>
            <p className="text-[0.75rem] text-slate-600">
              {onNow ? 'Counter par dikh rahi hai'
                : m.offHere ? (m.offUntil ? 'Is branch me khatam — waqt poora hote hi khud chalu ho jayegi' : 'Is branch me khatam — jab tak chalu na karein')
                : 'Har branch me band — counter par nahi aati'}
            </p>
          </div>
          {canManage && (onNow
            ? <Button size="sm" variant="critical" loading={busy} onClick={() => setChoosing((v) => !v)}>Khatam (86)</Button>
            : <Button size="sm" variant="success" loading={busy}
                onClick={() => void run(() => (m.offHere ? menuItemsApi.setBranch([m.id], true) : menuItemsApi.setAvailable(m.id, true)), 'Chalu kar di')}>Chalu karein</Button>)}
        </div>
        {canManage && onNow && choosing && (
          <div className="mt-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-[0.8125rem] font-semibold text-slate-800">Kab tak band rahe?</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {([['Aaj din khatam tak', undefined], ['1 ghanta', 1], ['2 ghante', 2], ['Jab tak chalu na karein', null]] as Array<[string, number | null | undefined]>).map(([label, h]) => (
                <Button key={label} size="xs" variant={h === undefined ? 'critical' : 'secondary'} disabled={busy}
                  onClick={() => { setChoosing(false); void run(() => menuItemsApi.setBranch([m.id], false, h === undefined ? undefined : h === null ? null : inHours(h)), `Band (86) — ${label.toLowerCase()}`); }}>
                  {label}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-[0.75rem] text-slate-500">Sirf is branch me band hoti hai (sab branch dekh rahe hon to har branch me). Waqt poora hote hi khud chalu.</p>
            <button type="button" disabled={busy} onClick={() => { setChoosing(false); void run(() => menuItemsApi.setAvailable(m.id, false), 'Menu se band — har branch me'); }}
              className="mt-1 text-[0.75rem] font-semibold text-rose-700 hover:underline">Menu se hi band karein (har branch, khud chalu nahi hogi)</button>
          </div>
        )}
        <dl className="mt-3 grid grid-cols-2 gap-3 text-[0.8125rem]">
          <div><dt className="text-slate-500">Kab milti hai</dt><dd className="font-medium text-slate-900">{hoursText(m)}</dd></div>
          <div><dt className="text-slate-500">Banne me</dt><dd className="font-medium text-slate-900">{m.prepTimeMinutes ? `${m.prepTimeMinutes} min` : '—'}</dd></div>
          <div><dt className="text-slate-500">Teekhapan</dt><dd className="font-medium text-slate-900">{spice ? `${spice.chillies} ${spice.label}` : 'Teekha nahi'}</dd></div>
          <div><dt className="text-slate-500">Kitna</dt><dd className="font-medium text-slate-900">{m.servingSize || '—'}{m.servesPeople ? ` · ${m.servesPeople} log` : ''}</dd></div>
        </dl>
        {m.cookingInstructions && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-[0.8125rem] text-slate-700"><span className="font-semibold">Cook ke liye: </span>{m.cookingInstructions}</p>}
        {!!m.dietaryTags?.length && <div className="mt-3 flex flex-wrap gap-1">{m.dietaryTags.map((t) => <span key={t} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-slate-700">{dietLabel(t)}</span>)}</div>}
      </Card>
      <Card className="rounded-2xl" title="Add-ons" actions={<Link to="/restaurant/modifiers" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Groups →</Link>}>
        {!groups.length ? <p className="text-[0.8125rem] text-slate-500">Koi add-on nahi. Edit me "Size / Add-ons" step se lagayein.</p> : (
          <ul className="space-y-2">
            {groups.map((g) => {
              const grp = g.modifierGroup ?? {};
              const opts = (grp.options ?? []).filter((o: { isActive?: boolean }) => o.isActive !== false);
              return (
                <li key={g.modifierGroupId} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[0.875rem] font-semibold text-slate-900">{grp.name ?? 'Group'} <span className="font-normal text-slate-500">· {modifierTypeOf(grp.type ?? 'ADDON').label}{grp.isRequired ? ' · zaroori' : ''}{grp.isActive === false ? ' · band' : ''}</span></p>
                  <p className="mt-0.5 text-[0.75rem] text-slate-600">{opts.map((o: { name: string; priceAdjustment?: number }) => `${o.name}${o.priceAdjustment ? ` (${o.priceAdjustment > 0 ? '+' : ''}${o.priceAdjustment})` : ''}`).join(', ') || 'Grahak ka note'}</p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ── Recipe tab ── */
function RecipeTab({ ctx }: { ctx: Ctx }) {
  const r = ctx.extra?.menu?.recipe;
  const cook = ctx.extra?.cook;
  if (!r) {
    return (
      <Card className="rounded-2xl">
        <div className="flex flex-col items-center px-4 py-8 text-center">
          <Wheat className="h-7 w-7 text-amber-600" />
          <p className="mt-2 font-semibold text-slate-900">Recipe nahi bani</p>
          <p className="mt-1 max-w-md text-[0.8125rem] text-slate-500">Recipe ke bagair dish bikne par raw material stock se nahi katta aur profit report me cost andaze se lagti hai.</p>
          <Link to={`/restaurant-menu-items/${ctx.product.id}/edit`} className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-white"><Plus className="h-4 w-4" />Recipe banayein</Link>
        </div>
      </Card>
    );
  }
  const portions = Number(r.yieldQuantity) || 1;
  const lines = [...(r.ingredients ?? [])].sort((a: { displayOrder?: number }, b: { displayOrder?: number }) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  let plate = 0;
  const rows = lines.map((l: any) => {
    const unit = l.ingredient?.unit ?? l.unit;
    const rate = Number(l.ingredient?.costPrice) || Number(l.costPerUnit) || 0;
    const waste = Number(l.wastagePercent) || 0;
    // Wastage comes out of stock on top of the recipe quantity.
    const per = convertQty((Number(l.quantity) || 0) * (1 + waste / 100), l.unit, unit) / portions;
    const cost = per * rate;
    if (!l.isOptional) plate += cost;
    return { id: l.id as string, name: l.ingredient?.name ?? 'Saamaan', qty: Number(l.quantity), unit: l.unit as string, stockUnit: unit as string, per, cost, waste, optional: !!l.isOptional, notes: l.notes as string | null };
  });
  const price = Number(ctx.product.price) || 0;
  const pct = price > 0 ? (plate / price) * 100 : null;
  const tone = foodCostTone(pct);
  return (
    <Card className="rounded-2xl" flush title={`Recipe · ${fmt(portions)} plate ka saamaan`}
      actions={<Link to={`/restaurant-menu-items/${ctx.product.id}/edit`} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Badlein →</Link>}>
      <div className="overflow-x-auto">
        <table className="w-full text-[0.8125rem]">
          <thead className="bg-slate-50 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-2.5">Saamaan</th><th className="px-3 py-2.5 text-right">Recipe me</th><th className="px-3 py-2.5 text-right">Ek plate</th><th className="px-4 py-2.5 text-right">Aaj ki cost</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((x) => (
              <tr key={x.id}>
                <td className="px-4 py-2.5"><span className="font-medium text-slate-900">{x.name}</span>{x.optional && <span className="ml-1.5 text-[0.6875rem] text-slate-500">(marzi ka)</span>}{x.notes && <span className="block text-[0.6875rem] text-slate-500">{x.notes}</span>}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmt(x.qty)} {x.unit}{x.waste > 0 && <span className="block text-[0.6875rem] text-amber-700">+{fmt(x.waste)}% wastage</span>}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{fmt(x.per)} {x.stockUnit}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{x.optional ? '—' : ctx.cost(x.cost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 font-semibold">
            <tr><td className="px-4 py-2.5" colSpan={3}>Ek plate ki cost{pct !== null && !ctx.costHidden && <span className={cn('ml-2 text-[0.75rem]', tone === 'bad' ? 'text-rose-700' : tone === 'warn' ? 'text-amber-700' : 'text-success-700')}>{pct.toFixed(1)}% food cost</span>}</td><td className="px-4 py-2.5 text-right tabular-nums">{ctx.cost(plate)}</td></tr>
          </tfoot>
        </table>
      </div>
      {cook && (
        <p className={cn('flex items-center gap-2 border-t border-slate-100 px-4 py-3 text-[0.8125rem]', cook.canMake === 0 ? 'text-rose-700' : 'text-slate-600')}>
          <ChefHat className="h-4 w-4" />
          {cook.canMake === null ? 'Sab saamaan marzi ka hai' : cook.canMake === 0 ? `Ab nahi ban sakti — ${cook.blocker?.name ?? 'saamaan'} khatam` : `Is branch ke stock se ${cook.canMake} plate aur ban sakti hain`}
          {cook.blocker && cook.canMake !== null && cook.canMake > 0 && <span className="text-slate-500">· pehle {cook.blocker.name} khatam hoga</span>}
        </p>
      )}
      {!!r.preparationSteps && <div className="border-t border-slate-100 px-4 py-3 text-[0.8125rem] text-slate-700"><p className="mb-1 font-semibold">Banane ka tareeqa</p><p className="whitespace-pre-line">{r.preparationSteps}</p></div>}
    </Card>
  );
}

/* ── Raw material: dishes that use it ── */
function UsedInTab({ ctx }: { ctx: Ctx }) {
  const rows = ctx.extra?.usedIn ?? [];
  const id = ctx.product.id;
  if (!rows.length) return <Card className="rounded-2xl"><p className="px-2 py-6 text-center text-[0.8125rem] text-slate-500">Kisi recipe me nahi laga. Dish ki recipe me yeh saamaan daalein taake bikne par stock kate.</p></Card>;
  return (
    <Card className="rounded-2xl" flush title={`${rows.length} dish me lagta hai`}>
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => {
          const line = r.ingredients.find((i) => i.ingredientProductId === id);
          const per = line ? convertQty((Number(line.quantity) || 0) * (1 + (Number(line.wastagePercent) || 0) / 100), line.unit, ctx.product.unit) / (Number(r.yieldQuantity) || 1) : 0;
          return (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[0.8125rem]">
              <Link to={`/restaurant-menu-items/${r.menuItem.productId}`} className="min-w-0 truncate font-medium text-slate-900 hover:text-brand-700">{r.menuItem.product.name}</Link>
              <span className="shrink-0 tabular-nums text-slate-600">{fmt(per)} {ctx.product.unit} fi plate</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

const config: DetailConfig<Extra> = {
  label: 'Restaurant',
  paths: { list: '/products', edit: (id) => `/restaurant-menu-items/${id}/edit` },
  stockChips: [1, 5, 10, 25, 50],
  extra: {
    key: 'restaurant-product-extra',
    load: async (id) => {
      const [menu, cook, recipes] = await Promise.all([
        menuItemsApi.byProduct(id).catch(() => null),
        recipesApi.cookability().catch(() => null),
        recipesApi.list().catch(() => [] as RecipeRow[]),
      ]);
      return {
        menu,
        cook: cook?.rows.find((r) => r.productId === id) ?? null,
        usedIn: recipes.filter((r) => r.ingredients.some((i) => i.ingredientProductId === id)),
      };
    },
  },
  badges: (c) => {
    const m = c.extra?.menu;
    if (isRaw(c)) return <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[0.6875rem] font-bold text-amber-800">Raw material</span>;
    return (
      <>
        {!m ? <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] font-bold text-slate-600">Menu par nahi</span>
          : m.isAvailable && !m.offHere ? <span className="rounded-md bg-success-100 px-1.5 py-0.5 text-[0.6875rem] font-bold text-success-700">Menu par</span>
            : <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[0.6875rem] font-bold text-rose-700">{m.offHere ? offLabel(m.offUntil) : 'Band (86)'}</span>}
        {m?.chefSpecial && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[0.6875rem] font-bold text-amber-800">Chef special</span>}
        {m?.bestSeller && <span className="rounded-md bg-brand-100 px-1.5 py-0.5 text-[0.6875rem] font-bold text-brand-800">Best seller</span>}
      </>
    );
  },
  facts: (c) => {
    if (isRaw(c)) return [['Type', 'Raw material — menu par nahi'], ['Recipes me', `${c.extra?.usedIn.length ?? 0} dish`]];
    const m = c.extra?.menu;
    const out: Array<[string, string]> = [['Type', isDish(c) ? 'Kitchen me banti hai' : 'Bani banai bikti hai']];
    if (m) {
      out.push(['Kab milti hai', hoursText(m)]);
      if (m.prepTimeMinutes) out.push(['Banne me', `${m.prepTimeMinutes} min`]);
      out.push(['Add-ons', m.modifiers?.length ? `${m.modifiers.length} group` : 'Nahi']);
    }
    return out;
  },
  tile: (c) => {
    if (isRaw(c)) return { label: 'Recipes me', value: `${c.extra?.usedIn.length ?? 0} dish`, hint: 'Is saamaan se banti hain' };
    const cook = c.extra?.cook;
    if (!cook || cook.canMake === null) return null;
    return { label: 'Aur ban sakti hain', value: `${cook.canMake} plate`, hint: cook.blocker ? `Pehle ${cook.blocker.name} khatam hoga` : undefined };
  },
  alerts: (c) => {
    if (isRaw(c)) return null;
    const m = c.extra?.menu;
    const cook = c.extra?.cook;
    if (m?.isAvailable && !m.offHere && cook?.canMake === 0) {
      return (
        <p className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-[0.8125rem] text-rose-800 ring-1 ring-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Menu par hai magar ab nahi ban sakti — {cook.blocker?.name ?? 'saamaan'} khatam. Purchase karein ya "Khatam (86)" dabayein.
        </p>
      );
    }
    if (isDish(c) && m && !m.recipe) {
      return (
        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <Wheat className="mt-0.5 h-4 w-4 shrink-0" />Recipe nahi — bikne par saamaan stock se nahi katta. <Link to={`/restaurant-menu-items/${c.product.id}/edit`} className="font-semibold underline">Recipe banayein</Link>
        </p>
      );
    }
    if (cook?.unitProblems?.length) {
      return <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">Recipe me {cook.unitProblems.join(', ')} ki unit stock se nahi milti — recipe theek karein.</p>;
    }
    return null;
  },
  tabs: [
    { id: 'menu', label: 'Menu', icon: UtensilsCrossed, when: (c) => !isRaw(c), render: (c) => <MenuTab ctx={c} /> },
    { id: 'recipe', label: 'Recipe', icon: Wheat, when: (c) => isDish(c), render: (c) => <RecipeTab ctx={c} /> },
    { id: 'used', label: 'Recipes me', icon: ChefHat, when: (c) => isRaw(c), render: (c) => <UsedInTab ctx={c} /> },
  ],
  guide: [
    { icon: Power, color: '#e11d48', title: 'Khatam ho gayi?', text: 'Menu tab me "Khatam (86)" dabayein aur waqt chunein — is branch ke counter par nahi aayegi, aur waqt poora hote hi khud chalu ho jayegi.' },
    { icon: Wheat, color: '#a16207', title: 'Recipe', text: 'Aaj ke raw material rate se plate ki cost, food cost % aur is branch ke stock se kitni plate ban sakti hain.' },
    { icon: Clock, color: '#16a34a', title: 'Waqt', text: 'Nashta ya BBQ jaisi dish ka waqt edit me likhein — us waqt ke bahar counter par nahi aati.' },
  ],
};

export default function RestaurantProductDetail() {
  return <ProductDetailPage config={config} />;
}
