/**
 * Manufacturing overview for every industry: today's production, the
 * recipes with their cost, margin and what the stock can make, and raw
 * materials too low for one more batch.
 *
 * Keys: N new production · R recipes · H history · G guide.
 */

import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Coins, Factory, FlaskConical, GraduationCap, Package, Percent, Plus, ShoppingCart, Zap } from 'lucide-react';
import { Badge, EmptyState, PageHero, PageShell, Skeleton, heroIconButton, heroPrimaryButton, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide, type GuideStep } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { ProductThumb } from '@modules/inventory/products/lib/productEmoji';
import { MFG_KEY, manufacturingApi, qty, type Recipe } from '../api';
import { useManufacturingSwitch } from '../hooks';
import { wholeUnits } from '../units';
import { MfgNav, MfgOff } from '../components/MfgNav';

export const MFG_GUIDE: GuideStep[] = [
  { icon: FlaskConical, color: '#16a34a', title: '1. Recipe banayein', text: 'Jo cheez aap khud banate hain (mix daal, dry fruit pack, cake, attar) us ki Recipe me raw maal, quantity aur "1 batch se kitna banta hai" likhein.' },
  { icon: Factory, color: '#2563eb', title: '2. Banayein', text: 'Kitna banana hai likhein — raw maal stock se kam hota hai aur bana hua maal stock me aata hai. Kam raw maal laal dikhta hai.' },
  { icon: Coins, color: '#7c3aed', title: '3. Cost khud', text: 'Raw maal ki aaj ki Cost + packing, mazdoori, bijli = har unit ki Cost. Bechne par Profit isi Cost se banta hai.' },
  { icon: Zap, color: '#d97706', title: 'Bikte waqt banayein', text: 'Jo cheez bill par hi banti hai (dry fruit box) us ki Recipe me "Bikte waqt banayein" chalu karein — bechte hi raw maal kam ho jata hai.' },
];

export function RecipeTile({ r, money, canProduce }: { r: Recipe; money: (n: number) => string; canProduce: boolean }) {
  const m = r.margins?.retail ?? null;
  return (
    <div className={cn('flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80', !r.isActive && 'opacity-60')}>
      <Link to={`/manufacturing/recipes/${r.productId}`} className="flex items-start gap-3">
        <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-100"><ProductThumb name={r.product.name} category={r.product.category} url={r.product.image} size="full" /></span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 font-semibold leading-snug text-slate-900">{r.product.name}</span>
          <span className="block text-[0.75rem] text-slate-500">{r.lines.length} raw item · 1 batch = {qty(r.yieldQty)} {r.product.unit}</span>
          {r.makeOnSale && <Badge className="mt-1" size="xs" variant="warning"><Zap className="h-3 w-3" />Bikte waqt banta hai</Badge>}
        </span>
      </Link>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        <div className="col-span-2 flex items-baseline justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-[0.75rem] text-slate-500">Cost / {r.product.unit}</dt>
          <dd className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{r.unitCost != null ? money(r.unitCost) : '—'}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-[0.6875rem] text-slate-500">Profit</dt><dd className={cn('text-[0.875rem] font-bold tabular-nums', m !== null && m < 0 ? 'text-rose-600' : 'text-success-700')}>{m === null ? '—' : `${m.toFixed(1)}%`}</dd></div>
        <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-[0.6875rem] text-slate-500">Stock se ban sakta</dt><dd className={cn('text-[0.875rem] font-bold tabular-nums', r.canMake.units < 1 ? 'text-rose-600' : 'text-slate-900')}>{qty(wholeUnits(r.canMake.units, r.product.unit))} {r.product.unit}</dd></div>
      </dl>
      {r.canMake.units < 1 && r.canMake.limitedBy && <p className="mt-2 text-[0.75rem] text-rose-600">{r.canMake.limitedBy} khatam / kam hai</p>}
      {canProduce && r.isActive && !r.makeOnSale && (
        <Link to={`/manufacturing/produce?product=${r.productId}`} className="mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-brand-50 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-100"><Factory className="h-4 w-4" />Banayein</Link>
      )}
    </div>
  );
}

export default function ManufacturingPage() {
  const sw = useManufacturingSwitch();
  const enabled = sw === 'on';
  const navigate = useNavigate();
  const guide = usePageGuide();
  const { cost: money } = useMasked();
  const canProduce = usePermission(PERMISSIONS.MANUFACTURING_PRODUCE);
  const canManage = usePermission(PERMISSIONS.MANUFACTURING_MANAGE);
  const canBuy = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const q = useQuery({ queryKey: [MFG_KEY, 'summary'], queryFn: manufacturingApi.summary, enabled });
  const s = q.data;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (k === 'n' && canProduce) navigate('/manufacturing/produce');
      else if (k === 'r') navigate('/manufacturing/recipes');
      else if (k === 'h') navigate('/manufacturing/history');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canProduce, navigate]);

  if (sw === 'loading') return <PageShell><Skeleton className="h-28 rounded-3xl" /><Skeleton className="h-72 rounded-2xl" /></PageShell>;
  if (!enabled) return <PageShell><MfgOff /></PageShell>;

  return (
    <PageShell>
      {guide.isOpen && <PageGuide title="Banayein (Manufacturing)" onClose={guide.close} steps={MFG_GUIDE}
        tips={['Raw maal Purchase se aata hai — us ki Cost badle to Recipe ki Cost bhi khud badal jati hai.', 'Ghalat production ho jaye to History me "Wapas karein" dabayein.']}
        shortcuts={[['N', 'nayi production'], ['R', 'recipes'], ['H', 'history'], ['G', 'guide']]} />}

      <PageHero title="Banayein" subtitle="Raw maal mila kar apna maal banayein — Cost aur stock khud hisaab me"
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <Link to="/manufacturing/recipes?new=1" aria-label="Nayi Recipe" className={heroButton}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Nayi Recipe</span></Link>}
          {canProduce && <Link to="/manufacturing/produce" title="N" aria-label="Nayi production" className={heroPrimaryButton}><Factory className="h-4 w-4" /><span className="hidden sm:inline">Nayi production</span></Link>}
        </>}
        loading={q.isLoading}
        stats={s ? [
          { label: 'Aaj banaya', value: `${qty(s.today.quantity)}`, hint: `${s.today.runs} production` },
          { label: 'Aaj ki Cost', value: s.today.totalCost != null ? money(s.today.totalCost) : '—' },
          { label: 'Recipes', value: String(s.recipes.active), hint: s.recipes.makeOnSale ? `${s.recipes.makeOnSale} bikte waqt` : undefined },
          { label: 'Raw maal kam', value: String(s.lowRaw.length), hint: s.lowRaw.length ? 'agle batch ke liye' : 'sab theek' },
        ] : undefined}
      />
      <MfgNav />

      {q.isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
        : !s?.recipes.total ? (
          <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <EmptyState icon={<FlaskConical className="h-6 w-6" />} title="Abhi koi Recipe nahi"
              description="Pehle batayein ke aap kya banate hain aur us me kya lagta hai — jaise 1 batch mix daal = 4 kg moong + 3 kg masoor + 3 kg chana = 10 packet."
              action={canManage ? <Link to="/manufacturing/recipes?new=1" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-brand-fg hover:bg-brand-700"><Plus className="h-4 w-4" />Pehli Recipe banayein</Link> : undefined} />
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
                <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><Package className="h-4 w-4 text-brand-600" />Aaj kya bana</h2>
                {!s.today.items.length ? <p className="mt-3 text-[0.875rem] text-slate-500">Aaj abhi kuch nahi bana.</p> : (
                  <ul className="mt-2 divide-y divide-slate-100">
                    {s.today.items.map((i) => (
                      <li key={i.productId} className="flex items-center justify-between gap-3 py-2 text-[0.875rem]">
                        <span className="min-w-0 truncate font-medium text-slate-800">{i.name}</span>
                        <span className="shrink-0 tabular-nums text-slate-600">{qty(i.quantity)} {i.unit}{i.totalCost != null && <span className="ml-2 text-slate-500">· {money(i.totalCost)}</span>}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><AlertTriangle className="h-4 w-4 text-amber-500" />Raw maal kam</h2>
                  {canBuy && s.lowRaw.length > 0 && <Link to="/purchases/new" className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline"><ShoppingCart className="h-4 w-4" />Purchase</Link>}
                </div>
                {!s.lowRaw.length ? <p className="mt-3 text-[0.875rem] text-slate-500">Har Recipe ka kam se kam ek batch ban sakta hai.</p> : (
                  <ul className="mt-2 divide-y divide-slate-100">
                    {s.lowRaw.slice(0, 8).map((r) => (
                      <li key={r.productId} className="flex items-center justify-between gap-3 py-2 text-[0.875rem]">
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-slate-800">{r.name}</span>
                          <span className="block truncate text-[0.75rem] text-slate-500">{r.usedIn.join(', ')}</span>
                        </span>
                        <span className="shrink-0 text-right tabular-nums">
                          <span className={cn('block font-semibold', r.stock <= 0 ? 'text-rose-600' : 'text-amber-700')}>{qty(r.stock)} {r.unit}</span>
                          <span className="block text-[0.6875rem] text-slate-500">1 batch: {qty(r.perBatch)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><Percent className="h-4 w-4 text-slate-500" />Recipes</h2>
                <Link to="/manufacturing/recipes" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Sab dekhein →</Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {s.top.map((r) => <RecipeTile key={r.id} r={r} money={money} canProduce={canProduce} />)}
              </div>
            </section>
          </>
        )}
    </PageShell>
  );
}
