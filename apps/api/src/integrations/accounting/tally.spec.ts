import { dayBookCsv, ledgersUsed, mastersXml, mergeTallySettings, tallyVouchers, vouchersXml } from './tally';

const day = {
  sales: [
    { subtotal: 1000, discount: 100, total: 900, creditAmount: 0, paymentMethod: 'CASH', costOfGoods: 600 },
    { subtotal: 500, discount: 0, total: 500, creditAmount: 200, paymentMethod: 'JAZZCASH', costOfGoods: 300 },
  ],
  returns: [{ refundAmount: 150, refundMethod: 'CASH' }],
  collections: [{ amount: 250 }],
  expenses: [{ amount: 400, paymentMethod: 'CASH', categoryId: 'c1', categoryName: 'Bijli bill' }],
};

const bal = (lines: { side: string; amount: number }[]) =>
  Math.round(lines.reduce((t, l) => t + (l.side === 'debit' ? l.amount : -l.amount), 0) * 100) / 100;

describe('Tally export', () => {
  const s = mergeTallySettings({ includeCogs: true });

  it('har kaam ka apna voucher type, har voucher balanced', () => {
    const v = tallyVouchers('2026-09-30', day, s);
    expect(v.map((x) => `${x.kind}:${x.type}`)).toEqual(['sales:Sales', 'refund:Payment', 'receipt:Receipt', 'expense:Payment', 'cogs:Journal']);
    for (const x of v) expect(bal(x.lines)).toBe(0);
    const sale = v[0].lines;
    expect(sale).toEqual(expect.arrayContaining([
      expect.objectContaining({ accountId: 'Cash', side: 'debit', amount: 900 }),
      expect.objectContaining({ accountId: 'JazzCash Wallet', side: 'debit', amount: 300 }),
      expect.objectContaining({ accountId: 'Udhaar Customers (Nafaa)', side: 'debit', amount: 200 }),
      expect.objectContaining({ accountId: 'Discount Allowed', side: 'debit', amount: 100 }),
      expect.objectContaining({ accountId: 'Sales - Nafaa POS', side: 'credit', amount: 1500 }),
    ]));
    // Kharche ki category ka naam hi ledger
    expect(v[3].lines).toEqual(expect.arrayContaining([expect.objectContaining({ accountId: 'Bijli bill', side: 'debit', amount: 400 })]));
    // Cash/Bank Journal me nahi
    expect(v[4].lines.map((l) => l.accountId)).toEqual(['Cost of Goods Sold', 'Stock - Nafaa']);
  });

  it('XML: Tally ka sign qaida, pakki REMOTEID, escape', () => {
    const v = tallyVouchers('2026-09-30', day, mergeTallySettings({ mapping: { sales: 'Sales & Services' } }));
    const xml = vouchersXml('t1', v, mergeTallySettings({ companyName: 'Ali <Traders>' }));
    expect(xml).toContain('<SVCURRENTCOMPANY>Ali &lt;Traders&gt;</SVCURRENTCOMPANY>');
    expect(xml).toContain('REMOTEID="nafaa:t1:2026-09-30:sales" VCHTYPE="Sales"');
    expect(xml).toContain('<DATE>20260930</DATE>');
    expect(xml).toMatch(/<LEDGERNAME>Cash<\/LEDGERNAME>\s*<ISDEEMEDPOSITIVE>Yes<\/ISDEEMEDPOSITIVE>\s*<AMOUNT>-900\.00<\/AMOUNT>/);
    expect(xml).toMatch(/<LEDGERNAME>Sales &amp; Services<\/LEDGERNAME>\s*<ISDEEMEDPOSITIVE>No<\/ISDEEMEDPOSITIVE>\s*<AMOUNT>1500\.00<\/AMOUNT>/);
  });

  it('masters me sahi groups, CSV me har line', () => {
    const v = tallyVouchers('2026-09-30', day, s);
    const led = ledgersUsed(v, s);
    expect(led).toEqual(expect.arrayContaining([
      { name: 'Cash', group: 'Cash-in-Hand' }, { name: 'JazzCash Wallet', group: 'Bank Accounts' },
      { name: 'Udhaar Customers (Nafaa)', group: 'Sundry Debtors' }, { name: 'Bijli bill', group: 'Indirect Expenses' },
    ]));
    expect(mastersXml(led, s)).toContain('<PARENT>Cash-in-Hand</PARENT>');
    const csv = dayBookCsv(v);
    expect(csv.split('\r\n')).toHaveLength(1 + v.reduce((t, x) => t + x.lines.length, 0));
  });

  it('khali din = koi voucher nahi', () => {
    expect(tallyVouchers('2026-09-30', { sales: [], returns: [], collections: [], expenses: [] }, s)).toEqual([]);
  });
});
