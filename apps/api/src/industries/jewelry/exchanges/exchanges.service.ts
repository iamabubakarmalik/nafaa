/**
 * Old gold and silver taken across the counter.
 *
 * Buying: the metal is tested (karat), weighed, valued at today's buying
 * rate less kaat, and goes into metal stock; cash paid comes out of the
 * open drawer. Gold weighed in for a bill (`forBill`) also goes into metal
 * stock and waits, unpaid, as a trade-in the counter can put on the bill;
 * if the customer takes it back instead it goes out of stock again.
 * Repairs now live in JewelryRepair; old repair rows here (purpose REPAIR /
 * REPAIR_DONE) are still listed and handed back from this service.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExchangeType, JewelryPurity, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ensureCustomer, postIndustrySale, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { PURITY_FACTOR, metalTypeForPurity, postMetalEntry } from '../common/metal-ledger';
import { payFromDrawer } from '../common/drawer';

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const r3 = (n: number) => Math.round((Number(n) || 0) * 1000) / 1000;

/** Exchange types where metal physically comes into the shop. */
const METAL_IN: ExchangeType[] = ['OLD_GOLD_EXCHANGE', 'OLD_SILVER_EXCHANGE', 'BROKEN_JEWELRY', 'PURE_METAL_DEPOSIT', 'COIN_EXCHANGE', 'MELT_AND_REMAKE'];
/** Work done on the customer's own piece. */
export const REPAIR_TYPES: ExchangeType[] = ['REPAIR', 'RESIZING', 'RENOVATION'];
const PURITIES = Object.values(JewelryPurity) as string[];
const TYPES = Object.values(ExchangeType) as string[];

type Kind = 'buy' | 'bill-open' | 'repair' | 'repair-open' | 'all';
const KINDS: Kind[] = ['buy', 'bill-open', 'repair', 'repair-open', 'all'];

@Injectable()
export class ExchangesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const type = String(dto?.exchangeType ?? 'OLD_GOLD_EXCHANGE');
    if (!TYPES.includes(type)) throw new BadRequestException('Kaam ki type ghalat hai');
    if (REPAIR_TYPES.includes(type as ExchangeType)) throw new BadRequestException('Repair ab "Repair" page se darj hoti hai');
    const forBill = dto.forBill === true;
    const claimed = String(dto.claimedPurity ?? '');
    if (!PURITIES.includes(claimed)) throw new BadRequestException('Karat chunein');
    const tested = dto.testedPurity ? String(dto.testedPurity) : claimed;
    if (!PURITIES.includes(tested)) throw new BadRequestException('Test ka karat ghalat hai');
    const customerName = String(dto.customerName ?? '').trim() || 'Walk-in';
    const customerPhone = String(dto.customerPhone ?? '').trim();
    const itemDescription = String(dto.itemDescription ?? '').trim();
    if (!itemDescription) throw new BadRequestException('Zewar ki tafseel likhein (kya cheez hai)');

    const grossWeight = r3(Number(dto.grossWeight) || 0);
    const stoneWeight = r3(Math.max(Number(dto.stoneWeight) || 0, 0));
    if (!(grossWeight > 0)) throw new BadRequestException('Wazan likhein');
    if (stoneWeight >= grossWeight) throw new BadRequestException('Nag ka wazan kul wazan se kam hona chahiye');
    const netWeight = dto.netWeight ? r3(Number(dto.netWeight)) : r3(grossWeight - stoneWeight);
    const fineGoldEquivalent = r3(netWeight * (PURITY_FACTOR[tested] ?? 1));

    // Value = net weight × rate (rate is per gram of the tested karat) less kaat and charges.
    const ratePerGram = r2(Math.max(Number(dto.ratePerGram) || 0, 0));
    const grossValue = r2(netWeight * ratePerGram);
    const deductionPct = Math.min(Math.max(Number(dto.deductionPct) || 0, 0), 50);
    const deductions = r2(dto.deductions != null ? Math.max(Number(dto.deductions) || 0, 0) : (grossValue * deductionPct) / 100);
    const meltingCharges = r2(Math.max(Number(dto.meltingCharges) || 0, 0));
    const testingCharges = r2(Math.max(Number(dto.testingCharges) || 0, 0));
    const netValue = r2(Math.max(grossValue - deductions - meltingCharges - testingCharges, 0));
    if (!(ratePerGram > 0)) throw new BadRequestException('Rate likhein (aaj ka khareed rate)');
    if (forBill && !(netValue > 0)) throw new BadRequestException('Purane sone ki qeemat sifar nahi ho sakti');

    const exchange = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`jewelry-exchange-no:${user.tenantId}`}))::text`;
      const count = await tx.jewelryExchange.count({ where: { tenantId: user.tenantId } });
      const exchangeNumber = 'JEX-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');
      const row = await tx.jewelryExchange.create({
        data: {
          tenantId: user.tenantId,
          exchangeNumber,
          exchangeType: type as ExchangeType,
          customerId: dto.customerId || null,
          customerName,
          customerPhone,
          customerCnic: dto.customerCnic || null,
          exchangeDate: new Date(),
          itemDescription,
          metalType: metalTypeForPurity(tested),
          claimedPurity: claimed as JewelryPurity,
          testedPurity: tested as JewelryPurity,
          grossWeight, netWeight, stoneWeight, fineGoldEquivalent,
          ratePerGram, grossValue, deductions, netValue, meltingCharges, testingCharges,
          purpose: forBill ? 'SALE' : 'BUY',
          testingMethod: dto.testingMethod || null,
          testedBy: dto.testedBy || null,
          witnessedBy: dto.witnessedBy || null,
          photoUrls: Array.isArray(dto.photoUrls) ? dto.photoUrls.slice(0, 10) : [],
          cnicPhotoUrl: dto.cnicPhotoUrl || null,
          notes: dto.notes || null,
          createdById: user.id,
        },
      });
      if (METAL_IN.includes(row.exchangeType) && netWeight > 0) {
        await postMetalEntry(tx, user.tenantId, user.id, {
          entryType: 'EXCHANGE_IN', metalType: row.metalType, purity: row.testedPurity ?? row.claimedPurity, grams: netWeight,
          ratePerGram: netWeight > 0 ? r2(netValue / netWeight) : null, reference: exchangeNumber,
          source: customerName, exchangeId: row.id, notes: itemDescription,
        });
      }
      return row;
    });

    // Old metal bought for cash: the money leaves the drawer.
    if (!forBill && dto.paidInCash === true && netValue > 0) {
      const paid = await payFromDrawer(this.prisma, {
        tenantId: user.tenantId, userId: user.id, shopId: user.shopId, amount: netValue,
        reason: `Purana zewar khareeda ${exchange.exchangeNumber}`, note: customerName, reference: `jewelry-exchange:${exchange.exchangeNumber}`,
      });
      return { ...exchange, paidFromDrawer: paid };
    }
    return exchange;
  }

  private kindWhere(kind: Kind): Prisma.JewelryExchangeWhereInput {
    if (kind === 'buy') return { exchangeType: { notIn: REPAIR_TYPES }, OR: [{ purpose: null }, { purpose: { not: 'RETURNED' } }] };
    if (kind === 'bill-open') return { purpose: 'SALE', saleId: null };
    if (kind === 'repair') return { exchangeType: { in: REPAIR_TYPES } };
    if (kind === 'repair-open') return { exchangeType: { in: REPAIR_TYPES }, purpose: 'REPAIR' };
    return {};
  }

  async page(user: AuthenticatedUser, q: { kind?: string; search?: string; from?: string; to?: string; page?: number; limit?: number }) {
    const kind: Kind = (KINDS as string[]).includes(q.kind ?? '') ? (q.kind as Kind) : 'buy';
    const limit = Math.min(Math.max(Number(q.limit) || 30, 1), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    const search = q.search?.trim();
    const where: Prisma.JewelryExchangeWhereInput = {
      tenantId: user.tenantId,
      ...this.kindWhere(kind),
      ...(q.from || q.to ? { exchangeDate: { ...(q.from && { gte: new Date(q.from) }), ...(q.to && { lte: new Date(q.to) }) } } : {}),
      ...(search && {
        AND: [{
          OR: [
            { exchangeNumber: { contains: search, mode: 'insensitive' } },
            { customerName: { contains: search, mode: 'insensitive' } },
            { customerPhone: { contains: search } },
            { customerCnic: { contains: search } },
            { itemDescription: { contains: search, mode: 'insensitive' } },
          ],
        }],
      }),
    };
    const [total, items, sums] = await Promise.all([
      this.prisma.jewelryExchange.count({ where }),
      this.prisma.jewelryExchange.findMany({ where, orderBy: { exchangeDate: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.jewelryExchange.aggregate({ where, _sum: { netWeight: true, fineGoldEquivalent: true, netValue: true, deductions: true } }),
    ]);
    return {
      kind, page, limit, total, pages: Math.max(Math.ceil(total / limit), 1), items,
      totals: { grams: r3(sums._sum.netWeight ?? 0), fine: r3(sums._sum.fineGoldEquivalent ?? 0), value: r2(sums._sum.netValue ?? 0), deductions: r2(sums._sum.deductions ?? 0) },
    };
  }

  async list(user: AuthenticatedUser, params: { customerId?: string; exchangeType?: string; from?: string; to?: string; search?: string }) {
    return this.prisma.jewelryExchange.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.exchangeType && TYPES.includes(params.exchangeType) && { exchangeType: params.exchangeType as ExchangeType }),
        ...(params.from || params.to ? {
          exchangeDate: { ...(params.from && { gte: new Date(params.from) }), ...(params.to && { lte: new Date(params.to) }) },
        } : {}),
        ...(params.search && {
          OR: [
            { exchangeNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { customerCnic: { contains: params.search } },
          ],
        }),
      },
      orderBy: { exchangeDate: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const e = await this.prisma.jewelryExchange.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!e) throw new NotFoundException('Record nahi mila');
    return e;
  }

  /**
   * Gold weighed in for a bill that the customer takes back without a bill:
   * it goes out of metal stock again and the row is closed.
   */
  async giveBack(user: AuthenticatedUser, id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`jewelry-exchange:${id}`}))::text`;
      const e = await tx.jewelryExchange.findFirst({ where: { id, tenantId: user.tenantId } });
      if (!e) throw new NotFoundException('Record nahi mila');
      if (e.purpose !== 'SALE' || e.saleId) throw new BadRequestException('Sirf woh purana sona wapas ho sakta hai jo abhi kisi bill par nahi laga');
      const grams = r3(e.netWeight ?? e.grossWeight);
      if (grams > 0) {
        await postMetalEntry(tx, user.tenantId, user.id, {
          entryType: 'ADJUSTMENT', metalType: e.metalType, purity: e.testedPurity ?? e.claimedPurity, grams,
          ratePerGram: e.ratePerGram || null, reference: e.exchangeNumber, source: e.customerName, exchangeId: e.id,
          notes: 'Bill nahi bana: purana zewar customer ko wapas',
        });
      }
      return tx.jewelryExchange.update({ where: { id: e.id }, data: { purpose: 'RETURNED' } });
    });
  }

  async linkToSale(user: AuthenticatedUser, id: string, saleId: string) {
    await this.getOne(user, id);
    return this.prisma.jewelryExchange.update({ where: { id }, data: { saleId } });
  }

  /**
   * Hands a repaired piece back: the charge becomes a bill (Sale) so it
   * reaches the day book, drawer and reports. Unpaid charge goes on khata.
   */
  async deliverRepair(user: AuthenticatedUser, id: string, dto: { charge?: number; paidAmount?: number; paymentMethod?: string }) {
    const e = await this.getOne(user, id);
    if (!REPAIR_TYPES.includes(e.exchangeType)) throw new BadRequestException('Yeh repair nahi hai');
    if (e.purpose !== 'REPAIR') throw new BadRequestException('Yeh repair pehle hi wapas ho chuki hai');
    const charge = r2(dto.charge != null ? Number(dto.charge) : e.netValue);
    if (!(charge >= 0)) throw new BadRequestException('Repair ki amount sahi likhein');
    const paid = r2(Math.min(Math.max(Number(dto.paidAmount ?? charge) || 0, 0), charge));

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`jewelry-repair:${e.id}`}))::text`;
      const fresh = await tx.jewelryExchange.findFirst({ where: { id: e.id }, select: { purpose: true } });
      if (fresh?.purpose !== 'REPAIR') throw new BadRequestException('Yeh repair pehle hi wapas ho chuki hai');
      let saleId: string | null = null;
      if (charge > 0) {
        const shopId = await resolveIndustryShopId(tx, user, null);
        const customerId = paid < charge
          ? await ensureCustomer(tx, user, { customerId: e.customerId, name: e.customerName, phone: e.customerPhone, shopId })
          : e.customerId;
        const sale = await postIndustrySale(tx, user, {
          saleNumber: e.exchangeNumber, sourceRef: e.exchangeNumber, shopId, customerId,
          lines: [{ label: `Repair: ${e.itemDescription.slice(0, 60)}`, amount: charge }],
          paidAmount: paid, paymentMethod: dto.paymentMethod,
        });
        saleId = sale.id;
      }
      return tx.jewelryExchange.update({ where: { id: e.id }, data: { purpose: 'REPAIR_DONE', netValue: charge, saleId } });
    });
  }

  async summary(user: AuthenticatedUser, from?: string, to?: string) {
    const where: Prisma.JewelryExchangeWhereInput = { tenantId: user.tenantId };
    if (from || to) where.exchangeDate = { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) };
    const [total, byType, totalValue, openRepairs] = await Promise.all([
      this.prisma.jewelryExchange.count({ where }),
      this.prisma.jewelryExchange.groupBy({
        by: ['exchangeType'], where, _count: { _all: true }, _sum: { fineGoldEquivalent: true, netValue: true, netWeight: true },
      }),
      this.prisma.jewelryExchange.aggregate({
        where: { ...where, exchangeType: { notIn: REPAIR_TYPES } },
        _sum: { fineGoldEquivalent: true, netValue: true, grossWeight: true, netWeight: true, deductions: true },
      }),
      this.prisma.jewelryExchange.count({ where: { tenantId: user.tenantId, exchangeType: { in: REPAIR_TYPES }, purpose: 'REPAIR' } }),
    ]);
    return { total, byType, totals: totalValue._sum, openRepairs };
  }
}
