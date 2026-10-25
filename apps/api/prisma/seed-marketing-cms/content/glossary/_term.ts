/**
 * Shared builder for glossary terms. Each topic file lists its terms as
 * TermSpec objects; index.ts joins them and this builder turns each into a
 * GLOSSARY_TERM seed entry.
 *
 * Page layout (GlossaryTermTemplate): the one-sentence definition sits under
 * the H1 and again beside the Roman Urdu meaning, then the example, then the
 * body blocks. So the body never repeats the definition or the example: it
 * explains how the term works in a Pakistani business, how Nafaa handles it
 * (only with evidence) and, for tax and legal terms, the official source.
 */

import { richText, withIds } from '../../lib/blocks';
import type { EntryRef, SeedEntry } from '../../lib/types';
import type { Source } from '../../../../src/admin-marketing/cms/contract/cms-contract';

export const CHECKED_ON = '2026-10-26';
const NEW_ORIGIN = 'new (glossary expansion, 26 Oct 2026)';
const OLD_ORIGIN = 'apps/marketing/src/lib/data/glossary.ts';

export interface TermSpec {
  slug: string;
  term: string;
  /** One sentence, shown under the H1 (max 400 characters). */
  definition: string;
  definitionRomanUrdu: string;
  /** Markdown; a short worked example from a Pakistani business. */
  example: string;
  /** Markdown body: how it works, "In Nafaa" (with evidence), sources. */
  body: string;
  alsoKnownAs?: string[];
  related?: EntryRef[];
  /** Code files proving each Nafaa claim in the body. */
  evidence?: string[];
  /** Official sources (required for tax and legal terms). */
  sources?: Source[];
  /** True for terms carried over from the old marketing site. */
  imported?: boolean;
  dropped?: string[];
  needsOwner?: string[];
}

export function source(title: string, url: string, publisher: string): Source {
  return { title, url, publisher, accessedAt: CHECKED_ON };
}

/** Official sources reused across tax and legal terms (opened 26 Oct 2026 unless noted). */
export const SRC = {
  fbrPos: source('FBR: Point of Sale legal provisions', 'https://fbr.gov.pk/pos-legal-provisions/163085/163086', 'Federal Board of Revenue'),
  fbrTier1: source('FBR: Sales Tax General Order, Tier-1 retailers', 'https://fbr.gov.pk/sales-tax-general-order-tier-1/163085/173442', 'Federal Board of Revenue'),
  fbrPosVerify: source('FBR: POS invoice verification', 'https://fbr.gov.pk/pos-invoice-verification/163085/163142', 'Federal Board of Revenue'),
  fbrDi: source('FBR: Digital invoicing legal provisions', 'https://fbr.gov.pk/di-legal-provisions/173967/173968', 'Federal Board of Revenue'),
  fbrStBasics: source('FBR: Sales Tax Basics', 'https://fbr.gov.pk/sales-tax-basics/51148/101149', 'Federal Board of Revenue'),
  fbrActs: source('FBR: Acts, Rules and Ordinances', 'https://fbr.gov.pk/act-rules-ordinances/131226', 'Federal Board of Revenue'),
  fbrWht: source('FBR: Withholding tax rates', 'https://fbr.gov.pk/withholding-tax-rates/51147/81155', 'Federal Board of Revenue'),
  fbrAtl: source('FBR: Active Taxpayer List (Income Tax)', 'https://fbr.gov.pk/categ/active-taxpayer-list-income-tax/51147/30859/71167', 'Federal Board of Revenue'),
  fbrAtlSt: source('FBR: Active Taxpayer List (Sales Tax)', 'https://fbr.gov.pk/atl-sales-tax/163223', 'Federal Board of Revenue'),
  iris: source('FBR IRIS taxpayer portal', 'https://iris.fbr.gov.pk/public/txplogin.xhtml', 'Federal Board of Revenue'),
  pra: source('Punjab Revenue Authority', 'https://pra.punjab.gov.pk/', 'Punjab Revenue Authority'),
  praEims: source('PRA electronic invoice monitoring (e-IMS)', 'https://e.pra.punjab.gov.pk/public/eims.xhtml', 'Punjab Revenue Authority'),
  srb: source('Sindh Revenue Board', 'https://srb.gos.pk', 'Sindh Revenue Board'),
  kpra: source('Khyber Pakhtunkhwa Revenue Authority', 'https://kpra.kp.gov.pk', 'Khyber Pakhtunkhwa Revenue Authority'),
  dirbs: source('PTA Device Identification, Registration and Blocking System (DIRBS)', 'https://dirbs.pta.gov.pk/', 'Pakistan Telecommunication Authority'),
  drap: source('Drug Regulatory Authority of Pakistan', 'https://www.dra.gov.pk/', 'Drug Regulatory Authority of Pakistan'),
  /** The SBP site refuses automated fetches (HTTP 403); the page is SBP's public Raast page. */
  raast: source('State Bank of Pakistan: Raast', 'https://www.sbp.org.pk/dfs/Raast.html', 'State Bank of Pakistan'),
} as const;

/** Evidence paths (apps/web/src unless marked api). */
const W = 'apps/web/src';
export const EV = {
  pos: `${W}/modules/pos`,
  posShortcuts: `${W}/modules/pos/components/PosShortcutsOverlay.tsx`,
  posHold: `${W}/modules/pos/components/PosHoldCartsModal.tsx`,
  posSplit: `${W}/modules/pos/components/PosSplitTender.tsx`,
  posWeigh: `${W}/modules/pos/components/PosWeighModal.tsx`,
  posUnit: `${W}/modules/pos/components/PosUnitPickerModal.tsx`,
  posVariant: `${W}/modules/pos/components/VariantPicker.tsx`,
  posBatch: `${W}/modules/pos/components/PosBatchPicker.tsx`,
  posServiceCharges: `${W}/modules/pos/components/ServiceChargesPanel.tsx`,
  posDiscount: `${W}/modules/pos/components/PosDiscountModal.tsx`,
  khata: `${W}/modules/customers/khata`,
  customerForm: `${W}/modules/customers/customers/pages/CustomerFormPage.tsx`,
  loyalty: `${W}/modules/customers/loyalty/pages/LoyaltyPage.tsx`,
  cashRegister: `${W}/modules/finance/cash-register/pages/CashRegisterPage.tsx`,
  openShift: `${W}/modules/finance/cash-register/components/OpenShiftModal.tsx`,
  closeShift: `${W}/modules/finance/cash-register/components/CloseShiftModal.tsx`,
  denominations: `${W}/modules/finance/cash-register/components/DenominationCounter.tsx`,
  cashMove: `${W}/modules/finance/cash-register/components/CashMoveModal.tsx`,
  expenses: `${W}/modules/finance/expenses`,
  money: `${W}/modules/finance/money`,
  profitReport: `${W}/modules/finance/profit-report`,
  pnl: `${W}/modules/reports/pnl`,
  dayBook: `${W}/modules/reports/day-book`,
  purchaseEditor: `${W}/modules/purchasing/purchases/editor/PurchaseEditorPage.tsx`,
  purchasesApi: `${W}/modules/purchasing/purchases/api/purchases.api.ts`,
  purchasesService: 'apps/api/src/modules/purchasing/purchases/purchases.service.ts',
  supplierLedger: `${W}/modules/purchasing/suppliers/api/supplier-ledger.api.ts`,
  lowStock: `${W}/modules/inventory/low-stock/pages/LowStockPage.tsx`,
  reorder: `${W}/modules/inventory/low-stock/components/ReorderView.tsx`,
  stockCount: `${W}/modules/inventory/stock-adjustments/components/StockCountPanel.tsx`,
  adjustments: `${W}/modules/inventory/stock-adjustments/pages/StockAdjustmentsPage.tsx`,
  movements: `${W}/modules/inventory/stock-movements`,
  transfers: `${W}/modules/inventory/transfers/pages/TransfersPage.tsx`,
  damage: `${W}/modules/inventory/damage/pages/DamagePage.tsx`,
  combos: `${W}/modules/inventory/combos/pages/CombosPage.tsx`,
  units: `${W}/modules/inventory/product-units/pages/ProductUnitsPage.tsx`,
  labels: `${W}/modules/inventory/barcodes/components/LabelDesigner.tsx`,
  labelRender: `${W}/modules/inventory/barcodes/components/renderLabels.ts`,
  stockReport: `${W}/modules/inventory/stock-report`,
  variantCard: `${W}/modules/inventory/products/components/VariantCard.tsx`,
  priceStep: `${W}/modules/inventory/products/editor/coreSteps.tsx`,
  productImport: `${W}/modules/inventory/products/import`,
  returns: `${W}/modules/sales/returns/pages/ReturnsPage.tsx`,
  discounts: `${W}/modules/sales/discounts/pages/DiscountsPage.tsx`,
  receipt: `${W}/core/receipt`,
  payQr: `${W}/core/payments/payQr.ts`,
  emvQr: `${W}/core/payments/emvQr.ts`,
  hardware: `${W}/core/hardware/HardwarePage.tsx`,
  hardwareSettings: `${W}/core/hardware/settings.ts`,
  offline: `${W}/core/lib/offline/db.ts`,
  permissions: `${W}/core/lib/permissions.ts`,
  nav: `${W}/app/shell/navigation/nav-config.ts`,
  tax: `${W}/modules/tax/TaxPage.tsx`,
  taxMeta: `${W}/modules/tax/meta.ts`,
  taxPrint: `${W}/modules/tax/print.ts`,
  fbr: `${W}/integrations/fbr`,
  accounting: `${W}/integrations/accounting/AccountingPage.tsx`,
  cod: `${W}/integrations/online-orders/pages/CodPage.tsx`,
  blocklist: `${W}/integrations/online-orders/pages/BlocklistPage.tsx`,
  channels: `${W}/integrations/channels`,
  kotDisplay: `${W}/industries/restaurant/pages/KotDisplayPage.tsx`,
  stations: `${W}/industries/restaurant/pages/StationsPage.tsx`,
  tables: `${W}/industries/restaurant/pages/TablesLayoutPage.tsx`,
  recipes: `${W}/industries/restaurant/pages/RecipesPage.tsx`,
  modifiers: `${W}/industries/restaurant/pages/ModifiersPage.tsx`,
  orderDialogs: `${W}/industries/restaurant/components/OrderDialogs.tsx`,
  menuBoard: 'apps/api/src/industries/restaurant/menu-items/menu-board.service.ts',
  controlledLog: `${W}/industries/pharmacy/pages/ControlledLogPage.tsx`,
  salts: `${W}/industries/pharmacy/pages/SaltsPage.tsx`,
  prescriptions: `${W}/industries/pharmacy/pages/PrescriptionsPage.tsx`,
  expiring: `${W}/industries/pharmacy/pages/ExpiringPage.tsx`,
  pharmacyPos: `${W}/industries/pharmacy/pos/config.ts`,
  emiPlans: `${W}/industries/mobile/pages/EmiPlansPage.tsx`,
  imeiInventory: `${W}/industries/mobile/pages/GlobalImeiInventoryPage.tsx`,
  imeiApi: `${W}/industries/mobile/api/imei.api.ts`,
  mobileMeta: `${W}/industries/mobile/components/meta.ts`,
  layaway: `${W}/industries/garments/pages/LayawayPage.tsx`,
  quotations: `${W}/industries/hardware/pages/QuotationsPage.tsx`,
  challans: `${W}/industries/hardware/pages/DeliveriesPage.tsx`,
  production: `${W}/industries/bakery/pages/ProductionPage.tsx`,
  ingredients: `${W}/industries/bakery/pages/IngredientsPage.tsx`,
  serials: `${W}/industries/electronics/pages/SerialTrackingPage.tsx`,
  warrantyClaims: `${W}/industries/electronics/pages/WarrantyClaimsPage.tsx`,
  metalRates: `${W}/industries/jewelry/pages/MetalRatesPage.tsx`,
  jewelryMeta: `${W}/industries/jewelry/lib/meta.ts`,
} as const;

export function term(t: TermSpec, index: number): SeedEntry {
  const key = `GLOSSARY_TERM:${t.slug}`;
  const isLegal = (t.sources ?? []).length > 0;
  return {
    type: 'GLOSSARY_TERM',
    slug: t.slug,
    title: t.term,
    summary: t.definition,
    data: {
      term: t.term,
      definition: t.definition,
      definitionRomanUrdu: t.definitionRomanUrdu,
      example: t.example,
      alsoKnownAs: t.alsoKnownAs ?? [],
    },
    blocks: withIds(key, [richText(t.body)]),
    relations: (t.related ?? []).map((ref) => ({ ref, kind: 'RELATED' as const })),
    sortOrder: index + 1,
    origin: t.imported ? `${OLD_ORIGIN}#${t.slug} (expanded 26 Oct 2026)` : NEW_ORIGIN,
    evidence: t.evidence ?? [],
    ...(isLegal ? { sources: t.sources } : {}),
    factCheck: {
      checkedOn: CHECKED_ON,
      note: isLegal
        ? 'Rules and bodies checked against the official sources listed; no rates or thresholds quoted because they change with Finance Acts.'
        : t.evidence?.length
          ? 'Plain-language definition; every Nafaa claim checked against the evidence files.'
          : 'Plain-language definition; no Nafaa product claims.',
    },
    dropped: [
      ...(t.imported ? ['Urdu Nastaliq definition (replaced by Roman Urdu).', 'Letter and category fields (computed by the site).'] : []),
      ...(t.dropped ?? []),
    ],
    needsOwner: t.needsOwner ?? [],
  };
}
