/**
 * Approve and invoice with the credit PIN step. The server answers per
 * order; orders over the credit limit or overdue come back with `needsPin`
 * and stay APPROVED. We then ask for the manager PIN once and send just
 * those orders again through /orders/invoice, which retries APPROVED orders.
 */

import { askManagerPin } from '@core/security/ManagerPin';
import { distributionApi, type ID, type InvoiceRun } from '../api/distribution.api';

export type RunResult = InvoiceRun['results'][number];

export async function approveOrInvoice(kind: 'approve' | 'invoice', ids: ID[]): Promise<{ results: RunResult[]; invoiced: number; failed: number; pinSkipped: boolean }> {
  const first = kind === 'approve' ? await distributionApi.approve(ids) : await distributionApi.invoice(ids);
  const byId = new Map(first.results.map((r) => [r.id, r]));
  let pinSkipped = false;
  if (first.needsPin) {
    const pinIds = first.results.filter((r) => r.needsPin).map((r) => r.id);
    const pin = await askManagerPin(`${pinIds.length} order credit limit se upar ya udhaar purana — Invoice`, 'credit');
    if (pin) {
      const again = await distributionApi.invoice(pinIds, pin);
      again.results.forEach((r) => byId.set(r.id, r));
    } else pinSkipped = true;
  }
  const results = ids.map((id) => byId.get(id)).filter(Boolean) as RunResult[];
  return { results, invoiced: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, pinSkipped };
}
