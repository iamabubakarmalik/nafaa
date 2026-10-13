/**
 * Sample bills for test prints and previews in settings (Hardware,
 * Printing, Payment QR). They go through the same receipt engine as real
 * bills, so a test shows exactly what a customer will get.
 */

import type { ReceiptDoc } from './types';

/** A short paid bill. */
export function sampleReceipt(): ReceiptDoc {
  return {
    saleNumber: 'TEST-001',
    date: new Date(),
    stamp: 'TEST',
    customerName: 'Ahmed Ali',
    cashierName: 'Counter 1',
    lines: [
      { name: 'Doodh 1 litre', qty: 2, unit: 'pcs', price: 220, total: 440 },
      { name: 'Double roti', qty: 1, unit: 'pcs', price: 180, total: 180 },
      { name: 'Chai patti 200g', qty: 1, unit: 'pcs', price: 650, total: 650, discount: 70 },
    ],
    subtotal: 1270,
    discount: 70,
    total: 1200,
    paid: 1500,
    paymentLabel: 'Cash',
  };
}

/** The same bill left partly unpaid, so payment details and the pay QR print. */
export function sampleDueReceipt(): ReceiptDoc {
  return { ...sampleReceipt(), paid: 200, paymentLabel: 'Udhaar (baqi)' };
}
