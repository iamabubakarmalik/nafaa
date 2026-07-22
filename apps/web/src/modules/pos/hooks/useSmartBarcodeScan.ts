import { productsApi } from '@modules/inventory/products/api/products.api';
import { productUnitsApi } from '@industries/retail/api/product-units.api';
import { combosApi } from '@industries/retail/api/combos.api';

export interface SmartScanResult {
  type: 'product' | 'variant' | 'unit' | 'combo' | 'not_found';
  product?: any;
  variant?: any;
  unit?: any;
  combo?: any;
  suggestedPrice?: number;
  suggestedQty?: number;
}

/**
 * Universal barcode scanner:
 *   1. Try Product Unit barcode (multi-unit) → auto-select right unit
 *   2. Try Combo barcode
 *   3. Try Product/Variant barcode
 *   4. Fall back to SKU lookup
 */
export async function smartBarcodeScan(code: string): Promise<SmartScanResult> {
  const trimmed = code.trim();
  if (!trimmed) return { type: 'not_found' };

  // 1. Try product unit barcode (highest priority — this tells us which unit to sell at)
  try {
    const unit = await productUnitsApi.byBarcode(trimmed);
    if (unit) {
      return {
        type: 'unit',
        product: unit.product,
        variant: unit.variant,
        unit,
        suggestedPrice: unit.price,
        suggestedQty: 1,
      };
    }
  } catch {
    // Not a unit barcode, continue
  }

  // 2. Try combo barcode
  try {
    const allCombos = await combosApi.list({ status: 'ACTIVE' });
    const combo = allCombos.find((c) => c.barcode === trimmed);
    if (combo) {
      return {
        type: 'combo',
        combo,
        suggestedPrice: combo.comboPrice,
        suggestedQty: 1,
      };
    }
  } catch {
    // Continue
  }

  // 3. Try product/variant barcode (existing flow)
  try {
    const product = await productsApi.byBarcode(trimmed);
    if (product) {
      const matched = (product as any).matchedVariant;
      return {
        type: matched ? 'variant' : 'product',
        product,
        variant: matched,
        suggestedQty: 1,
      };
    }
  } catch {
    return { type: 'not_found' };
  }

  return { type: 'not_found' };
}
