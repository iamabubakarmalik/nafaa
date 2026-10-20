/**
 * Size requests ("farmaish"): a customer wants a size or colour the shop
 * does not have now. Each open request shows whether the asked size is in
 * stock in this branch again, so the shop can call the customer. Requests
 * are closed as bought / not bought or cancelled; nothing is deleted.
 *
 * Statuses: PENDING (waiting for stock), SCHEDULED (customer told the
 * stock came), COMPLETED (customer came back), CANCELLED.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { paging, r2, variantParts } from '../common/shoe-common';
import { CreateTryOnDto } from './dto/create-tryon.dto';

const OPEN = ['PENDING', 'SCHEDULED'];
export const REQUEST_VIEWS = ['open', 'waiting', 'told', 'bought', 'closed', 'all'] as const;
type RequestView = typeof REQUEST_VIEWS[number];
const norm = (s?: string | null) => String(s ?? '').trim().toLowerCase();

@Injectable()
export class ShoeTryOnService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateTryOnDto, scope?: ShopScope) {
    if (dto.productId && !(await this.prisma.product.count({ where: { id: dto.productId, tenantId: user.tenantId } }))) {
      throw new BadRequestException('Joota is dukaan ka nahi');
    }
    if (dto.customerId && !(await this.prisma.customer.count({ where: { id: dto.customerId, tenantId: user.tenantId } }))) {
      throw new BadRequestException('Customer is dukaan ka nahi');
    }
    const sizes = [...new Set((dto.requestedSizes ?? []).map((s) => s.trim()).filter(Boolean))];
    // Next number after the highest used, so numbers never clash.
    const prefix = `TR-${new Date().getFullYear()}-`;
    const last = await this.prisma.shoeTryOnRequest.findFirst({
      where: { tenantId: user.tenantId, requestNumber: { startsWith: prefix } },
      orderBy: { requestNumber: 'desc' },
      select: { requestNumber: true },
    });
    const n = last ? parseInt(last.requestNumber.slice(prefix.length), 10) || 0 : 0;
    const requestNumber = `${prefix}${String(n + 1).padStart(4, '0')}`;
    const shopId = await resolveIndustryShopId(this.prisma, user, scope?.shopId);

    return this.prisma.shoeTryOnRequest.create({
      data: {
        tenantId: user.tenantId,
        requestNumber,
        ...dto,
        shopId,
        requestedSizes: sizes,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: 'PENDING',
      },
    });
  }

  async list(user: AuthenticatedUser, scope: ShopScope, params: { status?: string; search?: string }) {
    const status = params.status === 'OPEN' ? { in: OPEN } : params.status || undefined;
    const rows = await this.prisma.shoeTryOnRequest.findMany({
      where: {
        tenantId: user.tenantId,
        ...(scope.shopId && { AND: [scope.whereLoose] }),
        ...(status && { status }),
        ...(params.search && {
          OR: [
            { requestNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { productName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 300,
    });
    return this.withStock(user, scope, rows);
  }

  /**
   * One page of requests for a view, with every view's count. Open
   * requests carry the asked sizes now in stock in the branch.
   */
  async page(user: AuthenticatedUser, scope: ShopScope, q: { view?: string; search?: string; page?: string; limit?: string }) {
    const view = (REQUEST_VIEWS as readonly string[]).includes(q.view ?? '') ? q.view as RequestView : 'open';
    const { page, limit, skip } = paging(q);
    const s = q.search?.trim();
    const base: Prisma.ShoeTryOnRequestWhereInput = {
      tenantId: user.tenantId,
      ...(scope.shopId && { AND: [scope.whereLoose] }),
      ...(s && {
        OR: [
          { requestNumber: { contains: s, mode: 'insensitive' } }, { customerName: { contains: s, mode: 'insensitive' } },
          { customerPhone: { contains: s } }, { productName: { contains: s, mode: 'insensitive' } },
        ],
      }),
    };
    const views: Record<RequestView, Prisma.ShoeTryOnRequestWhereInput> = {
      open: { status: { in: OPEN } },
      waiting: { status: 'PENDING' },
      told: { status: 'SCHEDULED' },
      bought: { status: 'COMPLETED', purchased: true },
      closed: { OR: [{ status: 'CANCELLED' }, { status: 'COMPLETED', purchased: false }] },
      all: {},
    };
    const where = { AND: [base, views[view]] };
    const [rows, total, ...counts] = await Promise.all([
      this.prisma.shoeTryOnRequest.findMany({ where, orderBy: view === 'open' || view === 'waiting' || view === 'told' ? { createdAt: 'asc' } : { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.shoeTryOnRequest.count({ where }),
      ...REQUEST_VIEWS.map((v) => this.prisma.shoeTryOnRequest.count({ where: { AND: [base, views[v]] } })),
    ]);
    return {
      items: await this.withStock(user, scope, rows), total, page, pages: Math.max(Math.ceil(total / limit), 1),
      counts: Object.fromEntries(REQUEST_VIEWS.map((v, i) => [v, counts[i]])) as Record<RequestView, number>,
    };
  }

  /** Adds, for open requests of a known article, the asked sizes now in stock in the branch. */
  private async withStock<T extends { status: string; productId: string | null; requestedSizes: string[]; colorPreference: string | null }>(
    user: AuthenticatedUser, scope: ShopScope, rows: T[],
  ) {
    const ids = [...new Set(rows.filter((r) => OPEN.includes(r.status) && r.productId).map((r) => r.productId!))];
    if (!ids.length) return rows.map((r) => ({ ...r, available: [] as Array<{ size: string | null; color: string | null; stock: number }> }));
    const [variants, stocks, plain] = await Promise.all([
      this.prisma.productVariant.findMany({ where: { productId: { in: ids }, isActive: true }, select: { id: true, productId: true, name: true, size: true, color: true } }),
      this.prisma.shopStock.groupBy({ by: ['variantId'], where: { tenantId: user.tenantId, productId: { in: ids }, variantId: { not: null }, ...scope.where }, _sum: { stock: true } }),
      this.prisma.shopStock.groupBy({ by: ['productId'], where: { tenantId: user.tenantId, productId: { in: ids }, variantId: null, ...scope.where }, _sum: { stock: true } }),
    ]);
    const stockOf = new Map(stocks.map((s) => [s.variantId, Number(s._sum.stock ?? 0)]));
    const plainOf = new Map(plain.map((s) => [s.productId, Number(s._sum.stock ?? 0)]));
    return rows.map((r) => {
      if (!OPEN.includes(r.status) || !r.productId) return { ...r, available: [] };
      const own = variants.filter((v) => v.productId === r.productId);
      if (!own.length) {
        const stock = r2(plainOf.get(r.productId) ?? 0);
        return { ...r, available: stock > 0 ? [{ size: null, color: null, stock }] : [] };
      }
      const want = new Set(r.requestedSizes.map(norm));
      const color = norm(r.colorPreference);
      const available = own
        .map((v) => ({ ...variantParts(v), stock: r2(stockOf.get(v.id) ?? 0) }))
        .filter((v) => v.stock > 0 && (!want.size || want.has(norm(v.size))) && (!color || !v.color || norm(v.color) === color));
      return { ...r, available };
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.shoeTryOnRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Farmaish nahi mili');
    return r;
  }

  async notified(user: AuthenticatedUser, id: string) {
    const r = await this.getOne(user, id);
    if (r.status !== 'PENDING') throw new BadRequestException('Sirf intezar wali farmaish par');
    return this.prisma.shoeTryOnRequest.update({ where: { id }, data: { status: 'SCHEDULED', scheduledAt: new Date() } });
  }

  async complete(user: AuthenticatedUser, id: string, purchased: boolean, purchasedSize?: string) {
    const r = await this.getOne(user, id);
    if (!OPEN.includes(r.status)) throw new BadRequestException('Farmaish pehle hi band ho chuki hai');
    return this.prisma.shoeTryOnRequest.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date(), purchased, purchasedSize: purchased ? purchasedSize : null },
    });
  }

  async cancel(user: AuthenticatedUser, id: string) {
    const r = await this.getOne(user, id);
    if (!OPEN.includes(r.status)) return r;
    return this.prisma.shoeTryOnRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async summary(user: AuthenticatedUser, scope?: ShopScope) {
    const inBranch = { tenantId: user.tenantId, ...(scope?.shopId && { AND: [scope.whereLoose] }) };
    const groups = await this.prisma.shoeTryOnRequest.groupBy({ by: ['status'], where: inBranch, _count: { _all: true } });
    const count = (s: string) => groups.find((g) => g.status === s)?._count._all ?? 0;
    const conversion = await this.prisma.shoeTryOnRequest.count({ where: { ...inBranch, status: 'COMPLETED', purchased: true } });
    return { pending: count('PENDING'), scheduled: count('SCHEDULED'), completed: count('COMPLETED'), cancelled: count('CANCELLED'), conversion };
  }
}
