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
import { Button, Card, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { ProductDetailPage, type DetailConfig, type DetailContext } from '@modules/inventory/products/detail/ProductDetailPage';
import { menuItemsApi, type RestaurantMenuItem } from '../api/menu-items.api';
import { recipesApi, type Cookability, type RecipeRow } from '../api/recipes.api';
import { convertQty } from '../lib/recipeUnits';
import { clock12, daysLabel, dietLabel, foodCostTone, modifierTypeOf, offLabel, spiceOf } from '../lib/menuMeta';
import { t as tr } from '@core/i18n';

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
  if (!m.availableFrom && !m.availableTo && !days.length) return tr('Jab tak menu par hai, har waqt');
  const time = m.availableFrom || m.availableTo ? `${clock12(m.availableFrom) || tr('shuru se')} – ${clock12(m.availableTo) || tr('band hone tak')}` : tr('Poora din');
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
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || tr('Nahi hua'));
    } finally { setBusy(false); }
  };

  if (!m) {
    return (
      <Card className="rounded-2xl">
        <div className="flex flex-col items-center px-4 py-8 text-center">
          <UtensilsCrossed className="h-7 w-7 text-slate-400" />
          <p className="mt-2 font-semibold text-slate-900">{tr('Menu par nahi')}</p>
          <p className="mt-1 max-w-md text-[0.8125rem] text-slate-500">{tr('Restaurant counter par sirf woh cheez aati hai jo menu par ho. Cold drink, paani jaisi cheezein bhi menu par daal dein.')}</p>
          {canManage && <Button className="mt-4" loading={busy} leftIcon={<Plus className="h-4 w-4" />} onClick={() => void run(() => menuItemsApi.addToMenu([ctx.product.id]), tr('Menu par aa gayi'))}>{tr('Menu par daalein')}</Button>}
        </div>
      </Card>
    );
  }
  const spice = m.isSpicy ? spiceOf(m.spiceLevel) : null;
  const onNow = m.isAvailable && !m.offHere;
  const groups = [...(m.modifiers ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-2xl" title={tr('Aaj')}>
        <div className={cn('flex items-center gap-3 rounded-xl p-3 ring-1', onNow ? 'bg-success-50 ring-success-200' : 'bg-rose-50 ring-rose-200')}>
          <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', onNow ? 'bg-success-600 text-white' : 'bg-rose-600 text-white')}>
            {onNow ? <Power className="h-5 w-5" /> : <CircleSlash className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">{onNow ? tr('Mil rahi hai') : m.offHere ? offLabel(m.offUntil) : tr('Menu se band hai')}</p>
            <p className="text-[0.75rem] text-slate-600">
              {onNow ? tr('Counter par dikh rahi hai')
                : m.offHere ? (m.offUntil ? tr('Is branch me khatam — waqt poora hote hi khud chalu ho jayegi') : tr('Is branch me khatam — jab tak chalu na karein'))
                : tr('Har branch me band — counter par nahi aati')}
            </p>
          </div>
          {canManage && (onNow
            ? <Button size="sm" variant="critical" loading={busy} onClick={() => setChoosing((v) => !v)}>{tr('Khatam (86)')}</Button>
            : <Button size="sm" variant="success" loading={busy}
                onClick={() => void run(() => (m.offHere ? menuItemsApi.setBranch([m.id], true) : menuItemsApi.setAvailable(m.id, true)), tr('Chalu kar di'))}>{tr('Chalu karein')}</Button>)}
        </div>
        {canManage && onNow && choosing && (
          <div className="mt-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-[0.8125rem] font-semibold text-slate-800">{tr('Kab tak band rahe?')}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {([[tr('Aaj din khatam tak'), undefined], ['1 ghanta', 1], ['2 ghante', 2], [tr('Jab tak chalu na karein'), null]] as Array<[string, number | null | undefined]>).map(([label, h]) => (
                <Button key={label} size="xs" variant={h === undefined ? 'critical' : 'secondary'} disabled={busy}
                  onClick={() => { setChoosing(false); void run(() => menuItemsApi.setBranch([m.id], false, h === undefined ? undefined : h === null ? null : inHours(h)), tr('Band (86) — {{value}}', { value: label.toLowerCase() })); }}>
                  {label}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-[0.75rem] text-slate-500">{tr('Sirf is branch me band hoti hai (sab branch dekh rahe hon to har branch me). Waqt poora hote hi khud chalu.')}</p>
            <button type="button" disabled={busy} onClick={() => { setChoosing(false); void run(() => menuItemsApi.setAvailable(m.id, false), tr('Menu se band — har branch me')); }}
              className="mt-1 text-[0.75rem] font-semibold text-rose-700 hover:underline">{tr('Menu se hi band karein (har branch, khud chalu nahi hogi)')}</button>
          </div>
        )}
        <dl className="mt-3 grid grid-cols-2 gap-3 text-[0.8125rem]">
          <div><dt className="text-slate-500">{tr('Kab milti hai')}</dt><dd className="font-medium text-slate-900">{hoursText(m)}</dd></div>
          <div><dt className="text-slate-500">{tr('Banne me')}</dt><dd className="font-medium text-slate-900">{m.prepTimeMinutes ? tr('{{prepTimeMinutes}} min', { prepTimeMinutes: m.prepTimeMinutes }) : '—'}</dd></div>
          <div><dt className="text-slate-500">{tr('Teekhapan')}</dt><dd className="font-medium text-slate-900">{spice ? `${spice.chillies} ${spice.label}` : tr('Teekha nahi')}</dd></div>
          <div><dt className="text-slate-500">{tr('Kitna')}</dt><dd className="font-medium text-slate-900">{m.servingSize || '—'}{m.servesPeople ? tr(' · {{servesPeople}} log', { servesPeople: m.servesPeople }) : ''}</dd></div>
        </dl>
        {m.cookingInstructions && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-[0.8125rem] text-slate-700"><span className="font-semibold">{tr('Cook ke liye:')}{' '} </span>{m.cookingInstructions}</p>}
        {!!m.dietaryTags?.length && <div className="mt-3 flex flex-wrap gap-1">{m.dietaryTags.map((t) => <span key={t} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-slate-700">{dietLabel(t)}</span>)}</div>}
      </Card>
      <Card className="rounded-2xl" title={tr('Add-ons')} actions={<Link to="/restaurant/modifiers" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{tr('Groups →')}</Link>}>
        {!groups.length ? <p className="text-[0.8125rem] text-slate-500">{tr('Koi add-on nahi. Edit me "Size / Add-ons" step se lagayein.')}</p> : (
          <ul className="space-y-2">
            {groups.map((g) => {
              const grp = g.modifierGroup ?? {};
              const opts = (grp.options ?? []).filter((o: { isActive?: boolean }) => o.isActive !== false);
              return (
                <li key={g.modifierGroupId} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[0.875rem] font-semibold text-slate-900">{grp.name ?? tr('Group')} <span className="font-normal text-slate-500">· {modifierTypeOf(grp.type ?? 'ADDON').label}{grp.isRequired ? tr(' · zaroori') : ''}{grp.isActive === false ? tr(' · band') : ''}</span></p>
                  <p className="mt-0.5 text-[0.75rem] text-slate-600">{opts.map((o: { name: string; priceAdjustment?: number }) => `${o.name}${o.priceAdjustment ? ` (${o.priceAdjustment > 0 ? '+' : ''}${o.priceAdjustment})` : ''}`).join(', ') || tr('Grahak ka note')}</p>
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
          <p className="mt-2 font-semibold text-slate-900">{tr('Recipe nahi bani')}</p>
          <p className="mt-1 max-w-md text-[0.8125rem] text-slate-500">{tr('Recipe ke bagair dish bikne par raw material stock se nahi katta aur profit report me cost andaze se lagti hai.')}</p>
          <Link to={`/restaurant-menu-items/${ctx.product.id}/edit`} className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-white"><Plus className="h-4 w-4" />{tr('Recipe banayein')}</Link>
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
    <Card className="rounded-2xl" flush title={tr('Recipe · {{portions}} plate ka saamaan', { portions: fmt(portions) })}
      actions={<Link to={`/restaurant-menu-items/${ctx.product.id}/edit`} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{tr('Badlein →')}</Link>}>
      <Table>
        <THead>
          <Tr><Th className="px-4 py-2.5">{tr('Saamaan')}</Th><Th align="right" className="px-3 py-2.5">{tr('Recipe me')}</Th><Th align="right" className="px-3 py-2.5">{tr('Ek plate')}</Th><Th align="right" className="px-4 py-2.5">{tr('Aaj ki cost')}</Th></Tr>
        </THead>
        <TBody>
          {rows.map((x) => (
            <Tr key={x.id}>
              <Td className="px-4 py-2.5"><span className="font-medium text-slate-900">{x.name}</span>{x.optional && <span className="ms-1.5 text-[0.6875rem] text-slate-500">{tr('(marzi ka)')}</span>}{x.notes && <span className="block text-[0.6875rem] text-slate-500">{x.notes}</span>}</Td>
              <Td align="right" className="px-3 py-2.5 tabular-nums">{fmt(x.qty)} {x.unit}{x.waste > 0 && <span className="block text-[0.6875rem] text-amber-700">{tr('+{{waste}}% wastage', { waste: fmt(x.waste) })}</span>}</Td>
              <Td align="right" className="px-3 py-2.5 tabular-nums text-slate-600">{fmt(x.per)} {x.stockUnit}</Td>
              <Td align="right" className="px-4 py-2.5 tabular-nums">{x.optional ? '—' : ctx.cost(x.cost)}</Td>
            </Tr>
          ))}
        </TBody>
        <tfoot className="bg-slate-50 font-semibold">
          <Tr><Td className="px-4 py-2.5" colSpan={3}>{tr('Ek plate ki cost')}{pct !== null && !ctx.costHidden && <span className={cn('ms-2 text-[0.75rem]', tone === 'bad' ? 'text-rose-700' : tone === 'warn' ? 'text-amber-700' : 'text-success-700')}>{tr('{{value}}% food cost', { value: pct.toFixed(1) })}</span>}</Td><Td align="right" className="px-4 py-2.5 tabular-nums">{ctx.cost(plate)}</Td></Tr>
        </tfoot>
      </Table>
      {cook && (
        <p className={cn('flex items-center gap-2 border-t border-slate-100 px-4 py-3 text-[0.8125rem]', cook.canMake === 0 ? 'text-rose-700' : 'text-slate-600')}>
          <ChefHat className="h-4 w-4" />
          {cook.canMake === null ? tr('Sab saamaan marzi ka hai') : cook.canMake === 0 ? tr('Ab nahi ban sakti — {{value}} khatam', { value: cook.blocker?.name ?? 'saamaan' }) : tr('Is branch ke stock se {{canMake}} plate aur ban sakti hain', { canMake: cook.canMake })}
          {cook.blocker && cook.canMake !== null && cook.canMake > 0 && <span className="text-slate-500">{tr('· pehle {{name}} khatam hoga', { name: cook.blocker.name })}</span>}
        </p>
      )}
      {!!r.preparationSteps && <div className="border-t border-slate-100 px-4 py-3 text-[0.8125rem] text-slate-700"><p className="mb-1 font-semibold">{tr('Banane ka tareeqa')}</p><p className="whitespace-pre-line">{r.preparationSteps}</p></div>}
    </Card>
  );
}

/* ── Raw material: dishes that use it ── */
function UsedInTab({ ctx }: { ctx: Ctx }) {
  const rows = ctx.extra?.usedIn ?? [];
  const id = ctx.product.id;
  if (!rows.length) return <Card className="rounded-2xl"><p className="px-2 py-6 text-center text-[0.8125rem] text-slate-500">{tr('Kisi recipe me nahi laga. Dish ki recipe me yeh saamaan daalein taake bikne par stock kate.')}</p></Card>;
  return (
    <Card className="rounded-2xl" flush title={tr('{{count}} dish me lagta hai', { count: rows.length })}>
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => {
          const line = r.ingredients.find((i) => i.ingredientProductId === id);
          const per = line ? convertQty((Number(line.quantity) || 0) * (1 + (Number(line.wastagePercent) || 0) / 100), line.unit, ctx.product.unit) / (Number(r.yieldQuantity) || 1) : 0;
          return (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[0.8125rem]">
              <Link to={`/restaurant-menu-items/${r.menuItem.productId}`} className="min-w-0 truncate font-medium text-slate-900 hover:text-brand-700">{r.menuItem.product.name}</Link>
              <span className="shrink-0 tabular-nums text-slate-600">{tr('{{per}} {{unit}} fi plate', { per: fmt(per), unit: ctx.product.unit })}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

const config: DetailConfig<Extra> = {
  label: tr('Restaurant'),
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
    if (isRaw(c)) return <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[0.6875rem] font-bold text-amber-800">{tr('Raw material')}</span>;
    return (
      <>
        {!m ? <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] font-bold text-slate-600">{tr('Menu par nahi')}</span>
          : m.isAvailable && !m.offHere ? <span className="rounded-md bg-success-100 px-1.5 py-0.5 text-[0.6875rem] font-bold text-success-700">{tr('Menu par')}</span>
            : <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[0.6875rem] font-bold text-rose-700">{m.offHere ? offLabel(m.offUntil) : tr('Band (86)')}</span>}
        {m?.chefSpecial && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[0.6875rem] font-bold text-amber-800">{tr('Chef special')}</span>}
        {m?.bestSeller && <span className="rounded-md bg-brand-100 px-1.5 py-0.5 text-[0.6875rem] font-bold text-brand-800">{tr('Best seller')}</span>}
      </>
    );
  },
  facts: (c) => {
    if (isRaw(c)) return [[tr('Type'), tr('Raw material — menu par nahi')], [tr('Recipes me'), `${c.extra?.usedIn.length ?? 0} dish`]];
    const m = c.extra?.menu;
    const out: Array<[string, string]> = [[tr('Type'), isDish(c) ? tr('Kitchen me banti hai') : tr('Bani banai bikti hai')]];
    if (m) {
      out.push([tr('Kab milti hai'), hoursText(m)]);
      if (m.prepTimeMinutes) out.push([tr('Banne me'), `${m.prepTimeMinutes} min`]);
      out.push([tr('Add-ons'), m.modifiers?.length ? tr('{{count}} group', { count: m.modifiers.length }) : tr('Nahi')]);
    }
    return out;
  },
  tile: (c) => {
    if (isRaw(c)) return { label: tr('Recipes me'), value: `${c.extra?.usedIn.length ?? 0} dish`, hint: tr('Is saamaan se banti hain') };
    const cook = c.extra?.cook;
    if (!cook || cook.canMake === null) return null;
    return { label: tr('Aur ban sakti hain'), value: `${cook.canMake} plate`, hint: cook.blocker ? tr('Pehle {{name}} khatam hoga', { name: cook.blocker.name }) : undefined };
  },
  alerts: (c) => {
    if (isRaw(c)) return null;
    const m = c.extra?.menu;
    const cook = c.extra?.cook;
    if (m?.isAvailable && !m.offHere && cook?.canMake === 0) {
      return (
        <p className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-[0.8125rem] text-rose-800 ring-1 ring-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{tr('Menu par hai magar ab nahi ban sakti — {{value}} khatam. Purchase karein ya "Khatam (86)" dabayein.', { value: cook.blocker?.name ?? 'saamaan' })}
        </p>
      );
    }
    if (isDish(c) && m && !m.recipe) {
      return (
        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <Wheat className="mt-0.5 h-4 w-4 shrink-0" />{tr('Recipe nahi — bikne par saamaan stock se nahi katta.')}{' '} <Link to={`/restaurant-menu-items/${c.product.id}/edit`} className="font-semibold underline">{tr('Recipe banayein')}</Link>
        </p>
      );
    }
    if (cook?.unitProblems?.length) {
      return <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">{tr('Recipe me {{value}} ki unit stock se nahi milti — recipe theek karein.', { value: cook.unitProblems.join(', ') })}</p>;
    }
    return null;
  },
  tabs: [
    { id: 'menu', label: tr('Menu'), icon: UtensilsCrossed, when: (c) => !isRaw(c), render: (c) => <MenuTab ctx={c} /> },
    { id: 'recipe', label: tr('Recipe'), icon: Wheat, when: (c) => isDish(c), render: (c) => <RecipeTab ctx={c} /> },
    { id: 'used', label: tr('Recipes me'), icon: ChefHat, when: (c) => isRaw(c), render: (c) => <UsedInTab ctx={c} /> },
  ],
  guide: [
    { icon: Power, color: '#e11d48', title: tr('Khatam ho gayi?'), text: tr('Menu tab me "Khatam (86)" dabayein aur waqt chunein — is branch ke counter par nahi aayegi, aur waqt poora hote hi khud chalu ho jayegi.') },
    { icon: Wheat, color: '#a16207', title: tr('Recipe'), text: tr('Aaj ke raw material rate se plate ki cost, food cost % aur is branch ke stock se kitni plate ban sakti hain.') },
    { icon: Clock, color: '#16a34a', title: tr('Waqt'), text: tr('Nashta ya BBQ jaisi dish ka waqt edit me likhein — us waqt ke bahar counter par nahi aati.') },
  ],
};

export default function RestaurantProductDetail() {
  return <ProductDetailPage config={config} />;
}
