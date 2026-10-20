import { ProductCatalogService } from './product-catalog.service';

const day = 86_400_000;
const product = (id: string, over: Record<string, unknown> = {}) => ({
  id, name: id, sku: null, barcode: null, description: null, unit: 'pcs', price: 100, costPrice: 60, stock: 10,
  lowStockAlert: 5, categoryId: 'c1', brandId: null, isActive: true, isFeatured: false, hasVariants: false,
  expiryTracked: false, productType: null, createdAt: new Date('2026-01-01'), ...over,
});

function setup() {
  const products = [
    product('Atta', { stock: 20 }),
    product('Bread', { stock: 3 }),
    product('Cake', { stock: 0 }),
    product('Dates', { stock: 8, categoryId: null }),
  ];
  const groupBy = jest.fn((args: { _sum?: unknown }) => Promise.resolve(args._sum
    ? [{ productId: 'Atta', _sum: { quantity: 30, returnedQty: 0, total: 3000 } }, { productId: 'Bread', _sum: { quantity: 6, returnedQty: 1, total: 500 } }]
    : []));
  const prisma = {
    product: {
      count: jest.fn().mockResolvedValue(2),
      findMany: jest.fn((args: { where: { id?: unknown } }) => Promise.resolve(args.where.id
        ? (args.where.id as { in: string[] }).in.map((id) => ({ id, images: [], variants: [], _count: { variants: 0, batches: 0, productImeis: 0 } }))
        : products)),
    },
    shopStock: { findMany: jest.fn().mockResolvedValue([]) },
    saleItem: { groupBy },
    productBatch: { findMany: jest.fn().mockResolvedValue([{ productId: 'Bread', expiryDate: new Date(Date.now() + 2 * day), quantity: 3 }]) },
    productVariant: { findMany: jest.fn((args: unknown) => Promise.resolve(JSON.stringify(args).includes('8964') ? [{ productId: 'Cake' }] : [])) },
    category: { findMany: jest.fn().mockResolvedValue([{ id: 'c1', name: 'Grocery', color: '#000' }]) },
    brand: { findMany: jest.fn().mockResolvedValue([]) },
    tag: { findMany: jest.fn().mockResolvedValue([{ id: 'g1', name: 'Fresh', color: '#0f0' }]) },
    productTag: { findMany: jest.fn().mockResolvedValue([{ productId: 'Bread', tagId: 'g1' }]) },
    electronicsProductProfile: { findMany: jest.fn().mockResolvedValue([
      { productId: 'Atta', conditionType: 'BRAND_NEW', categoryType: null, warrantyMonths: 12, mrp: 90, modelNumber: 'X1', partNumber: null, brandId: null, requiresSerial: true, hasImei: false },
    ]) },
    electronicsSerialTracking: { groupBy: jest.fn().mockResolvedValue([{ productId: 'Atta', _count: { _all: 18 } }]) },
    bakeryProductProfile: { findMany: jest.fn().mockResolvedValue([]) },
    autoPartProfile: { findMany: jest.fn().mockResolvedValue([]) },
    productSalt: { findMany: jest.fn().mockResolvedValue([]) },
    pharmacyMedicine: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return new ProductCatalogService(prisma as never);
}

const user = { tenantId: 't1' } as never;

describe('ProductCatalogService.list', () => {
  it('counts stock tabs over the whole catalog and values stock at cost and sale price', async () => {
    const res = await setup().list(user, {});
    expect(res.tabs).toMatchObject({ all: 4, in: 3, low: 1, out: 1, dead: 1, expiring: 1 });
    expect(res.stats).toMatchObject({ products: 4, units: 31, costValue: 31 * 60, saleValue: 31 * 100, sold30: 35 });
    expect(res.categories.map((c) => c.id)).toEqual(['c1', 'none']);
  });

  it('sorts by 30-day sales and reports days of stock left', async () => {
    const res = await setup().list(user, { sort: 'bestSelling' });
    expect(res.items.map((i) => i.id).slice(0, 2)).toEqual(['Atta', 'Bread']);
    // Atta: 30 sold in 30 days = 1/day, 20 in stock = 20 days.
    expect(res.items[0].daysLeft).toBe(20);
  });

  it('search matches variant barcodes; stock filter narrows the list', async () => {
    const svc = setup();
    expect((await svc.list(user, { search: '8964' })).items.map((i) => i.id)).toEqual(['Cake']);
    expect((await svc.list(user, { stock: 'low' })).items.map((i) => i.id)).toEqual(['Bread']);
    await expect(svc.list(user, { sort: 'bogus' as never })).rejects.toThrow();
  });

  it('filters and flags on industry details: tags, serial mismatch, price over MRP', async () => {
    const svc = setup();
    expect((await svc.list(user, { tagId: 'g1' })).items.map((i) => i.id)).toEqual(['Bread']);
    const res = await svc.list(user, { serial: 'mismatch' });
    // Atta has 20 in stock but only 18 serials on the shelf.
    expect(res.items.map((i) => i.id)).toEqual(['Atta']);
    expect(res.facets.serial).toEqual({ tracked: 1, mismatch: 1 });
    expect(res.alerts.overMrp).toEqual([{ id: 'Atta', name: 'Atta', price: 100, mrp: 90 }]);
    expect((await svc.list(user, { search: 'x1' })).items.map((i) => i.id)).toEqual(['Atta']);
  });

  it('analytics groups value by category, finds dead stock and items running out', async () => {
    const res = await setup().analytics(user);
    expect(res.categories.map((c) => [c.id, c.units])).toEqual([['c1', 23], ['none', 8]]);
    expect(res.deadStock.map((d) => d.id)).toEqual(['Dates']);
    // Bread: 5 sold in 30 days, 3 left = 18 days, so it is not "running out" within a week.
    expect(res.runningOut).toEqual([]);
    expect(res.fix).toMatchObject({ noImage: 2, noCategory: 1 });
  });
});
