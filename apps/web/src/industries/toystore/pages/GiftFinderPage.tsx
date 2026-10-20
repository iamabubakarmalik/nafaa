/**
 * Gift finder for the counter: a customer says "7 saal ka larka, 2000 tak"
 * and the shop sees every toy in stock that fits, best sellers first, with
 * small-parts toys left out for children under three.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Baby, BatteryCharging, Gift, GraduationCap, ShieldCheck, ShoppingCart, Sparkles } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { Card, Input, PageHero, PageShell, Skeleton, Switch, heroIconButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { toyProductsApi } from '../api/products.api';
import { cellsNeeded } from '../hooks/useToyFacts';
import { CATEGORIES, labelOf } from '../lib/meta';
import { EmptyBox, useDebounced } from '../components/ui';

interface Found {
  productId: string; categoryType?: string; brand?: string; isEducational: boolean; chokingHazard: boolean;
  requiresBatteries: boolean; batteriesIncluded: boolean; batteryType?: string; batteryQuantity?: number;
  product: { id: string; name: string; price: number; stock: number; images?: Array<{ url: string }> };
}

const AGES = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14];
const BUDGETS = [500, 1000, 2000, 3000, 5000];

export default function GiftFinderPage() {
  const canSell = usePermission(PERMISSIONS.POS_USE);
  const { sales } = useMasked();
  const guide = usePageGuide();
  const [years, setYears] = useState(5);
  const [gender, setGender] = useState<'' | 'BOYS' | 'GIRLS'>('');
  const [budget, setBudget] = useState('');
  const [educational, setEducational] = useState(false);
  const maxBudget = useDebounced(Number(budget) || 0, 300);

  const q = useQuery({
    queryKey: ['toy-gift-finder', years, gender, maxBudget, educational],
    queryFn: () => toyProductsApi.forAge({ years, gender: gender || undefined, maxBudget: maxBudget || undefined, educationalOnly: educational || undefined, safeOnly: true }),
    staleTime: 30_000,
  });
  const items = (q.data?.items ?? []) as Found[];
  const chip = (on: boolean) => cn('h-9 rounded-xl px-3 text-[0.8125rem] font-semibold ring-1 transition', on ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50');

  return (
    <PageShell>
      <PageHero
        title="Gift finder"
        chip={<><Gift /> Umar aur budget se</>}
        meta="Customer ki baat sunein — umar, larka/larki aur budget chunein, stock wale khilone saamne"
        loading={q.isFetching}
        actions={<button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>}
        stats={[{ label: 'Mile', value: items.length }]}
      />

      <Card className="rounded-2xl">
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Bachay ki umar (saal)</span>
            <div className="flex flex-wrap gap-1.5">{AGES.map((a) => <button key={a} type="button" onClick={() => setYears(a)} className={chip(years === a)}>{a}{a === 14 ? '+' : ''}</button>)}</div>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kis ke liye</span>
              <div className="flex gap-1.5">
                {([['', 'Koi bhi'], ['BOYS', 'Larka'], ['GIRLS', 'Larki']] as const).map(([v, l]) => <button key={v} type="button" onClick={() => setGender(v)} className={chip(gender === v)}>{l}</button>)}
              </div>
            </div>
            <div className="w-40">
              <Input label="Budget (Rs)" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))} placeholder="Koi had nahi" />
            </div>
            <div className="flex flex-wrap gap-1.5 pb-0.5">{BUDGETS.map((b) => <button key={b} type="button" onClick={() => setBudget(String(b))} className={chip(Number(budget) === b)}>{b.toLocaleString()} tak</button>)}</div>
            <Switch checked={educational} onChange={(e) => setEducational(e.target.checked)} label="Sirf seekhne wale" />
          </div>
          {years < 3 && <p className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-[0.8125rem] text-emerald-800 ring-1 ring-emerald-200"><ShieldCheck className="h-4 w-4" />3 saal se chhote bachay ke liye chhote purze wale khilone nahi dikhaye ja rahe.</p>}
        </div>
      </Card>

      {q.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <EmptyBox icon={Baby} title="Is umar aur budget me kuch nahi" text="Budget barha kar dekhein, ya khilonon par umar likhein — jin khilonon par umar nahi likhi wo yahan nahi aate." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((t) => {
            const cells = cellsNeeded(t);
            return (
              <Link key={t.productId} to={`/toystore-products/${t.productId}`} className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200/80 hover:ring-brand-300">
                {t.product.images?.[0]?.url
                  ? <img src={t.product.images[0].url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-500"><Gift className="h-6 w-6" /></span>}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[0.875rem] font-semibold text-slate-900">{t.product.name}</p>
                  <p className="truncate text-[0.75rem] text-slate-500">{[labelOf(CATEGORIES, t.categoryType), t.brand].filter(Boolean).join(' · ') || `Stock ${t.product.stock}`}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{sales(t.product.price)}</span>
                    {t.isEducational && <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-violet-700"><Sparkles className="mr-0.5 inline h-3 w-3" />Seekhne wala</span>}
                    {t.chokingHazard && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-amber-800"><AlertTriangle className="mr-0.5 inline h-3 w-3" />Purze</span>}
                    {cells && <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-sky-700"><BatteryCharging className="mr-0.5 inline h-3 w-3" />{cells}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {canSell && items.length > 0 && <Link to="/pos" className="inline-flex h-10 w-fit items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-white hover:bg-brand-700"><ShoppingCart className="h-4 w-4" />POS par bechein</Link>}

      {guide.isOpen && (
        <PageGuide title="Gift finder — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Baby, color: '#db2777', title: 'Umar', text: 'Jis bachay ke liye gift hai us ki umar chunein. Sirf wo khilone aate hain jin par ye umar likhi hai aur stock me hain.' },
            { icon: Gift, color: '#16a34a', title: 'Budget', text: 'Customer ka budget likhein — is se mehnge khilone nahi aate.' },
            { icon: ShieldCheck, color: '#0891b2', title: 'Chhote bachay', text: '3 saal se kam par chhote purze wale khilone khud hi hat jate hain.' },
          ]}
          shortcuts={[['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
