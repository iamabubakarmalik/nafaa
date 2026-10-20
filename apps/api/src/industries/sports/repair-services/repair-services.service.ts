/**
 * Repair desk: bat repair, racket stringing, gripping, ball and shoe work.
 * The item is received with an estimate and an advance (kept on the
 * customer's khata); on delivery the repair charge, plus any parts taken
 * from stock (string, grip), becomes a normal bill. A cancelled job's
 * advance can be given back in cash; a voided delivery bill puts the job
 * back to "done, not delivered" (see SportsBillVoidService).
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { startOfDayTz, endOfDayTz } from '../../../common/helpers/business-time.helper';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { CreateRepairServiceDto, RepairPart, UpdateRepairStatusDto } from './dto/create-repair.dto';
import { nextRunningNumber } from '../common/service-sale.helper';
import { checkRefundPin, paging, r2, refundAdvance, refundedOnKhata } from '../common/sports-common';
import {
  ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId,
} from '../../_shared/industry-sale.helper';

const OPEN = ['RECEIVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'];
export const REPAIR_VIEWS = ['active', 'work', 'ready', 'late', 'advance', 'done', 'all'] as const;
type RepairView = typeof REPAIR_VIEWS[number];

@Injectable()
export class RepairServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  /**
   * One page of repairs for a view, with every view's count and the money
   * of the matching jobs (estimate or final charge, advance, still due).
   */
  async page(user: AuthenticatedUser, q: { view?: string; page?: string; limit?: string; search?: string; from?: string; to?: string }) {
    const view = (REPAIR_VIEWS as readonly string[]).includes(q.view ?? '') ? q.view as RepairView : 'active';
    const { page, limit, skip } = paging(q);
    const s = q.search?.trim();
    const base: Prisma.SportsRepairServiceWhereInput = {
      tenantId: user.tenantId,
      ...(q.from || q.to ? { receivedAt: { ...(q.from && { gte: startOfDayTz(new Date(q.from)) }), ...(q.to && { lte: endOfDayTz(new Date(q.to)) }) } } : {}),
      ...(s && {
        OR: [
          { serviceNumber: { contains: s, mode: 'insensitive' } }, { customerName: { contains: s, mode: 'insensitive' } },
          { customerPhone: { contains: s } }, { itemType: { contains: s, mode: 'insensitive' } }, { itemBrand: { contains: s, mode: 'insensitive' } },
        ],
      }),
    };
    const views: Record<RepairView, Prisma.SportsRepairServiceWhereInput> = {
      active: { status: { in: OPEN } },
      work: { status: { in: ['RECEIVED', 'IN_PROGRESS', 'ON_HOLD'] } },
      ready: { status: 'COMPLETED' },
      late: { status: { in: ['RECEIVED', 'IN_PROGRESS', 'ON_HOLD'] }, estimatedReadyAt: { lt: new Date() } },
      advance: { status: { in: OPEN }, advancePaid: { gt: 0 } },
      done: { status: { in: ['DELIVERED', 'CANCELLED'] } },
      all: {},
    };
    const where = { AND: [base, views[view]] };
    const [rows, total, ...counts] = await Promise.all([
      this.prisma.sportsRepairService.findMany({
        where,
        orderBy: view === 'done' || view === 'all' ? [{ receivedAt: 'desc' }] : [{ estimatedReadyAt: { sort: 'asc', nulls: 'last' } }, { receivedAt: 'asc' }],
        skip, take: limit,
      }),
      this.prisma.sportsRepairService.count({ where }),
      ...REPAIR_VIEWS.map((v) => this.prisma.sportsRepairService.count({ where: { AND: [base, views[v]] } })),
    ]);
    const all = await this.prisma.sportsRepairService.findMany({ where: { AND: [where, { status: { not: 'CANCELLED' } }] }, select: { status: true, estimatedCost: true, finalCost: true, advancePaid: true } });
    const value = (r: { estimatedCost: number; finalCost: number }) => Number(r.finalCost || r.estimatedCost || 0);
    return {
      items: rows, total, page, pages: Math.max(Math.ceil(total / limit), 1),
      counts: Object.fromEntries(REPAIR_VIEWS.map((v, i) => [v, counts[i]])) as Record<RepairView, number>,
      totals: {
        value: r2(all.reduce((t, r) => t + value(r), 0)),
        advance: r2(all.filter((r) => r.status !== 'DELIVERED').reduce((t, r) => t + Number(r.advancePaid || 0), 0)),
        due: r2(all.filter((r) => r.status !== 'DELIVERED').reduce((t, r) => t + Math.max(value(r) - Number(r.advancePaid || 0), 0), 0)),
      },
    };
  }

  /** Gives back in cash the advance of a cancelled repair. */
  async refund(user: AuthenticatedUser, id: string, activeShopId?: string | null, managerPin?: string) {
    const r = await this.prisma.sportsRepairService.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Repair nahi mili');
    if (r.status !== 'CANCELLED') throw new BadRequestException('Pehle repair cancel karein, phir advance wapas hota hai');
    await checkRefundPin(this.prisma, user, managerPin);
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.sportsRepairService.updateMany({ where: { id, status: 'CANCELLED', updatedAt: r.updatedAt }, data: { updatedAt: new Date() } });
      if (!claimed.count) throw new ConflictException('Repair abhi kisi aur ne badli — safha taaza karein');
      const amount = await refundAdvance(tx, user, { reference: r.serviceNumber, label: 'Repair', customerId: r.customerId, shopId: activeShopId });
      return tx.sportsRepairService.update({
        where: { id },
        data: { advancePaid: r2(Math.max(Number(r.advancePaid) - amount, 0)), notes: [r.notes, `Advance wapas: Rs ${amount}`].filter(Boolean).join('\n') },
      });
    });
  }

  /** Parts from stock: each must be a product (and size) of this shop. */
  private async checkParts(user: AuthenticatedUser, parts: RepairPart[]) {
    if (!parts.length) return [];
    if (parts.length > 20) throw new BadRequestException('Zyada se zyada 20 parts');
    const ids = [...new Set(parts.map((p) => p.productId))];
    const found = await this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: ids } }, select: { id: true, name: true, variants: { select: { id: true } } } });
    const byId = new Map(found.map((p) => [p.id, p]));
    return parts.map((p) => {
      const product = byId.get(p.productId);
      if (!product) throw new BadRequestException('Part is dukaan ka nahi');
      if (p.variantId && !product.variants.some((v) => v.id === p.variantId)) throw new BadRequestException(`${product.name}: size is product ka nahi`);
      return { productId: p.productId, variantId: p.variantId, name: p.name?.trim() || product.name, quantity: Number(p.quantity), price: r2(p.price) };
    });
  }

  async create(user: AuthenticatedUser, dto: CreateRepairServiceDto, activeShopId?: string | null) {
    const serviceNumber = await nextRunningNumber(
      async (prefix) => (await this.prisma.sportsRepairService.findFirst({
        where: { tenantId: user.tenantId, serviceNumber: { startsWith: prefix } },
        orderBy: { serviceNumber: 'desc' },
        select: { serviceNumber: true },
      }))?.serviceNumber,
      `RS-${new Date().getFullYear()}-`,
    );
    if ((dto.advancePaid ?? 0) > (dto.estimatedCost ?? 0) + 0.01 && (dto.estimatedCost ?? 0) > 0) {
      throw new BadRequestException('Advance andaze ki amount se zyada nahi ho sakta');
    }
    if (dto.customerId && !(await this.prisma.customer.count({ where: { id: dto.customerId, tenantId: user.tenantId } }))) {
      throw new BadRequestException('Customer is dukaan ka nahi');
    }

    const advance = r2(dto.advancePaid ?? 0);
    return this.prisma.$transaction(async (tx) => {
      let customerId = dto.customerId || null;
      if (advance > 0) {
        // The advance is cash in hand today; it waits on the customer's khata
        // and is used up by the sale made on delivery.
        const shopId = await resolveIndustryShopId(tx, user, activeShopId);
        customerId = await ensureCustomer(tx, user, {
          customerId, name: dto.customerName, phone: dto.customerPhone, shopId,
        });
        await recordKhataPayment(tx, user, {
          customerId, shopId, amount: advance, reference: serviceNumber, note: `Repair advance ${serviceNumber}`, method: dto.paymentMethod,
        });
      }
      return tx.sportsRepairService.create({
        data: {
          tenantId: user.tenantId,
          serviceNumber,
          customerId,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          itemType: dto.itemType,
          itemBrand: dto.itemBrand,
          itemDescription: dto.itemDescription,
          issue: dto.issue,
          repairType: dto.repairType,
          estimatedCost: dto.estimatedCost ?? 0,
          advancePaid: advance,
          estimatedReadyAt: dto.estimatedReadyAt ? new Date(dto.estimatedReadyAt) : null,
          photosBeforeUrls: dto.photosBeforeUrls ?? [],
          notes: dto.notes,
          status: 'RECEIVED',
        },
      });
    });
  }

  async list(user: AuthenticatedUser, params: {
    status?: string;
    itemType?: string;
    repairType?: string;
    customerId?: string;
    from?: string;
    to?: string;
    search?: string;
  }) {
    return this.prisma.sportsRepairService.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.itemType && { itemType: params.itemType }),
        ...(params.repairType && { repairType: params.repairType }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.from || params.to
          ? {
              receivedAt: {
                ...(params.from && { gte: startOfDayTz(new Date(params.from)) }),
                ...(params.to && { lte: endOfDayTz(new Date(params.to)) }),
              },
            }
          : {}),
        ...(params.search && {
          OR: [
            { serviceNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { itemType: { contains: params.search, mode: 'insensitive' } },
            { itemBrand: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { receivedAt: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.sportsRepairService.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Repair nahi mili');
    const [sale, refunded] = await Promise.all([
      this.prisma.sale.findFirst({ where: { tenantId: user.tenantId, sourceRef: r.serviceNumber, status: { not: 'VOIDED' } }, select: { id: true, saleNumber: true } }),
      refundedOnKhata(this.prisma, user.tenantId, r.serviceNumber),
    ]);
    return { ...r, sale, refunded };
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateRepairStatusDto, activeShopId?: string | null) {
    const r = await this.prisma.sportsRepairService.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Repair service not found');
    if ((r.status === 'DELIVERED' || r.status === 'CANCELLED') && dto.status !== r.status) {
      throw new BadRequestException(`${r.serviceNumber} pehle hi ${r.status === 'DELIVERED' ? 'deliver' : 'cancel'} ho chuka hai`);
    }
    if (r.status === 'DELIVERED' && dto.finalCost !== undefined && Math.abs(dto.finalCost - Number(r.finalCost ?? 0)) > 0.009) {
      throw new BadRequestException('Deliver ke baad bill ki amount nahi badal sakti');
    }

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'COMPLETED' && !r.completedAt) patch.completedAt = now;
    if (dto.status === 'DELIVERED' && !r.deliveredAt) patch.deliveredAt = now;
    if (dto.workDone) patch.workDone = dto.workDone;
    if (dto.partsUsed) patch.partsUsed = dto.partsUsed;
    if (dto.finalCost !== undefined) patch.finalCost = dto.finalCost;
    if (dto.photosAfterUrls) patch.photosAfterUrls = dto.photosAfterUrls;
    if (dto.notes) patch.notes = ((r.notes || '') + '\n' + dto.notes).trim();

    if (dto.status !== 'DELIVERED' || r.status === 'DELIVERED') {
      return this.prisma.sportsRepairService.update({ where: { id }, data: patch });
    }

    // Delivery books the repair charge (and parts from stock) as a sale, like
    // any counter bill. Advances already sit on the customer's khata and are used up by it.
    const parts = await this.checkParts(user, Array.isArray(dto.partsUsed) ? dto.partsUsed : []);
    const partsTotal = r2(parts.reduce((t, p) => t + p.quantity * p.price, 0));
    const labour = r2(Number(dto.finalCost ?? (r.finalCost || r.estimatedCost) ?? 0));
    const total = r2(labour + partsTotal);
    patch.finalCost = total;
    if (parts.length) patch.partsUsed = parts;
    const advance = r2(r.advancePaid);
    if (advance > total + 0.01) {
      throw new BadRequestException(`Rs ${advance} pehle liye ja chuke hain — bill is se kam nahi ho sakta`);
    }
    const due = r2(Math.max(total - advance, 0));
    const takenNow = r2(Math.max(dto.paidNow ?? due, 0));
    const kept = r2(Math.min(takenNow, due));
    const stillOwed = r2(due - kept);
    const label = `Repair: ${r.itemType}${r.itemBrand ? ` ${r.itemBrand}` : ''} — ${dto.workDone || r.workDone || r.issue}`.slice(0, 180);
    const shopId = await resolveIndustryShopId(this.prisma as any, user, activeShopId);
    let customerId = r.customerId;
    if (!customerId && (stillOwed > 0 || advance > 0)) {
      customerId = await ensureCustomer(this.prisma as any, user, { name: r.customerName, phone: r.customerPhone, shopId });
    }
    const legacyPaid = r2(Math.max(advance - (await paidOnKhata(this.prisma as any, user.tenantId, r.serviceNumber)), 0));

    if (parts.length) {
      // Parts leave stock through the normal sale; the repair work rides as a charge on the same bill.
      const already = await this.prisma.sale.findFirst({ where: { tenantId: user.tenantId, sourceRef: r.serviceNumber, status: { not: 'VOIDED' } }, select: { id: true } });
      if (!already) {
        await this.sales.create(user, new ShopScope(shopId, false), {
          shopId, customerId: customerId ?? undefined,
          paymentMethod: (dto.paymentMethod ?? 'CASH') as any,
          paidAmount: r2(kept + legacyPaid),
          allowCredit: customerId ? true : undefined,
          items: parts.map((p) => ({ productId: p.productId, ...(p.variantId ? { variantId: p.variantId } : {}), quantity: p.quantity, priceOverride: p.price })),
          serviceCharges: labour > 0 ? [{ type: 'OTHER', label, amount: labour }] : [],
        } as any, { source: 'POS', sourceRef: r.serviceNumber });
      }
      return this.prisma.sportsRepairService.update({ where: { id }, data: { ...patch, customerId, advancePaid: r2(advance + kept) } });
    }

    // A voided earlier bill keeps its number, so a re-delivery gets the next one.
    const bills = await this.prisma.sale.findMany({ where: { tenantId: user.tenantId, sourceRef: r.serviceNumber }, select: { status: true } });
    const live = bills.some((b) => b.status !== 'VOIDED');
    return this.prisma.$transaction(async (tx) => {
      if (total > 0 && !live) {
        await postIndustrySale(tx, user, {
          saleNumber: bills.length ? `${r.serviceNumber}-${bills.length + 1}` : r.serviceNumber,
          sourceRef: r.serviceNumber,
          shopId,
          customerId,
          lines: [{ label, amount: total }],
          paidAmount: r2(kept + legacyPaid),
          paymentMethod: dto.paymentMethod,
        });
      }
      return tx.sportsRepairService.update({
        where: { id },
        data: { ...patch, customerId, advancePaid: r2(advance + kept) },
      });
    });
  }

  async recordPayment(user: AuthenticatedUser, id: string, amount: number, activeShopId?: string | null, paymentMethod?: string) {
    const r = await this.prisma.sportsRepairService.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Repair service not found');
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    if (r.status === 'DELIVERED' || r.status === 'CANCELLED') {
      throw new BadRequestException(r.status === 'DELIVERED'
        ? 'Repair deliver ho chuki — baqi amount customer ke khate se wasool karein'
        : 'Cancel shuda repair par payment nahi li ja sakti');
    }
    const bill = Number(r.finalCost || r.estimatedCost || 0);
    const due = r2(bill - Number(r.advancePaid || 0));
    if (bill > 0 && amount > due + 0.01) {
      throw new BadRequestException(due > 0 ? `Baqi sirf Rs ${due} hai` : 'Poori amount mil chuki hai');
    }

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, activeShopId);
      const customerId = await ensureCustomer(tx, user, {
        customerId: r.customerId, name: r.customerName, phone: r.customerPhone, shopId,
      });
      await recordKhataPayment(tx, user, {
        customerId, shopId, amount, reference: r.serviceNumber, note: `Repair advance ${r.serviceNumber}`, method: paymentMethod,
      });
      return tx.sportsRepairService.update({
        where: { id },
        data: { advancePaid: r2(Number(r.advancePaid || 0) + amount), customerId },
      });
    });
  }

  /** Repairs are cancelled, never deleted; an advance stays on the khata until refunded. */
  async remove(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.sportsRepairService.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Repair nahi mili');
    if (r.status === 'DELIVERED') throw new BadRequestException('Deliver shuda repair ka bill ban chuka hai — bill ki Return karein');
    if (r.status === 'CANCELLED') return r;
    return this.prisma.sportsRepairService.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async summary(user: AuthenticatedUser) {
    const [received, inProgress, completed, delivered] = await Promise.all([
      this.prisma.sportsRepairService.count({ where: { tenantId: user.tenantId, status: 'RECEIVED' } }),
      this.prisma.sportsRepairService.count({ where: { tenantId: user.tenantId, status: 'IN_PROGRESS' } }),
      this.prisma.sportsRepairService.count({ where: { tenantId: user.tenantId, status: 'COMPLETED' } }),
      this.prisma.sportsRepairService.count({ where: { tenantId: user.tenantId, status: 'DELIVERED' } }),
    ]);
    const revenue = await this.prisma.sportsRepairService.aggregate({
      where: { tenantId: user.tenantId, status: 'DELIVERED' },
      _sum: { finalCost: true, advancePaid: true },
    });
    return {
      received, inProgress, completed, delivered,
      totalRevenue: revenue._sum.finalCost ?? 0,
      totalCollected: revenue._sum.advancePaid ?? 0,
    };
  }

  async overdueRepairs(user: AuthenticatedUser) {
    const now = new Date();
    return this.prisma.sportsRepairService.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['RECEIVED', 'IN_PROGRESS'] },
        estimatedReadyAt: { lt: now },
      },
      orderBy: { estimatedReadyAt: 'asc' },
    });
  }
}
