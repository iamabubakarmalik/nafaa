import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, Prisma, UsedPhoneCondition, UsedPhoneStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import type { CreateSaleDto } from '../../../modules/sales/sales/dto/create-sale.dto';
import { ShopScope } from '../../../common/shop-scope';
import { startOfDayTz, subDaysTz } from '../../../common/helpers/business-time.helper';
import { CreateUsedPhoneDto } from './dto/create-used-phone.dto';
import { UpdateUsedPhoneDto } from './dto/update-used-phone.dto';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { QueryUsedPhonesDto } from './dto/query-used-phones.dto';
import { assertOwnCustomer, assertOwnShop, normaliseCnic } from '../common/mobile-common';

/** Statuses a phone can be moved to by hand. SOLD comes from a bill, IN_TRANSIT from a transfer. */
const MANUAL_STATUS: UsedPhoneStatus[] = ['PENDING_INSPECTION', 'IN_STOCK', 'REPAIRING', 'RETURNED'];

@Injectable()
export class UsedPhonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  // ════════════════════════════════════════════════════════
  // VALUATION HELPER — suggested buy-back price from condition
  // ════════════════════════════════════════════════════════

  /** Suggested buy-back price as a share of the market price of a like-new unit. */
  estimateValuation(input: {
    referencePrice: number;
    condition: UsedPhoneCondition;
    modelYear?: number;
    hasOriginalBox?: boolean;
    hasOriginalCharger?: boolean;
    hasOriginalReceipt?: boolean;
    hasWarrantyLeft?: boolean;
    batteryHealth?: number;
  }): { suggestedBuyback: number; multiplier: number; reasoning: string[] } {
    const reasoning: string[] = [];
    const conditionMultipliers: Record<UsedPhoneCondition, number> = {
      EXCELLENT: 0.85,
      VERY_GOOD: 0.75,
      GOOD: 0.65,
      FAIR: 0.50,
      POOR: 0.30,
    };
    const reference = Math.max(Number(input.referencePrice) || 0, 0);
    let multiplier = conditionMultipliers[input.condition] ?? conditionMultipliers.GOOD;
    reasoning.push(`Halat ${input.condition}: ${(multiplier * 100).toFixed(0)}%`);

    if (input.modelYear) {
      const age = new Date().getFullYear() - input.modelYear;
      if (age > 1) {
        const agePenalty = Math.min((age - 1) * 0.03, 0.20);
        multiplier -= agePenalty;
        reasoning.push(`${age} saal purana: -${(agePenalty * 100).toFixed(0)}%`);
      }
    }
    if (input.hasOriginalBox) { multiplier += 0.02; reasoning.push('Dabba: +2%'); }
    if (input.hasOriginalCharger) { multiplier += 0.02; reasoning.push('Charger: +2%'); }
    if (input.hasOriginalReceipt) { multiplier += 0.03; reasoning.push('Raseed: +3%'); }
    if (input.hasWarrantyLeft) { multiplier += 0.05; reasoning.push('Warranty baqi: +5%'); }
    if (input.batteryHealth !== undefined && input.batteryHealth < 80) {
      const batteryPenalty = ((80 - input.batteryHealth) / 100) * 0.5;
      multiplier -= batteryPenalty;
      reasoning.push(`Battery ${input.batteryHealth}%: -${(batteryPenalty * 100).toFixed(0)}%`);
    }

    multiplier = Math.max(0.10, Math.min(multiplier, 0.95));
    return { suggestedBuyback: Math.round(reference * multiplier), multiplier, reasoning };
  }

  // ════════════════════════════════════════════════════════
  // CREATE (buy-back, exchange or consignment intake)
  // ════════════════════════════════════════════════════════

  async create(user: AuthenticatedUser, dto: CreateUsedPhoneDto) {
    if (dto.imei2 && dto.imei2 === dto.imei1) throw new BadRequestException('IMEI 1 aur IMEI 2 ek jaise nahi ho sakte');
    const held = await this.heldWithImei(user.tenantId, dto.imei1);
    if (held) {
      throw new ConflictException(`IMEI ${dto.imei1} abhi dukaan me hai (used phone ${held.usedPhoneCode}) — usi record ko kholein`);
    }
    // A phone still on our shelf as new stock cannot be bought in again;
    // one we sold earlier can (a customer selling it back is normal).
    const onShelf = await this.prisma.productImei.findFirst({
      where: { tenantId: user.tenantId, status: { not: 'SOLD' }, OR: [{ imei1: dto.imei1 }, { imei2: dto.imei1 }] },
      select: { status: true },
    });
    if (onShelf) {
      throw new ConflictException(`IMEI ${dto.imei1} naye phone ke stock me hai (${onShelf.status}) — ye wapas khareeda nahi ja sakta`);
    }
    if (dto.status && !['PENDING_INSPECTION', 'IN_STOCK'].includes(dto.status)) {
      throw new BadRequestException('Naya used phone "Check baqi" ya "Stock" me hi aata hai');
    }
    await assertOwnShop(this.prisma, user, dto.shopId);
    await assertOwnCustomer(this.prisma, user, dto.fromCustomerId);
    const cnic = normaliseCnic(dto.fromCustomerCnic);

    // A seller already on the customer list is linked by phone number.
    let fromCustomerId = dto.fromCustomerId;
    const sellerPhone = dto.fromCustomerPhone?.trim();
    if (!fromCustomerId && sellerPhone) {
      fromCustomerId = (await this.prisma.customer.findFirst({
        where: { tenantId: user.tenantId, phone: sellerPhone, isActive: true },
        select: { id: true },
      }))?.id;
    }

    const year = new Date().getFullYear();
    const prefix = `UP-${year}-`;
    const last = await this.prisma.usedPhone.findFirst({
      where: { tenantId: user.tenantId, usedPhoneCode: { startsWith: prefix } },
      orderBy: { usedPhoneCode: 'desc' },
      select: { usedPhoneCode: true },
    });
    let nextNum = 1;
    if (last?.usedPhoneCode) {
      const n = parseInt(last.usedPhoneCode.split('-').pop() ?? '', 10);
      if (!isNaN(n)) nextNum = n + 1;
    }
    const usedPhoneCode = `${prefix}${String(nextNum).padStart(4, '0')}`;
    const shopId = dto.shopId ?? user.shopId ?? null;
    const buyback = dto.buybackPrice ?? 0;
    const refurbish = dto.refurbishCost ?? 0;

    const phone = await this.prisma.usedPhone.create({
      data: {
        tenantId: user.tenantId,
        shopId,
        usedPhoneCode,
        imei1: dto.imei1,
        imei2: dto.imei2,
        serialNumber: dto.serialNumber,
        brand: dto.brand.trim(),
        model: dto.model.trim(),
        storage: dto.storage,
        ram: dto.ram,
        color: dto.color,
        modelYear: dto.modelYear,
        ptaStatus: dto.ptaStatus ?? 'PENDING',
        ptaTaxPaid: dto.ptaTaxPaid ?? 0,
        condition: dto.condition ?? 'GOOD',
        conditionNotes: dto.conditionNotes,
        hasOriginalBox: dto.hasOriginalBox ?? false,
        hasOriginalCharger: dto.hasOriginalCharger ?? false,
        hasOriginalCable: dto.hasOriginalCable ?? false,
        hasOriginalEarphones: dto.hasOriginalEarphones ?? false,
        hasOriginalReceipt: dto.hasOriginalReceipt ?? false,
        hasWarrantyLeft: dto.hasWarrantyLeft ?? false,
        warrantyExpiryDate: dto.warrantyExpiryDate ? new Date(dto.warrantyExpiryDate) : null,
        source: dto.source ?? 'CASH_BUYBACK',
        buybackPrice: buyback,
        estimatedValue: dto.estimatedValue ?? 0,
        refurbishCost: refurbish,
        totalCost: buyback + refurbish,
        resalePrice: dto.resalePrice ?? 0,
        fromCustomerId,
        fromCustomerName: dto.fromCustomerName?.trim() || undefined,
        fromCustomerPhone: sellerPhone || undefined,
        fromCustomerCnic: cnic,
        cnicPhotoUrl: dto.cnicPhotoUrl,
        imeiPhotoUrl: dto.imeiPhotoUrl,
        devicePhotos: dto.devicePhotos ?? [],
        status: dto.status ?? 'PENDING_INSPECTION',
        notes: dto.notes,
        createdById: user.id,
      },
      include: {
        shop: { select: { id: true, name: true } },
        fromCustomer: { select: { id: true, name: true, phone: true } },
      },
    });

    if (phone.source === 'CASH_BUYBACK' && buyback > 0) {
      const paidFromDrawer = await this.payFromDrawer(user, phone.shopId, buyback, phone.usedPhoneCode, `${phone.brand} ${phone.model}`);
      return { ...phone, paidFromDrawer };
    }
    return phone;
  }

  /**
   * The used-phone record that still holds this IMEI: anything not sold or
   * discarded. A phone sold earlier can be bought back as a new record.
   */
  private heldWithImei(tenantId: string, imei: string, exceptId?: string) {
    return this.prisma.usedPhone.findFirst({
      where: {
        tenantId,
        OR: [{ imei1: imei }, { imei2: imei }],
        status: { notIn: ['SOLD', 'DISCARDED'] },
        ...(exceptId && { id: { not: exceptId } }),
      },
      select: { id: true, usedPhoneCode: true, status: true },
    });
  }

  /** Earlier and later records of the same phone (bought back after a sale). */
  private async history(tenantId: string, phone: { id: string; imei1: string }) {
    return this.prisma.usedPhone.findMany({
      where: { tenantId, imei1: phone.imei1, id: { not: phone.id } },
      select: {
        id: true, usedPhoneCode: true, status: true, source: true, receivedAt: true, soldAt: true,
        buybackPrice: true, finalSoldPrice: true, fromCustomerName: true, soldSaleId: true,
      },
      orderBy: { receivedAt: 'asc' },
    });
  }

  /**
   * Cash paid to the seller of a used phone leaves the open drawer, so the
   * register closes without a false shortage. Without an open register
   * there is no drawer to correct.
   */
  private async payFromDrawer(user: AuthenticatedUser, shopId: string | null, amount: number, code: string, device: string): Promise<boolean> {
    const register = await this.prisma.cashRegister.findFirst({
      where: { tenantId: user.tenantId, status: 'OPEN', ...(shopId && { shopId }) },
      orderBy: { openedAt: 'desc' },
      select: { id: true },
    });
    if (!register) return false;
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.cashRegister.updateMany({
        where: { id: register.id, status: 'OPEN' },
        data: { expectedBalance: { decrement: amount }, totalCashOut: { increment: amount } },
      });
      if (!claimed.count) return false;
      await tx.cashTransaction.create({
        data: {
          tenantId: user.tenantId, cashRegisterId: register.id, createdById: user.id,
          type: 'CASH_OUT', amount, reason: `Used phone khareeda ${code}`, note: device, reference: `usedphone:${code}`,
        },
      });
      return true;
    });
  }

  /** True once the seller was paid from the drawer for this phone. */
  private async paidFromDrawer(tenantId: string, code: string) {
    return !!(await this.prisma.cashTransaction.findFirst({
      where: { tenantId, reference: `usedphone:${code}` },
      select: { id: true },
    }));
  }

  /** The live bill that used this exchange phone as a trade-in, if any. */
  private async tradeInBill(tenantId: string, code: string) {
    const row = await this.prisma.salePayment.findFirst({
      where: { tenantId, method: 'TRADE_IN', reference: code, sale: { status: { not: 'VOIDED' } } },
      select: { sale: { select: { id: true, saleNumber: true } } },
    });
    return row?.sale ?? null;
  }

  /**
   * Phones taken in as an exchange (type Exchange) that no live bill has used
   * as a trade-in yet. The POS offers these as a TRADE_IN payment.
   */
  async openTradeIns(user: AuthenticatedUser) {
    const used = await this.prisma.salePayment.findMany({
      where: { tenantId: user.tenantId, method: 'TRADE_IN', reference: { not: null }, sale: { status: { not: 'VOIDED' } } },
      select: { reference: true },
    });
    const taken = used.map((u) => u.reference!).filter(Boolean);
    return this.prisma.usedPhone.findMany({
      where: {
        tenantId: user.tenantId, source: 'EXCHANGE', status: { not: 'DISCARDED' }, buybackPrice: { gt: 0 },
        ...(taken.length && { usedPhoneCode: { notIn: taken } }),
      },
      select: {
        id: true, usedPhoneCode: true, brand: true, model: true, storage: true, color: true,
        buybackPrice: true, fromCustomerName: true, fromCustomerId: true, receivedAt: true,
      },
      orderBy: { receivedAt: 'desc' },
      take: 50,
    });
  }

  // ════════════════════════════════════════════════════════
  // LIST + DETAIL
  // ════════════════════════════════════════════════════════

  private listWhere(user: AuthenticatedUser, query: QueryUsedPhonesDto, withStatus = true): Prisma.UsedPhoneWhereInput {
    const q = query.search?.trim();
    const and: Prisma.UsedPhoneWhereInput[] = [];
    if (q) {
      and.push({
        OR: [
          { imei1: { contains: q } },
          { imei2: { contains: q } },
          { serialNumber: { contains: q, mode: 'insensitive' as const } },
          { brand: { contains: q, mode: 'insensitive' as const } },
          { model: { contains: q, mode: 'insensitive' as const } },
          { usedPhoneCode: { contains: q, mode: 'insensitive' as const } },
          { fromCustomerName: { contains: q, mode: 'insensitive' as const } },
          { fromCustomerPhone: { contains: q } },
          { fromCustomerCnic: { contains: q } },
        ],
      });
    }
    const ok = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
    if (ok(query.from) || ok(query.to)) {
      const r: Prisma.DateTimeFilter = {};
      if (ok(query.from)) r.gte = startOfDayTz(new Date(`${query.from}T12:00:00Z`));
      if (ok(query.to)) r.lt = startOfDayTz(new Date(new Date(`${query.to}T12:00:00Z`).getTime() + 86_400_000));
      and.push(query.status === 'SOLD' ? { soldAt: r } : { receivedAt: r });
    }
    if (query.agedDays && query.agedDays > 0) {
      and.push({ status: 'IN_STOCK', receivedAt: { lte: subDaysTz(new Date(), query.agedDays) } });
    }
    return {
      tenantId: user.tenantId,
      ...(query.shopId && { shopId: query.shopId }),
      ...(withStatus && query.status && { status: query.status }),
      ...(query.condition && { condition: query.condition }),
      ...(query.source && { source: query.source }),
      ...(query.ptaStatus && { ptaStatus: query.ptaStatus }),
      ...(query.brand && { brand: { contains: query.brand, mode: 'insensitive' } }),
      ...(and.length && { AND: and }),
    };
  }

  async findAll(user: AuthenticatedUser, query: QueryUsedPhonesDto) {
    const where = this.listWhere(user, query);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 200);
    const orderBy: Prisma.UsedPhoneOrderByWithRelationInput[] =
      query.sort === 'old' ? [{ receivedAt: 'asc' }]
        : query.sort === 'priceHigh' ? [{ resalePrice: 'desc' }]
          : query.sort === 'margin' ? [{ resalePrice: 'desc' }, { totalCost: 'asc' }]
            : query.sort === 'sold' ? [{ soldAt: { sort: 'desc', nulls: 'last' } }]
              : [{ receivedAt: 'desc' }];

    const [items, total, byStatus, sums] = await Promise.all([
      this.prisma.usedPhone.findMany({
        where,
        include: {
          shop: { select: { id: true, name: true } },
          fromCustomer: { select: { id: true, name: true, phone: true } },
          _count: { select: { inspections: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.usedPhone.count({ where }),
      this.prisma.usedPhone.groupBy({ by: ['status'], where: this.listWhere(user, query, false), _count: { _all: true } }),
      this.prisma.usedPhone.aggregate({ where, _sum: { totalCost: true, resalePrice: true, finalSoldPrice: true } }),
    ]);

    const now = Date.now();
    return {
      items: items.map((p) => ({ ...p, daysInStock: Math.max(0, Math.floor((now - p.receivedAt.getTime()) / 86_400_000)) })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      counts: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])) as Partial<Record<UsedPhoneStatus, number>>,
      totals: {
        cost: Number(sums._sum.totalCost ?? 0),
        resale: Number(sums._sum.resalePrice ?? 0),
        sold: Number(sums._sum.finalSoldPrice ?? 0),
      },
    };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const phone = await this.prisma.usedPhone.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        shop: { select: { id: true, name: true } },
        fromCustomer: { select: { id: true, name: true, phone: true, cnic: true } },
        inspections: { orderBy: { inspectedAt: 'desc' } },
      },
    });
    if (!phone) throw new NotFoundException('Used phone nahi mila');
    return phone;
  }

  /** Detail plus where the money went: drawer payment, trade-in bill, resale bill. */
  async detail(user: AuthenticatedUser, id: string) {
    const phone = await this.findOne(user, id);
    const [paid, tradeIn, sale, history] = await Promise.all([
      this.paidFromDrawer(user.tenantId, phone.usedPhoneCode),
      this.tradeInBill(user.tenantId, phone.usedPhoneCode),
      phone.soldSaleId
        ? this.prisma.sale.findFirst({
            where: { id: phone.soldSaleId, tenantId: user.tenantId },
            select: { id: true, saleNumber: true, status: true, createdAt: true, total: true, customer: { select: { id: true, name: true, phone: true } } },
          })
        : null,
      this.history(user.tenantId, phone),
    ]);
    return { ...phone, paidFromDrawer: paid, tradeInBill: tradeIn, sale, history };
  }

  async stats(user: AuthenticatedUser) {
    const [byStatus, byCondition, totalValue, soldStats] = await Promise.all([
      this.prisma.usedPhone.groupBy({
        by: ['status'],
        where: { tenantId: user.tenantId },
        _count: { _all: true },
      }),
      this.prisma.usedPhone.groupBy({
        by: ['condition'],
        where: { tenantId: user.tenantId, status: 'IN_STOCK' },
        _count: { _all: true },
      }),
      this.prisma.usedPhone.aggregate({
        where: { tenantId: user.tenantId, status: 'IN_STOCK' },
        _sum: { totalCost: true, resalePrice: true },
      }),
      this.prisma.usedPhone.aggregate({
        where: { tenantId: user.tenantId, status: 'SOLD' },
        _sum: { totalCost: true, finalSoldPrice: true },
        _count: { _all: true },
      }),
    ]);

    const totalProfit = (soldStats._sum.finalSoldPrice ?? 0) - (soldStats._sum.totalCost ?? 0);

    return {
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      byCondition: byCondition.map((c) => ({ condition: c.condition, count: c._count._all })),
      inStockCost: totalValue._sum.totalCost ?? 0,
      inStockResaleValue: totalValue._sum.resalePrice ?? 0,
      potentialProfit: (totalValue._sum.resalePrice ?? 0) - (totalValue._sum.totalCost ?? 0),
      totalSold: soldStats._count._all,
      totalRevenue: soldStats._sum.finalSoldPrice ?? 0,
      totalProfit,
    };
  }

  // ════════════════════════════════════════════════════════
  // UPDATE
  // ════════════════════════════════════════════════════════

  /**
   * Edits the phone's details. Money already paid or used on a bill keeps
   * its amount, and status moves only between the hand-set ones.
   */
  async update(user: AuthenticatedUser, id: string, dto: UpdateUsedPhoneDto) {
    const phone = await this.findOne(user, id);
    if (phone.status === 'SOLD' || phone.status === 'DISCARDED') {
      const allowed = ['notes', 'conditionNotes', 'devicePhotos', 'imeiPhotoUrl', 'cnicPhotoUrl'];
      const touched = Object.keys(dto).filter((k) => (dto as Record<string, unknown>)[k] !== undefined);
      if (touched.some((k) => !allowed.includes(k))) {
        throw new BadRequestException(`${phone.usedPhoneCode} ${phone.status === 'SOLD' ? 'bik chuka' : 'discard ho chuka'} hai — sirf note aur tasveerein badal sakti hain`);
      }
    }
    if (dto.status && dto.status !== phone.status && !MANUAL_STATUS.includes(dto.status)) {
      throw new BadRequestException('Ye halat yahan se nahi lagti — bechne ke liye POS, hatane ke liye Discard');
    }
    const moneyChanged = (dto.buybackPrice !== undefined && Number(dto.buybackPrice) !== Number(phone.buybackPrice))
      || (dto.source !== undefined && dto.source !== phone.source);
    if (moneyChanged) {
      if (await this.paidFromDrawer(user.tenantId, phone.usedPhoneCode)) {
        throw new BadRequestException('Is phone ke paise galle se diye ja chuke hain — khareed ki qeemat ab nahi badal sakti');
      }
      const bill = await this.tradeInBill(user.tenantId, phone.usedPhoneCode);
      if (bill) throw new BadRequestException(`Ye phone bill ${bill.saleNumber} me trade-in laga hai — qeemat nahi badal sakti`);
    }
    if (dto.imei1 && dto.imei1 !== phone.imei1) {
      const held = await this.heldWithImei(user.tenantId, dto.imei1, id);
      if (held) throw new ConflictException(`IMEI ${dto.imei1} abhi dukaan me hai (used phone ${held.usedPhoneCode})`);
    }
    if (dto.shopId !== undefined) await assertOwnShop(this.prisma, user, dto.shopId);
    if (dto.fromCustomerId !== undefined) await assertOwnCustomer(this.prisma, user, dto.fromCustomerId);

    const buyback = dto.buybackPrice ?? phone.buybackPrice;
    const refurbish = dto.refurbishCost ?? phone.refurbishCost;
    const { warrantyExpiryDate, fromCustomerCnic, ...rest } = dto;

    return this.prisma.usedPhone.update({
      where: { id },
      data: {
        ...rest,
        ...(fromCustomerCnic !== undefined && { fromCustomerCnic: normaliseCnic(fromCustomerCnic) ?? null }),
        totalCost: Number(buyback) + Number(refurbish),
        ...(warrantyExpiryDate !== undefined && { warrantyExpiryDate: warrantyExpiryDate ? new Date(warrantyExpiryDate) : null }),
      },
      include: {
        shop: { select: { id: true, name: true } },
        fromCustomer: { select: { id: true, name: true } },
      },
    });
  }

  // ════════════════════════════════════════════════════════
  // INSPECTION
  // ════════════════════════════════════════════════════════

  async addInspection(user: AuthenticatedUser, usedPhoneId: string, dto: CreateInspectionDto) {
    const phone = await this.findOne(user, usedPhoneId);
    if (['SOLD', 'DISCARDED', 'IN_TRANSIT'].includes(phone.status)) {
      throw new BadRequestException(`${phone.usedPhoneCode} abhi ${phone.status} hai — check nahi ho sakta`);
    }
    const refurbish = dto.estimatedRepairCost ?? Number(phone.refurbishCost);

    return this.prisma.$transaction(async (tx) => {
      const inspection = await tx.usedPhoneInspection.create({
        data: {
          usedPhoneId,
          tenantId: user.tenantId,
          screenCondition: dto.screenCondition,
          bodyCondition: dto.bodyCondition,
          cameraWorks: dto.cameraWorks,
          speakerWorks: dto.speakerWorks,
          microphoneWorks: dto.microphoneWorks,
          chargingPortWorks: dto.chargingPortWorks,
          buttonsWork: dto.buttonsWork,
          faceIdFingerprintWorks: dto.faceIdFingerprintWorks,
          batteryHealth: dto.batteryHealth,
          imeiUnlocked: dto.imeiUnlocked,
          icloudUnlocked: dto.icloudUnlocked,
          softwareIssues: dto.softwareIssues,
          needsRepair: dto.needsRepair ?? false,
          estimatedRepairCost: dto.estimatedRepairCost ?? 0,
          recommendedActions: dto.recommendedActions,
          inspectedById: user.id,
        },
      });

      await tx.usedPhone.update({
        where: { id: usedPhoneId },
        data: {
          inspectedAt: new Date(),
          inspectedById: user.id,
          status: dto.needsRepair ? 'REPAIRING' : 'IN_STOCK',
          refurbishCost: refurbish,
          totalCost: Number(phone.buybackPrice) + refurbish,
        },
      });

      return inspection;
    });
  }

  // ════════════════════════════════════════════════════════
  // STATUS TRANSITIONS
  // ════════════════════════════════════════════════════════

  async markInStock(user: AuthenticatedUser, id: string) {
    const phone = await this.findOne(user, id);
    if (!['PENDING_INSPECTION', 'REPAIRING', 'RETURNED'].includes(phone.status)) {
      throw new BadRequestException(`${phone.usedPhoneCode} abhi ${phone.status} hai — stock me nahi daala ja sakta`);
    }
    return this.prisma.usedPhone.update({
      where: { id },
      data: { status: UsedPhoneStatus.IN_STOCK },
    });
  }

  /**
   * Sells the phone outside the POS (mobile app). The sale is a real bill
   * through the counter engine, so the money reaches the drawer, khata and
   * reports. With `saleId` the bill already exists and must hold this phone.
   */
  async markSold(
    user: AuthenticatedUser,
    scope: ShopScope,
    id: string,
    body: { finalPrice: number; saleId?: string; paymentMethod?: PaymentMethod; customerId?: string },
  ) {
    const phone = await this.findOne(user, id);
    if (phone.status === 'SOLD') throw new BadRequestException('Ye phone pehle hi bik chuka hai');
    if (body.saleId) {
      const line = await this.prisma.saleItem.findFirst({
        where: { usedPhoneId: id, saleId: body.saleId, sale: { tenantId: user.tenantId, status: { not: 'VOIDED' } } },
        select: { id: true },
      });
      if (!line) throw new BadRequestException('Is bill me ye phone nahi');
      return this.findOne(user, id);
    }
    const price = Number(body.finalPrice);
    if (!(price > 0)) throw new BadRequestException('Bechne ki qeemat likhein');
    if (phone.status !== 'IN_STOCK') {
      throw new BadRequestException(`${phone.usedPhoneCode} abhi ${phone.status} hai — pehle check kar ke stock me daalein`);
    }
    await this.sales.create(user, scope, {
      shopId: scope.shopId ?? phone.shopId ?? undefined,
      customerId: body.customerId || undefined,
      paymentMethod: body.paymentMethod ?? 'CASH',
      paidAmount: price,
      items: [{ usedPhoneId: id, quantity: 1, priceOverride: price }],
    } as CreateSaleDto);
    return this.findOne(user, id);
  }

  async markDiscarded(user: AuthenticatedUser, id: string, reason?: string) {
    const phone = await this.findOne(user, id);
    if (phone.status === 'SOLD') throw new BadRequestException('Bika hua phone discard nahi ho sakta');
    if (phone.status === 'DISCARDED') return phone;
    const line = `[DISCARD ${new Date().toISOString().slice(0, 10)}] ${reason?.trim() || 'Bechne ke qabil nahi'}`;
    return this.prisma.usedPhone.update({
      where: { id },
      data: {
        status: UsedPhoneStatus.DISCARDED,
        notes: [phone.notes, line].filter(Boolean).join('\n'),
      },
    });
  }

  // ════════════════════════════════════════════════════════
  // REMOVE — a phone record is never erased; it is discarded with a note
  // ════════════════════════════════════════════════════════

  async remove(user: AuthenticatedUser, id: string) {
    const phone = await this.findOne(user, id);
    if (phone.status === 'SOLD' || phone.soldSaleId) {
      throw new BadRequestException('Bika hua phone hataya nahi ja sakta');
    }
    const bill = await this.tradeInBill(user.tenantId, phone.usedPhoneCode);
    if (bill) throw new BadRequestException(`Ye phone bill ${bill.saleNumber} me trade-in laga hai — pehle wo bill cancel karein`);
    await this.markDiscarded(user, id, 'Ghalat entry — hataya gaya');
    return { message: 'Used phone hata diya (record "Discard" me mehfooz hai)', usedPhoneCode: phone.usedPhoneCode };
  }
}
