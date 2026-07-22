import type { CreateProductPayload } from '@/api/products.api';
import type { ProductVariant } from '@/api/product-variants.api';

/**
 * Common props passed to every industry section component.
 * Sections can use any subset they need.
 */
export interface IndustrySectionProps {
  /** Product ID (only set when editing existing product) */
  productId?: string;

  /** Full product form state */
  form: CreateProductPayload;

  /** Setter for the form state (use for standard inventory fields) */
  setForm: (updater: (prev: CreateProductPayload) => CreateProductPayload) => void;

  /** True when editing existing product */
  isEdit: boolean;

  /** Loaded variants of this product */
  variants: ProductVariant[];

  /** Business type from useBusinessFeatures (e.g. CARPET, MOBILE) */
  businessType: string;

  /** Detected unit type — useful for further sub-classification */
  unit: string;
}

/**
 * Industry plugin definition.
 * Each industry registers itself with these capabilities.
 */
export interface IndustryPlugin {
  /** Unique key — usually equals businessType (CARPET, MOBILE, etc.) */
  key: string;

  /** Display label for badges and headers */
  label: string;

  /**
   * Detection function — given product + business context,
   * decides whether this plugin should handle the product.
   */
  matches: (ctx: {
    businessType: string;
    unit: string;
    features?: Record<string, any>;
  }) => boolean;

  /** Inventory tab section component (replaces standard "Current Stock") */
  InventorySection?: React.ComponentType<IndustrySectionProps>;

  /** Variants tab banner (optional warning / extra buttons) */
  VariantsBanner?: React.ComponentType<IndustrySectionProps>;

  /** Per-variant extra panel (under each variant card) */
  VariantExtraPanel?: React.ComponentType<IndustrySectionProps & { variant: ProductVariant }>;

  /** Side preview "Admin Info" stock block override */
  AdminStockBlock?: React.ComponentType<IndustrySectionProps>;

  /** Side preview "Customer Stock" block override (replaces variants grid) */
  CustomerStockBlock?: React.ComponentType<IndustrySectionProps>;

  /** Header quick-action bar (under main header) */
  HeaderActionBar?: React.ComponentType<IndustrySectionProps>;

  /** Inventory tab badge count (e.g. "5" rolls) */
  inventoryBadge?: (ctx: { productId?: string }) => number | null;
}
