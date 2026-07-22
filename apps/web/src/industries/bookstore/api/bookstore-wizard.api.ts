import { productsApi } from '@modules/inventory/products/api/products.api';
import { bookProfilesApi } from './book-profiles.api';
import { stationeryProfilesApi } from './stationery-profiles.api';
import { artSupplyProfilesApi } from './art-supply-profiles.api';
import type { BookstoreWizardDraft } from '../hooks/useBookstoreWizard';

export interface BookstoreWizardSaveResult {
  productId: string;
  productType: 'BOOK' | 'STATIONERY' | 'ART_SUPPLY';
  productName: string;
  profileId?: string;
  authorCount: number;
}

/**
 * Atomically create a bookstore product with type-specific profile:
 *   • Product (base)
 *   • Book profile OR Stationery profile OR Art supply profile
 *
 * Rollback: deletes the product if profile creation fails.
 */
export async function saveBookstoreWizard(
  draft: BookstoreWizardDraft,
): Promise<BookstoreWizardSaveResult> {
  const { basic, book, stationery, art } = draft;

  // ─── 1. CREATE PRODUCT ─────────────────────────────────
  const product = await productsApi.create({
    name: basic.name.trim(),
    description: basic.description.trim() || undefined,
    categoryId: basic.categoryId || undefined,
    brandId: basic.brandId || undefined,
    sku: basic.sku.trim() || undefined,
    barcode: basic.barcode.trim() || undefined,
    unit: basic.unit || 'pcs',
    price: Number(basic.salePrice || 0),
    costPrice: Number(basic.costPrice || 0),
    wholesalePrice: basic.wholesalePrice === '' ? undefined : Number(basic.wholesalePrice),
    taxRate: Number(basic.taxRate || 0),
    stock: Number(basic.stock || 0),
    lowStockAlert: Number(basic.lowStockAlert || 5),
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

  // ─── 2. CREATE TYPE-SPECIFIC PROFILE ───────────────────
  let profileId: string | undefined;
  let authorCount = 0;

  try {
    if (basic.productType === 'BOOK') {
      const profile = await bookProfilesApi.upsert({
        productId,
        isbn10: book.isbn10.trim() || undefined,
        isbn13: book.isbn13.trim() || undefined,
        publisherBookCode: book.publisherBookCode.trim() || undefined,
        title: book.title.trim() || basic.name.trim(),
        subtitle: book.subtitle.trim() || undefined,
        originalTitle: book.originalTitle.trim() || undefined,
        category: book.category,
        subCategory: book.subCategory.trim() || undefined,
        binding: book.binding,
        condition: book.condition,
        publisherId: book.publisherId || undefined,
        edition: book.edition.trim() || undefined,
        editionNumber: book.editionNumber === '' ? undefined : Number(book.editionNumber),
        publishYear: book.publishYear === '' ? undefined : Number(book.publishYear),
        reprintYear: book.reprintYear === '' ? undefined : Number(book.reprintYear),
        language: book.language,
        pageCount: book.pageCount === '' ? undefined : Number(book.pageCount),
        weightGrams: book.weightGrams === '' ? undefined : Number(book.weightGrams),
        dimensions: book.dimensions.trim() || undefined,
        paperQuality: book.paperQuality.trim() || undefined,
        synopsis: book.synopsis.trim() || undefined,
        tableOfContents: book.tableOfContents.trim() || undefined,
        isTextbook: book.isTextbook,
        grade: book.grade || undefined,
        classLevel: book.classLevel || undefined,
        subject: book.subject || undefined,
        board: book.board || undefined,
        curriculum: book.curriculum.trim() || undefined,
        mrp: basic.mrp === '' ? undefined : Number(basic.mrp),
        discountPct: Number(basic.discountPct || 0),
        isBestSeller: book.isBestSeller,
        isNewArrival: book.isNewArrival,
        isFeatured: basic.isFeatured,
        isAwardWinner: book.isAwardWinner,
        awardName: book.awardName.trim() || undefined,
        isRentable: book.isRentable,
        rentalPricePerWeek: book.rentalPricePerWeek === '' ? 0 : Number(book.rentalPricePerWeek),
        rentalDeposit: book.rentalDeposit === '' ? 0 : Number(book.rentalDeposit),
        authorIds: book.authorIds,
      });
      profileId = profile.id;
      authorCount = book.authorIds.length;
    } else if (basic.productType === 'STATIONERY') {
      const profile = await stationeryProfilesApi.upsert({
        productId,
        category: stationery.category,
        subCategory: stationery.subCategory.trim() || undefined,
        brand: stationery.brand.trim() || undefined,
        color: stationery.color.trim() || undefined,
        size: stationery.size.trim() || undefined,
        weight: stationery.weight === '' ? undefined : Number(stationery.weight),
        dimensions: stationery.dimensions.trim() || undefined,
        material: stationery.material.trim() || undefined,
        packSize: stationery.packSize === '' ? undefined : Number(stationery.packSize),
        packUnit: stationery.packUnit.trim() || undefined,
        itemsPerPack: stationery.itemsPerPack === '' ? undefined : Number(stationery.itemsPerPack),
        isFastMoving: stationery.isFastMoving,
        isSchoolItem: stationery.isSchoolItem,
        isOfficeItem: stationery.isOfficeItem,
        reorderLevel: Number(stationery.reorderLevel || 10),
      });
      profileId = profile.id;
    } else if (basic.productType === 'ART_SUPPLY') {
      const profile = await artSupplyProfilesApi.upsert({
        productId,
        category: art.category,
        subCategory: art.subCategory.trim() || undefined,
        brand: art.brand.trim() || undefined,
        color: art.color.trim() || undefined,
        colorCode: art.colorCode.trim() || undefined,
        size: art.size.trim() || undefined,
        grade: art.grade || undefined,
        weight: art.weight === '' ? undefined : Number(art.weight),
        volume: art.volume.trim() || undefined,
        dimensions: art.dimensions.trim() || undefined,
        suitableFor: art.suitableFor,
        isProfessional: art.isProfessional,
        isBeginner: art.isBeginner,
        reorderLevel: Number(art.reorderLevel || 5),
      });
      profileId = profile.id;
    }
  } catch (e) {
    await rollback(e);
  }

  return {
    productId,
    productType: basic.productType,
    productName: product.name,
    profileId,
    authorCount,
  };
}
