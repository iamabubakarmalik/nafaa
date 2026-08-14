import { apiClient } from '@core/api/client';

export interface SeedProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  tags: string[];
  unit: string;
  price: number;
  costPrice: number;
  wholesalePrice?: number;
  barcode?: string;
  imageUrl?: string;
  emoji?: string;
  description?: string;
  weight?: number;
  weightUnit?: string;
  alreadyExists: boolean;
}

export interface CatalogCategory {
  name: string;
  color: string;
  description: string;
  count: number;
}

export interface CatalogBrand {
  name: string;
  count: number;
}

export interface QuickSetupCatalog {
  catalog: SeedProduct[];
  categories: CatalogCategory[];
  brands: CatalogBrand[];
  total: number;
  alreadyImported: number;
}

export interface QuickSetupImportResult {
  message: string;
  imported: number;
  skipped: number;
  brandsCreated: number;
  categoriesCreated: number;
  tagsCreated: number;
  errorCount: number;
  errors: Array<{ name: string; error: string }>;
}

export interface PriceOverride {
  price?: number;
  costPrice?: number;
  stock?: number;
}

const unwrap = <T>(res: any): T => (res?.data?.data ?? res?.data) as T;

export const quickSetupApi = {
  async catalog(): Promise<QuickSetupCatalog> {
    const res = await apiClient.get('/products/quick-setup/catalog');
    return unwrap<QuickSetupCatalog>(res);
  },

  async import(
    catalogIds: string[],
    priceOverrides: Record<string, PriceOverride> = {},
    shopId?: string,
  ): Promise<QuickSetupImportResult> {
    const res = await apiClient.post('/products/quick-setup/import', {
      catalogIds,
      priceOverrides,
      shopId,
    });
    return unwrap<QuickSetupImportResult>(res);
  },
};