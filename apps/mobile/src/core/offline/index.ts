/**
 * Offline engine: public entry. Import from '@/core/offline' only.
 * See README.md in this folder for how screens use it.
 */

import { requireEngine, syncNow as runSync } from './native/runtime';
import { onlineReason, requiresOnline, ONLINE_ONLY, type OnlineFeature } from './engine/rules';
import { t } from '@/core/i18n';
import type { CustomerSearch, ProductSearch, SalesQuery } from './engine/lookups';
import type { SaleInput } from './engine/rules';
import type * as Ops from './engine/ops';

export { startOfflineEngine, currentEngine, whenEngine, beforeLogout, dropUnsentAndWipe, useEngineStatus } from './native/runtime';
export {
  useProductSearch, useProduct, useCustomerSearch, useCustomer, useSalesHistory, useSale, useOutbox, useSyncIssues, useSyncNotes,
  useOfflineList, useOfflineManifest, useApiQuery,
} from './native/hooks';
export { useCachedNotice } from './native/queryPersist';
export { registerPrewarm, apiKey } from './native/prewarm';
export { rememberOfflineLogin, offlineLogin, hasOfflineLogin, offlineLoginPeople, forgetOfflineLogin, updateOfflineTokens } from './native/offlineAuth';
export { OfflineRuleError, ONLINE_ONLY, requiresOnline, type OnlineFeature, type RuleCode, type SaleInput, type SaleItemInput, type PaymentMethod, type SaleCheck, type SaleTotals } from './engine/rules';
export type {
  ProductRow, ProductDetail, VariantRow, PackRow, BarcodeHit, CustomerRow, SaleRow, SaleLine, OutboxItem, OpKind, OpStatus, IssueCode,
  SyncState, SyncProgress, SyncNote, PriceTier,
} from './engine/types';
export type { Manifest } from './engine/mirror';
export type { EngineStatus } from './engine/engine';
export type { RegisterState, HeldBill, CustomerInput, ExpenseInput, IncomeInput, PurchaseInput, ProductInput, ReturnInput, AdjustmentType } from './engine/ops';

/** Download changes and send waiting work now (pull-to-refresh, "Sync now"). `full` downloads everything again. */
export const syncNow = (opts: { full?: boolean } = {}) => runSync(opts);

/** Plain words for "this needs internet", to show next to the cached data. */
export function onlineNeededText(feature: OnlineFeature): string {
  return t('{{what}} needs internet. You are seeing the last saved data.', { what: onlineReason(feature, t) });
}

/**
 * Everything the screens need, without React. All functions wait for the
 * signed-in user's engine; they throw when nobody is signed in.
 */
export const offline = {
  syncNow,
  requiresOnline: (feature: OnlineFeature | string) => requiresOnline(feature),
  onlineOnly: ONLINE_ONLY,

  products: {
    search: async (q: ProductSearch = {}) => (await requireEngine()).products.search(q),
    byBarcode: async (code: string, shopId?: string | null) => (await requireEngine()).products.byCode(code, shopId),
    get: async (id: string, shopId?: string | null) => (await requireEngine()).products.get(id, shopId),
    stock: async (shopId: string, productId: string, variantId?: string | null) => (await requireEngine()).products.stock(shopId, productId, variantId),
    count: async () => (await requireEngine()).products.count(),
    countByCategory: async () => (await requireEngine()).products.countByCategory(),
  },
  customers: {
    search: async (q: CustomerSearch = {}) => (await requireEngine()).customers.search(q),
    get: async (id: string) => (await requireEngine()).customers.get(id),
  },
  sales: {
    list: async (q: SalesQuery = {}) => (await requireEngine()).sales.list(q),
    get: async (id: string) => (await requireEngine()).sales.get(id),
    /** Shop rules and stock check before checkout (problems to show, reasons that need a PIN, totals). */
    check: async (input: SaleInput, opts: { allowOversell?: boolean } = {}) => (await requireEngine()).sales.check(input, opts),
    totals: async (input: SaleInput) => (await requireEngine()).sales.totals(input),
  },
  lists: {
    get: async <T = Record<string, unknown>>(type: Parameters<Awaited<ReturnType<typeof requireEngine>>['lists']['get']>[0]) => (await requireEngine()).lists.get<T>(type),
  },
  manifest: async () => (await requireEngine()).manifest(),
  register: {
    state: async (shopId: string) => (await requireEngine()).register.state(shopId),
  },
  attendance: {
    today: async (day?: string) => (await requireEngine()).attendance.today(day),
  },
  heldBills: {
    save: async <T>(bill: { id?: string; label?: string; shopId?: string | null; data: T }) => (await requireEngine()).held.save(bill),
    list: async <T>(shopId?: string | null) => (await requireEngine()).held.list<T>(shopId),
    remove: async (id: string) => (await requireEngine()).held.remove(id),
  },
  outbox: {
    list: async () => (await requireEngine()).outbox.list(),
    /** Waits until a queued change is sent or becomes an issue (for "saving..." on screen when online). */
    waitFor: async (opId: string, timeoutMs?: number) => (await requireEngine()).outbox.waitFor(opId, timeoutMs),
  },
  issues: {
    list: async () => (await requireEngine()).issues.list(),
    retry: async (id: string, patch?: { body?: unknown }) => (await requireEngine()).issues.retry(id, patch),
    retryAll: async () => (await requireEngine()).issues.retryAll(),
    discard: async (id: string) => (await requireEngine()).issues.discard(id),
    useExistingCustomer: async (opId: string, customerId: string) => (await requireEngine()).issues.useExistingCustomer(opId, customerId),
  },
};

/* ───────────── typed operations ───────────── */

const e = () => requireEngine();

/** POS sale: cash, card, wallet, split, khata. Throws OfflineRuleError when a shop rule stops it. */
export const enqueueSale = async (input: SaleInput, opts: { allowOversell?: boolean } = {}) => (await e()).enqueue.sale(input, opts);
/** Cancel a bill: a pending one is removed on the phone; a synced one gets a void (PIN rule needs internet). */
export const enqueueVoid = async (saleId: string, input: { reason?: string; managerPin?: string } = {}) => (await e()).enqueue.void(saleId, input);
/** Return on a synced bill (the default refund PIN rule needs internet). */
export const enqueueReturn = async (input: Omit<Ops.ReturnInput, 'online'>) => (await e()).enqueue.return(input);
export const enqueueCustomerCreate = async (input: Ops.CustomerInput) => (await e()).enqueue.customerCreate(input);
export const enqueueCustomerUpdate = async (id: string, patch: Partial<Ops.CustomerInput>) => (await e()).enqueue.customerUpdate(id, patch);
export const enqueueKhataPayment = async (input: Parameters<typeof Ops.enqueueKhataPayment>[1]) => (await e()).enqueue.khataPayment(input);
export const enqueueKhataUdhaar = async (input: Parameters<typeof Ops.enqueueKhataUdhaar>[1]) => (await e()).enqueue.khataUdhaar(input);
export const enqueueExpense = async (input: Ops.ExpenseInput) => (await e()).enqueue.expense(input);
export const enqueueIncome = async (input: Ops.IncomeInput) => (await e()).enqueue.income(input);
export const enqueueStockAdjustment = async (input: Parameters<typeof Ops.enqueueStockAdjustment>[1]) => (await e()).enqueue.stockAdjustment(input);
export const enqueueDamage = async (input: Parameters<typeof Ops.enqueueDamage>[1]) => (await e()).enqueue.damage(input);
export const enqueuePurchase = async (input: Ops.PurchaseInput) => (await e()).enqueue.purchase(input);
export const enqueueProductCreate = async (input: Ops.ProductInput) => (await e()).enqueue.productCreate(input);
export const enqueueProductUpdate = async (id: string, patch: Partial<Ops.ProductInput>) => (await e()).enqueue.productUpdate(id, patch);
export const enqueuePriceChange = async (id: string, prices: { price?: number; wholesalePrice?: number | null; creditPrice?: number | null; costPrice?: number }) => (await e()).enqueue.priceChange(id, prices);
export const enqueueCheckIn = async (staffId: string, note?: string) => (await e()).enqueue.checkIn(staffId, note);
export const enqueueCheckOut = async (staffId: string, note?: string) => (await e()).enqueue.checkOut(staffId, note);
export const enqueueRegisterOpen = async (input: Parameters<typeof Ops.enqueueRegisterOpen>[1]) => (await e()).enqueue.registerOpen(input);
export const enqueueRegisterClose = async (input: Parameters<typeof Ops.enqueueRegisterClose>[1]) => (await e()).enqueue.registerClose(input);
export const enqueueCashMove = async (input: Parameters<typeof Ops.enqueueCashMove>[1]) => (await e()).enqueue.cashMove(input);
