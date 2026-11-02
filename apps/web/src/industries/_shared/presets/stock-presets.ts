/**
 * Industry stock presets: damage reasons and quick adjustment reasons that the
 * stock adjustment form offers as one-tap notes.
 */

import { t } from '@core/i18n';
export interface DamageReasonPreset {
  reason: string;
  emoji: string;
  category: 'DAMAGE' | 'LOSS' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
  color: string;
  severity?: 'minor' | 'major' | 'critical';
}

export interface IndustryStockPresets {
  damageReasons: DamageReasonPreset[];
  adjustmentReasons: string[];  // Quick-fill options
}

// ═══════════════════════════════════════════════════════════════
// 🧶 CARPET
// ═══════════════════════════════════════════════════════════════
export const CARPET_STOCK: IndustryStockPresets = {
  damageReasons: [
    { reason: t('Cutting Waste (unavoidable)'), emoji: '✂️', category: 'DAMAGE', color: '#f59e0b', severity: 'minor' },
    { reason: t('Water Damage'), emoji: '💧', category: 'DAMAGE', color: '#0ea5e9', severity: 'major' },
    { reason: t('Moth / Pest Damage'), emoji: '🪲', category: 'DAMAGE', color: '#a855f7', severity: 'major' },
    { reason: t('Fire / Burn Marks'), emoji: '🔥', category: 'DAMAGE', color: '#ef4444', severity: 'critical' },
    { reason: t('Stain (unremovable)'), emoji: '🎨', category: 'DAMAGE', color: '#8b5cf6', severity: 'major' },
    { reason: t('Frayed Edges'), emoji: '🧵', category: 'DAMAGE', color: '#f97316', severity: 'minor' },
    { reason: t('Colour Bleeding'), emoji: '🌈', category: 'DAMAGE', color: '#ec4899', severity: 'major' },
    { reason: t('Roll End Waste'), emoji: '📏', category: 'DAMAGE', color: '#78716c', severity: 'minor' },
    { reason: t('Warehouse Theft'), emoji: '🚨', category: 'LOSS', color: '#dc2626', severity: 'critical' },
    { reason: t('Sample / Display Cutoff'), emoji: '📖', category: 'ADJUSTMENT_OUT', color: '#8b5cf6' },
    { reason: t('Counting Correction (found extra)'), emoji: '➕', category: 'ADJUSTMENT_IN', color: '#22c55e' },
    { reason: t('Opening Stock Entry'), emoji: '📦', category: 'ADJUSTMENT_IN', color: '#3b82f6' },
  ],
  adjustmentReasons: [
    t('Cutting waste correction'),
    t('Roll leftover recorded'),
    t('Opening balance entry'),
    t('Physical count adjustment'),
    t('Sample piece taken out'),
    t('Damaged section removed'),
    t('Return from customer'),
    t('Warehouse audit correction'),
  ],
};

// ═══════════════════════════════════════════════════════════════
// 📱 MOBILE
// ═══════════════════════════════════════════════════════════════
export const MOBILE_STOCK: IndustryStockPresets = {
  damageReasons: [
    { reason: t('Screen Crack / Damage'), emoji: '📱', category: 'DAMAGE', color: '#ef4444', severity: 'major' },
    { reason: t('Water Damage'), emoji: '💧', category: 'DAMAGE', color: '#0ea5e9', severity: 'critical' },
    { reason: t('Battery Swollen'), emoji: '🔋', category: 'DAMAGE', color: '#f59e0b', severity: 'major' },
    { reason: t('Motherboard Fault'), emoji: '⚡', category: 'DAMAGE', color: '#dc2626', severity: 'critical' },
    { reason: t('Physical Drop Damage'), emoji: '💥', category: 'DAMAGE', color: '#ef4444', severity: 'major' },
    { reason: t('IMEI Tampered'), emoji: '🔒', category: 'DAMAGE', color: '#a855f7', severity: 'critical' },
    { reason: t('PTA Block'), emoji: '🚫', category: 'LOSS', color: '#dc2626', severity: 'critical' },
    { reason: t('Shop Theft'), emoji: '🚨', category: 'LOSS', color: '#dc2626', severity: 'critical' },
    { reason: t('Warranty Return (Manufacturer)'), emoji: '🔄', category: 'ADJUSTMENT_OUT', color: '#3b82f6' },
    { reason: t('Repair Test Unit'), emoji: '🔧', category: 'ADJUSTMENT_OUT', color: '#f59e0b' },
    { reason: t('Trade-in Received'), emoji: '📥', category: 'ADJUSTMENT_IN', color: '#22c55e' },
    { reason: t('Counting Correction'), emoji: '✅', category: 'ADJUSTMENT_IN', color: '#22c55e' },
  ],
  adjustmentReasons: [
    t('IMEI counting correction'),
    t('Trade-in phone added'),
    t('Repair test unit'),
    t('Damaged in transport'),
    t('Warranty replacement'),
    t('PTA block detected'),
    t('Display model change'),
    t('Refurbished unit added'),
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🍽️ RESTAURANT
// ═══════════════════════════════════════════════════════════════
export const RESTAURANT_STOCK: IndustryStockPresets = {
  damageReasons: [
    { reason: t('Expired / Spoiled'), emoji: '🗑️', category: 'DAMAGE', color: '#ef4444', severity: 'major' },
    { reason: t('Kitchen Waste'), emoji: '🍽️', category: 'DAMAGE', color: '#f59e0b', severity: 'minor' },
    { reason: t('Burnt / Overcooked'), emoji: '🔥', category: 'DAMAGE', color: '#dc2626', severity: 'major' },
    { reason: t('Freezer Breakdown'), emoji: '❄️', category: 'DAMAGE', color: '#0ea5e9', severity: 'critical' },
    { reason: t('Contamination'), emoji: '⚠️', category: 'DAMAGE', color: '#f97316', severity: 'critical' },
    { reason: t('Insect / Pest Issue'), emoji: '🪲', category: 'DAMAGE', color: '#a855f7', severity: 'major' },
    { reason: t('Staff Meal'), emoji: '👨‍🍳', category: 'ADJUSTMENT_OUT', color: '#8b5cf6' },
    { reason: t('Complimentary Serve'), emoji: '🎁', category: 'ADJUSTMENT_OUT', color: '#ec4899' },
    { reason: t('Recipe Test / R&D'), emoji: '🧪', category: 'ADJUSTMENT_OUT', color: '#3b82f6' },
    { reason: t('Fresh Delivery Received'), emoji: '🚚', category: 'ADJUSTMENT_IN', color: '#22c55e' },
    { reason: t('Portion Correction'), emoji: '⚖️', category: 'ADJUSTMENT_IN', color: '#84cc16' },
  ],
  adjustmentReasons: [
    t('Expired batch removed'),
    t('Staff meal deduction'),
    t('Complimentary serving'),
    t('Kitchen prep waste'),
    t('Recipe test batch'),
    t('Fresh delivery received'),
    t('Freezer damage loss'),
    t('Portion size correction'),
  ],
};

// ═══════════════════════════════════════════════════════════════
// 💎 JEWELRY
// ═══════════════════════════════════════════════════════════════
export const JEWELRY_STOCK: IndustryStockPresets = {
  damageReasons: [
    { reason: t('Setting Loose / Stone Fall'), emoji: '💎', category: 'DAMAGE', color: '#f59e0b', severity: 'major' },
    { reason: t('Melting Loss (in refining)'), emoji: '🔥', category: 'ADJUSTMENT_OUT', color: '#dc2626' },
    { reason: t('Polishing Wear'), emoji: '✨', category: 'DAMAGE', color: '#a855f7', severity: 'minor' },
    { reason: t('Scratch / Dent'), emoji: '⚡', category: 'DAMAGE', color: '#f97316', severity: 'minor' },
    { reason: t('Broken Chain / Clasp'), emoji: '⛓️', category: 'DAMAGE', color: '#ef4444', severity: 'major' },
    { reason: t('Vault Audit Difference'), emoji: '🔐', category: 'ADJUSTMENT_OUT', color: '#dc2626' },
    { reason: t('Theft / Robbery'), emoji: '🚨', category: 'LOSS', color: '#dc2626', severity: 'critical' },
    { reason: t('Karigar Repair'), emoji: '👨‍🎨', category: 'ADJUSTMENT_OUT', color: '#8b5cf6' },
    { reason: t('Melting for Rework'), emoji: '🔨', category: 'ADJUSTMENT_OUT', color: '#f59e0b' },
    { reason: t('New Design Received'), emoji: '🆕', category: 'ADJUSTMENT_IN', color: '#22c55e' },
    { reason: t('Customer Exchange (old)'), emoji: '🔄', category: 'ADJUSTMENT_IN', color: '#3b82f6' },
  ],
  adjustmentReasons: [
    t('Melting refining loss'),
    t('Karigar repair sent'),
    t('Design rework melted'),
    t('Customer exchange in'),
    t('Vault audit adjustment'),
    t('Polish wear correction'),
    t('Weight recalibration'),
    t('Insurance claim processed'),
  ],
};

// ═══════════════════════════════════════════════════════════════
// 💊 PHARMACY
// ═══════════════════════════════════════════════════════════════
export const PHARMACY_STOCK: IndustryStockPresets = {
  damageReasons: [
    { reason: t('Expired Medicine'), emoji: '⏰', category: 'LOSS', color: '#ef4444', severity: 'major' },
    { reason: t('Broken Bottle / Blister'), emoji: '💊', category: 'DAMAGE', color: '#f59e0b', severity: 'minor' },
    { reason: t('Cold Chain Breakdown'), emoji: '❄️', category: 'DAMAGE', color: '#0ea5e9', severity: 'critical' },
    { reason: t('DRAP Recall'), emoji: '🚫', category: 'LOSS', color: '#dc2626', severity: 'critical' },
    { reason: t('Damaged in Transit'), emoji: '📦', category: 'DAMAGE', color: '#8b5cf6', severity: 'major' },
    { reason: t('Sample to Doctor'), emoji: '👨‍⚕️', category: 'ADJUSTMENT_OUT', color: '#3b82f6' },
    { reason: t('Charity Donation'), emoji: '🤲', category: 'ADJUSTMENT_OUT', color: '#22c55e' },
    { reason: t('Batch Recall Returned'), emoji: '↩️', category: 'ADJUSTMENT_OUT', color: '#f97316' },
    { reason: t('Distributor Delivery'), emoji: '🚚', category: 'ADJUSTMENT_IN', color: '#22c55e' },
    { reason: t('Wholesale Return In'), emoji: '📥', category: 'ADJUSTMENT_IN', color: '#84cc16' },
  ],
  adjustmentReasons: [
    t('Expired batch removed'),
    t('Cold chain damage'),
    t('Doctor sample given'),
    t('Charity donation'),
    t('DRAP recall'),
    t('Distributor delivery'),
    t('Batch inspection loss'),
    t('Compounding waste'),
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🚗 AUTO PARTS
// ═══════════════════════════════════════════════════════════════
export const AUTOPARTS_STOCK: IndustryStockPresets = {
  damageReasons: [
    { reason: t('Rust / Corrosion'), emoji: '🦀', category: 'DAMAGE', color: '#f97316', severity: 'major' },
    { reason: t('Wrong Fit / Return'), emoji: '↩️', category: 'ADJUSTMENT_OUT', color: '#3b82f6' },
    { reason: t('Manufacturing Defect'), emoji: '⚠️', category: 'DAMAGE', color: '#dc2626', severity: 'major' },
    { reason: t('Damaged in Fitting'), emoji: '🔧', category: 'DAMAGE', color: '#f59e0b', severity: 'minor' },
    { reason: t('Warranty Return to Supplier'), emoji: '🔄', category: 'ADJUSTMENT_OUT', color: '#8b5cf6' },
    { reason: t('Workshop Test Fit'), emoji: '⚙️', category: 'ADJUSTMENT_OUT', color: '#ec4899' },
    { reason: t('New Stock Received'), emoji: '📦', category: 'ADJUSTMENT_IN', color: '#22c55e' },
    { reason: t('Old Part Traded In'), emoji: '♻️', category: 'ADJUSTMENT_IN', color: '#84cc16' },
  ],
  adjustmentReasons: [
    t('Wrong fit returned'),
    t('Warranty return'),
    t('Test fit damage'),
    t('New stock in'),
    t('Old part trade-in'),
    t('Workshop damage'),
    t('Rust damage removed'),
  ],
};

// ═══════════════════════════════════════════════════════════════
// 👗 GARMENTS
// ═══════════════════════════════════════════════════════════════
export const GARMENTS_STOCK: IndustryStockPresets = {
  damageReasons: [
    { reason: t('Fabric Tear'), emoji: '🧵', category: 'DAMAGE', color: '#ef4444', severity: 'major' },
    { reason: t('Colour Fading'), emoji: '🌈', category: 'DAMAGE', color: '#f59e0b', severity: 'minor' },
    { reason: t('Stitching Defect'), emoji: '🪡', category: 'DAMAGE', color: '#8b5cf6', severity: 'minor' },
    { reason: t('Stain (unremovable)'), emoji: '🎨', category: 'DAMAGE', color: '#a855f7', severity: 'major' },
    { reason: t('Moth Damage'), emoji: '🪲', category: 'DAMAGE', color: '#dc2626', severity: 'major' },
    { reason: t('Sample / Display Piece'), emoji: '👗', category: 'ADJUSTMENT_OUT', color: '#ec4899' },
    { reason: t('Alteration Test Cut'), emoji: '✂️', category: 'ADJUSTMENT_OUT', color: '#3b82f6' },
    { reason: t('New Collection Received'), emoji: '📦', category: 'ADJUSTMENT_IN', color: '#22c55e' },
  ],
  adjustmentReasons: [
    t('Sample piece taken'),
    t('Display damage'),
    t('Alteration cutoff'),
    t('Fabric moth damage'),
    t('New collection in'),
    t('Stain damage removed'),
    t('Size exchange'),
  ],
};

// ═══════════════════════════════════════════════════════════════
// GENERIC FALLBACK
// ═══════════════════════════════════════════════════════════════
export const GENERIC_STOCK: IndustryStockPresets = {
  damageReasons: [
    { reason: t('Physical Damage'), emoji: '💥', category: 'DAMAGE', color: '#ef4444', severity: 'major' },
    { reason: t('Water Damage'), emoji: '💧', category: 'DAMAGE', color: '#0ea5e9', severity: 'major' },
    { reason: t('Expired'), emoji: '⏰', category: 'LOSS', color: '#f59e0b', severity: 'major' },
    { reason: t('Theft / Shoplifting'), emoji: '🚨', category: 'LOSS', color: '#dc2626', severity: 'critical' },
    { reason: t('Sample / Giveaway'), emoji: '🎁', category: 'ADJUSTMENT_OUT', color: '#ec4899' },
    { reason: t('Counting Correction'), emoji: '✅', category: 'ADJUSTMENT_IN', color: '#22c55e' },
    { reason: t('Opening Balance'), emoji: '📦', category: 'ADJUSTMENT_IN', color: '#3b82f6' },
    { reason: t('Return In'), emoji: '↩️', category: 'ADJUSTMENT_IN', color: '#84cc16' },
  ],
  adjustmentReasons: [
    t('Counting correction'),
    t('Opening balance'),
    t('Damaged goods'),
    t('Physical count'),
    t('Return received'),
    t('Sample given'),
    t('Promotional giveaway'),
  ],
};

// ═══════════════════════════════════════════════════════════════
// MASTER MAP
// ═══════════════════════════════════════════════════════════════
export const INDUSTRY_STOCK_PRESETS: Record<string, IndustryStockPresets> = {
  carpet: CARPET_STOCK,
  mobile: MOBILE_STOCK,
  restaurant: RESTAURANT_STOCK,
  jewelry: JEWELRY_STOCK,
  autoparts: AUTOPARTS_STOCK,
  pharmacy: PHARMACY_STOCK,
  garments: GARMENTS_STOCK,
};

export function getIndustryStockPresets(industryId?: string | null): IndustryStockPresets {
  if (industryId && INDUSTRY_STOCK_PRESETS[industryId]) {
    return INDUSTRY_STOCK_PRESETS[industryId];
  }
  return GENERIC_STOCK;
}
