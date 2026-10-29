/**
 * The Recipe section of the shared product pages (detail tab and editor):
 * loads the product's recipe and shows the editor, read-only without the
 * recipe permission, with links to make it and to the production history.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Factory, History } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { MFG_KEY, manufacturingApi } from '../api';
import { RecipeEditor, type RecipeEditorProduct } from './RecipeEditor';

export function ProductRecipePanel({ product, compact }: { product: RecipeEditorProduct; compact?: boolean }) {
  const canManage = usePermission(PERMISSIONS.MANUFACTURING_MANAGE);
  const canProduce = usePermission(PERMISSIONS.MANUFACTURING_PRODUCE);
  const q = useQuery({ queryKey: [MFG_KEY, 'recipe', product.id], queryFn: () => manufacturingApi.recipe(product.id) });

  if (q.isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (q.data?.product.hasVariants) {
    return <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[0.875rem] text-amber-900 ring-1 ring-amber-200">Variants wale product ki Recipe abhi nahi banti — har variant ko alag product bana kar Recipe banayein.</p>;
  }
  const recipe = q.data?.recipe ?? null;
  const link = 'inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.875rem] text-slate-600">
          {recipe ? <>Yeh product <strong className="text-slate-900">banaya jata hai</strong> — raw maal se Cost khud nikalti hai.</> : 'Agar yeh product aap khud banate hain (mix, pack, cake, attar) to Recipe banayein.'}
        </p>
        {recipe && (
          <div className="flex flex-wrap gap-1.5">
            <Link to={`/manufacturing/history?productId=${product.id}`} className={link}><History className="h-4 w-4" />Production</Link>
            {canProduce && !recipe.makeOnSale && (
              <Link to={`/manufacturing/produce?product=${product.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-[0.8125rem] font-semibold text-brand-fg shadow-sm hover:bg-brand-700"><Factory className="h-4 w-4" />Banayein</Link>
            )}
          </div>
        )}
      </div>
      <RecipeEditor key={recipe?.updatedAt ?? 'new'} product={product} recipe={recipe} canEdit={canManage} compact={compact}
        onSaved={() => void q.refetch()} />
    </div>
  );
}
