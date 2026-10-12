/**
 * Links to the bill page. The bill's design is shop-wide (Settings → Raseed);
 * only the paper width is remembered per device, because each counter can
 * have a different printer.
 */

import { devicePaper } from '@core/receipt/setup';

export const receiptLink = (saleId: string, autoprint = false) => {
  const paper = devicePaper();
  const q = [paper && `paper=${paper}`, autoprint && 'autoprint=1'].filter(Boolean).join('&');
  return `/sales/${saleId}/receipt${q ? `?${q}` : ''}`;
};
