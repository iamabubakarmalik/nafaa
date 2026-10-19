import { BadRequestException, Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { HardwareDeliveryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { ShopScope } from '../../../common/shop-scope';
import { endOfDayTz, startOfDayTz } from '../../../common/helpers/business-time.helper';
import { ConfirmDeliveryDto, CreateDeliveryDto, UpdateDeliveryStatusDto } from './dto/create-delivery.dto';
import { createWithDocNumber, LATEST_NUMBERS } from '../common/doc-number';
import { r2, r4, slipUnit } from '../common/units';

/** Challans still on their way: their whole quantity counts as sent. */
const OPEN: HardwareDeliveryStatus[] = ['PENDING', 'SCHEDULED', 'LOADED', 'DISPATCHED', 'IN_TRANSIT'];
const DONE: HardwareDeliveryStatus[] = ['DELIVERED', 'PARTIALLY_DELIVERED', 'FAILED', 'RETURNED'];

/** Moves allowed from each status; finished challans only take a confirm, never a status change. */
const NEXT: Partial<Record<HardwareDeliveryStatus, HardwareDeliveryStatus[]>> = {
  PENDING: ['SCHEDULED', 'LOADED', 'DISPATCHED', 'CANCELLED'],
  SCHEDULED: ['PENDING', 'LOADED', 'DISPATCHED', 'CANCELLED'],
  LOADED: ['SCHEDULED', 'DISPATCHED', 'IN_TRANSIT', 'CANCELLED'],
  DISPATCHED: ['IN_TRANSIT', 'FAILED', 'CANCELLED'],
  IN_TRANSIT: ['FAILED', 'CANCELLED'],
};

const TABS = ['all', 'open', 'today', 'partial', 'delivered', 'cancelled'] as const;
export type DeliveryTab = (typeof TABS)[number];

export interface DeliveryPageQuery {
  tab?: string;
  search?: string;
  from?: string;
  to?: string;
  saleId?: string;
  projectId?: string;
  customerId?: string;
  page?: number;
  limit?: number;
}

/** One bill line as the challan screen sees it: sold, already sent, still to send. */
export interface BillLine {
  productId: string;
  name: string;
  unit: string;
  price: number;
  sold: number;
  sent: number;
  remaining: number;
}

/**
 * Delivery challans for site delivery. A challan is made from a bill (or on
 * its own for goods not billed yet); one bill can go out on several
 * challans, and each challan can reach the site in part. What is still to
 * send for a bill is its sold quantity, less returns, less what open
 * challans carry and what finished challans delivered.
 *
 * A challan never moves stock or money: the bill already did both. A voided
 * bill cancels its open challans.
 */
@Injectable()
export class DeliveriesService implements OnModuleInit {
  private readonly log = new Logger(DeliveriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.cancelForVoidedSale(tenantId, saleId));
  }

  private async cancelForVoidedSale(tenantId: string, saleId: string) {
    const { count } = await this.prisma.hardwareDelivery.updateMany({
      where: { tenantId, saleId, status: { in: OPEN } },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: 'Bill void ho gaya' },
    });
    if (count) this.log.log(`Cancelled ${count} challan(s) of voided sale ${saleId}`);
  }

  /** Sold, sent and remaining quantity per product of a bill. */
  async billLines(tenantId: string, saleId: string, excludeDeliveryId?: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      select: {
        id: true, saleNumber: true, status: true, shopId: true, soldAt: true, total: true, customerId: true,
        customer: { select: { id: true, name: true, phone: true, address: true, city: true, area: true } },
        items: { select: { productId: true, quantity: true, returnedQty: true, price: true, product: { select: { name: true, unit: true } } } },
      },
    });
    if (!sale) throw new NotFoundException('Bill nahi mila');

    const lines = new Map<string, BillLine>();
    for (const it of sale.items) {
      if (!it.productId || !it.product) continue;
      const net = Math.max(Number(it.quantity) - Number(it.returnedQty || 0), 0);
      const prev = lines.get(it.productId);
      if (prev) prev.sold = r4(prev.sold + net);
      else lines.set(it.productId, { productId: it.productId, name: it.product.name, unit: it.product.unit || 'pcs', price: r2(Number(it.price)), sold: r4(net), sent: 0, remaining: 0 });
    }

    const challans = await this.prisma.hardwareDelivery.findMany({
      where: { tenantId, saleId, status: { not: 'CANCELLED' }, ...(excludeDeliveryId && { id: { not: excludeDeliveryId } }) },
      select: { status: true, items: { select: { productId: true, orderedQty: true, deliveredQty: true } } },
    });
    for (const c of challans) {
      for (const it of c.items) {
        const line = it.productId ? lines.get(it.productId) : undefined;
        if (!line) continue;
        line.sent = r4(line.sent + (DONE.includes(c.status) ? it.deliveredQty : it.orderedQty));
      }
    }
    for (const l of lines.values()) l.remaining = r4(Math.max(l.sold - l.sent, 0));

    const { items: _items, ...head } = sale;
    return { sale: head, lines: [...lines.values()], challanCount: challans.length };
  }

  async create(user: AuthenticatedUser, scope: ShopScope, input: CreateDeliveryDto) {
    const t = user.tenantId;
    const dto = {
      ...input,
      projectId: input.projectId?.trim() || undefined,
      quotationId: input.quotationId?.trim() || undefined,
      saleId: input.saleId?.trim() || undefined,
      customerId: input.customerId?.trim() || undefined,
      customerName: input.customerName?.trim(),
      deliveryAddress: input.deliveryAddress?.trim(),
    };
    if (!dto.customerName) throw new BadRequestException('Customer ka naam likhein');
    if (!dto.deliveryAddress) throw new BadRequestException('Site ka pata likhein');
    if (!dto.items?.length) throw new BadRequestException('Challan me kam se kam ek item dalein');
    if (dto.items.some((it) => !(it.orderedQty > 0))) throw new BadRequestException('Har item ki quantity 0 se zyada honi chahiye');
    const charges = [dto.deliveryCharge, dto.loadingCharge, dto.unloadingCharge, dto.laborCharge, dto.tollCharge];
    if (charges.some((c) => c != null && c < 0)) throw new BadRequestException('Kiraya ya mazdoori manfi nahi ho sakti');
    if (dto.projectId && !(await this.prisma.hardwareProject.findFirst({ where: { id: dto.projectId, tenantId: t }, select: { id: true } }))) throw new NotFoundException('Site / project nahi mila');
    if (dto.quotationId && !(await this.prisma.hardwareQuotation.findFirst({ where: { id: dto.quotationId, tenantId: t }, select: { id: true } }))) throw new NotFoundException('Quotation nahi mili');
    if (dto.customerId && !(await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: t }, select: { id: true } }))) throw new NotFoundException('Customer nahi mila');

    let shopId = scope.shopId ?? undefined;
    if (dto.saleId) {
      const bill = await this.billLines(t, dto.saleId);
      if (bill.sale.status === 'VOIDED') throw new BadRequestException('Void bill ka challan nahi banta');
      const byProduct = new Map(bill.lines.map((l) => [l.productId, l]));
      const asked = new Map<string, number>();
      for (const it of dto.items) {
        const line = it.productId ? byProduct.get(it.productId) : undefined;
        if (!line) throw new BadRequestException(`"${it.itemName}" is bill me nahi hai`);
        asked.set(line.productId, (asked.get(line.productId) ?? 0) + it.orderedQty);
      }
      for (const [productId, qty] of asked) {
        const line = byProduct.get(productId)!;
        if (qty > line.remaining + 1e-6) throw new BadRequestException(`"${line.name}" ki sirf ${line.remaining} ${line.unit} bheji ja sakti hai`);
      }
      dto.customerId ??= bill.sale.customerId ?? undefined;
      shopId = bill.sale.shopId ?? shopId;
    }

    const prefix = `DEL-${new Date().getFullYear()}-`;
    const totalCharges = r2(charges.reduce<number>((s, c) => s + (c ?? 0), 0));
    const products = await this.prisma.product.findMany({
      where: { tenantId: t, id: { in: dto.items.map((i) => i.productId).filter((x): x is string => !!x) } },
      select: { id: true, unit: true },
    });
    const unitOf = new Map(products.map((p) => [p.id, p.unit]));
    const items = dto.items.map((it, idx) => ({
      productId: it.productId && unitOf.has(it.productId) ? it.productId : undefined,
      variantId: it.variantId,
      itemName: it.itemName.trim(),
      brand: it.brand,
      orderedQty: r4(it.orderedQty),
      unit: it.unit ?? slipUnit(it.productId ? unitOf.get(it.productId) : undefined),
      unitPrice: r2(it.unitPrice ?? 0),
      total: r2((it.unitPrice ?? 0) * it.orderedQty),
      notes: it.notes,
      displayOrder: idx,
    }));

    return createWithDocNumber({
      prefix,
      width: 4,
      existing: async () => (await this.prisma.hardwareDelivery.findMany({
        where: { tenantId: t, deliveryNumber: { startsWith: prefix } },
        select: { deliveryNumber: true }, orderBy: { createdAt: 'desc' }, take: LATEST_NUMBERS,
      })).map((d) => d.deliveryNumber),
      create: (deliveryNumber) => this.prisma.hardwareDelivery.create({
        data: {
          tenantId: t,
          shopId,
          deliveryNumber,
          saleId: dto.saleId,
          projectId: dto.projectId,
          quotationId: dto.quotationId,
          customerId: dto.customerId,
          customerName: dto.customerName!,
          customerPhone: dto.customerPhone,
          deliveryAddress: dto.deliveryAddress!,
          city: dto.city,
          area: dto.area,
          latitude: dto.latitude,
          longitude: dto.longitude,
          landmark: dto.landmark,
          siteContactName: dto.siteContactName,
          siteContactPhone: dto.siteContactPhone,
          vehicleType: dto.vehicleType ?? 'PICKUP',
          vehicleNumber: dto.vehicleNumber,
          driverName: dto.driverName,
          driverPhone: dto.driverPhone,
          driverCnic: dto.driverCnic,
          helperName: dto.helperName,
          scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
          scheduledTime: dto.scheduledTime,
          distanceKm: dto.distanceKm,
          deliveryCharge: dto.deliveryCharge ?? 0,
          loadingCharge: dto.loadingCharge ?? 0,
          unloadingCharge: dto.unloadingCharge ?? 0,
          laborCharge: dto.laborCharge ?? 0,
          tollCharge: dto.tollCharge ?? 0,
          totalCharges,
          ...(dto.vehicleNumber || dto.driverName ? { status: 'SCHEDULED' as const } : {}),
          loadingInstructions: dto.loadingInstructions,
          driverInstructions: dto.driverInstructions,
          customerNotes: dto.customerNotes,
          internalNotes: dto.internalNotes,
          createdById: user.id,
          items: { create: items },
        },
        include: { items: { orderBy: { displayOrder: 'asc' } } },
      }),
    });
  }

  private pageWhere(user: AuthenticatedUser, scope: ShopScope, q: DeliveryPageQuery): Prisma.HardwareDeliveryWhereInput {
    const search = q.search?.trim();
    return {
      tenantId: user.tenantId,
      ...scope.whereLoose,
      ...(q.saleId && { saleId: q.saleId }),
      ...(q.projectId && { projectId: q.projectId }),
      ...(q.customerId && { customerId: q.customerId }),
      ...(q.from || q.to ? { createdAt: { ...(q.from && { gte: new Date(q.from) }), ...(q.to && { lte: new Date(q.to) }) } } : {}),
      ...(search && {
        OR: [
          { deliveryNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search } },
          { deliveryAddress: { contains: search, mode: 'insensitive' } },
          { vehicleNumber: { contains: search, mode: 'insensitive' } },
          { driverName: { contains: search, mode: 'insensitive' } },
          { items: { some: { itemName: { contains: search, mode: 'insensitive' } } } },
        ],
      }),
    };
  }

  private tabWhere(tab: DeliveryTab): Prisma.HardwareDeliveryWhereInput {
    switch (tab) {
      case 'open': return { status: { in: OPEN } };
      case 'today': return { status: { in: OPEN }, scheduledDate: { lte: endOfDayTz() } };
      case 'partial': return { status: 'PARTIALLY_DELIVERED' };
      case 'delivered': return { status: 'DELIVERED' };
      case 'cancelled': return { status: { in: ['CANCELLED', 'FAILED', 'RETURNED'] } };
      default: return {};
    }
  }

  /** Server-side list for the challans page: one page, counts per tab, charges total. */
  async page(user: AuthenticatedUser, scope: ShopScope, q: DeliveryPageQuery) {
    const tab: DeliveryTab = (TABS as readonly string[]).includes(q.tab ?? '') ? (q.tab as DeliveryTab) : 'all';
    const limit = Math.min(Math.max(Number(q.limit) || 25, 1), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    const base = this.pageWhere(user, scope, q);
    const where = { AND: [base, this.tabWhere(tab)] };

    const [items, total, ...counts] = await Promise.all([
      this.prisma.hardwareDelivery.findMany({
        where,
        include: { items: { orderBy: { displayOrder: 'asc' } }, project: { select: { id: true, name: true, projectNumber: true } } },
        orderBy: tab === 'open' || tab === 'today' ? [{ scheduledDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }] : [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.hardwareDelivery.count({ where }),
      ...TABS.map((t) => this.prisma.hardwareDelivery.count({ where: { AND: [base, this.tabWhere(t)] } })),
    ]);
    const charges = await this.prisma.hardwareDelivery.aggregate({
      where: { AND: [base, { status: { notIn: ['CANCELLED'] } }] },
      _sum: { totalCharges: true },
    });

    const sales = await this.saleNumbers(user.tenantId, items.map((d) => d.saleId));
    return {
      items: items.map((d) => ({ ...d, saleNumber: d.saleId ? sales.get(d.saleId) ?? null : null })),
      total,
      page,
      limit,
      counts: Object.fromEntries(TABS.map((t, i) => [t, counts[i]])) as Record<DeliveryTab, number>,
      charges: r2(charges._sum.totalCharges ?? 0),
    };
  }

  private async saleNumbers(tenantId: string, ids: Array<string | null>) {
    const list = [...new Set(ids.filter((x): x is string => !!x))];
    if (!list.length) return new Map<string, string>();
    const rows = await this.prisma.sale.findMany({ where: { tenantId, id: { in: list } }, select: { id: true, saleNumber: true } });
    return new Map(rows.map((s) => [s.id, s.saleNumber]));
  }

  /** Challan status per bill, for the sales history marks. */
  async forSales(user: AuthenticatedUser, saleIds: string[]) {
    const ids = [...new Set(saleIds.filter(Boolean))].slice(0, 200);
    if (!ids.length) return {};
    const rows = await this.prisma.hardwareDelivery.findMany({
      where: { tenantId: user.tenantId, saleId: { in: ids }, status: { not: 'CANCELLED' } },
      select: { saleId: true, status: true, deliveryNumber: true },
      orderBy: { createdAt: 'asc' },
    });
    const out: Record<string, { count: number; open: number; numbers: string[] }> = {};
    for (const r of rows) {
      const o = (out[r.saleId!] ??= { count: 0, open: 0, numbers: [] });
      o.count += 1;
      if (OPEN.includes(r.status)) o.open += 1;
      o.numbers.push(r.deliveryNumber);
    }
    return out;
  }

  async list(user: AuthenticatedUser, scope: ShopScope, params: { status?: string; projectId?: string; customerId?: string; vehicleType?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.hardwareDelivery.findMany({
      where: {
        ...this.pageWhere(user, scope, { search: params.search, projectId: params.projectId, customerId: params.customerId }),
        ...(params.status && { status: params.status as HardwareDeliveryStatus }),
        ...(params.vehicleType && { vehicleType: params.vehicleType as Prisma.EnumHardwareDeliveryVehicleTypeFilter['equals'] }),
        ...(params.from || params.to ? {
          scheduledDate: { ...(params.from && { gte: new Date(params.from) }), ...(params.to && { lte: new Date(params.to) }) },
        } : {}),
      },
      include: { items: { take: 3 }, project: true },
      orderBy: [{ status: 'asc' }, { scheduledDate: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const d = await this.prisma.hardwareDelivery.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: { orderBy: { displayOrder: 'asc' } }, project: true },
    });
    if (!d) throw new NotFoundException('Challan nahi mila');
    const saleNumber = d.saleId ? (await this.saleNumbers(user.tenantId, [d.saleId])).get(d.saleId) ?? null : null;
    return { ...d, saleNumber };
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateDeliveryStatusDto) {
    const d = await this.prisma.hardwareDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Challan nahi mila');
    if (dto.status === d.status) return this.getOne(user, id);
    if (dto.status === 'DELIVERED' || dto.status === 'PARTIALLY_DELIVERED') {
      throw new BadRequestException('Pohanchne ki tasdeeq "Pohanch gaya" se karein — har item ki quantity ke saath');
    }
    if (!NEXT[d.status]?.includes(dto.status)) throw new BadRequestException('Ye challan is haalat se aage nahi badal sakta');
    if (dto.status === 'CANCELLED' && !dto.cancellationReason?.trim()) throw new BadRequestException('Cancel karne ki wajah likhein');

    const now = new Date();
    const patch: Prisma.HardwareDeliveryUpdateInput = { status: dto.status };
    if (dto.status === 'LOADED') patch.loadedAt = now;
    if (dto.status === 'DISPATCHED' || dto.status === 'IN_TRANSIT') { patch.dispatchedAt = d.dispatchedAt ?? now; patch.dispatchedById = d.dispatchedById ?? user.id; }
    if (dto.status === 'CANCELLED') { patch.cancelledAt = now; patch.cancellationReason = dto.cancellationReason!.trim(); }
    if (dto.issueReported) patch.issueReported = dto.issueReported;
    await this.prisma.hardwareDelivery.update({ where: { id }, data: patch });
    return this.getOne(user, id);
  }

  async confirmDelivery(user: AuthenticatedUser, id: string, dto: ConfirmDeliveryDto) {
    const d = await this.prisma.hardwareDelivery.findFirst({ where: { id, tenantId: user.tenantId }, include: { items: true } });
    if (!d) throw new NotFoundException('Challan nahi mila');
    if (!OPEN.includes(d.status)) throw new BadRequestException('Ye challan pehle hi band ho chuka hai');

    const given = new Map((dto.deliveredItems ?? []).map((x) => [x.itemId, x]));
    for (const x of given.values()) {
      const it = d.items.find((i) => i.id === x.itemId);
      if (!it) throw new BadRequestException('Item is challan ka nahi');
      const delivered = Number(x.deliveredQty), damaged = Number(x.damagedQty ?? 0);
      if (!(delivered >= 0) || !(damaged >= 0)) throw new BadRequestException(`"${it.itemName}" ki quantity ghalat hai`);
      if (delivered + damaged > it.orderedQty + 1e-6) throw new BadRequestException(`"${it.itemName}" challan (${it.orderedQty}) se zyada nahi pohanch sakta`);
    }
    const rows = d.items.map((it) => {
      const x = given.get(it.id);
      const deliveredQty = x ? r4(Number(x.deliveredQty)) : it.orderedQty;
      const damagedQty = x ? r4(Number(x.damagedQty ?? 0)) : 0;
      return { id: it.id, deliveredQty, damagedQty, returnedQty: r4(Math.max(it.orderedQty - deliveredQty - damagedQty, 0)), full: deliveredQty >= it.orderedQty - 1e-6 };
    });
    if (rows.every((r) => r.deliveredQty <= 0)) throw new BadRequestException('Kuch bhi nahi pohancha? Challan cancel karein ya "Nahi pohancha" chunein');

    await this.prisma.$transaction([
      ...rows.map((r) => this.prisma.hardwareDeliveryItem.update({
        where: { id: r.id },
        data: { deliveredQty: r.deliveredQty, damagedQty: r.damagedQty, returnedQty: r.returnedQty },
      })),
      this.prisma.hardwareDelivery.update({
        where: { id },
        data: {
          status: rows.every((r) => r.full) ? 'DELIVERED' : 'PARTIALLY_DELIVERED',
          deliveredAt: new Date(),
          receivedByName: dto.receivedByName?.trim() || undefined,
          receivedByPhone: dto.receivedByPhone?.trim() || undefined,
          receivedByCnic: dto.receivedByCnic?.trim() || undefined,
          receiverSignatureUrl: dto.receiverSignatureUrl,
          deliveryProofUrls: dto.deliveryProofUrls ?? [],
          gateEntryNumber: dto.gateEntryNumber?.trim() || undefined,
          ...(dto.issueReported?.trim() && { issueReported: dto.issueReported.trim() }),
        },
      }),
    ]);
    return this.getOne(user, id);
  }

  async assignVehicle(user: AuthenticatedUser, id: string, dto: { vehicleType?: string; vehicleNumber?: string; driverName?: string; driverPhone?: string; driverCnic?: string; helperName?: string; scheduledDate?: string; scheduledTime?: string }) {
    const d = await this.prisma.hardwareDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Challan nahi mila');
    if (!OPEN.includes(d.status)) throw new BadRequestException('Ye challan mukammal ya cancel ho chuka hai');
    // Only the driver fields; the body is untyped, so nothing else may reach the row.
    const pick = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
    const vehicles = ['PICKUP', 'MINI_TRUCK', 'TRUCK', 'TRAILER', 'DUMPER', 'CRANE', 'RICKSHAW', 'MOTORCYCLE', 'CUSTOMER_PICKUP', 'OTHER'];
    const vehicleType = pick(dto?.vehicleType);
    if (vehicleType && !vehicles.includes(vehicleType)) throw new BadRequestException('Gaari ka type ghalat hai');
    const date = pick(dto?.scheduledDate);
    if (date && Number.isNaN(new Date(date).getTime())) throw new BadRequestException('Tareekh ghalat hai');
    await this.prisma.hardwareDelivery.update({
      where: { id },
      data: {
        vehicleType: vehicleType as Prisma.HardwareDeliveryUpdateInput['vehicleType'],
        vehicleNumber: pick(dto?.vehicleNumber),
        driverName: pick(dto?.driverName),
        driverPhone: pick(dto?.driverPhone),
        driverCnic: pick(dto?.driverCnic),
        helperName: pick(dto?.helperName),
        scheduledDate: date ? new Date(date) : undefined,
        scheduledTime: pick(dto?.scheduledTime),
        ...(d.status === 'PENDING' && { status: 'SCHEDULED' }),
      },
    });
    return this.getOne(user, id);
  }

  /** Challans are records of goods sent: "delete" cancels and keeps the slip. */
  async remove(user: AuthenticatedUser, id: string, reason?: string) {
    const d = await this.prisma.hardwareDelivery.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!d) throw new NotFoundException('Challan nahi mila');
    if (!OPEN.includes(d.status)) throw new BadRequestException('Pohancha hua challan cancel nahi hota');
    return this.updateStatus(user, id, { status: 'CANCELLED', cancellationReason: reason?.trim() || 'Cancel kiya gaya' });
  }

  async summary(user: AuthenticatedUser, scope: ShopScope) {
    const base = { tenantId: user.tenantId, ...scope.whereLoose };
    const [pending, inTransit, delivered, todayScheduled] = await Promise.all([
      this.prisma.hardwareDelivery.count({ where: { ...base, status: { in: ['PENDING', 'SCHEDULED'] } } }),
      this.prisma.hardwareDelivery.count({ where: { ...base, status: { in: ['LOADED', 'DISPATCHED', 'IN_TRANSIT'] } } }),
      this.prisma.hardwareDelivery.aggregate({ where: { ...base, status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] } }, _count: { _all: true }, _sum: { totalCharges: true } }),
      this.prisma.hardwareDelivery.count({ where: { ...base, status: { in: OPEN }, scheduledDate: { gte: startOfDayTz(), lte: endOfDayTz() } } }),
    ]);
    return {
      pending,
      inTransit,
      deliveredCount: delivered._count._all,
      deliveredRevenue: r2(delivered._sum.totalCharges ?? 0),
      todayScheduled,
    };
  }
}
