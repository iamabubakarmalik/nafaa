import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, Plus, Trash2, Search, X, Package, AlertCircle,
  ToggleLeft, ToggleRight, Info, DollarSign, Clock, ChefHat,
  Sparkles,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import type {
  RestaurantWizardRecipe, RestaurantWizardRecipeIngredient,
} from '../../hooks/useRestaurantWizard';

interface Props {
  recipe: RestaurantWizardRecipe;
  onToggleRecipe: (v: boolean) => void;
  onUpdate: (patch: Partial<RestaurantWizardRecipe>) => void;
  onAddIngredient: (ing: Omit<RestaurantWizardRecipeIngredient, 'tempId'>) => void;
  onUpdateIngredient: (tempId: string, patch: Partial<RestaurantWizardRecipeIngredient>) => void;
  onRemoveIngredient: (tempId: string) => void;
  errors: string[];
}

const UNIT_OPTIONS = ['gram', 'kg', 'ml', 'liter', 'pcs', 'cup', 'tbsp', 'tsp', 'plate'];

export function RestaurantWizardStep3Recipe({
  recipe, onToggleRecipe, onUpdate, onAddIngredient, onUpdateIngredient, onRemoveIngredient, errors,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const { data: productsData } = useQuery({
    queryKey: ['products-for-recipe', productSearch],
    queryFn: () => productsApi.list({ page: 1, limit: 30, search: productSearch || undefined }),
    enabled: showPicker,
  });

  const products = productsData?.items ?? [];

  const addFromProduct = (product: any) => {
    onAddIngredient({
      ingredientProductId: product.id,
      ingredientName: product.name,
      quantity: 1,
      unit: product.unit || 'gram',
      costPerUnit: Number(product.costPrice || product.price || 0),
      isOptional: false,
    });
    setProductSearch('');
    setShowPicker(false);
  };

  const totalCost = recipe.ingredients.reduce(
    (a, i) => a + Number(i.quantity || 0) * Number(i.costPerUnit || 0), 0,
  );

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix before saving:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200 p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shrink-0">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-amber-900 text-sm">Recipe / BOM Tracking</h3>
          <p className="text-xs text-amber-800 font-semibold mt-0.5 leading-relaxed">
            Ingredient tracking se automatic stock deduct hoga sale ke waqt. Optional hai —
            sirf important dishes ke liye enable karo.
          </p>
        </div>
      </div>

      {/* Toggle */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center shadow-md shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Track Recipe Ingredients?</h3>
            <p className="text-sm text-slate-600 font-semibold mt-0.5">
              Jab ye item bike, ingredients ka stock automatic minus ho jayega
            </p>
          </div>
          <button type="button" onClick={() => onToggleRecipe(!recipe.hasRecipe)}
            className={['inline-flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-sm transition shrink-0',
              recipe.hasRecipe ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'].join(' ')}>
            {recipe.hasRecipe ? (<><ToggleRight className="h-5 w-5" /> Yes, track</>)
              : (<><ToggleLeft className="h-5 w-5" /> No, skip</>)}
          </button>
        </div>

        {!recipe.hasRecipe && (
          <div className="mt-4 rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900">
              <div className="font-extrabold mb-0.5">Skip mode</div>
              <div className="font-semibold">
                Recipe track nahi hogi — bas item save ho jayega. Baad mein Recipe page se add kar sakte hain.
              </div>
            </div>
          </div>
        )}
      </section>

      {recipe.hasRecipe && (
        <>
          {/* Recipe Yield */}
          <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md">
                <ChefHat className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-amber-900 text-base">Recipe Yield</h3>
                <p className="text-xs text-amber-700 font-semibold">Ek recipe se kitna banega?</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <Input
                label="Yield Quantity"
                type="number" step="0.01"
                value={recipe.yieldQuantity}
                onChange={(e) => onUpdate({ yieldQuantity: Number(e.target.value || 1) })}
                hint="e.g. 1 plate, 4 portions"
              />
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Yield Unit</label>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500"
                  value={recipe.yieldUnit}
                  onChange={(e) => onUpdate({ yieldUnit: e.target.value })}
                >
                  {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <Input
                label="Cooking Time (min)"
                type="number"
                value={recipe.cookingTime}
                onChange={(e) => onUpdate({ cookingTime: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="Optional"
                leftIcon={<Clock className="h-4 w-4 text-slate-400" />}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Preparation Steps</label>
              <textarea
                rows={4}
                value={recipe.preparationSteps}
                onChange={(e) => onUpdate({ preparationSteps: e.target.value })}
                placeholder="Step 1: Marinate chicken for 30 min&#10;Step 2: Cook rice separately&#10;Step 3: ..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500"
              />
            </div>
          </section>

          {/* Ingredients */}
          <section className="rounded-2xl border-2 border-amber-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center shadow-md">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Ingredients</h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
                    {totalCost > 0 && ` • Cost: ${formatPKRFull(totalCost)}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Add Ingredient
              </button>
            </div>

            {showPicker && (
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      autoFocus
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search ingredient product..."
                      className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    onClick={() => { setShowPicker(false); setProductSearch(''); }}
                    className="h-10 w-10 rounded-lg bg-white hover:bg-slate-100 flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto rounded-lg bg-white border border-amber-200">
                  {products.length === 0 ? (
                    <div className="p-4 text-xs text-slate-500 font-semibold italic text-center">
                      No products found. Products list mein pehle raw ingredients add karo.
                    </div>
                  ) : (
                    products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addFromProduct(p)}
                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-amber-50 transition text-left border-b border-slate-100 last:border-0"
                      >
                        <Package className="h-4 w-4 text-slate-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-sm truncate text-slate-900">{p.name}</div>
                          <div className="text-xs text-slate-500 font-semibold">
                            {formatPKR(p.costPrice || p.price)} / {p.unit}
                          </div>
                        </div>
                        <Plus className="h-4 w-4 text-amber-600" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {recipe.ingredients.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Ingredient</th>
                      <th className="px-2 py-2 text-right font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Qty</th>
                      <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Unit</th>
                      <th className="px-2 py-2 text-right font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Cost/Unit</th>
                      <th className="px-2 py-2 text-right font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Total</th>
                      <th className="px-2 py-2 text-center font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">Opt?</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recipe.ingredients.map((ing) => {
                      const lineTotal = Number(ing.quantity || 0) * Number(ing.costPerUnit || 0);
                      return (
                        <tr key={ing.tempId} className="hover:bg-amber-50/50">
                          <td className="px-2 py-1.5">
                            <div className="font-extrabold text-sm text-slate-900">{ing.ingredientName}</div>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number" step="0.01"
                              value={ing.quantity}
                              onChange={(e) => onUpdateIngredient(ing.tempId, { quantity: Number(e.target.value || 0) })}
                              className="w-16 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold tabular-nums text-right focus:outline-none focus:border-amber-500"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={ing.unit}
                              onChange={(e) => onUpdateIngredient(ing.tempId, { unit: e.target.value })}
                              className="h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-amber-500"
                            >
                              {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number" step="0.01"
                              value={ing.costPerUnit ?? ''}
                              onChange={(e) => onUpdateIngredient(ing.tempId, { costPerUnit: e.target.value === '' ? undefined : Number(e.target.value) })}
                              placeholder="0"
                              className="w-20 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold tabular-nums text-right focus:outline-none focus:border-amber-500"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right text-xs font-extrabold text-emerald-700 tabular-nums">
                            {formatPKR(lineTotal)}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={ing.isOptional}
                              onChange={(e) => onUpdateIngredient(ing.tempId, { isOptional: e.target.checked })}
                              className="h-4 w-4 rounded"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <button
                              onClick={() => onRemoveIngredient(ing.tempId)}
                              className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-amber-50 border-t-2 border-amber-200">
                    <tr>
                      <td colSpan={4} className="px-2 py-2 text-right text-xs font-extrabold text-amber-900 uppercase">
                        Total Recipe Cost
                      </td>
                      <td className="px-2 py-2 text-right text-sm font-extrabold text-amber-900 tabular-nums">
                        {formatPKRFull(totalCost)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-8 text-center">
                <Package className="h-10 w-10 text-amber-400 mx-auto mb-2" />
                <div className="font-extrabold text-slate-700 text-sm">No ingredients added</div>
                <div className="text-xs text-slate-500 font-semibold mt-1">
                  "Add Ingredient" click karo, ya switch off karo agar recipe track nahi karni
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
