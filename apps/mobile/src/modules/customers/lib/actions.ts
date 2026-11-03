/**
 * Khata and customer writes. Payments, credit and customer changes go through
 * the offline engine, so they work without internet and show at once; when
 * online we wait a moment for the server so the screen shows its answer.
 */

import { isOnline } from '@/core/net';
import { enqueueCustomerCreate, enqueueCustomerUpdate, enqueueKhataPayment, enqueueKhataUdhaar, offline, OfflineRuleError, type PaymentMethod } from '@/core/offline';
import { refreshCustomers } from './refresh';

async function settle(opId: string) {
  if (isOnline()) {
    try { await offline.outbox.waitFor(opId, 8000); } catch { /* it stays queued; the sync screen shows it */ }
  }
  refreshCustomers();
}

export const receivePayment = async (i: { customerId: string; amount: number; paymentMethod: PaymentMethod; note?: string }) => {
  const opId = await enqueueKhataPayment(i);
  await settle(opId);
};

export const giveCredit = async (i: { customerId: string; amount: number; note?: string }) => {
  const opId = await enqueueKhataUdhaar(i);
  await settle(opId);
};

export const createCustomer = async (input: Parameters<typeof enqueueCustomerCreate>[0]) => {
  const res = await enqueueCustomerCreate(input);
  await settle(res.opId);
  return res.customerId;
};

export const updateCustomer = async (id: string, patch: Parameters<typeof enqueueCustomerUpdate>[1]) => {
  const opId = await enqueueCustomerUpdate(id, patch);
  await settle(opId);
};

export { OfflineRuleError };
