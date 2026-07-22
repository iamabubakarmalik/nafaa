import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChefHat, Package, Plus, Trash2, X, Save, Search, Sparkles,
  RefreshCw, DollarSign, Clock, ArrowRight, AlertCircle,
  Utensils, TrendingUp, Info,
} from 'lucide-react';
import { menuItemsApi } from '../api/menu-items.api';
import { recipesApi, type Recipe, type RecipeIngredient } from '../api/recipes.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const UNIT_OPTIONS = ['kg', 'g', 'mg', 'l', 'ml', 'piece', 'dozen', 'tbsp', 'tsp', 'cup', 'oz', 'lb'];

export default function RecipesPage() {
  const queryClient = useQueryClient();
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>('');
  const [menuSearch, setMenuSearch] = useState('');

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menu-items-recipes', menuSearch],
    queryFn: () => menuItemsApi.list({ search: menuSearch || undefined }),
  });

  const { data: recipe, isLoading: loadingRecipe } = useQuery({
    queryKey: ['recipe', selectedMenuItemId],
    queryFn: () => recipesApi.getByMenuItem(selectedMenuItemId),
    enabled: !!selectedMenuItemId,
  });

  const selectedMenuItem = menuItems.find((m) => m.id === selectedMenuItemId);

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-lime-900 to-emerald-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-lime-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Recipe / BOM Builder
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              📖 Recipes
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Ingredients tracker — auto stock deduction jab dish bane
            </p>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        {/* LEFT — Menu picker */}
        <aside className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-10rem)]">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/30">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Menu Items</h3>
          </div>
          <div className="p-3 border-b border-slate-100 dark:border-neutral-800">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                placeholder="Search menu..."
                className="h-10 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-lime-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {menuItems.map((mi) => (
              <button
                key={mi.id}
                onClick={() => setSelectedMenuItemId(mi.id)}
                className={
                  'w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-neutral-800 transition text-left border-l-4 ' +
                  (selectedMenuItemId === mi.id ? 'bg-lime-50 dark:bg-lime-950/30 border-lime-500' : 'border-transparent')
                }
              >
                <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                  {mi.imageUrl || mi.product?.images?.[0]?.url ? (
                    <img src={mi.imageUrl || mi.product?.images?.[0]?.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ChefHat className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-xs truncate text-slate-900 dark:text-white">{mi.product?.name}</div>
                  <div className="text-[10px] text-slate-500 font-semibold">{formatPKR(mi.product?.price ?? 0)}</div>
                </div>
                {mi.recipe && <span className="px-1.5 py-0.5 rounded bg-lime-100 dark:bg-lime-950/40 text-lime-700 text-[8px] font-extrabold uppercase">Has Recipe</span>}
              </button>
            ))}
          </div>
        </aside>

        {/* RIGHT — Recipe editor */}
        <section>
          {!selectedMenuItem ? (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
              <ChefHat className="h-16 w-16 text-slate-400 mx-auto mb-3" />
              <h3 className="font-extrabold text-slate-900 dark:text-white">Select a menu item</h3>
              <p className="text-sm text-slate-500 font-semibold mt-1">Left se select karo recipe banane ke liye</p>
            </div>
          ) : loadingRecipe ? (
            <div className="h-96 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />
          ) : (
            <RecipeEditor
              menuItem={selectedMenuItem}
              existingRecipe={recipe ?? null}
              onSaved={() => {
                queryClient.invalidateQueries({ queryKey: ['recipe', selectedMenuItemId] });
                queryClient.invalidateQueries({ queryKey: ['menu-items-recipes'] });
              }}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function RecipeEditor({ menuItem, existingRecipe, onSaved }: {
  menuItem: any;
  existingRecipe: Recipe | null;
  onSaved: () => void;
}) {
  const [yieldQuantity, setYieldQuantity] = useState(existingRecipe?.yieldQuantity ?? 1);
  const [yieldUnit, setYieldUnit] = useState(existingRecipe?.yieldUnit ?? 'portion');
  const [cookingTime, setCookingTime] = useState(existingRecipe?.cookingTime ?? menuItem.prepTimeMinutes ?? 15);
  const [preparationSteps, setPreparationSteps] = useState(existingRecipe?.preparationSteps ?? '');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    existingRecipe?.ingredients ?? [],
  );

  useEffect(() => {
    if (existingRecipe) {
      setYieldQuantity(existingRecipe.yieldQuantity);
      setYieldUnit(existingRecipe.yieldUnit);
      setCookingTime(existingRecipe.cookingTime ?? 15);
      setPreparationSteps(existingRecipe.preparationSteps ?? '');
      setIngredients(existingRecipe.ingredients);
    } else {
      setYieldQuantity(1);
      setYieldUnit('portion');
      setCookingTime(15);
      setPreparationSteps('');
      setIngredients([]);
    }
  }, [existingRecipe, menuItem.id]);

  const totalCost = ingredients.reduce((sum, ing) => sum + (ing.costPerUnit ?? 0) * ing.quantity, 0);
  const menuPrice = menuItem.product?.price ?? 0;
  const marginPct = menuPrice > 0 ? ((menuPrice - totalCost) / menuPrice) * 100 : 0;

  const saveMutation = useMutation({
    mutationFn: () => recipesApi.upsert({
      menuItemId: menuItem.id,
      yieldQuantity,
      yieldUnit,
      cookingTime,
      preparationSteps: preparationSteps || undefined,
      ingredients: ingredients.filter((i) => i.ingredientProductId && i.quantity > 0),
    }),
    onSuccess: () => {
      toast.success('Recipe saved');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const removeMutation = useMutation({
    mutationFn: () => recipesApi.remove(existingRecipe!.id),
    onSuccess: () => {
      toast.success('Recipe deleted');
      onSaved();
    },
  });

  return (
    <div className="space-y-4">
      {/* Menu Item Header */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-lime-900 text-white p-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-white/15 overflow-hidden shrink-0">
            {menuItem.imageUrl || menuItem.product?.images?.[0]?.url ? (
              <img src={menuItem.imageUrl || menuItem.product?.images?.[0]?.url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><ChefHat className="h-8 w-8 text-white/60" /></div>
            )}
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase font-extrabold text-white/70">Recipe for</div>
            <div className="text-2xl font-extrabold">{menuItem.product?.name}</div>
            <div className="text-sm text-white/80 font-semibold">Menu price: {formatPKR(menuPrice)}</div>
          </div>
        </div>
      </div>

      {/* Cost analysis */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4">
          <div className="text-xs uppercase font-extrabold text-slate-500">Recipe Cost</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(totalCost)}</div>
          <div className="text-[10px] text-slate-500 font-bold">per {yieldQuantity} {yieldUnit}</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4">
          <div className="text-xs uppercase font-extrabold text-slate-500">Cost per Portion</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {formatPKR(yieldQuantity > 0 ? totalCost / yieldQuantity : 0)}
          </div>
          <div className="text-[10px] text-slate-500 font-bold">1 {yieldUnit}</div>
        </div>
        <div className={
          'rounded-2xl border-2 p-4 ' +
          (marginPct > 50 ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300' :
           marginPct > 30 ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300' :
           'bg-rose-50 dark:bg-rose-950/40 border-rose-300')
        }>
          <div className={
            'text-xs uppercase font-extrabold ' +
            (marginPct > 50 ? 'text-emerald-700' : marginPct > 30 ? 'text-amber-700' : 'text-rose-700')
          }>Profit Margin</div>
          <div className={
            'mt-1 text-2xl font-extrabold tabular-nums ' +
            (marginPct > 50 ? 'text-emerald-700' : marginPct > 30 ? 'text-amber-700' : 'text-rose-700')
          }>
            {marginPct.toFixed(1)}%
          </div>
          <div className={
            'text-[10px] font-bold ' +
            (marginPct > 50 ? 'text-emerald-700' : marginPct > 30 ? 'text-amber-700' : 'text-rose-700')
          }>
            Profit: {formatPKR(menuPrice - totalCost)}
          </div>
        </div>
      </div>

      {/* Yield + Time */}
      <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recipe Yield</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Yield Quantity</label>
            <input
              type="number" step="0.01" min="0.01"
              value={yieldQuantity}
              onChange={(e) => setYieldQuantity(Number(e.target.value))}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-lime-500"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Yield Unit</label>
            <select
              value={yieldUnit}
              onChange={(e) => setYieldUnit(e.target.value)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-lime-500"
            >
              <option value="portion">Portion</option>
              <option value="plate">Plate</option>
              <option value="serving">Serving</option>
              <option value="piece">Piece</option>
              <option value="kg">Kg</option>
              <option value="g">Grams</option>
              <option value="liter">Liter</option>
              <option value="ml">ml</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Cooking Time (min)</label>
            <input
              type="number" min="1"
              value={cookingTime}
              onChange={(e) => setCookingTime(Number(e.target.value))}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-lime-500"
            />
          </div>
        </div>
      </div>

      {/* Ingredients */}
      <IngredientsSection ingredients={ingredients} onChange={setIngredients} />

      {/* Preparation Steps */}
      <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Preparation Steps</h3>
        <textarea
          rows={6}
          value={preparationSteps}
          onChange={(e) => setPreparationSteps(e.target.value)}
          placeholder="1. Marinate chicken with spices for 30 minutes..."
          className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-lime-500 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="lg"
          className="flex-1 bg-gradient-to-r from-lime-600 to-emerald-700"
          onClick={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
          disabled={ingredients.filter((i) => i.ingredientProductId && i.quantity > 0).length === 0}
        >
          <Save className="h-5 w-5" />
          {existingRecipe ? 'Update Recipe' : 'Create Recipe'}
        </Button>
        {existingRecipe && (
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              if (confirm('Delete this recipe?')) removeMutation.mutate();
            }}
            className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100"
          >
            <Trash2 className="h-5 w-5" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

function IngredientsSection({ ingredients, onChange }: {
  ingredients: RecipeIngredient[];
  onChange: (ing: RecipeIngredient[]) => void;
}) {
  const [productSearch, setProductSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const { data: productsData } = useQuery({
    queryKey: ['products-for-recipe', productSearch],
    queryFn: () => productsApi.list({ page: 1, limit: 30, search: productSearch || undefined }),
    enabled: showPicker,
  });

  const products = productsData?.items ?? [];

  const addIngredient = (product: any) => {
    onChange([
      ...ingredients,
      {
        ingredientProductId: product.id,
        quantity: 1,
        unit: product.unit || 'piece',
        costPerUnit: product.costPrice ?? 0,
        totalCost: product.costPrice ?? 0,
        isOptional: false,
        ingredient: product,
      },
    ]);
    setShowPicker(false);
    setProductSearch('');
  };

  const update = (idx: number, patch: Partial<RecipeIngredient>) => {
    const updated = ingredients.map((ing, i) => {
      if (i !== idx) return ing;
      const next = { ...ing, ...patch };
      // Recalc totalCost
      if ('quantity' in patch || 'costPerUnit' in patch) {
        next.totalCost = (next.quantity ?? 0) * (next.costPerUnit ?? 0);
      }
      return next;
    });
    onChange(updated);
  };

  const remove = (idx: number) => onChange(ingredients.filter((_, i) => i !== idx));

  return (
    <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-lime-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ingredients</h3>
          <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-neutral-700 text-[10px] font-extrabold">{ingredients.length}</span>
        </div>
        <Button size="sm" onClick={() => setShowPicker(true)} className="bg-gradient-to-r from-lime-600 to-emerald-700">
          <Plus className="h-3.5 w-3.5" />
          Add Ingredient
        </Button>
      </div>

      {showPicker && (
        <div className="p-3 border-b border-slate-100 dark:border-neutral-800 bg-lime-50/50 dark:bg-lime-950/20">
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search raw materials/ingredients..."
                className="h-10 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-lime-500"
              />
            </div>
            <button onClick={() => setShowPicker(false)} className="h-10 w-10 rounded-xl bg-white dark:bg-neutral-800 hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => addIngredient(p)}
                className="w-full px-3 py-2 flex items-center gap-3 rounded-lg hover:bg-white dark:hover:bg-neutral-800 transition text-left"
              >
                <Package className="h-4 w-4 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm truncate text-slate-900 dark:text-white">{p.name}</div>
                  <div className="text-xs text-slate-500 font-semibold">
                    Cost: {formatPKR(p.costPrice)} / {p.unit} • Stock: {p.stock}
                  </div>
                </div>
                <Plus className="h-4 w-4 text-lime-600" />
              </button>
            ))}
          </div>
        </div>
      )}

      {ingredients.length === 0 ? (
        <div className="p-8 text-center">
          <Package className="h-12 w-12 text-slate-400 mx-auto mb-2" />
          <p className="font-extrabold text-slate-700 dark:text-slate-300">No ingredients yet</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">Add products/raw materials used in this dish</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-neutral-800">
          {ingredients.map((ing, i) => (
            <div key={i} className="p-3 grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4 flex items-center gap-2 min-w-0">
                <Package className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                    {ing.ingredient?.name || 'Ingredient'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold">Stock: {ing.ingredient?.stock ?? '—'}</div>
                </div>
              </div>

              <div className="col-span-2">
                <input
                  type="number" step="0.001" min="0.001"
                  value={ing.quantity}
                  onChange={(e) => update(i, { quantity: Number(e.target.value) })}
                  className="h-9 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-extrabold tabular-nums text-right focus:outline-none focus:border-lime-500"
                />
              </div>

              <div className="col-span-2">
                <select
                  value={ing.unit}
                  onChange={(e) => update(i, { unit: e.target.value })}
                  className="h-9 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs font-bold focus:outline-none focus:border-lime-500"
                >
                  {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div className="col-span-2 relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-extrabold text-slate-500">Rs</span>
                <input
                  type="number" step="0.01"
                  value={ing.costPerUnit ?? 0}
                  onChange={(e) => update(i, { costPerUnit: Number(e.target.value) })}
                  placeholder="Cost/unit"
                  className="h-9 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-7 pr-2 text-xs font-extrabold tabular-nums focus:outline-none focus:border-lime-500"
                />
              </div>

              <div className="col-span-1 text-right">
                <div className="text-sm font-extrabold text-emerald-700 tabular-nums">
                  {formatPKR((ing.quantity ?? 0) * (ing.costPerUnit ?? 0))}
                </div>
                <label className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ing.isOptional || false}
                    onChange={(e) => update(i, { isOptional: e.target.checked })}
                    className="h-3 w-3"
                  />
                  Opt
                </label>
              </div>

              <button
                onClick={() => remove(i)}
                className="col-span-1 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
