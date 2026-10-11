import { apiClient } from '@core/api/client';

export type UnitConversionType =
  | 'BASE' | 'PACK' | 'BOX' | 'DOZEN' | 'CARTON'
  | 'KG_TO_GRAM' | 'L_TO_ML' | 'CUSTOM';

export interface ProductUnit {
  id: string;
  productId: string;
  variantId?: string | null;
  unitName: string;
  unitLabel?: string | null;
  conversionType: UnitConversionType;
  conversionRate: number;
  isBase: boolean;
  isDefault: boolean;
  price: number;
  costPrice: number;
  wholesalePrice?: number | null;
  mrpPrice?: number | null;
  barcode?: string | null;
  sku?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const productUnitsApi = {
  create: (data: Partial<ProductUnit>) =>
    apiClient.post('/retail/product-units', data).then(unwrap<ProductUnit>),

  /** Poori dukaan ki units — POS scan ke liye ek dafa. */
  listAll: () =>
    apiClient.get('/retail/product-units').then(unwrap<ProductUnit[]>),

  byProduct: (productId: string, variantId?: string) =>
    apiClient
      .get('/retail/product-units/by-product/' + productId, {
        params: variantId ? { variantId } : {},
      })
      .then(unwrap<ProductUnit[]>),

  /** Scanner ka code → wohi unit (barcode ya SKU, dono chalte hain). */
  byBarcode: (barcode: string) =>
    apiClient
      .get('/retail/product-units/by-barcode/' + encodeURIComponent(barcode))
      .then(unwrap<ProductUnit & { product: any; variant?: any }>),

  /** Unit ka apna barcode bana do — dozen/carton ke label ke liye. */
  generateBarcode: (id: string) =>
    apiClient
      .post('/retail/product-units/' + id + '/generate-barcode')
      .then(unwrap<ProductUnit>),

  update: (id: string, data: Partial<ProductUnit>) =>
    apiClient.patch('/retail/product-units/' + id, data).then(unwrap<ProductUnit>),

  remove: (id: string) =>
    apiClient.delete('/retail/product-units/' + id).then(unwrap),

  convert: (fromUnitId: string, toUnitId: string, quantity: number) =>
    apiClient
      .post('/retail/product-units/convert', { fromUnitId, toUnitId, quantity })
      .then(unwrap<number>),
};
