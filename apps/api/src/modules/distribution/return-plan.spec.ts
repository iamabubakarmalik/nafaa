import { returnPlan } from './distribution.support';

describe('returnPlan (settlement and delivery report share it)', () => {
  const order = { orderNumber: 'SO-000001', items: [{ id: 'a', baseQty: 48, freeBaseQty: 2 }, { id: 'b', baseQty: 12, freeBaseQty: 0 }] };

  it('takes nothing back when delivered and everything when returned', () => {
    expect(returnPlan(order, 'DELIVERED', 500).size).toBe(0);
    const all = returnPlan(order, 'RETURNED', 0);
    expect(all.get('a')).toEqual({ paid: 48, free: 2, damaged: false });
    expect(all.get('b')).toEqual({ paid: 12, free: 0, damaged: false });
  });

  it('keeps only the lines that came back on a partial delivery', () => {
    const p = returnPlan(order, 'PARTIAL', 100, [{ orderItemId: 'a', returnBaseQty: 6, damaged: true }, { orderItemId: 'b', returnBaseQty: 0 }]);
    expect([...p.keys()]).toEqual(['a']);
    expect(p.get('a')).toEqual({ paid: 6, free: 0, damaged: true });
  });

  it('refuses what cannot have happened', () => {
    expect(() => returnPlan(order, 'RETURNED', 10)).toThrow(/cash nahi/);
    expect(() => returnPlan(order, 'PARTIAL', 0)).toThrow(/wapas aane wala maal/);
    expect(() => returnPlan(order, 'PARTIAL', 0, [{ orderItemId: 'a', returnBaseQty: 0 }])).toThrow(/kam se kam ek/);
    expect(() => returnPlan(order, 'PARTIAL', 0, [{ orderItemId: 'a', returnBaseQty: 49 }])).toThrow(/zyada/);
    expect(() => returnPlan(order, 'PARTIAL', 0, [{ orderItemId: 'x', returnBaseQty: 1 }])).toThrow(/Order ki nahi/);
  });
});
