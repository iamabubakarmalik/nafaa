import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CONTRACT_STATUSES, CreateWeddingContractDto, RecordWeddingPaymentDto, UpdateContractStatusDto, WeddingMaterialDto } from './dto/create-contract.dto';
import { ShopScope, applyStockDelta, isServiceProduct } from '../../../common/shop-scope';
import {
  ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId,
} from '../../_shared/industry-sale.helper';
import { Prisma } from '@prisma/client';
import { addDaysTz, cleanInput, dayKey, dayRange, dayStart, parseDay } from '../florist-common';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
const STATUSES: readonly string[] = CONTRACT_STATUSES;
/** Body fields that are not contract columns or are set only by the server. */
const NOT_COLUMNS = ['advancePaymentMethod', 'contractNumber', 'status', 'advanceAmount', 'balanceAmount', 'finalAmount', 'handledById', 'confirmedAt'];

/**
 * Wedding money follows the counter's rules. Every advance and payment is
 * written on the family's khata the day it is received (so the day book and
 * the drawer see it), and completing the contract makes the bill, which
 * uses those payments up. Before, payments only changed numbers on the
 * contract and the wedding never reached sales, profit or the day book.
 */

@Injectable()
export class WeddingContractsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The family's khata: found by phone, else opened in the contact's name. */
  private customerFor(tx: any, user: AuthenticatedUser, c: { contactPerson: string; contactPhone: string }, shopId: string) {
    return ensureCustomer(tx, user, { name: c.contactPerson, phone: c.contactPhone, shopId });
  }

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateWeddingContractDto) {
    const count = await this.prisma.floristWeddingContract.count({ where: { tenantId: user.tenantId } });
    const year = dayKey().slice(0, 4);
    let n = count + 1;
    let contractNumber = `WED-${year}-${String(n).padStart(4, '0')}`;
    while (await this.prisma.floristWeddingContract.findFirst({ where: { tenantId: user.tenantId, contractNumber }, select: { id: true } })) {
      n += 1;
      contractNumber = `WED-${year}-${String(n).padStart(4, '0')}`;
    }
    const advance = r2(Math.max(dto.advanceAmount ?? 0, 0));
    if (advance > dto.quotedAmount + 0.01) throw new BadRequestException('Advance quote se zyada nahi ho sakta');
    const balance = r2(dto.quotedAmount - advance);
    const weddingDate = parseDay(dto.weddingDate);
    if (!weddingDate) throw new BadRequestException('Shaadi ki date likhein');

    const body = cleanInput(dto);
    for (const k of NOT_COLUMNS) delete body[k];
    if (body.contactEmail === '') delete body.contactEmail;

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.floristWeddingContract.create({
        data: {
          ...body,
          tenantId: user.tenantId,
          contractNumber,
          weddingDate,
          siteVisitDate: parseDay(dto.siteVisitDate),
          setupStartTime: dto.setupStartTime ? parseDay(dto.setupStartTime) : null,
          advanceAmount: advance,
          balanceAmount: balance,
          colorTheme: dto.colorTheme ?? [],
          primaryFlowers: dto.primaryFlowers ?? [],
          moodBoardUrls: dto.moodBoardUrls ?? [],
          handledById: user.id,
          status: 'QUOTED',
        },
      });
      if (advance > 0) {
        const shopId = await resolveIndustryShopId(tx, user, scope.shopId);
        const customerId = await this.customerFor(tx, user, created, shopId);
        await recordKhataPayment(tx, user, {
          customerId, shopId, amount: advance, reference: contractNumber, method: dto.advancePaymentMethod,
          note: `Shaadi advance: ${created.brideName} & ${created.groomName} (${contractNumber})`,
        });
      }
      return created;
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; upcoming?: boolean; search?: string }) {
    return this.prisma.floristWeddingContract.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.upcoming && { weddingDate: { gte: new Date() } }),
        ...(params.search && {
          OR: [
            { contractNumber: { contains: params.search, mode: 'insensitive' } },
            { brideName: { contains: params.search, mode: 'insensitive' } },
            { groomName: { contains: params.search, mode: 'insensitive' } },
            { contactPerson: { contains: params.search, mode: 'insensitive' } },
            { contactPhone: { contains: params.search } },
          ],
        }),
      },
      orderBy: { weddingDate: 'asc' },
      take: 200,
    });
  }

  /** Paged contracts with status counts and money for the weddings page. `from`/`to` filter the wedding day. */
  async paged(user: AuthenticatedUser, params: { status?: string; search?: string; from?: string; to?: string; upcoming?: boolean; page?: number; limit?: number }) {
    const page = Math.max(1, Math.floor(Number(params.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(params.limit) || 25)));
    const range = params.upcoming ? { gte: dayStart() } : dayRange(params.from, params.to);
    const base: Prisma.FloristWeddingContractWhereInput = {
      tenantId: user.tenantId,
      ...(range && { weddingDate: range }),
      ...(params.search && {
        OR: [
          { contractNumber: { contains: params.search, mode: 'insensitive' } },
          { brideName: { contains: params.search, mode: 'insensitive' } },
          { groomName: { contains: params.search, mode: 'insensitive' } },
          { contactPerson: { contains: params.search, mode: 'insensitive' } },
          { contactPhone: { contains: params.search } },
          { ceremonyVenue: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
    };
    const status = params.status === 'OPEN' ? { in: ['QUOTED', 'CONFIRMED', 'IN_PROGRESS'] } : STATUSES.includes(params.status ?? '') ? params.status : undefined;
    const where: Prisma.FloristWeddingContractWhereInput = { ...base, ...(status && { status }) };
    const [items, total, money, byStatus] = await Promise.all([
      this.prisma.floristWeddingContract.findMany({ where, orderBy: [{ weddingDate: params.upcoming || params.status === 'OPEN' ? 'asc' : 'desc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.floristWeddingContract.count({ where }),
      this.prisma.floristWeddingContract.aggregate({ where: { ...where, status: { not: 'CANCELLED' } }, _sum: { quotedAmount: true, advanceAmount: true, balanceAmount: true } }),
      this.prisma.floristWeddingContract.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
    ]);
    return {
      items, total, page, limit,
      totals: { quoted: r2(money._sum.quotedAmount ?? 0), received: r2(money._sum.advanceAmount ?? 0), due: r2(money._sum.balanceAmount ?? 0) },
      counts: Object.fromEntries(byStatus.map((b) => [b.status, b._count._all])),
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.floristWeddingContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Contract not found');
    return c;
  }

  async updateStatus(user: AuthenticatedUser, scope: ShopScope, id: string, dto: UpdateContractStatusDto) {
    if (!STATUSES.includes(dto.status)) throw new BadRequestException('Ghalat status');
    const c = await this.prisma.floristWeddingContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Contract not found');
    if (c.status === dto.status) return c;
    if (c.status === 'COMPLETED') {
      throw new BadRequestException('Mukammal contract ka bill ban chuka hai — tabdeeli ke liye us bill par Return karein');
    }
    if (dto.status === 'COMPLETED') return this.complete(user, scope, c, dto.notes, dto.materials);

    const patch: any = { status: dto.status };
    if (dto.status === 'CONFIRMED' && !c.confirmedAt) patch.confirmedAt = new Date();
    if (dto.notes) patch.internalNotes = ((c.internalNotes || '') + '\n' + dto.notes).trim();
    return this.prisma.floristWeddingContract.update({ where: { id }, data: patch });
  }

  /**
   * Wedding done: the bill is made and the payments on the khata cover it.
   * Flowers used come off stock here; their cost rides on the bill (at no
   * price, the quote is the price) so profit counts them and a void puts
   * them back on the shelf.
   */
  private async complete(user: AuthenticatedUser, scope: ShopScope, c: any, notes?: string, materials: WeddingMaterialDto[] = []) {
    const amount = r2(c.finalAmount > 0 ? c.finalAmount : c.quotedAmount);
    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, scope.shopId);
      const used: Array<{ label: string; amount: number; cost: number; quantity: number; productId: string }> = [];
      for (const m of materials) {
        const product = await tx.product.findFirst({ where: { id: m.productId, tenantId: user.tenantId }, select: { id: true, name: true, costPrice: true, productType: true, unit: true } });
        if (!product) throw new NotFoundException('Cheez nahi mili');
        const unitCost = Number(product.costPrice) || 0;
        if (!isServiceProduct(product)) {
          await applyStockDelta({
            tx, tenantId: user.tenantId, shopId, productId: product.id, variantId: null, delta: -m.quantity, movementType: 'SALE_OUT',
            reference: c.contractNumber, note: `Shaadi ${c.contractNumber} me laga`, preventNegative: true, label: product.name, userId: user.id, unitCost,
          });
        }
        used.push({ label: `${product.name} (shaadi me laga)`, amount: 0, cost: r2(unitCost * m.quantity), quantity: m.quantity, productId: product.id });
      }
      const customerId = await this.customerFor(tx, user, c, shopId);
      // Advances recorded before they went to the khata count as paid with this bill.
      const legacyPaid = r2(Math.max(Number(c.advanceAmount || 0) - (await paidOnKhata(tx, user.tenantId, c.contractNumber)), 0));
      // A voided earlier bill keeps its number; the new bill takes the next one.
      const taken = await tx.sale.findMany({ where: { tenantId: user.tenantId, saleNumber: { startsWith: `FLW-${c.contractNumber}` } }, select: { saleNumber: true, status: true } });
      if (taken.some((s) => s.status !== 'VOIDED')) throw new BadRequestException('Is contract ka bill pehle hi ban chuka hai');
      const saleNumber = taken.length ? `FLW-${c.contractNumber}-${taken.length + 1}` : `FLW-${c.contractNumber}`;
      const sale = await postIndustrySale(tx, user, {
        saleNumber,
        sourceRef: c.contractNumber,
        shopId,
        customerId,
        lines: [{ label: `Shaadi phool / sajawat: ${c.brideName} & ${c.groomName}`, amount }, ...used],
        paidAmount: Math.min(legacyPaid, amount),
        paymentMethod: 'CASH',
      });
      const updated = await tx.floristWeddingContract.update({
        where: { id: c.id },
        data: {
          status: 'COMPLETED',
          finalAmount: amount,
          internalNotes: [c.internalNotes, `Bill ${sale.saleNumber}`, notes].filter(Boolean).join('\n'),
        },
      });
      return { ...updated, sale: { id: sale.id, saleNumber: sale.saleNumber } };
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: Partial<CreateWeddingContractDto>) {
    const c = await this.prisma.floristWeddingContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Contract not found');
    if (c.status === 'COMPLETED') throw new BadRequestException('Mukammal contract badla nahi ja sakta');

    // Money already taken changes only through payments, never by editing the form.
    const patch = cleanInput(dto);
    for (const k of NOT_COLUMNS) delete patch[k];
    if (patch.contactEmail === '') patch.contactEmail = null;
    if (dto.weddingDate) patch.weddingDate = parseDay(dto.weddingDate) ?? undefined;
    if (dto.siteVisitDate !== undefined) patch.siteVisitDate = parseDay(dto.siteVisitDate);
    if (dto.setupStartTime !== undefined) patch.setupStartTime = dto.setupStartTime ? parseDay(dto.setupStartTime) : null;
    if (dto.quotedAmount !== undefined) {
      if (dto.quotedAmount < Number(c.advanceAmount || 0) - 0.01) {
        throw new BadRequestException(`Rs ${c.advanceAmount} pehle mil chuke hain — quote us se kam nahi ho sakta`);
      }
      patch.balanceAmount = r2(dto.quotedAmount - Number(c.advanceAmount || 0));
    }
    return this.prisma.floristWeddingContract.update({ where: { id }, data: patch });
  }

  async recordPayment(user: AuthenticatedUser, scope: ShopScope, id: string, dto: RecordWeddingPaymentDto) {
    const c = await this.prisma.floristWeddingContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Contract not found');
    if (c.status === 'CANCELLED') throw new BadRequestException('Cancel contract par amount nahi li ja sakti');
    if (c.status === 'COMPLETED') throw new BadRequestException('Bill ban chuka hai — baqi payment Khata se lein');
    const amount = r2(dto.amount);
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const owed = r2(Number(c.quotedAmount || 0) - Number(c.advanceAmount || 0));
    if (amount > owed + 0.01) throw new BadRequestException(`Sirf Rs ${owed} baqi hain`);

    const newAdvance = r2(Number(c.advanceAmount || 0) + amount);
    const newBalance = Math.max(r2(Number(c.quotedAmount || 0) - newAdvance), 0);

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, scope.shopId);
      const customerId = await this.customerFor(tx, user, c, shopId);
      await recordKhataPayment(tx, user, {
        customerId, shopId, amount, reference: c.contractNumber, method: dto.paymentMethod,
        note: `Shaadi payment: ${c.brideName} & ${c.groomName} (${c.contractNumber})`,
      });
      return tx.floristWeddingContract.update({
        where: { id },
        data: {
          advanceAmount: newAdvance,
          balanceAmount: newBalance,
          internalNotes: dto.notes ? ((c.internalNotes || '') + '\nPayment: ' + dto.notes).trim() : undefined,
        },
      });
    });
  }

  /**
   * DELETE keeps its route but only cancels: the contract and any money on
   * the family's khata stay on record. An advance already taken stays on
   * the khata as their credit (return it from the khata if the shop does).
   */
  async remove(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.floristWeddingContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Contract not found');
    if (c.status === 'COMPLETED') throw new BadRequestException('Mukammal contract ka bill ban chuka hai — us bill par Return karein');
    if (c.status === 'CANCELLED') return c;
    return this.prisma.floristWeddingContract.update({
      where: { id },
      data: { status: 'CANCELLED', internalNotes: [c.internalNotes, 'Cancel kiya gaya'].filter(Boolean).join('\n') },
    });
  }

  /** A voided wedding bill: the contract can be completed (billed) again. */
  async reopenAfterVoid(tenantId: string, contractNumber: string, saleNumber: string) {
    const c = await this.prisma.floristWeddingContract.findFirst({ where: { tenantId, contractNumber, status: 'COMPLETED' } });
    if (!c) return null;
    return this.prisma.floristWeddingContract.update({
      where: { id: c.id },
      data: { status: 'CONFIRMED', internalNotes: [c.internalNotes, `Bill ${saleNumber} void — dobara mukammal karein`].filter(Boolean).join('\n') },
    });
  }

  async upcomingWeddings(user: AuthenticatedUser, days = 30) {
    const now = dayStart();
    const future = addDaysTz(now, days);
    return this.prisma.floristWeddingContract.findMany({
      where: {
        tenantId: user.tenantId,
        weddingDate: { gte: now, lte: future },
        status: { in: ['QUOTED', 'CONFIRMED'] },
      },
      orderBy: { weddingDate: 'asc' },
    });
  }
}
