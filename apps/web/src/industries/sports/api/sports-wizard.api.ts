import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi, type UpsertVariantPayload } from '@modules/inventory/products/api/product-variants.api';
import { sportsProductsApi } from './products.api';
import type { SportsWizardDraft } from '../hooks/useSportsWizard';

export interface SportsWizardSaveResult {
  productId: string;
  productName: string;
  profileCreated: boolean;
  variantCount: number;
  totalStock: number;
}

export async function saveSportsWizard(draft: SportsWizardDraft): Promise<SportsWizardSaveResult> {
  const { basic, specs, team, hasVariants, variants, stock } = draft;

  const baselineStock = hasVariants
    ? variants.reduce((a, v) => a + Number(v.stock || 0), 0)
    : Number(stock.currentStock || 0);

  const product = await productsApi.create({
    name: basic.name.trim(),
    description: basic.description.trim() || undefined,
    categoryId: basic.categoryId || undefined,
    sku: basic.sku.trim() || undefined,
    barcode: basic.barcode.trim() || undefined,
    unit: 'pcs',
    price: Number(basic.retailPrice || 0),
    costPrice: Number(basic.costPrice || 0),
    wholesalePrice: basic.wholesalePrice === '' ? undefined : Number(basic.wholesalePrice),
    taxRate: Number(basic.taxRate || 0),
    stock: baselineStock,
    lowStockAlert: Number(stock.lowStockAlert || 3),
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

  let profileCreated = false;
  try {
    await sportsProductsApi.upsert({
      productId,
      brandId: basic.brandId || undefined,
      categoryType: basic.categoryType as any,
      sport: basic.sport || undefined,
      ageGroup: basic.ageGroup as any,
      genderTarget: basic.genderTarget as any,

      batWood: specs.batWood || undefined,
      batWeightGrams: specs.batWeightGrams ? Number(specs.batWeightGrams) : undefined,
      batGrade: specs.batGrade || undefined,
      batSize: specs.batSize || undefined,
      handleType: specs.handleType || undefined,

      ballType: specs.ballType || undefined,
      ballWeight: specs.ballWeight || undefined,
      ballCircumference: specs.ballCircumference || undefined,
      ballMaterial: specs.ballMaterial || undefined,

      size: specs.size || undefined,
      material: specs.material || undefined,
      fit: specs.fit || undefined,
      hasCustomization: specs.hasCustomization,

      shoeSize: specs.shoeSize || undefined,
      soleType: specs.soleType || undefined,
      studType: specs.studType || undefined,

      weight: specs.weight || undefined,
      maxUserWeight: specs.maxUserWeight || undefined,
      dimensions: specs.dimensions || undefined,
      powerRating: specs.powerRating || undefined,
      motorType: specs.motorType || undefined,
      foldable: specs.foldable,

      color: basic.color || undefined,
      colorHex: basic.colorHex || undefined,
      material2: specs.material2 || undefined,
      countryOfMake: basic.countryOfMake || undefined,
      certifications: specs.certifications,

      isTeamOrderable: team.isTeamOrderable,
      minTeamOrder: team.minTeamOrder ? Number(team.minTeamOrder) : undefined,
      bulkDiscountPct: team.bulkDiscountPct ? Number(team.bulkDiscountPct) : undefined,
      customizationOptions: team.customizationOptions,

      warrantyMonths: basic.warrantyMonths ? Number(basic.warrantyMonths) : 0,
      warrantyType: basic.warrantyType || undefined,

      mrp: basic.mrp === '' ? undefined : Number(basic.mrp),
      costPrice: Number(basic.costPrice || 0),
      wholesalePrice: basic.wholesalePrice === '' ? undefined : Number(basic.wholesalePrice),
      retailPrice: Number(basic.retailPrice || 0),
      teamPrice: team.teamPrice === '' ? undefined : Number(team.teamPrice),

      isFeatured: basic.isFeatured,
      isBestSeller: basic.isBestSeller,
      isNewArrival: basic.isNewArrival,
      isProfessional: basic.isProfessional,

      notes: basic.notes || undefined,
      careInstructions: basic.careInstructions || undefined,
    });
    profileCreated = true;
  } catch (e) {
    await rollback(e);
  }

  let createdVariants: any[] = [];
  if (hasVariants && variants.length > 0) {
    const payloads: UpsertVariantPayload[] = variants.map((v, i) => ({
      name: v.name.trim(),
      sku: v.sku?.trim() || undefined,
      barcode: v.barcode?.trim() || undefined,
      unit: 'pcs',
      price: v.priceOverride ?? Number(basic.retailPrice || 0),
      costPrice: v.costOverride ?? Number(basic.costPrice || 0),
      stock: Number(v.stock || 0),
      lowStockAlert: Number(v.lowStockAlert || 3),
      imageUrl: v.imageUrl || undefined,
      isActive: v.isActive,
      sortOrder: i,
    }));
    try {
      createdVariants = await productVariantsApi.bulkCreate(productId, payloads);
    } catch (e) {
      await rollback(e);
    }
  }

  return {
    productId,
    productName: product.name,
    profileCreated,
    variantCount: createdVariants.length,
    totalStock: baselineStock,
  };
}
