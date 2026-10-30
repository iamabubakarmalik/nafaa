/**
 * Service behaviour of the trade network with a mocked database: linking,
 * isolation between businesses, an order booked in the seller's books, a
 * delivery turned into the buyer's draft purchase, and payments that post
 * on the other side only when confirmed.
 */

import { NotFoundException } from '@nestjs/common';
import { linkFor } from './trade-network.support';
import { TradeLinksService } from './services/links.service';
import { TradeCatalogService } from './services/catalog.service';
import { TradeOrdersService } from './services/orders.service';
import { TradeSyncService } from './services/sync.service';
import { TradePaymentsService } from './services/payments.service';

const SELLER = 'tenant-seller';
const BUYER = 'tenant-buyer';
const OTHER = 'tenant-other';

const user = (tenantId: string, permissions: string[] = []) => ({ id: `u-${tenantId}`, sub: `u-${tenantId}`, tenantId, email: '', role: 'OWNER', shopId: null, permissions }) as never;
const staff = (tenantId: string, permissions: string[]) => ({ id: `s-${tenantId}`, sub: `s-${tenantId}`, tenantId, email: '', role: 'STAFF', shopId: null, permissions }) as never;

const baseLink = {
  id: 'L1', sellerTenantId: SELLER, buyerTenantId: BUYER, status: 'ACTIVE', requestedVia: 'CODE', requestedById: 'u-b', requestNote: null,
  requestedAt: new Date(), decidedById: 'u-s', decidedAt: new Date(), rejectReason: null, activatedAt: new Date('2026-10-01'), closedBy: null,
  customerId: 'C1', supplierId: 'S1', bookedById: 'u-s', autoReceive: false, receiveShopId: null, paymentsScanAt: null, createdAt: new Date(), updatedAt: new Date(),
};

/** findFirst that honours the party filter the way Postgres would. */
function linkTable(links: Array<typeof baseLink>) {
  return {
    findFirst: jest.fn(async ({ where }: any) => links.find((l) => l.id === where.id && (where.OR ?? []).some((o: any) => (o.sellerTenantId && o.sellerTenantId === l.sellerTenantId) || (o.buyerTenantId && o.buyerTenantId === l.buyerTenantId))) ?? null),
  };
}

const notifications = { create: jest.fn().mockResolvedValue({}) };
const openAccess = { read: jest.fn().mockResolvedValue({ enabled: true, planAllows: true, planName: 'Pro' }), assertOpen: jest.fn().mockResolvedValue(undefined) };

describe('isolation: linkFor', () => {
  const db = { tradeLink: linkTable([baseLink]) } as never;

  it('gives each party its own side', async () => {
    expect((await linkFor(db, SELLER, 'L1')).side).toBe('SELLER');
    expect((await linkFor(db, BUYER, 'L1')).side).toBe('BUYER');
  });
  it('hides the link from any other business', async () => {
    await expect(linkFor(db, OTHER, 'L1')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('refuses the wrong side as not found (no hint that it exists)', async () => {
    await expect(linkFor(db, BUYER, 'L1', 'SELLER')).rejects.toBeInstanceOf(NotFoundException);
    await expect(linkFor(db, SELLER, 'L1', 'BUYER')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('linking', () => {
  function setup(link = { ...baseLink, status: 'PENDING', customerId: null as string | null, supplierId: null as string | null }) {
    const created: any = { customer: [], supplier: [] };
    const tx = {
      customer: {
        findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(async ({ data }: any) => { created.customer.push(data); return { id: 'C-new' }; }),
        update: jest.fn().mockResolvedValue({}),
      },
      supplier: {
        findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(async ({ data }: any) => { created.supplier.push(data); return { id: 'S-new' }; }),
      },
      priceList: { findFirst: jest.fn(async ({ where }: any) => (where.tenantId === SELLER && where.id === 'PL1' ? { id: 'PL1' } : null)) },
      distRoute: { findFirst: jest.fn().mockResolvedValue(null) },
      tradeLink: { ...linkTable([link]), updateMany: jest.fn().mockResolvedValue({ count: 1 }), update: jest.fn() },
    };
    const prisma: any = {
      ...tx,
      $transaction: jest.fn((fn: any) => fn(tx)),
      tenant: { findMany: jest.fn(async () => [{ id: SELLER, name: 'Al-Noor Traders', phone: '0300-1111111', address: null, businessType: 'DISTRIBUTOR' }, { id: BUYER, name: 'Madina Kiryana', phone: '0321-2222222', address: 'Main bazar', businessType: 'GROCERY' }]) },
      tradeProfile: { findMany: jest.fn().mockResolvedValue([]) },
      tenantSettings: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'u-tenant-seller' }) },
    };
    const svc = new TradeLinksService(prisma, openAccess as never, notifications as never);
    jest.spyOn(svc, 'linkView').mockResolvedValue({ ok: true } as never);
    return { svc, prisma, tx, created };
  }

  it('on approval makes the buyer a customer of the seller and the seller a supplier of the buyer', async () => {
    const { svc, tx, created } = setup();
    await svc.approve(user(SELLER), 'L1', { priceListId: 'PL1', creditLimit: 50000, creditDays: 15 });
    expect(created.customer[0]).toMatchObject({ tenantId: SELLER, name: 'Madina Kiryana', phone: '0321-2222222' });
    expect(created.supplier[0]).toMatchObject({ tenantId: BUYER, name: 'Al-Noor Traders' });
    expect(tx.customer.update).toHaveBeenCalledWith({ where: { id: 'C-new' }, data: { priceListId: 'PL1', creditLimit: 50000, creditDays: 15 } });
    expect(tx.tradeLink.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'L1', status: 'PENDING' },
      data: expect.objectContaining({ status: 'ACTIVE', customerId: 'C-new', supplierId: 'S-new' }),
    }));
    expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: BUYER }));
  });

  it("refuses a price list that is not the seller's own", async () => {
    const { svc } = setup();
    await expect(svc.approve(user(SELLER), 'L1', { priceListId: 'PL-of-someone-else' })).rejects.toThrow('Price list nahi mili');
  });

  it('only the seller can approve', async () => {
    const { svc } = setup();
    await expect(svc.approve(user(BUYER), 'L1', {})).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.approve(user(OTHER), 'L1', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('matches an existing customer by phone instead of making a new one', async () => {
    const { svc, tx, created } = setup();
    tx.customer.findMany.mockResolvedValueOnce([{ id: 'C-old', name: 'Madina Store', phone: '+92 321 2222222', balance: 1200 }]);
    await svc.approve(user(SELLER), 'L1', {});
    expect(created.customer).toHaveLength(0);
    expect(tx.tradeLink.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ customerId: 'C-old' }) }));
  });
});

describe('catalog isolation', () => {
  it("never reads a seller's catalog through someone else's link", async () => {
    const prisma: any = { tradeLink: linkTable([baseLink]) };
    const svc = new TradeCatalogService(prisma, openAccess as never);
    await expect(svc.catalog(user(OTHER), 'L1', {})).rejects.toBeInstanceOf(NotFoundException);
    // The seller cannot shop from its own buyer link either.
    await expect(svc.catalog(user(SELLER), 'L1', {})).rejects.toBeInstanceOf(NotFoundException);
  });
  it('refuses a paused link and a seller with distribution off', async () => {
    const prisma: any = { tradeLink: linkTable([{ ...baseLink, status: 'PAUSED' }]) };
    await expect(new TradeCatalogService(prisma, openAccess as never).buyingLink(user(BUYER), 'L1')).rejects.toThrow('rok rakhe');
    const prisma2: any = { tradeLink: linkTable([baseLink]) };
    const off = { read: jest.fn().mockResolvedValue({ enabled: false, planAllows: true }) };
    await expect(new TradeCatalogService(prisma2, off as never).buyingLink(user(BUYER), 'L1')).rejects.toThrow('band');
  });
});

describe('placing an order', () => {
  it("books a distribution order in the seller's books as the seller, marked NETWORK", async () => {
    const prisma: any = {
      tradeOrder: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
      customer: { findFirst: jest.fn().mockResolvedValue({ id: 'C1', isActive: true }) },
      tradeProfile: { findUnique: jest.fn().mockResolvedValue({ minOrderValue: null }) },
      tenant: { findMany: jest.fn().mockResolvedValue([{ id: BUYER, name: 'Madina Kiryana', phone: null, address: null }]) },
      tenantSettings: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findFirst: jest.fn(async ({ where }: any) => ({ id: 'u-s', email: 's@x', role: 'OWNER', permissions: [], tenantId: where.tenantId })) },
      salesOrder: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    prisma.tradeProfile.findMany = jest.fn().mockResolvedValue([]);
    const catalog = {
      buyingLink: jest.fn().mockResolvedValue(baseLink),
      priceCart: jest.fn().mockResolvedValue({ lines: [{ productId: 'P1', variantId: null, unitId: 'U1', unitName: 'Carton', qty: 2, name: 'Tea' }], total: 2300, warnings: [] }),
    };
    const distOrders = { create: jest.fn().mockResolvedValue({ order: { id: 'SO1', orderNumber: 'SO-000010', total: 2300 }, duplicate: false, warnings: [] }) };
    const svc = new TradeOrdersService(prisma, distOrders as never, catalog as never, {} as never, notifications as never);
    jest.spyOn(svc, 'detail').mockResolvedValue({ id: 'T1' } as never);

    await svc.place(user(BUYER), { linkId: 'L1', items: [{ productId: 'P1', unitId: 'U1', qty: 2 }] } as never);

    const [actor, dto] = distOrders.create.mock.calls[0];
    expect(actor.tenantId).toBe(SELLER);
    expect(dto).toMatchObject({ customerId: 'C1', items: [{ productId: 'P1', unitId: 'U1', qty: 2, variantId: null }] });
    expect(dto.clientRef).toMatch(/^tn-/);
    expect(dto.items[0]).not.toHaveProperty('price');
    expect(prisma.salesOrder.updateMany).toHaveBeenCalledWith({ where: { id: 'SO1', tenantId: SELLER }, data: { source: 'NETWORK' } });
    expect(prisma.tradeOrder.create.mock.calls[0][0].data).toMatchObject({ buyerTenantId: BUYER, sellerTenantId: SELLER, salesOrderId: 'SO1', status: 'BOOKED' });
    expect(notifications.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId: SELLER, title: 'Nafaa par naya Order' }));
  });

  it('lets the buyer take back only an order the seller has not approved', async () => {
    const prisma: any = {
      tradeOrder: { findFirst: jest.fn().mockResolvedValue({ id: 'T1', salesOrderId: 'SO1', sellerTenantId: SELLER, buyerTenantId: BUYER }), update: jest.fn() },
      salesOrder: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const svc = new TradeOrdersService(prisma, {} as never, {} as never, {} as never, notifications as never);
    await expect(svc.cancel(user(BUYER), 'T1')).rejects.toThrow('approve kar chuka');
    expect(prisma.salesOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'SO1', tenantId: SELLER, status: 'BOOKED' } }));
    expect(prisma.tradeOrder.update).not.toHaveBeenCalled();
  });
});

describe('delivery to draft purchase', () => {
  function setup(soStatus: string, items: any[], opts: { maps?: Record<string, string>; autoReceive?: boolean } = {}) {
    const order = {
      id: 'T1', linkId: 'L1', buyerTenantId: BUYER, sellerTenantId: SELLER, salesOrderId: 'SO1', orderNumber: 'SO-000010', placedById: 'u-b',
      status: soStatus, receiveState: 'NONE', purchaseId: null, deliveredValue: null as number | null, invoiceNumber: 'INV-9', link: { ...baseLink, autoReceive: !!opts.autoReceive },
    };
    const updates: any[] = [];
    const prisma: any = {
      tradeOrder: {
        findUnique: jest.fn(async () => order),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(async ({ data }: any) => { updates.push(data); Object.assign(order, data); return order; }),
      },
      salesOrder: { findFirst: jest.fn(async ({ where }: any) => (where.tenantId === SELLER ? { id: 'SO1', orderNumber: 'SO-000010', status: soStatus, items } : null)) },
      purchase: { findFirst: jest.fn().mockResolvedValue(null) },
      supplier: { findFirst: jest.fn().mockResolvedValue({ id: 'S1' }) },
      user: { findFirst: jest.fn(async ({ where }: any) => ({ id: 'u-b', email: 'b@x', role: 'OWNER', permissions: [], tenantId: where.tenantId })) },
      tenant: { findMany: jest.fn().mockResolvedValue([{ id: SELLER, name: 'Al-Noor Traders', phone: null, address: null }]) },
      tradeProfile: { findMany: jest.fn().mockResolvedValue([]) },
      tenantSettings: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const maps = opts.maps ?? { P1: 'B1', P2: 'B2', P9: 'B9' };
    const catalog = {
      resolveMaps: jest.fn().mockResolvedValue({ get: (p: string) => (maps[p] ? { buyerProductId: maps[p], buyerVariantId: null, by: 'SKU' } : null) }),
      saveMaps: jest.fn(),
    };
    const purchases = { create: jest.fn().mockResolvedValue({ id: 'PUR1' }), receive: jest.fn().mockResolvedValue({}) };
    const svc = new TradeSyncService(prisma, notifications as never, purchases as never, catalog as never);
    return { svc, prisma, purchases, order, updates };
  }
  const items = [
    { id: 'i1', productId: 'P1', variantId: null, baseQty: 24, total: 2300, freeBaseQty: 2, freeProductId: null, deliveredBaseQty: null, deliveredFreeQty: null },
    { id: 'i2', productId: 'P2', variantId: null, baseQty: 10, total: 500, freeBaseQty: 0, freeProductId: null, deliveredBaseQty: null, deliveredFreeQty: null },
  ];

  it("drafts a purchase in the buyer's books at invoice net price, free goods at zero", async () => {
    const { svc, purchases, order } = setup('DELIVERED', items);
    order.deliveredValue = 2800;
    expect(await svc.prepareReceiving('T1')).toBe('DRAFT');
    const [actor, scope, dto] = purchases.create.mock.calls[0];
    expect(actor.tenantId).toBe(BUYER);
    expect(scope.isAll).toBe(true);
    expect(dto).toMatchObject({ supplierId: 'S1', receive: false, discount: 0, otherCharges: 0, supplierInvoiceNo: 'INV-9' });
    expect(dto.items).toEqual([
      { productId: 'B1', variantId: undefined, quantity: 24, costPrice: 95.8333 },
      { productId: 'B1', variantId: undefined, quantity: 2, costPrice: 0 },
      { productId: 'B2', variantId: undefined, quantity: 10, costPrice: 50 },
    ]);
    expect(order.purchaseId).toBe('PUR1');
    expect(order.receiveState).toBe('DRAFT');
    expect(purchases.receive).not.toHaveBeenCalled();
  });

  it('takes only what was delivered on a partial delivery, balanced to the khata figure', async () => {
    const partial = [{ ...items[0], deliveredBaseQty: 12, deliveredFreeQty: 1 }, { ...items[1], deliveredBaseQty: 0, deliveredFreeQty: 0 }];
    const { svc, purchases, order } = setup('PARTIAL', partial);
    // Invoice 2,800 less returns 1,650 = 1,150 owed, Rs 0.0004 off from per-unit rounding.
    order.deliveredValue = 1150;
    await svc.prepareReceiving('T1');
    const dto = purchases.create.mock.calls[0][2];
    expect(dto.items.map((i: any) => [i.productId, i.quantity, i.costPrice])).toEqual([['B1', 12, 95.8333], ['B1', 1, 0]]);
    expect(dto.otherCharges).toBe(0);
    expect(dto.discount).toBe(0);
  });

  it('makes no purchase when everything came back', async () => {
    const { svc, purchases, order } = setup('RETURNED', items);
    expect(await svc.prepareReceiving('T1')).toBe('NOTHING');
    expect(purchases.create).not.toHaveBeenCalled();
    expect(order.receiveState).toBe('NOTHING');
  });

  it('waits for the buyer to match unknown products, once', async () => {
    const { svc, purchases, order } = setup('DELIVERED', items, { maps: { P1: 'B1' } });
    expect(await svc.prepareReceiving('T1')).toBe('NEEDS_MAP');
    expect(purchases.create).not.toHaveBeenCalled();
    expect(order.receiveState).toBe('NEEDS_MAP');
  });

  it('receives into stock straight away with auto-receive on', async () => {
    const { svc, purchases, prisma, order } = setup('DELIVERED', items, { autoReceive: true });
    order.deliveredValue = 2800;
    prisma.purchase.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'PUR1', status: 'PENDING', items: [{ id: 'pi1', baseQuantity: 24, receivedQty: 0, conversionRate: 1 }] });
    // receiveDraft reads the order again by id.
    prisma.tradeOrder.findUnique.mockImplementation(async () => order);
    expect(await svc.prepareReceiving('T1')).toBe('RECEIVED');
    expect(purchases.receive).toHaveBeenCalledWith(expect.objectContaining({ tenantId: BUYER }), expect.anything(), 'PUR1', { items: [{ itemId: 'pi1', quantity: 24 }], close: true });
  });
});

describe('status sync', () => {
  it('copies a forward move and announces it once', async () => {
    const t = { id: 'T1', buyerTenantId: BUYER, sellerTenantId: SELLER, salesOrderId: 'SO1', status: 'BOOKED', invoiceNumber: null, invoiceTotal: null, deliveredValue: null, approvedAt: null, invoicedAt: null, loadedAt: null, deliveredAt: null, cancelledAt: null };
    const prisma: any = {
      salesOrder: { findFirst: jest.fn().mockResolvedValue({ id: 'SO1', orderNumber: 'SO-1', status: 'INVOICED', saleId: 'SA1', returnsValue: 0, cashCollected: 0, approvedAt: new Date(), invoicedAt: new Date(), loadSheetId: null }) },
      sale: { findFirst: jest.fn().mockResolvedValue({ saleNumber: 'INV-1', total: 2800 }) },
      tradeOrder: { updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 }) },
      tenant: { findMany: jest.fn().mockResolvedValue([{ id: SELLER, name: 'Al-Noor', phone: null, address: null }]) },
      tradeProfile: { findMany: jest.fn().mockResolvedValue([]) },
      tenantSettings: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const n = { create: jest.fn().mockResolvedValue({}) };
    const svc = new TradeSyncService(prisma, n as never, {} as never, {} as never);
    await svc.syncOne(t as never);
    await svc.syncOne(t as never); // a second run lost the claim
    expect(prisma.tradeOrder.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: 'T1', status: 'BOOKED' }, data: { status: 'INVOICED', invoiceNumber: 'INV-1', invoiceTotal: 2800 } });
    expect(n.create).toHaveBeenCalledTimes(1);
    expect(n.create.mock.calls[0][0]).toMatchObject({ tenantId: BUYER, title: 'Invoice ban gayi' });
  });
});

describe('two-sided payments', () => {
  function setup(payment?: any) {
    const posted: any = { seller: [], buyer: [] };
    const tx: any = {
      customer: { findFirst: jest.fn(async ({ where }: any) => (where.tenantId === SELLER ? { id: 'C1', routeId: null } : null)) },
      distRoute: { findFirst: jest.fn() },
      distributionSettings: { findUnique: jest.fn().mockResolvedValue(null) },
      distCollection: {
        create: jest.fn(async ({ data }: any) => { posted.seller.push(data); return { id: 'DC1', ...data }; }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ ledgerId: 'CL1' }),
      },
      sale: { findFirst: jest.fn() },
      customerLedger: { create: jest.fn().mockResolvedValue({ id: 'CL1' }) },
      supplier: { findFirst: jest.fn(async ({ where }: any) => (where.tenantId === BUYER ? { id: 'S1', outstandingDue: 5000 } : null)) },
      tradePayment: {
        create: jest.fn(async ({ data }: any) => ({ id: 'TP1', createdAt: new Date(), decidedAt: null, disputeReason: null, ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
    };
    // postCollection touches customer.update; keep it simple.
    tx.customer.update = jest.fn().mockResolvedValue({ balance: 3000 });
    tx.customerLedger.findMany = jest.fn().mockResolvedValue([]);
    const prisma: any = {
      ...tx,
      tradeLink: linkTable([baseLink]),
      $transaction: jest.fn((fn: any) => fn(tx)),
      tradePayment: { ...tx.tradePayment, findFirst: jest.fn().mockResolvedValue(payment ? { ...payment, link: baseLink } : null), findUniqueOrThrow: jest.fn(async () => ({ ...payment, status: 'CONFIRMED' })) },
      tenant: { findMany: jest.fn().mockResolvedValue([]) },
      tradeProfile: { findMany: jest.fn().mockResolvedValue([]) },
      tenantSettings: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const supplierLedger = { post: jest.fn(async (u: any, sid: string, type: string, amount: number) => { posted.buyer.push({ tenantId: u.tenantId, sid, type, amount }); return { id: 'SL1' }; }) };
    const svc = new TradePaymentsService(prisma, supplierLedger as never, notifications as never, {} as never);
    return { svc, tx, posted, supplierLedger };
  }
  const pending = (source: 'SELLER' | 'BUYER') => ({
    id: 'TP1', linkId: 'L1', sellerTenantId: SELLER, buyerTenantId: BUYER, source, status: 'PENDING', amount: 2000, method: 'CASH', reference: 'INV-1', note: null,
    paidAt: new Date(), tradeOrderId: null, sellerLedgerId: source === 'SELLER' ? 'CL0' : null, buyerLedgerId: source === 'BUYER' ? 'SL0' : null, recordedById: 'x',
  });

  it("a buyer's payment posts in the buyer's books only and waits for the seller", async () => {
    const { svc, posted, tx } = setup();
    const r = await svc.record(user(BUYER), 'L1', { amount: 2000, method: 'BANK_TRANSFER', reference: 'TRX-1' });
    expect(posted.buyer).toEqual([{ tenantId: BUYER, sid: 'S1', type: 'PAYMENT_MADE', amount: 2000 }]);
    expect(posted.seller).toHaveLength(0);
    expect(tx.tradePayment.create.mock.calls[0][0].data).toMatchObject({ source: 'BUYER', status: 'PENDING', buyerLedgerId: 'SL1' });
    expect(r).toMatchObject({ mine: true, postedHere: true, postedThere: false, canConfirm: false });
  });

  it('the seller confirming posts it in the seller khata, once', async () => {
    const { svc, posted, tx } = setup(pending('BUYER'));
    await svc.confirm(user(SELLER), 'TP1');
    expect(tx.tradePayment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'TP1', sellerLedgerId: null }) }));
    expect(posted.seller[0]).toMatchObject({ tenantId: SELLER, customerId: 'C1', amount: 2000, kind: 'RECOVERY' });
    expect(tx.tradePayment.update).toHaveBeenCalledWith({ where: { id: 'TP1' }, data: { sellerLedgerId: 'CL1' } });
  });

  it('a second confirm finds nothing to claim and posts nothing', async () => {
    const { svc, posted, tx } = setup(pending('BUYER'));
    tx.tradePayment.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(svc.confirm(user(SELLER), 'TP1')).rejects.toThrow('pehle hi badal');
    expect(posted.seller).toHaveLength(0);
  });

  it('the recorder cannot confirm its own payment', async () => {
    const { svc } = setup(pending('BUYER'));
    await expect(svc.confirm(user(BUYER), 'TP1')).rejects.toThrow('doosri party');
  });

  it("the buyer confirming a seller's payment posts PAYMENT_MADE in the buyer's books", async () => {
    const { svc, posted } = setup(pending('SELLER'));
    await svc.confirm(user(BUYER), 'TP1');
    expect(posted.buyer).toEqual([{ tenantId: BUYER, sid: 'S1', type: 'PAYMENT_MADE', amount: 2000 }]);
  });

  it('needs the payments permission', async () => {
    const { svc } = setup(pending('SELLER'));
    await expect(svc.confirm(staff(BUYER, ['trade.buy']), 'TP1')).rejects.toThrow('permission');
  });

  it("is hidden from a business that is not a party", async () => {
    const { svc } = setup();
    await expect(svc.record(user(OTHER), 'L1', { amount: 10 })).rejects.toBeInstanceOf(NotFoundException);
  });
});
