import { byAuthority, daysBetween, health, monthDays, monthlyReport, notSent, reportCsv } from './tax-reports';

const row = (o: Partial<any>) => ({ status: 'SUCCESS', kind: 'SALE', authority: 'PRA', shopId: 's1', saleValue: 1000, taxAmount: 160, totalAmount: 1160, taxRate: 16, day: '2026-10-01', createdAt: new Date('2026-10-01T10:00:00Z'), submittedAt: new Date('2026-10-01T10:00:02Z'), ...o });

describe('tax reports', () => {
  it('mahina: sirf kamyab, return minus, rate-wise', () => {
    const rows = [row({}), row({ kind: 'RETURN', saleValue: 100, taxAmount: 16, totalAmount: 116 }), row({ status: 'FAILED' }), row({ taxRate: 8, saleValue: 500, taxAmount: 40, totalAmount: 540, day: '2026-10-02' })];
    const r = monthlyReport(rows, monthDays('2026-10'));
    expect(r.daily).toHaveLength(31);
    expect(r.daily[0]).toMatchObject({ bills: 1, returns: 1, saleValue: 900, tax: 144, total: 1044 });
    expect(r.totals).toMatchObject({ bills: 2, returns: 1, tax: 184, total: 1584 });
    expect(r.byRate.map((x) => x.rate)).toEqual([16, 8]);
    expect(r.totals).toMatchObject({ grossValue: 1500, grossTax: 200, returnValue: 100, returnTax: 16 });
    expect(reportCsv(r, { authority: 'PRA', month: '2026-10', business: 'Ali' })).toContain('TOTAL,2,1,1400.00,184.00,1584.00');
    expect(notSent(rows)).toEqual({ bills: 1, value: 1000, tax: 160 });
  });
  it('har authority alag, khali authority bhi', () => {
    const days = daysBetween('2026-10-01', '2026-10-03');
    expect(days).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
    const a = byAuthority([row({}), row({ authority: 'SRB', taxAmount: 150 })], days, ['KPRA']);
    expect(a.map((x) => x.authority).sort()).toEqual(['KPRA', 'PRA', 'SRB']);
    expect(a.find((x) => x.authority === 'KPRA')?.totals.bills).toBe(0);
  });
  it('sehat', () => {
    expect(health([row({}), row({ status: 'FAILED' }), row({ status: 'PENDING' })])).toMatchObject({ success: 1, failed: 1, pending: 1, successRate: 50, avgSeconds: 2 });
  });
});
