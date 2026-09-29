import { addCartNeed, claimShopStock } from './stock-claim.helper';

describe('POS stock — minus me nahi jata', () => {
  const label = { item: 'Coca-Cola', shop: 'Main' };

  it('ek hi product do lines me: jor kar check (4 + 4 > 5)', () => {
    const want = new Map<string, number>();
    expect(addCartNeed(want, 'p1:null', 4, 5, label)).toBe(4);
    expect(() => addCartNeed(want, 'p1:null', 4, 5, label)).toThrow(/cart me kul: 8/);
  });

  it('alag products alag gine jate hain', () => {
    const want = new Map<string, number>();
    addCartNeed(want, 'p1:null', 5, 5, label);
    expect(addCartNeed(want, 'p2:null', 3, 3, label)).toBe(3);
  });

  function fakeTx(stock: number) {
    const row = { stock };
    return {
      row,
      shopStock: {
        // Postgres ki tarah: shart (stock >= qty) aur kami ek hi qadam me
        updateMany: async ({ where, data }: any) => {
          if (row.stock >= where.stock.gte) { row.stock -= data.stock.decrement; return { count: 1 }; }
          return { count: 0 };
        },
        findUnique: async () => ({ stock: row.stock }),
      },
    };
  }

  it('kaafi stock: ghata kar naya stock', async () => {
    const tx = fakeTx(5);
    expect(await claimShopStock(tx, 's1', 3, 'Main')).toBe(2);
  });

  it('do counter ek saath (race): doosra ruk jata hai, stock minus nahi', async () => {
    const tx = fakeTx(5);
    const results = await Promise.allSettled([claimShopStock(tx, 's1', 4, 'Main'), claimShopStock(tx, 's1', 4, 'Main')]);
    expect(results.filter((r) => r.status === 'fulfilled').length).toBe(1);
    expect(results.filter((r) => r.status === 'rejected').length).toBe(1);
    expect(tx.row.stock).toBe(1);
  });
});
