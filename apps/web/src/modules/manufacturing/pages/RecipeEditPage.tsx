/**
 * One product's recipe on its own page: the shared recipe editor with the
 * product's prices, and links to make it or see its production.
 */

import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { PageHero, PageShell, Skeleton, heroButton } from '@/design-system/components';
import { MFG_KEY, manufacturingApi } from '../api';
import { useManufacturingSwitch } from '../hooks';
import { MfgNav, MfgOff } from '../components/MfgNav';
import { ProductRecipePanel } from '../components/ProductRecipePanel';

export default function RecipeEditPage() {
  const { productId = '' } = useParams<{ productId: string }>();
  const sw = useManufacturingSwitch();
  const enabled = sw === 'on';
  const q = useQuery({ queryKey: [MFG_KEY, 'recipe', productId], queryFn: () => manufacturingApi.recipe(productId), enabled: enabled && !!productId });
  const p = q.data?.product;

  if (sw === 'loading') return <PageShell><Skeleton className="h-28 rounded-3xl" /><Skeleton className="h-72 rounded-2xl" /></PageShell>;
  if (!enabled) return <PageShell><MfgOff /></PageShell>;
  return (
    <PageShell>
      <PageHero back="/manufacturing/recipes" backLabel="Recipes" loading={q.isLoading}
        title={p ? `${p.name} — Recipe` : 'Recipe'}
        subtitle={q.data?.recipe ? 'Raw maal ya quantity badlein — Cost foran nayi dikhti hai' : 'Is product me kya lagta hai aur 1 batch se kitna banta hai'}
        actions={p ? <Link to={`/products/${p.id}`} className={heroButton}><Eye className="h-4 w-4" />Product</Link> : undefined} />
      <MfgNav />
      {q.isLoading ? <Skeleton className="h-96 rounded-2xl" />
        : q.isError || !p ? <p className="rounded-2xl bg-white p-6 text-center text-slate-500 ring-1 ring-slate-200">Product nahi mila</p>
          : <ProductRecipePanel product={p} />}
    </PageShell>
  );
}
