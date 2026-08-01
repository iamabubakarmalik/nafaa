import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi, type UpsertVariantPayload } from '@modules/inventory/products/api/product-variants.api';
import { gamingProductsApi } from './products.api';
import type { GamingWizardDraft } from '../hooks/useGamingWizard';

export interface GamingWizardSaveResult {
  productId: string;
  productName: string;
  profileCreated: boolean;
  variantCount: number;
  totalStock: number;
}

export async function saveGamingWizard(draft: GamingWizardDraft): Promise<GamingWizardSaveResult> {
  const { basic, details, rental, hasVariants, variants, stock } = draft;

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
    await gamingProductsApi.upsert({
      productId,
      categoryType: basic.categoryType as any,
      platform: basic.platform as any,
      conditionType: basic.conditionType as any,

      publisher: details.publisher || undefined,
      developer: details.developer || undefined,
      genre: details.genre,
      ageRating: details.ageRating || undefined,
      playerCount: details.playerCount || undefined,
      onlineMultiplayer: details.onlineMultiplayer,
      requiresInternet: details.requiresInternet,
      gameFileSize: details.gameFileSize || undefined,
      releaseDate: details.releaseDate || undefined,
      region: details.region || undefined,
      language: details.language,

      storageCapacity: details.storageCapacity || undefined,
      memoryRam: details.memoryRam || undefined,
      processor: details.processor || undefined,
      graphicsCard: details.graphicsCard || undefined,
      displaySpec: details.displaySpec || undefined,
      includedAccessories: details.includedAccessories,
      numberOfControllers: Number(details.numberOfControllers || 1),

      gpuModel: details.gpuModel || undefined,
      cpuModel: details.cpuModel || undefined,
      ramSpec: details.ramSpec || undefined,
      formFactor: details.formFactor || undefined,
      power: details.power || undefined,
      socket: details.socket || undefined,
      chipset: details.chipset || undefined,

      isRentable: rental.isRentable,
      rentalPricePerHour: rental.rentalPricePerHour === '' ? undefined : Number(rental.rentalPricePerHour),
      rentalPricePerDay: rental.rentalPricePerDay === '' ? undefined : Number(rental.rentalPricePerDay),
      rentalDeposit: rental.rentalDeposit === '' ? undefined : Number(rental.rentalDeposit),

      mrp: basic.mrp === '' ? undefined : Number(basic.mrp),
      costPrice: Number(basic.costPrice || 0),
      retailPrice: Number(basic.retailPrice || 0),
      discountedPrice: basic.discountedPrice === '' ? undefined : Number(basic.discountedPrice),
      usedPrice: basic.usedPrice === '' ? undefined : Number(basic.usedPrice),
      tradeInValue: basic.tradeInValue === '' ? undefined : Number(basic.tradeInValue),

      isFeatured: basic.isFeatured,
      isBestSeller: basic.isBestSeller,
      isNewRelease: basic.isNewRelease,
      isPreOrder: rental.isPreOrder,
      preOrderReleaseDate: rental.preOrderReleaseDate || undefined,

      coverImageUrl: basic.imageUrls[0],
      trailerUrl: details.trailerUrl || undefined,
      screenshots: details.screenshots,
      notes: basic.notes || undefined,
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
