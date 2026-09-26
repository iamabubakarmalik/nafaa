import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productImagesApi } from '@modules/inventory/products/api/product-images.api';
import { bakeryProductsApi } from '../api/products.api';
import { ingredientsApi } from '../api/ingredients.api';
import type { BakeryWizardDraft } from './useBakeryWizard';
import { deriveBakeryCategory } from '../lib/bakeryCategory';

export interface SubmitProgress {
  stage: 'idle' | 'product' | 'images' | 'profile' | 'done';
  message: string;
  productCreated?: boolean;
  imagesUploaded: number;
  productId?: string;
}

export function useBakeryWizardSubmit(existingProductId?: string) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<SubmitProgress>({
    stage: 'idle',
    message: '',
    imagesUploaded: 0,
  });

  const isEdit = Boolean(existingProductId);

  const mutation = useMutation({
    mutationFn: async (draft: BakeryWizardDraft) => {
      /* ── RAW: ye Product banta hi nahi ──
         Banane ka saamaan bechne ki cheez nahi. Ise Ingredient me
         daalte hain, is liye POS, catalog aur products ki list me
         kabhi nazar nahi aata. */
      if (draft.itemType === 'RAW') {
        setProgress({ stage: 'product', message: 'Saamaan save ho raha hai…', imagesUploaded: 0 });
        const ing = await ingredientsApi.create({
          name: draft.basic.name.trim(),
          category: draft.raw.category || 'GENERAL',
          unit: draft.basic.unit || 'kg',
          currentStock: draft.raw.currentStock === '' ? 0 : Number(draft.raw.currentStock),
          minStock: draft.raw.minStock === '' ? 0 : Number(draft.raw.minStock),
          costPerUnit: draft.raw.costPerUnit === '' ? 0 : Number(draft.raw.costPerUnit),
          supplierName: draft.raw.supplierName || undefined,
          supplierPhone: draft.raw.supplierPhone || undefined,
          shelfLifeDays: draft.raw.shelfLifeDays === '' ? undefined : Number(draft.raw.shelfLifeDays),
          requiresRefrigeration: draft.raw.requiresRefrigeration,
          isCritical: draft.raw.isCritical,
          notes: draft.raw.notes || undefined,
          imageUrl: draft.basic.imageUrls[0] || undefined,
          isActive: draft.basic.isActive,
        });
        setProgress({
          stage: 'done', message: 'Ho gaya!', productCreated: true,
          productId: ing.id, imagesUploaded: 0,
        });
        return { id: ing.id, __raw: true } as any;
      }

      setProgress({
        stage: 'product',
        message: isEdit ? 'Update ho raha hai…' : 'Ban rahi hai…',
        imagesUploaded: 0,
      });

      const price =
        Number(draft.basic.pricePerPiece || 0) ||
        Number(draft.basic.pricePerPound || 0) ||
        Number(draft.basic.pricePerKg || 0) ||
        Number(draft.basic.pricePerDozen || 0) ||
        Number(draft.basic.pricePerBox || 0) || 0;

      const productPayload = {
        name: draft.basic.name.trim(),
        description: draft.basic.descriptionLong || undefined,
        categoryId: draft.basic.categoryId || undefined,
        brandId: draft.basic.brandId || undefined,
        sku: draft.basic.sku || undefined,
        barcode: draft.basic.barcode || undefined,
        unit: draft.basic.unit || 'pcs',
        price,
        costPrice: draft.basic.costPrice === '' ? 0 : Number(draft.basic.costPrice),
        taxRate: draft.basic.taxRate ? Number(draft.basic.taxRate) : 0,
        lowStockAlert: draft.basic.lowStockAlert === '' ? 5 : Number(draft.basic.lowStockAlert),
        weight: draft.basic.weightGrams ? Number(draft.basic.weightGrams) : undefined,
        weightUnit: 'g',
        isActive: draft.basic.isActive,
        isFeatured: draft.basic.isFeatured,
        tagIds: draft.basic.tagIds,
        expiryTracked: !!draft.production.shelfLifeDays || !!draft.production.shelfLifeHours,

        /* STOCK sirf nayi cheez banate waqt.
           Pehle yahan hamesha `stock: 0` jata tha. Edit karte waqt
           wohi 0 seedha product par chala jata aur counter ka poora
           maujooda stock chup-chaap ur jata tha. Stock badalne ka
           apna raasta hai (stock adjustment) — wizard ka kaam nahi. */
        ...(isEdit
          ? {}
          : { stock: draft.basic.openingStock === '' ? 0 : Number(draft.basic.openingStock) }),
      };

      const product = isEdit && existingProductId
        ? await productsApi.update(existingProductId, productPayload)
        : await productsApi.create(productPayload);

      /* Tasveerein edit me bhi. Pehle shart `!isEdit` thi — yani
         edit ke waqt lagai gayi tasveer chup-chaap gir jati thi
         aur koi error bhi nahi aata tha. */
      if (draft.basic.imageUrls.length > 0) {
        setProgress((p) => ({
          ...p,
          stage: 'images',
          message: `Uploading ${draft.basic.imageUrls.length} image${draft.basic.imageUrls.length !== 1 ? 's' : ''}...`,
          productCreated: true,
          productId: product.id,
        }));

        for (let i = 0; i < draft.basic.imageUrls.length; i++) {
          try {
            await productImagesApi.add(product.id, {
              url: draft.basic.imageUrls[i],
              isPrimary: i === 0,
            });
            setProgress((p) => ({ ...p, imagesUploaded: i + 1 }));
          } catch (err) {
            console.warn('Image attach failed', err);
          }
        }
      }

      setProgress((p) => ({
        ...p,
        stage: 'profile',
        message: isEdit ? 'Updating bakery details...' : 'Saving bakery details...',
        productCreated: true,
        productId: product.id,
      }));

      await bakeryProductsApi.upsert({
        productId: product.id,
        /* Qism dukaan-daar se poochi nahi jati — us ki category ke
           naam se nikal aati hai. Backend par ye khana lazmi hai. */
        category: deriveBakeryCategory(draft.basic.categoryName, draft.basic.name),
        defaultSize: draft.basic.defaultSize,
        /* Bahar se laya hua maal — Lays ke packet ka koi flavour,
           shape ya cream nahi hota. */
        defaultShape: draft.itemType === 'MADE' ? draft.cake.defaultShape : undefined,
        defaultFlavor: draft.itemType === 'MADE' ? draft.cake.defaultFlavor : undefined,
        defaultCreamType: draft.itemType === 'MADE' ? draft.cake.defaultCreamType : undefined,
        pricePerKg: draft.basic.pricePerKg ? Number(draft.basic.pricePerKg) : undefined,
        pricePerPound: draft.basic.pricePerPound ? Number(draft.basic.pricePerPound) : undefined,
        pricePerPiece: draft.basic.pricePerPiece ? Number(draft.basic.pricePerPiece) : undefined,
        pricePerDozen: draft.basic.pricePerDozen ? Number(draft.basic.pricePerDozen) : undefined,
        pricePerSlice: draft.basic.pricePerSlice ? Number(draft.basic.pricePerSlice) : undefined,
        pricePerBox: draft.basic.pricePerBox ? Number(draft.basic.pricePerBox) : undefined,
        pricePerTray: draft.basic.pricePerTray ? Number(draft.basic.pricePerTray) : undefined,
        weightGrams: draft.basic.weightGrams ? Number(draft.basic.weightGrams) : undefined,
        servingSize: draft.basic.servingSize ? Number(draft.basic.servingSize) : undefined,
        numberOfSlices: draft.basic.numberOfSlices ? Number(draft.basic.numberOfSlices) : undefined,
        isCustomizable: draft.itemType === 'MADE' && draft.cake.isCakeCustomizable,
        isCakeCustomizable: draft.itemType === 'MADE' && draft.cake.isCakeCustomizable,
        allowsMessageOnCake: draft.cake.allowsMessageOnCake,
        allowsPhotoOnCake: draft.cake.allowsPhotoOnCake,
        allowsCustomShape: draft.cake.allowsCustomShape,
        allowsFlavorChoice: draft.cake.allowsFlavorChoice,
        allowsSizeChoice: draft.cake.allowsSizeChoice,
        prepTimeHours: draft.production.prepTimeHours ? Number(draft.production.prepTimeHours) : undefined,
        advanceOrderHours: draft.production.advanceOrderHours ? Number(draft.production.advanceOrderHours) : undefined,
        minOrderQty: draft.production.minOrderQty ? Number(draft.production.minOrderQty) : 1,
        maxOrderQty: draft.production.maxOrderQty ? Number(draft.production.maxOrderQty) : undefined,
        shelfLifeHours: draft.production.shelfLifeHours ? Number(draft.production.shelfLifeHours) : undefined,
        shelfLifeDays: draft.production.shelfLifeDays ? Number(draft.production.shelfLifeDays) : undefined,
        requiresRefrigeration: draft.production.requiresRefrigeration,
        allergens: draft.production.allergens,
        containsEgg: draft.production.containsEgg,
        containsNuts: draft.production.containsNuts,
        containsGluten: draft.production.containsGluten,
        containsDairy: draft.production.containsDairy,
        isEggless: draft.production.isEggless,
        isVegan: draft.production.isVegan,
        isSugarFree: draft.production.isSugarFree,
        isHalal: draft.production.isHalal,
        dietaryBadges: draft.production.dietaryBadges,
        caloriesPerServing: draft.production.caloriesPerServing ? Number(draft.production.caloriesPerServing) : undefined,
        /* Recipe seedha profile ke `ingredients` JSON me — is ke
           liye koi naya column ya migration nahi chahiye. */
        ingredients: draft.itemType === 'MADE' && draft.recipe.length > 0
          ? {
              yield: draft.recipeYield,
              lines: draft.recipe.map((r) => ({
                ingredientId: r.ingredientId,
                name: r.name,
                qty: Number(r.qty || 0),
                unit: r.unit,
                costPerUnit: r.costPerUnit,
              })),
            }
          : undefined,
        imageUrls: draft.basic.imageUrls,
        descriptionLong: draft.basic.descriptionLong || undefined,
        ingredientList: draft.cake.ingredientList || undefined,
        servingSuggestions: draft.cake.servingSuggestions || undefined,
        isPopular: draft.basic.isPopular,
        isFeatured: draft.basic.isFeatured,
        isBestSeller: draft.basic.isBestSeller,
        isNewArrival: draft.basic.isNewArrival,
        isSeasonalItem: draft.basic.isSeasonalItem,
        seasonName: draft.basic.isSeasonalItem ? draft.basic.seasonName : undefined,
      });

      setProgress({
        stage: 'done',
        message: 'All done!',
        productCreated: true,
        productId: product.id,
        imagesUploaded: draft.basic.imageUrls.length,
      });

      return product;
    },

    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      queryClient.invalidateQueries({ queryKey: ['bakery-products'] });
      queryClient.invalidateQueries({ queryKey: ['bakery-product-detail', product.id] });
      toast.success(isEdit ? 'Update ho gaya!' : 'Ban gaya!', {
        description: isEdit ? 'Tabdeeliyan save ho gayin' : 'Ab POS aur catalog dono par hai',
        duration: 3000,
      });
    },

    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Save failed');
      setProgress((p) => ({ ...p, stage: 'idle', message: '' }));
    },
  });

  return { mutation, progress, isEdit };
}
