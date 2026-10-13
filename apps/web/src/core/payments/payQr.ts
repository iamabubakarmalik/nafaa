/**
 * The shop's payment QRs (Raast / bank, JazzCash, Easypaisa merchant QR):
 * API calls, the cached copy used when printing outside React, and helpers
 * that put the bill amount into a QR.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { qrWithAmount } from './emvQr';

export type QrMethod = 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';
export interface PayQr { method: QrMethod; label: string; payload: string; merchantName: string; scheme: string; amountInQr: boolean; printOnBill: boolean }

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

export const payQrApi = {
  list: () => apiClient.get('/pay-qr').then((r) => unwrap<PayQr[]>(r)),
  save: (qrs: Array<Pick<PayQr, 'method' | 'label' | 'payload' | 'amountInQr' | 'printOnBill'>>) => apiClient.put('/pay-qr', { qrs }).then((r) => unwrap<PayQr[]>(r)),
};

export const PAY_QR_KEY = ['pay-qr'];

/** Latest answer, for printing bills outside React (sync). */
let cache: PayQr[] = [];

/** Keeps the print cache in step after a save, without waiting for a refetch. */
export function rememberPayQrs(list: PayQr[]) {
  cache = list;
}

export const payQrQuery = {
  queryKey: PAY_QR_KEY,
  queryFn: async () => { const r = await payQrApi.list(); cache = r; return r; },
  staleTime: 10 * 60_000,
  retry: false,
};

export function usePayQrs() {
  const q = useQuery(payQrQuery);
  return q.data ?? cache;
}

/** That method's QR with the amount in it (or without, when the shop turned that off). */
export function qrFor(qrs: PayQr[], method: string, amount: number, bill?: string): { qr: PayQr; text: string } | null {
  const qr = qrs.find((x) => x.method === method);
  if (!qr || amount <= 0) return null;
  try { return { qr, text: qr.amountInQr ? qrWithAmount(qr.payload, amount, bill) : qr.payload }; } catch { return null; }
}

/** QR for the amount still due, printed on unpaid bills when the shop turned it on. */
export function billQr(due: number, saleNumber: string): { label: string; text: string } | null {
  if (due <= 0) return null;
  const qr = cache.find((x) => x.printOnBill && x.method === 'BANK_TRANSFER') ?? cache.find((x) => x.printOnBill);
  if (!qr) return null;
  const r = qrFor([qr], qr.method, due, saleNumber);
  return r ? { label: qr.label, text: r.text } : null;
}
