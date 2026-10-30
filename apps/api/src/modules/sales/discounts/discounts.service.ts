/**
 * Discount codes: create, edit, switch on/off, validate at the counter and
 * report how each code performs. Dates are business days in the shop's time
 * zone (a code valid "until 15 Oct" works for all of 15 Oct). A code can be
 * limited to some branches and to a number of uses per customer. Codes that
 * were used are switched off instead of deleted so their history stays.
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { safeDayStart, zonedToUtc } from '../../../common/helpers/business-time.helper';
import { CreateDiscountDto, UpdateDiscountDto } from './dto/create-discount.dto';
import { apiMessage } from '../../../common/i18n/api-message';

const KEY = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86_400_000;
const LIVE = ['COMPLETED', 'PARTIALLY_RETURNED', 'FULLY_RETURNED'] as const;
const n = (v: unknown) => Number(v ?? 0);

@Injectable()
export class DiscountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /** "2026-10-15" → start (or end) of that business day; full timestamps pass through. */
  private async dayBound(tenantId: string, v: string | null | undefined, end: boolean): Promise<Date | null> {
    if (!v) return null;
    if (!KEY.test(v)) return new Date(v);
    const { tz, dayStartHour } = await this.tz.clock(tenantId);
    const [y, m, d] = v.split('-').map(Number);
    const start = zonedToUtc(y, m, d, safeDayStart(dayStartHour), 0, 0, tz);
    return end ? new Date(start.getTime() + DAY - 1) : start;
  }

  private check(dto: Partial<CreateDiscountDto>) {
    if (dto.type === 'PERCENTAGE' && (dto.value ?? 0) > 100) throw new BadRequestException('Percentage 100 se zyada nahi ho sakta');
    if (dto.validFrom && dto.validUntil && dto.validFrom > dto.validUntil) throw new BadRequestException('Shuru ki date khatam se pehle honi chahiye');
  }

  async create(user: AuthenticatedUser, dto: CreateDiscountDto) {
    this.check(dto);
    const code = dto.code.toUpperCase().replace(/\s+/g, '');
    const existing = await this.prisma.discountCode.findFirst({ where: { tenantId: user.tenantId, code } });
    if (existing) throw new ConflictException('Yeh code pehle se bana hua hai');
    return this.prisma.discountCode.create({
      data: {
        tenantId: user.tenantId, createdById: user.id, code,
        description: dto.description, type: dto.type, value: dto.value,
        minPurchase: dto.minPurchase ?? 0, maxDiscount: dto.maxDiscount ?? null,
        usageLimit: dto.usageLimit ?? null, perCustomerLimit: dto.perCustomerLimit ?? null, shopIds: dto.shopIds ?? [],
        validFrom: await this.dayBound(user.tenantId, dto.validFrom, false),
        validUntil: await this.dayBound(user.tenantId, dto.validUntil, true),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateDiscountDto) {
    const dc = await this.prisma.discountCode.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!dc) throw new NotFoundException('Code nahi mila');
    this.check({ type: dto.type ?? dc.type, value: dto.value ?? dc.value, validFrom: dto.validFrom, validUntil: dto.validUntil });
    const data: Prisma.DiscountCodeUpdateInput = {};
    if (dto.code !== undefined) {
      const code = dto.code.toUpperCase().replace(/\s+/g, '');
      if (code !== dc.code && await this.prisma.discountCode.findFirst({ where: { tenantId: user.tenantId, code } })) {
        throw new ConflictException('Yeh code pehle se bana hua hai');
      }
      data.code = code;
    }
    if (dto.description !== undefined) data.description = dto.description || null;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.value !== undefined) data.value = dto.value;
    if (dto.minPurchase !== undefined) data.minPurchase = dto.minPurchase;
    // null clears a limit; undefined leaves it.
    if (dto.maxDiscount !== undefined) data.maxDiscount = dto.maxDiscount;
    if (dto.usageLimit !== undefined) data.usageLimit = dto.usageLimit;
    if (dto.perCustomerLimit !== undefined) data.perCustomerLimit = dto.perCustomerLimit;
    if (dto.shopIds !== undefined) data.shopIds = dto.shopIds;
    if (dto.validFrom !== undefined) data.validFrom = await this.dayBound(user.tenantId, dto.validFrom, false);
    if (dto.validUntil !== undefined) data.validUntil = await this.dayBound(user.tenantId, dto.validUntil, true);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.discountCode.update({ where: { id }, data });
  }

  /**
   * Every code with how it performed: uses, bills, sales, discount given and
   * customers, for a period (business-day keys) or all time, at one branch or all.
   */
  async list(user: AuthenticatedUser, opts: { from?: string; to?: string; shopId?: string } = {}) {
    const tenantId = user.tenantId;
    let range: { gte: Date; lt: Date } | undefined;
    if (opts.from && opts.to && KEY.test(opts.from) && KEY.test(opts.to)) {
      const gte = (await this.dayBound(tenantId, opts.from, false))!;
      const lt = new Date((await this.dayBound(tenantId, opts.to, false))!.getTime() + DAY);
      range = { gte, lt };
    }
    const saleWhere: Prisma.SaleWhereInput = {
      tenantId, discountCodeId: { not: null }, status: { in: [...LIVE] },
      ...(range && { soldAt: range }), ...(opts.shopId && { shopId: opts.shopId }),
    };
    const [codes, perCode, customers, byShop, shops] = await Promise.all([
      this.prisma.discountCode.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.sale.groupBy({
        by: ['discountCodeId'], where: saleWhere,
        _count: { _all: true }, _sum: { total: true, codeDiscount: true, discount: true }, _max: { soldAt: true },
      }),
      this.prisma.sale.groupBy({ by: ['discountCodeId', 'customerId'], where: { ...saleWhere, customerId: { not: null } } }),
      this.prisma.sale.groupBy({ by: ['discountCodeId', 'shopId'], where: saleWhere, _count: { _all: true }, _sum: { total: true } }),
      this.prisma.shop.findMany({ where: { tenantId }, select: { id: true, name: true } }),
    ]);
    const stats = new Map(perCode.map((p) => [p.discountCodeId!, p]));
    const people = new Map<string, number>();
    for (const c of customers) people.set(c.discountCodeId!, (people.get(c.discountCodeId!) ?? 0) + 1);
    const shopName = new Map(shops.map((s) => [s.id, s.name]));
    const now = Date.now();

    const items = codes.map((c) => {
      const st = stats.get(c.id);
      // Old sales stored the code's discount only inside `discount`.
      const given = n(st?._sum.codeDiscount) || 0;
      const status = !c.isActive ? 'inactive'
        : c.validUntil && c.validUntil.getTime() < now ? 'expired'
          : c.validFrom && c.validFrom.getTime() > now ? 'scheduled'
            : c.usageLimit && c.usageCount >= c.usageLimit ? 'used_up' : 'active';
      return {
        ...c, status,
        uses: st?._count._all ?? 0, revenue: n(st?._sum.total), discountGiven: given, customers: people.get(c.id) ?? 0,
        lastUsedAt: st?._max.soldAt ?? null,
        branches: byShop.filter((b) => b.discountCodeId === c.id).map((b) => ({ shopId: b.shopId, name: (b.shopId && shopName.get(b.shopId)) || '—', uses: b._count._all, revenue: n(b._sum.total) })),
      };
    });
    return {
      items,
      shops,
      totals: {
        codes: codes.length,
        active: items.filter((i) => i.status === 'active').length,
        uses: items.reduce((s, i) => s + i.uses, 0),
        revenue: items.reduce((s, i) => s + i.revenue, 0),
        discountGiven: items.reduce((s, i) => s + i.discountGiven, 0),
        customers: new Set(customers.map((c) => c.customerId)).size,
      },
    };
  }

  async toggle(user: AuthenticatedUser, id: string) {
    const dc = await this.prisma.discountCode.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!dc) throw new NotFoundException('Code nahi mila');
    return this.prisma.discountCode.update({ where: { id }, data: { isActive: !dc.isActive } });
  }

  /** Deletes an unused code; a used one is switched off so its bills keep the link. */
  async remove(user: AuthenticatedUser, id: string) {
    const dc = await this.prisma.discountCode.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true, usageCount: true, _count: { select: { sales: true } } } });
    if (!dc) throw new NotFoundException('Code nahi mila');
    if (dc.usageCount > 0 || dc._count.sales > 0) {
      await this.prisma.discountCode.update({ where: { id }, data: { isActive: false } });
      return { softDeleted: true, message: 'Yeh code istemal ho chuka hai — mitaya nahi, band kar diya taake hisaab bacha rahe' };
    }
    await this.prisma.discountCode.delete({ where: { id } });
    return { softDeleted: false, message: 'Code mita diya' };
  }

  async validate(user: AuthenticatedUser, code: string | undefined, amount: number, opts: { shopId?: string | null; customerId?: string | null } = {}) {
    const upper = (code ?? '').toUpperCase().replace(/\s+/g, '');
    if (!upper) throw new BadRequestException('Code likhein');
    const dc = await this.prisma.discountCode.findFirst({ where: { tenantId: user.tenantId, code: upper, isActive: true } });
    if (!dc) throw new BadRequestException('Yeh code nahi chalta');

    const now = new Date();
    if (dc.validFrom && now < dc.validFrom) throw new BadRequestException('Yeh code abhi shuru nahi hua');
    if (dc.validUntil && now > dc.validUntil) throw new BadRequestException('Is code ki period khatam ho gayi');
    if (dc.usageLimit && dc.usageCount >= dc.usageLimit) throw new BadRequestException('Is code ki had poori ho chuki hai');
    if (dc.shopIds.length && opts.shopId && !dc.shopIds.includes(opts.shopId)) throw new BadRequestException('Yeh code is branch par nahi chalta');
    if (dc.perCustomerLimit) {
      if (!opts.customerId) throw new BadRequestException('Is code ke liye customer chunein');
      const used = await this.prisma.sale.count({ where: { tenantId: user.tenantId, discountCodeId: dc.id, customerId: opts.customerId, status: { not: 'VOIDED' } } });
      if (used >= dc.perCustomerLimit) throw new BadRequestException(apiMessage('Yeh customer is code ko {{perCustomerLimit}} dafa istemal kar chuka hai', { perCustomerLimit: dc.perCustomerLimit }));
    }
    if (amount < dc.minPurchase) throw new BadRequestException(apiMessage('Kam se kam Rs {{minPurchase}} ki khareedari par chalta hai', { minPurchase: dc.minPurchase }));

    let discount = dc.type === 'PERCENTAGE' ? (amount * dc.value) / 100 : dc.value;
    if (dc.type === 'PERCENTAGE' && dc.maxDiscount && discount > dc.maxDiscount) discount = dc.maxDiscount;
    discount = Math.min(discount, amount);
    return { id: dc.id, code: dc.code, type: dc.type, value: dc.value, discount, finalAmount: Math.max(amount - discount, 0) };
  }
}
