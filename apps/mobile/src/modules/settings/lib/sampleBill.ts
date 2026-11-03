import type { ReceiptDoc } from '@/core/receipt';

/** A bill for previews and test prints; it goes through the same engine as a real one. */
export function sampleBill(): ReceiptDoc {
  return {
    saleNumber: 'NF-10234',
    date: new Date(),
    customerName: 'Ahmed Raza',
    customerPhone: '0300-1234567',
    cashierName: 'Bilal',
    lines: [
      { name: "Olper's Doodh 1L", qty: 2, unit: 'pcs', price: 290, total: 580 },
      { name: 'Dawn Bread Bari', qty: 1, unit: 'pcs', price: 180, total: 160, discount: 20 },
      { name: 'Samsung Galaxy A15', qty: 1, unit: 'pcs', price: 42000, total: 42000, details: ['IMEI 356789104523117', 'Warranty 12 mahine'] },
    ],
    subtotal: 42760,
    discount: 20,
    total: 42740,
    paid: 40000,
    paymentLabel: 'Cash',
    previousDue: 1500,
  };
}
