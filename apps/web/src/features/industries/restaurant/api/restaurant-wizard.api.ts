import { productsApi } from '@/api/products.api';
import { menuItemsApi } from './menu-items.api';
import { recipesApi } from './recipes.api';
import type { RestaurantWizardDraft } from '../hooks/useRestaurantWizard';

export interface RestaurantWizardSaveResult {
  productId: string;
  menuItemId: string;
  productName: string;
  dietaryTagCount: number;
  modifierGroupCount: number;
  ingredientCount: number;
  hasRecipe: boolean;
}

/**
 * Atomically create a restaurant menu item with:
 *   • Product (base entity)
 *   • Menu item (restaurant-specific meta)
 *   • Modifier group links
 *   • Recipe with ingredients (optional)
 *
 * Rollback: deletes the product if any subsequent step fails.
 */
export async function saveRestaurantWizard(
  draft: RestaurantWizardDraft,
): Promise<RestaurantWizardSaveResult> {
  const { basic, modifiers, recipe } = draft;

  // ─── 1. CREATE PRODUCT ─────────────────────────────────
  const product = await productsApi.create({
    name: basic.name.trim(),
    description: basic.description.trim() || undefined,
    categoryId: basic.categoryId || undefined,
    brandId: basic.brandId || undefined,
    sku: basic.sku.trim() || undefined,
    barcode: basic.barcode.trim() || undefined,
    unit: basic.unit || 'plate',
    price: Number(basic.salePrice || 0),
    costPrice: Number(basic.costPrice || 0),
    wholesalePrice: basic.wholesalePrice === '' ? undefined : Number(basic.wholesalePrice),
    taxRate: Number(basic.taxRate || 0),
    stock: 0, // Restaurant items typically don't track base stock
    lowStockAlert: 0,
    isActive: basic.isActive,
    isFeatured: basic.isFeatured,
    tagIds: basic.tagIds,
    imageUrls: basic.imageUrls,
  });

  const productId = product.id;

  const rollback = async (reason: unknown) => {
    try { await productsApi.remove(productId); } catch {}
    throw reason;
  };

  // ─── 2. CREATE MENU ITEM ───────────────────────────────
  let menuItem: any;
  try {
    menuItem = await menuItemsApi.upsert({
      productId,
      prepTimeMinutes: Number(basic.prepTimeMinutes) || undefined,
      cookingInstructions: basic.cookingInstructions || undefined,
      chefSpecial: basic.chefSpecial,
      bestSeller: basic.bestSeller,
      isSpicy: modifiers.isSpicy,
      spiceLevel: modifiers.isSpicy ? modifiers.spiceLevel : undefined,
      calories: basic.calories ? Number(basic.calories) : undefined,
      servingSize: basic.servingSize || undefined,
      servesPeople: Number(basic.servesPeople) || undefined,
      dietaryTags: modifiers.dietaryTags,
      allergenInfo: basic.allergenInfo || undefined,
      isAvailable: basic.isActive,
      availableFrom: basic.availableFrom || undefined,
      availableTo: basic.availableTo || undefined,
      availableDays: basic.availableDays,
      imageUrl: basic.menuImageUrl || undefined,
      tagLine: basic.tagLine || undefined,
    });
  } catch (e) {
    await rollback(e);
  }

  // ─── 3. ATTACH MODIFIER GROUPS ─────────────────────────
  if (modifiers.modifierGroupIds.length > 0) {
    try {
      await menuItemsApi.attachModifiers(menuItem.id, modifiers.modifierGroupIds);
    } catch (e) {
      await rollback(e);
    }
  }

  // ─── 4. CREATE RECIPE (optional) ───────────────────────
  if (recipe.hasRecipe && recipe.ingredients.length > 0) {
    try {
      await recipesApi.upsert({
        menuItemId: menuItem.id,
        yieldQuantity: Number(recipe.yieldQuantity) || 1,
        yieldUnit: recipe.yieldUnit,
        preparationSteps: recipe.preparationSteps || undefined,
        cookingTime: recipe.cookingTime ? Number(recipe.cookingTime) : undefined,
        ingredients: recipe.ingredients.map((ing, idx) => ({
          ingredientProductId: ing.ingredientProductId,
          quantity: Number(ing.quantity || 0),
          unit: ing.unit,
          costPerUnit: ing.costPerUnit,
          isOptional: ing.isOptional,
          notes: ing.notes,
          displayOrder: idx,
        })),
      });
    } catch (e) {
      await rollback(e);
    }
  }

  return {
    productId,
    menuItemId: menuItem.id,
    productName: product.name,
    dietaryTagCount: modifiers.dietaryTags.length,
    modifierGroupCount: modifiers.modifierGroupIds.length,
    ingredientCount: recipe.hasRecipe ? recipe.ingredients.length : 0,
    hasRecipe: recipe.hasRecipe,
  };
}
