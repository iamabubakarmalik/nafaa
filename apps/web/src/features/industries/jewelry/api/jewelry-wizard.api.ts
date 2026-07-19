import { productsApi } from '@/api/products.api';
import { jewelryProductsApi } from './products.api';
import type { JewelryWizardDraft } from '../hooks/useJewelryWizard';

export interface JewelryWizardSaveResult {
  productId: string;
  jewelryProfileId: string;
  productName: string;
  itemCode?: string;
  category: string;
  metalType: string;
  netWeight: number;
  gemstoneCount: number;
  hasHallmark: boolean;
  hasCertificate: boolean;
}

export async function saveJewelryWizard(
  draft: JewelryWizardDraft,
): Promise<JewelryWizardSaveResult> {
  const { basic, charges, certify } = draft;

  const product = await productsApi.create({
    name: basic.name.trim(),
    description: basic.description.trim() || undefined,
    categoryId: basic.categoryId || undefined,
    brandId: basic.brandId || undefined,
    sku: basic.sku.trim() || undefined,
    barcode: basic.barcode.trim() || undefined,
    unit: 'pcs',
    price: Number(certify.estimatedPrice || 0),
    costPrice: Number(certify.costPrice || 0),
    taxRate: 0,
    stock: 1,
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

  let profile: any;
  try {
    profile = await jewelryProductsApi.upsert({
      productId,
      itemCode: basic.itemCode || undefined,
      designNumber: basic.designNumber || undefined,
      category: basic.category,
      subCategory: basic.subCategory || undefined,
      style: basic.style,
      metalType: basic.metalType,
      purity: basic.purity,
      purityHallmark: basic.purityHallmark || undefined,
      grossWeight: Number(basic.grossWeight || 0),
      netWeight: Number(basic.netWeight || 0),
      stoneWeight: Number(basic.stoneWeight || 0),
      waxWeight: Number(basic.waxWeight || 0),
      otherWeight: Number(basic.otherWeight || 0),
      size: basic.size || undefined,
      length: basic.length === '' ? undefined : Number(basic.length),
      width: basic.width === '' ? undefined : Number(basic.width),
      thickness: basic.thickness === '' ? undefined : Number(basic.thickness),
      makingChargePerGram: Number(charges.makingChargePerGram || 0),
      makingChargeFixed: Number(charges.makingChargeFixed || 0),
      makingChargePct: Number(charges.makingChargePct || 0),
      wastagePct: Number(charges.wastagePct || 0),
      wastageGrams: Number(charges.wastageGrams || 0),
      designerCharge: Number(charges.designerCharge || 0),
      polishCharge: Number(charges.polishCharge || 0),
      hallmarkCharge: Number(charges.hallmarkCharge || 0),
      otherCharges: Number(charges.otherCharges || 0),
      hasStones: charges.hasStones,
      hasDiamond: charges.hasDiamond,
      hasGemstone: charges.hasGemstone,
      hasPearl: charges.hasPearl,
      stoneCount: charges.stoneCount === '' ? 0 : Number(charges.stoneCount),
      stoneCaret: charges.stoneCaret === '' ? undefined : Number(charges.stoneCaret),
      stoneQuality: charges.stoneQuality || undefined,
      stoneColor: charges.stoneColor || undefined,
      stoneClarity: charges.stoneClarity || undefined,
      stoneCut: charges.stoneCut || undefined,
      hallmarkNumber: charges.hallmarkNumber || undefined,
      hallmarkAuthority: charges.hallmarkAuthority || undefined,
      hallmarkDate: charges.hallmarkDate || undefined,
      bisNumber: charges.bisNumber || undefined,
      jewellerCode: charges.jewellerCode || undefined,
      hallmarkPhotoUrl: charges.hallmarkPhotoUrl || undefined,
      designerName: basic.designerName || undefined,
      karigarName: basic.karigarName || undefined,
      workshopName: basic.workshopName || undefined,
      countryOfOrigin: basic.countryOfOrigin || undefined,
      isCustomOrder: certify.isCustomOrder,
      isBespoke: certify.isBespoke,
      isAntique: certify.isAntique,
      isCertified: certify.isCertified,
      certificateNumber: certify.certificateNumber || undefined,
      certificateAuthority: certify.certificateAuthority || undefined,
      certificatePhotoUrl: certify.certificatePhotoUrl || undefined,
      isBuyBackEligible: certify.isBuyBackEligible,
      buyBackPct: Number(certify.buyBackPct || 0),
      isReturnable: certify.isReturnable,
      returnDays: Number(certify.returnDays || 0),
      currentValue: certify.currentValue === '' ? undefined : Number(certify.currentValue),
      insuredValue: certify.insuredValue === '' ? undefined : Number(certify.insuredValue),
      imageUrls: basic.imageUrls,
      videoUrl: certify.videoUrl || undefined,
      descriptionLong: certify.descriptionLong || undefined,
      careInstructions: certify.careInstructions || undefined,
      isPopular: certify.isPopular,
      isFeatured: basic.isFeatured,
      isBestSeller: certify.isBestSeller,
      isBridalCollection: certify.isBridalCollection,
      isFestivalSpecial: certify.isFestivalSpecial,
      gemstones: charges.gemstones.map((g: any) => ({
        type: g.type, count: Number(g.count || 0), caret: Number(g.caret || 0),
        quality: g.quality, color: g.color, clarity: g.clarity, cut: g.cut,
        shape: g.shape, origin: g.origin, isCertified: g.isCertified,
        certificateNumber: g.certificateNumber, ratePerCaret: g.ratePerCaret,
        totalValue: g.totalValue,
      })),
    });
  } catch (e) {
    await rollback(e);
  }

  return {
    productId,
    jewelryProfileId: profile.id,
    productName: product.name,
    itemCode: profile.itemCode,
    category: profile.category,
    metalType: profile.metalType,
    netWeight: profile.netWeight,
    gemstoneCount: charges.gemstones.length,
    hasHallmark: !!charges.hallmarkNumber.trim(),
    hasCertificate: certify.isCertified,
  };
}
