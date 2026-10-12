/**
 * Khata payment, credit and old-register entries that work without internet:
 * the request waits in the sync queue, and the saved customer balance and
 * khata entries update at once so lists and credit age stay right.
 */

import { db } from '@core/lib/offline/db';
import { LEDGER_CACHE_KEY } from '@core/lib/offline/offlineKhata';
import { queueGenericMutation } from '@core/lib/offline/syncEngine';
import { customerLedgerApi } from '@modules/customers/khata/api/customer-ledger.api';
import type { KhataAction } from './components/KhataActionModal';

const isNetFail = (e: unknown) => {
  const s = (e as { response?: { status?: number } })?.response?.status;
  return !navigator.onLine || !s || s === 408 || s >= 502;
};

const ENDPOINT: Record<KhataAction, string> = { payment: 'payment', udhaar: 'udhaar', opening: 'opening-balance' };

/** Runs the action online, or queues it and updates the saved data offline. Returns true when queued. */
export async function runKhataAction(action: KhataAction, customerId: string, amount: number, note?: string): Promise<boolean> {
  const payload = action === 'opening' ? { balance: amount, note } : { amount, note };
  try {
    if (action === 'payment') await customerLedgerApi.receivePayment(customerId, payload as { amount: number; note?: string });
    else if (action === 'udhaar') await customerLedgerApi.addUdhaar(customerId, payload as { amount: number; note?: string });
    else await customerLedgerApi.setOpeningBalance(customerId, payload as { balance: number; note?: string });
    return false;
  } catch (e) {
    if (!isNetFail(e)) throw e;
  }

  await queueGenericMutation({
    type: action === 'payment' ? 'PAYMENT_CUSTOMER' : 'CREATE_LEDGER',
    method: 'POST',
    endpoint: `/customer-ledger/${customerId}/${ENDPOINT[action]}`,
    payload,
  });

  const delta = action === 'payment' ? -amount : amount;
  const c = await db.customers.get(customerId);
  if (c) await db.customers.put({ ...c, balance: Number(c.balance ?? 0) + delta, _localDirty: true });
  const cache = await db.meta.get(LEDGER_CACHE_KEY);
  const all = (cache?.value ?? {}) as Record<string, { customer: unknown; ledgers: Array<Record<string, unknown>>; _cachedAt: number }>;
  const entry = all[customerId] ?? { customer: c, ledgers: [], _cachedAt: Date.now() };
  const balanceAfter = Number(c?.balance ?? 0) + delta;
  entry.ledgers = [{
    id: `local_${Date.now()}`, type: action === 'payment' ? 'PAYMENT_RECEIVED' : action === 'udhaar' ? 'ADJUSTMENT' : 'OPENING_BALANCE',
    amount: delta, balanceAfter, note: note ?? null, reference: 'Offline', createdAt: new Date().toISOString(),
  }, ...entry.ledgers];
  all[customerId] = entry;
  await db.meta.put({ key: LEDGER_CACHE_KEY, value: all, updatedAt: Date.now() });
  return true;
}
