/** Furniture bills on the shared receipt: the bill's delivery (and assembly) job as a row under the header. */

import { registerReceiptIndustry } from '@/core/receipt';
import { jobRows } from '../_shared/trade/jobRows';
import { registerSaleJobs, type TradeJob } from '../_shared/trade/saleJobs';
import { deliveriesApi } from './api';

registerSaleJobs('furniture', async (saleId): Promise<TradeJob[]> => {
  const list = await deliveriesApi.forSale(saleId).catch(() => []);
  return (Array.isArray(list) ? list : []).map((x): TradeJob => ({
    kind: 'delivery', number: x.deliveryNumber, status: x.status, date: x.deliveredAt ?? x.scheduledDate, who: x.driverName, charge: x.totalCharge, fitting: x.requiresAssembly,
  }));
});

registerReceiptIndustry('furniture', (_doc, { sale, lang }) => {
  const rows = jobRows(sale, lang);
  return rows.length ? { infoRows: rows } : null;
});
