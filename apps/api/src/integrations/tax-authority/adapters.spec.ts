import { kpraParse, kpraRequest, pkDateTime, praParse, praRequest, scaleLines, splitTax, srbParse, srbRequest } from './adapters';

const bill = {
  usin: 'S-000123', kind: 'SALE' as const, at: new Date('2026-09-30T10:00:00Z'), total: 1160, rate: 16, payment: 'CASH',
  buyer: { name: 'Ali', phone: '03001234567' },
  lines: [{ code: 'BRG', name: 'Burger', qty: 2, total: 800 }, { code: 'CK', name: 'Coke', qty: 2, total: 400 }],
  pctCode: '98012000', businessName: 'Ali Foods',
};

describe('tax authority adapters', () => {
  it('tax nikalna (qeemat tax samet) aur PKT waqt', () => {
    expect(splitTax(1160, 16)).toEqual({ value: 1000, tax: 160 });
    expect(pkDateTime(bill.at)).toBe('2026-09-30 15:00:00');
  });

  it('lines bill ke total ke barabar (discount baanta)', () => {
    const l = scaleLines(bill.lines, 1160);
    expect(l.reduce((t, x) => t + x.total, 0)).toBeCloseTo(1160, 2);
    expect(scaleLines([], 50)).toEqual([{ code: 'BILL', name: 'Bill', qty: 1, total: 50 }]);
  });

  it('PRA: PostData khane + jawab code 100', () => {
    const r = praRequest(bill, { posId: '123456', ntn: '1234567-8', token: 't' });
    expect(r).toMatchObject({ InvoiceNumber: '', POSID: 123456, USIN: 'S-000123', DateTime: '2026-09-30 15:00:00', TotalSaleValue: 1000, TotalTaxCharged: 160, TotalBillAmount: 1160, PaymentMode: 1, InvoiceType: 1 });
    expect(r.Items).toHaveLength(2);
    expect(r.Items[0]).toMatchObject({ PCTCode: '98012000', TaxRate: 16, InvoiceType: 1 });
    expect(praParse(200, { InvoiceNumber: '9000052011142444901', Code: '100', Response: 'ok' })).toMatchObject({ ok: true, fiscalNumber: '9000052011142444901' });
    expect(praParse(200, { Code: '401', Response: 'Unauthorized' })).toMatchObject({ ok: false, retry: false });
    expect(praParse(503, null)).toMatchObject({ ok: false, retry: true });
  });

  it('SRB: har khana maujood, khali = N/A, Test/Live', () => {
    const r = srbRequest({ ...bill, payment: 'JAZZCASH', rate: 15, total: 1150 }, { posId: '77', ntn: 'S123', user: 'u', pass: 'p' }, 'sandbox');
    const keys = ['posId', 'name', 'ntn', 'invoiceDateTime', 'invoiceType', 'invoiceId', 'rateValue', 'saleValue', 'taxAmount', 'discountAmount', 'netAmount', 'modeOfPay', 'consumerName', 'consumerNTN', 'consumerMobile', 'consumerEmail', 'address', 'cpcCode', 'extraInf', 'transType', 'pos_user', 'pos_pass'];
    expect(Object.keys(r).sort()).toEqual(keys.sort());
    expect(r).toMatchObject({ posId: 77, saleValue: 1000, taxAmount: 150, netAmount: 1150, modeOfPay: 'Card', consumerEmail: 'N/A', transType: 'Test' });
    expect(srbParse(200, { srbInvoiceId: '6742601T822', resCode: '00', QRCodeLink: 'https://apps.srb.gos.pk/x' })).toMatchObject({ ok: true, fiscalNumber: '6742601T822', qrText: 'https://apps.srb.gos.pk/x' });
  });

  it('KPRA: invoice + credit note + QR link', () => {
    const c = { posId: 'P1', ntn: '999', key: 'k' };
    expect(kpraRequest(bill, c)).toMatchObject({ ntn: '999', pos_id: 'P1', key: 'k', invoice_no: 'S-000123', amount: 1000, tax_amount: 160, total_amount: 1160, date_time: '2026-09-30 15:00:00', payment_mode: 1 });
    expect(kpraRequest({ ...bill, kind: 'RETURN', usin: 'R-1', refUsin: 'S-000123' }, c)).toMatchObject({ invoice_no: 'S-000123', credit_note_no: 'R-1' });
    expect(kpraParse(201, { status: 201, data: { transaction_id: 55 } }, c, 'S-000123')).toMatchObject({
      ok: true, fiscalNumber: '55', qrText: 'https://kpra.gov.pk/api/?pos_id=P1&invoice_no=S-000123',
    });
  });
});
