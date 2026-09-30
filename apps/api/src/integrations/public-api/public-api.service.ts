import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiCaller } from './api-keys.service';
import { serialize } from './events';

/**
 * Nafaa Public API (v1) ke jawab — sirf apne business ka data, key branch
 * wali ho to sirf us branch ka. Cost price / profit kabhi bahar nahi jata.
 */
export interface ListQuery { limit?: string; page?: string; search?: string; updated_since?: string; from?: string; to?: string; shop_id?: string; status?: string; phone?: string }

const pageOf = (q: ListQuery) => {
  const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 100);
  const page = Math.max(Number(q.page) || 1, 1);
  return { limit, page, skip: (page - 1) * limit };
};
const date = (v: string | undefined, name: string) => {
  if (!v) return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new BadRequestException({ error: 'bad_date', message: `${name} sahi tareekh nahi (ISO 8601, jaise 2026-09-30T00:00:00+05:00)` });
  return d;
};
const out = <T>(rows: T[], p: { limit: number; page: number }, map: (r: T) => unknown) => ({
  data: rows.slice(0, p.limit).map(map),
  page: p.page,
  limit: p.limit,
  hasMore: rows.length > p.limit,
});

@Injectable()
export class PublicApiService {
  constructor(private readonly prisma: PrismaService) {}

  private shopFilter(c: ApiCaller, q: ListQuery) {
    if (c.shopId) return c.shopId;
    return q.shop_id || undefined;
  }

  async me(c: ApiCaller) {
    const [tenant, shops] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: c.tenantId }, select: { id: true, name: true } as any }),
      this.prisma.shop.findMany({ where: { tenantId: c.tenantId, isActive: true, ...(c.shopId && { id: c.shopId }) }, select: { id: true, name: true, isMain: true, type: true } }),
    ]);
    return { business: tenant, shops, key: { id: c.keyId, scope: c.scope, shopId: c.shopId }, apiVersion: 1 };
  }

  async products(c: ApiCaller, q: ListQuery) {
    const p = pageOf(q);
    const shopId = this.shopFilter(c, q);
    const since = date(q.updated_since, 'updated_since');
    const where: Prisma.ProductWhereInput = {
      tenantId: c.tenantId,
      ...(since && { updatedAt: { gte: since } }),
      ...(q.search && { OR: [{ name: { contains: q.search, mode: 'insensitive' } }, { sku: q.search }, { barcode: q.search }] }),
    };
    const rows = await this.prisma.product.findMany({
      where, orderBy: since ? { updatedAt: 'asc' } : { name: 'asc' }, skip: p.skip, take: p.limit + 1,
      include: { category: { select: { id: true, name: true } }, shopStocks: { where: { variantId: null, ...(shopId && { shopId }) }, select: { shopId: true, stock: true, shopPrice: true } } },
    });
    return out(rows, p, serialize.product);
  }

  async product(c: ApiCaller, id: string) {
    const r = await this.prisma.product.findFirst({
      where: { tenantId: c.tenantId, OR: [{ id }, { sku: id }, { barcode: id }] },
      include: { category: { select: { id: true, name: true } }, shopStocks: { where: { variantId: null, ...(c.shopId && { shopId: c.shopId }) }, select: { shopId: true, stock: true, shopPrice: true } } },
    });
    if (!r) throw new NotFoundException({ error: 'not_found', message: 'Product nahi mila' });
    return serialize.product(r);
  }

  async stock(c: ApiCaller, q: ListQuery) {
    const p = pageOf(q);
    const shopId = this.shopFilter(c, q);
    const since = date(q.updated_since, 'updated_since');
    const rows = await this.prisma.shopStock.findMany({
      where: { tenantId: c.tenantId, ...(shopId && { shopId }), ...(since && { updatedAt: { gte: since } }) },
      include: { product: { select: { name: true, sku: true, barcode: true, unit: true } } },
      orderBy: { updatedAt: 'asc' }, skip: p.skip, take: p.limit + 1,
    });
    return out(rows, p, (s) => ({
      productId: s.productId, variantId: s.variantId, shopId: s.shopId, name: s.product.name, sku: s.product.sku, barcode: s.product.barcode,
      unit: s.product.unit, stock: s.stock, lowStockAlert: s.lowStockAlert, isLow: s.lowStockAlert > 0 && s.stock <= s.lowStockAlert,
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  async customers(c: ApiCaller, q: ListQuery) {
    const p = pageOf(q);
    const since = date(q.updated_since, 'updated_since');
    const rows = await this.prisma.customer.findMany({
      where: {
        tenantId: c.tenantId,
        ...(c.shopId && { OR: [{ shopId: c.shopId }, { shopId: null }] }),
        ...(since && { updatedAt: { gte: since } }),
        ...(q.phone && { phone: { contains: q.phone.replace(/\D/g, '').slice(-10) } }),
        ...(q.search && { name: { contains: q.search, mode: 'insensitive' } }),
      },
      orderBy: since ? { updatedAt: 'asc' } : { createdAt: 'desc' }, skip: p.skip, take: p.limit + 1,
    });
    return out(rows, p, serialize.customer);
  }

  async customer(c: ApiCaller, id: string) {
    const r = await this.prisma.customer.findFirst({ where: { id, tenantId: c.tenantId } });
    if (!r) throw new NotFoundException({ error: 'not_found', message: 'Customer nahi mila' });
    return serialize.customer(r);
  }

  /** Naya customer — same phone pehle se ho to wahi wapas (dobara nahi banta) */
  async createCustomer(c: ApiCaller, b: { name?: string; phone?: string; email?: string; city?: string; address?: string; notes?: string }) {
    const name = String(b.name ?? '').trim().slice(0, 120);
    if (!name) throw new BadRequestException({ error: 'name_required', message: 'name zaroori hai' });
    const phone = b.phone ? String(b.phone).trim().slice(0, 20) : null;
    if (phone) {
      const digits = phone.replace(/\D/g, '').slice(-10);
      const existing = digits.length >= 10 ? await this.prisma.customer.findFirst({ where: { tenantId: c.tenantId, phone: { contains: digits } } }) : null;
      if (existing) return { ...serialize.customer(existing), existing: true };
    }
    const r = await this.prisma.customer.create({
      data: {
        tenantId: c.tenantId, shopId: c.shopId, name, phone,
        email: b.email ? String(b.email).trim().slice(0, 120) : null,
        city: b.city ? String(b.city).trim().slice(0, 60) : null,
        address: b.address ? String(b.address).trim().slice(0, 300) : null,
        notes: b.notes ? String(b.notes).trim().slice(0, 500) : null,
      },
    });
    return { ...serialize.customer(r), existing: false };
  }

  async sales(c: ApiCaller, q: ListQuery) {
    const p = pageOf(q);
    const shopId = this.shopFilter(c, q);
    const from = date(q.from, 'from');
    const to = date(q.to, 'to');
    const since = date(q.updated_since, 'updated_since');
    const rows = await this.prisma.sale.findMany({
      where: {
        tenantId: c.tenantId, ...(shopId && { shopId }),
        ...((from || to) && { soldAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }),
        ...(since && { updatedAt: { gte: since } }),
        ...(q.status && { status: q.status.toUpperCase() as any }),
      },
      include: { customer: { select: { id: true, name: true, phone: true } }, items: { include: { product: { select: { name: true, sku: true, barcode: true } } } } },
      orderBy: since ? { updatedAt: 'asc' } : { soldAt: 'desc' }, skip: p.skip, take: p.limit + 1,
    });
    return out(rows, p, serialize.sale);
  }

  async sale(c: ApiCaller, id: string) {
    const r = await this.prisma.sale.findFirst({
      where: { tenantId: c.tenantId, OR: [{ id }, { saleNumber: id }], ...(c.shopId && { shopId: c.shopId }) },
      include: { customer: { select: { id: true, name: true, phone: true } }, items: { include: { product: { select: { name: true, sku: true, barcode: true } } } } },
    });
    if (!r) throw new NotFoundException({ error: 'not_found', message: 'Sale nahi mili' });
    return serialize.sale(r);
  }

  async orders(c: ApiCaller, q: ListQuery) {
    const p = pageOf(q);
    const shopId = this.shopFilter(c, q);
    const from = date(q.from, 'from');
    const to = date(q.to, 'to');
    const rows = await this.prisma.channelOrder.findMany({
      where: {
        tenantId: c.tenantId, ...(shopId && { shopId }),
        ...((from || to) && { receivedAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }),
        ...(q.status && { orderStatus: q.status.toUpperCase() }),
      },
      include: { integration: { select: { displayName: true, type: true } } },
      orderBy: { receivedAt: 'desc' }, skip: p.skip, take: p.limit + 1,
    });
    return out(rows.filter((o) => !(o.metadata as any)?.test), p, serialize.order);
  }

  async order(c: ApiCaller, id: string) {
    const r = await this.prisma.channelOrder.findFirst({
      where: { tenantId: c.tenantId, OR: [{ id }, { externalOrderNumber: id }], ...(c.shopId && { shopId: c.shopId }) },
      include: { integration: { select: { displayName: true, type: true } } },
    });
    if (!r) throw new NotFoundException({ error: 'not_found', message: 'Order nahi mila' });
    return serialize.order(r);
  }
}
