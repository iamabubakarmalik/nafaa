/**
 * Shapes of the delivery app's endpoints (GET /distribution/delivery/today,
 * POST /distribution/delivery/sync) and of its local queue rows.
 */

import type { MoneyMethod } from '../../booker/core/types';

export type { MoneyMethod };
export type DeliveryOutcome = 'DELIVERED' | 'PARTIAL' | 'RETURNED';
export type SyncStatus = 'ok' | 'duplicate' | 'conflict' | 'error';

export interface ReturnLine { orderItemId: string; returnBaseQty?: number; returnFreeQty?: number; damaged?: boolean }

export interface InvoiceLine {
  orderItemId: string; productId: string; name: string | null; variantName: string | null; baseUnit: string;
  unitName: string | null; conversionRate: number; qty: number; baseQty: number; total: number; netPerBase: number;
  freeBaseQty: number; freeProductId: string | null; freeProductName: string | null;
}

export interface ServerReport {
  id: string; clientRef: string | null; outcome: DeliveryOutcome; lines: ReturnLine[]; cashCollected: number; method: MoneyMethod;
  returnReason: string | null; note: string | null; reportedAt: string; status: 'PENDING' | 'USED' | 'CHANGED';
}

export interface Invoice {
  orderId: string; orderNumber: string; saleId: string | null; saleNumber: string | null; stop: number; total: number;
  status: string; settled: boolean; deliveryStatus: DeliveryOutcome | null;
  customer: {
    id: string; name: string; businessName: string | null; phone: string | null; address: string | null; area: string | null; city: string | null;
    latitude: number | null; longitude: number | null; balance?: number;
  } | null;
  lines: InvoiceLine[];
  report: ServerReport | null;
}

export interface ServerRecovery { id: string; clientRef: string | null; customerId: string; amount: number; method: MoneyMethod; status: string; collectedAt: string }

export interface Sheet {
  id: string; number: string; date: string; status: string; dispatchedAt: string | null; shopName: string | null; routeName: string | null;
  driverName: string | null; vehicleNo: string | null; note: string | null; invoiceCount: number; totalValue: number;
  invoices: Invoice[]; recoveries: ServerRecovery[];
}

export interface Today {
  serverTime: string; today: string;
  me: { id: string; canCollect: boolean; canSeeBalance: boolean };
  sheets: Sheet[];
}

export interface ReportPayload {
  clientRef: string; orderId: string; outcome: DeliveryOutcome; lines?: ReturnLine[]; cashCollected?: number; method?: MoneyMethod;
  returnReason?: string; note?: string; reportedAt: string; latitude?: number; longitude?: number; accuracyM?: number;
}

export interface RecoveryPayload {
  clientRef: string; loadSheetId: string; customerId: string; amount: number; method?: MoneyMethod; reference?: string; note?: string;
  collectedAt: string; latitude?: number; longitude?: number;
}

export interface DeliverySyncResult { kind: 'report' | 'recovery'; clientRef: string | null; status: SyncStatus; id?: string; reason?: string; warnings?: string[] }
export interface DeliverySyncResponse { serverTime: string; results: DeliverySyncResult[]; counts: Record<SyncStatus, number> }

/** Local queue row of a report; the latest one per order is what the phone shows. */
export interface QueuedReport {
  clientRef: string; orderId: string; sheetId: string; customerId: string | null; payload: string; status: 'PENDING' | 'SYNCED' | 'CONFLICT';
  reason: string | null; attempts: number; createdAt: string; syncedAt: string | null;
}

export interface QueuedRecovery {
  clientRef: string; sheetId: string; customerId: string; amount: number; method: MoneyMethod; payload: string;
  status: 'PENDING' | 'SYNCED' | 'CONFLICT'; serverId: string | null; reason: string | null; attempts: number; createdAt: string;
}

export interface DeliveryIssue { id: number; kind: 'report' | 'recovery'; clientRef: string; orderId: string | null; title: string; reason: string; createdAt: string }
