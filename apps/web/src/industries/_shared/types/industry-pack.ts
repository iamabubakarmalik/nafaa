/**
 * Industry Pack — the contract every industry plugin must implement.
 *
 * An IndustryPack is a self-contained bundle that extends the core app:
 *   • Navigation items (sidebar section)
 *   • Routes (pages)
 *   • Dashboard override
 *   • POS extensions (mode bar, quick keys, item picker router, cart, checkout)
 *   • Product form extensions (unit options, extra fields, inventory, variants)
 *   • Customer form extensions
 *   • Sales list & receipt extensions (badges, meta sections, kitchen copy)
 *   • Reports & settings
 *
 * Rules:
 *   • Industry packs may depend on core/ and platform/ code.
 *   • Core/platform code MUST NOT import industry pack code directly.
 *   • Industry packs MUST NOT import each other.
 */

import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { AuthTenant } from '@core/stores/auth.store';

// ═══════════════════════════════════════════════════════════════
// Navigation
// ═══════════════════════════════════════════════════════════════

export interface IndustryNavItem {
  to: string;
  label: string;
  icon?: LucideIcon;
  badge?: string;
  permission?: string;
  featureFlag?: string;
}

export interface IndustryNavGroup {
  label: string;
  icon?: LucideIcon;
  emoji?: string;
  color?: string;
  items: IndustryNavItem[];
  /** Lower = higher in sidebar. Default 100. */
  order?: number;
}

// ═══════════════════════════════════════════════════════════════
// Routes
// ═══════════════════════════════════════════════════════════════

export interface IndustryRoute {
  path: string;
  element: ComponentType | LazyExoticComponent<ComponentType<any>>;
  permission?: string;
  protected?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// POS Extensions — everything the industry can add to core POS
// ═══════════════════════════════════════════════════════════════

export interface IndustryPosExtensions {
  /** Top bar above POS (Restaurant: Dine-in/Takeaway; Hotel: room checkout) */
  modeBar?: ComponentType<any>;

  /** Quick-keys / favorites bar shown above product grid (Retail: quick keys) */
  quickKeysBar?: ComponentType<{ onProductAdd: (product: any) => void; onComboAdd?: (combo: any) => void; shopId?: string }>;

  /** Alert / notification strip (Retail: low-stock alerts) */
  alerts?: ComponentType;

  /** Extra widget shown in each cart line (Restaurant: modifier picker) */
  cartLineExtension?: ComponentType<{ line: any; onChange: (patch: any) => void }>;

  /** Extra section in checkout panel (Hotel: attach to booking) */
  checkoutExtension?: ComponentType<{ cart: any; onChange: (patch: any) => void }>;

  /** Extra tab/section in search panel (Carpet: cut-piece picker) */
  searchExtension?: ComponentType;

  /**
   * Called when user clicks a product tile. Return true if industry handled
   * it (opened custom picker like carpet roll / IMEI). Return false to let
   * core handle it (variants / direct add).
   */
  productClickRouter?: (
    product: any,
    context: {
      openVariantPicker: (variants: any[]) => void;
      openCarpetRollPicker: (product: any, variant?: any) => void;
      openImeiPicker: (product: any, variant?: any) => void;
      addToCart: (product: any, variant: any | null) => void;
      toast: (msg: string) => void;
    },
  ) => boolean | Promise<boolean>;

  /** Extra floating action buttons in POS header (Carpet: cut-piece button) */
  headerActions?: ComponentType<{ onOpenCutPieces?: () => void }>;

  /** Extra service charges automatically added (Restaurant: 10% service) */
  autoServiceCharges?: (cart: any) => Array<{ label: string; amount: number }>;
}

// ═══════════════════════════════════════════════════════════════
// Product Form Extensions
// ═══════════════════════════════════════════════════════════════

export interface UnitOption {
  value: string;
  label: string;
  /** Emoji / icon hint */
  hint?: string;
  /** Group name in dropdown */
  group?: string;
}

export interface IndustryProductFormExtensions {
  /**
   * Unit options shown in the unit dropdown when this industry is active.
   * If provided, REPLACES core unit list. Otherwise core defaults apply.
   */
  unitOptions?: UnitOption[];

  /** Default unit when creating a new product */
  defaultUnit?: string;

  /** Extra fields section (Pharmacy: salt, schedule class; Mobile: PTA) */
  extraFields?: ComponentType<{ product: any; onChange: (patch: any) => void }>;

  /** Extra dimension / weight fields (Carpet: length×width) */
  dimensionsFields?: ComponentType<{ product: any; onChange: (patch: any) => void }>;

  /** Extra pricing rows (Carpet: per-sqft rate; Jewelry: making charge) */
  pricingExtension?: ComponentType<{ product: any; onChange: (patch: any) => void }>;

  /** Replaces the inventory section entirely (Carpet: rolls; Mobile: IMEI list) */
  inventorySection?: ComponentType<{ productId: string; product?: any }>;

  /** Extra content in each variant card (Mobile: IMEI list per variant) */
  variantExtension?: ComponentType<{ variant: any }>;

  /** Header banner shown at top of variant list */
  variantsBanner?: ComponentType;

  /** Extra tabs to inject into product form */
  extraTabs?: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    desc?: string;
    component: ComponentType<{ productId: string; product?: any }>;
    /** Only show in edit mode */
    editOnly?: boolean;
    /** Only show if this feature flag is enabled */
    featureFlag?: string;
  }>;

  /** Preview panel bottom section (Carpet: total sqft; Mobile: IMEI count) */
  previewAdminBlock?: ComponentType<{ product: any; variants?: any[] }>;

  /** Preview panel customer-facing block (Carpet: available sizes) */
  previewCustomerBlock?: ComponentType<{ product: any }>;
}

// ═══════════════════════════════════════════════════════════════
// Customer Form Extensions
// ═══════════════════════════════════════════════════════════════

export interface IndustryCustomerFormExtensions {
  extraFields?: ComponentType<{ customer: any; onChange: (patch: any) => void }>;
  detailSection?: ComponentType<{ customerId: string }>;
}

// ═══════════════════════════════════════════════════════════════
// Sales List & Receipt Extensions
// ═══════════════════════════════════════════════════════════════

export interface IndustrySalesExtensions {
  /** Badge shown next to sale number in list (Restaurant: table #, Mobile: IMEI count) */
  saleBadge?: ComponentType<{ sale: any }>;

  /** Badge shown next to each sale item chip (Carpet: roll #) */
  saleItemBadge?: ComponentType<{ item: any }>;
}

export interface IndustryReceiptExtensions {
  /** Meta section under header on receipt (Restaurant: table + mode + KOT #) */
  metaSection?: ComponentType<{ sale: any }>;

  /** Extra content under each item on receipt (Restaurant: modifiers) */
  itemDetails?: ComponentType<{ sale: any; item: any }>;

  /** Extra totals rows (Restaurant: service charge, tax, delivery, tip) */
  totalsExtension?: ComponentType<{ sale: any }>;

  /** Whole extra copy after main receipt (Restaurant: kitchen copy for print) */
  kitchenCopy?: ComponentType<{ sale: any }>;

  /** WhatsApp message builder — extra lines for the shared message */
  whatsappLines?: (sale: any) => string[];
}

// ═══════════════════════════════════════════════════════════════
// Reports
// ═══════════════════════════════════════════════════════════════

export interface IndustryReport {
  id: string;
  name: string;
  description?: string;
  icon?: LucideIcon;
  component: ComponentType;
  permission?: string;
}

// ═══════════════════════════════════════════════════════════════
// The Pack
// ═══════════════════════════════════════════════════════════════

export interface IndustryPack {
  // ── Identity ────────────────────────────────────────────────
  id: string;
  name: string;
  shortName?: string;
  emoji: string;
  themeColor: string;
  description?: string;

  // ── Detection ───────────────────────────────────────────────
  matches: (tenant: AuthTenant | null) => boolean;

  /**
   * Detection priority when multiple packs match the same tenant.
   * Higher = wins. Default 100.
   * Suggested: Carpet=90, Mobile=80, Restaurant=70, Retail=60, Standard=0
   */
  priority?: number;

  // ── Navigation ──────────────────────────────────────────────
  navGroups: IndustryNavGroup[];

  // ── Routes ──────────────────────────────────────────────────
  routes: IndustryRoute[];

  // ── Dashboard ───────────────────────────────────────────────
  dashboardComponent?: ComponentType;

  // ── Extensions ──────────────────────────────────────────────
  pos?: IndustryPosExtensions;
  productForm?: IndustryProductFormExtensions;
  customerForm?: IndustryCustomerFormExtensions;
  sales?: IndustrySalesExtensions;
  receipt?: IndustryReceiptExtensions;

  // ── Settings / Reports ──────────────────────────────────────
  settingsSection?: {
    id: string;
    label: string;
    icon?: LucideIcon;
    component: ComponentType;
  };
  reports?: IndustryReport[];

  // ── Feature Flags ───────────────────────────────────────────
  featureFlags?: Array<{
    key: string;
    label: string;
    description?: string;
    defaultEnabled?: boolean;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// Helper types for consumers
// ═══════════════════════════════════════════════════════════════

export type IndustryPackChildren = { children?: ReactNode };
