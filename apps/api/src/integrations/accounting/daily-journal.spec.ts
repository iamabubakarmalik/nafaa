import { buildDailyJournal } from './daily-journal';

const map = {
  sales: 'SALES', discounts: 'DISC', returns: 'RET', receivable: 'AR', cogs: 'COGS', inventory: 'INV',
  methods: { CASH: 'CASH', CARD: 'BANK', BANK_TRANSFER: 'BANK', JAZZCASH: 'JC', EASYPAISA: 'EP' },
  expenseDefault: 'EXP', expenseByCategory: { rent: 'RENT' },
};
const sum = (lines: any[], side: string) => Math.round(lines.filter((l) => l.side === side).reduce((s, l) => s + l.amount, 0) * 100) / 100;

describe('Daily journal', () => {
  it('sale + udhaar + discount + refund + wapsi + kharcha — balanced', () => {
    const j = buildDailyJournal({
      sales: [
        { subtotal: 1000, discount: 100, total: 900, creditAmount: 0, paymentMethod: 'CASH', costOfGoods: 600 },
        { subtotal: 500, discount: 0, total: 500, creditAmount: 200, paymentMethod: 'JAZZCASH', costOfGoods: 300 },
        { subtotal: 300, discount: 0, total: 300, creditAmount: 0, paymentMethod: 'CARD', costOfGoods: 100 },
      ],
      returns: [{ refundAmount: 150, refundMethod: 'CASH' }],
      collections: [{ amount: 250 }],
      expenses: [{ amount: 5000, paymentMethod: 'CASH', categoryId: 'rent', categoryName: 'Kiraya' }, { amount: 70, paymentMethod: 'CASH', categoryId: null, categoryName: null }],
    }, map, { includeCogs: true });
    expect(j.missing).toEqual([]);
    expect(sum(j.lines, 'debit')).toBe(sum(j.lines, 'credit'));
    const line = (a: string, s: string) => j.lines.find((l) => l.accountId === a && l.side === s)?.amount;
    expect(line('SALES', 'credit')).toBe(1800);      // 900+100 + 500 + 300
    expect(line('DISC', 'debit')).toBe(100);
    expect(line('AR', 'debit')).toBe(200);
    expect(line('AR', 'credit')).toBe(250);           // udhaar wapsi
    expect(line('JC', 'debit')).toBe(300);
    expect(line('BANK', 'debit')).toBe(300);
    expect(line('CASH', 'debit')).toBe(900 + 250);    // sale + wapsi
    expect(line('CASH', 'credit')).toBe(150 + 5070);  // refund + kharcha
    expect(line('RENT', 'debit')).toBe(5000);
    expect(line('EXP', 'debit')).toBe(70);
    expect(line('COGS', 'debit')).toBe(1000);
    expect(j.totals.bills).toBe(3);
  });

  it('account na chuna ho to missing me, ghalti nahi', () => {
    const j = buildDailyJournal({ sales: [{ subtotal: 100, discount: 0, total: 100, creditAmount: 0, paymentMethod: 'EASYPAISA', costOfGoods: 0 }], returns: [], collections: [], expenses: [] }, { sales: 'S' });
    expect(j.missing).toEqual(['Easypaisa ka account']);
  });

  it('khali din = koi line nahi', () => {
    expect(buildDailyJournal({ sales: [], returns: [], collections: [], expenses: [] }, map).lines).toEqual([]);
  });
});
