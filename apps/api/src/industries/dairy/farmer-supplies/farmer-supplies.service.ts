/**
 * Milk bought from gawalas, morning and evening. Each collection puts the
 * litres into the branch stock of the shop's milk product at the price paid
 * (fat bonus included), so counter sales and deliveries carry the real cost
 * into the profit report, and adds what is owed to the gawala's account.
 * Paying the gawala is a cash-out from the drawer (FarmersService).
 *
 * A wrong entry is cancelled, not deleted: the litres and money are taken
 * back out and the slip keeps what it said.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DairyDeliverySlot, DairyMilkQuality } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope, applyStockDelta } from '../../../common/shop-scope';
import { resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { dayEnd, dayKey, dayRange, dayStart, drawerCash, milkProduct, parseDay, r2, r3 } from '../dairy-common';
import { CreateSupplyDto } from './dto/create-supply.dto';

/** Notes of a cancelled slip start with this. */
export const CANCELLED = 'CANCELLED:';

/** Slips that are not cancelled. A bare NOT on `notes` would also drop slips with no note (SQL null). */
export const LIVE_SLIP = { OR: [{ notes: null }, { NOT: { notes: { startsWith: CANCELLED } } }] };

/** Fat % the base rate is for; above it the gawala's fat bonus applies per point per litre. */
const BASE_FAT = 6;

@Injectable()
export class FarmerSuppliesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateSupplyDto) {
    const farmer = await this.prisma.dairyFarmer.findFirst({ where: { id: dto.farmerId, tenantId: user.tenantId } });
    if (!farmer) throw new NotFoundException('Gawala nahi mila');
    if (!farmer.isActive) throw new BadRequestException('Ye gawala band hai — pehle dobara chalu karein');
    const qty = r3(dto.quantity);
    if (!(qty > 0) || qty > 20_000) throw new BadRequestException('Doodh ki quantity 0 se zyada likhein');
    const when = parseDay(dto.supplyDate) ?? new Date();
    if (when.getTime() > dayEnd().getTime()) throw new BadRequestException('Aane wale din ki entry nahi ho sakti');

    const rate = r2(dto.ratePerLiter ?? farmer.ratePerLiter);
    if (!(rate > 0)) throw new BadRequestException('Rate likhein — gawale ka rate abhi 0 hai');
    const fatBonus = dto.fatContent && dto.fatContent > BASE_FAT ? r2((dto.fatContent - BASE_FAT) * farmer.fatBonusRate * qty) : 0;
    const adjustment = r2(dto.otherAdjustment ?? 0);
    const totalAmount = r2(rate * qty + fatBonus + adjustment);
    if (totalAmount < 0) throw new BadRequestException('Katauti doodh ki amount se zyada hai');
    const rejected = dto.quality === 'REJECTED';

    return this.prisma.$transaction(async (tx) => {
      const supply = await tx.dairyFarmerSupply.create({
        data: {
          tenantId: user.tenantId,
          farmerId: farmer.id,
          supplyDate: when,
          slot: dto.slot ?? 'MORNING',
          quantity: qty,
          unit: dto.unit ?? 'LITER',
          fatContent: dto.fatContent,
          snfContent: dto.snfContent,
          quality: dto.quality,
          ratePerLiter: rate,
          fatBonus,
          otherAdjustment: adjustment,
          // Rejected milk is sent back: nothing owed, nothing in stock.
          totalAmount: rejected ? 0 : totalAmount,
          receivedByStaffId: user.id,
          notes: dto.notes?.trim() || null,
        },
      });
      if (rejected) return supply;

      const product = await milkProduct(tx, user.tenantId, dto.productId);
      if (product && !product.hasVariants) {
        const shopId = await resolveIndustryShopId(tx, user, dto.shopId ?? scope.shopId);
        const unitCost = r2(totalAmount / qty);
        const before = await tx.product.findUniqueOrThrow({ where: { id: product.id }, select: { stock: true, costPrice: true } });
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId, productId: product.id, delta: qty, movementType: 'PURCHASE_IN',
          reference: supply.id, note: `Gawala ${farmer.name} (${farmer.farmerNumber}) — ${qty} L`, userId: user.id, unitCost,
        });
        // Milk carries the average price paid, so every litre sold has its real cost.
        const oldQty = Math.max(Number(before.stock) || 0, 0);
        const oldCost = Number(before.costPrice) || 0;
        const avg = oldQty > 0 && oldCost > 0 ? r2((oldQty * oldCost + qty * unitCost) / (oldQty + qty)) : unitCost;
        await tx.product.update({ where: { id: product.id }, data: { costPrice: avg } });
      }

      const recent = await tx.dairyFarmerSupply.findMany({
        where: { farmerId: farmer.id, tenantId: user.tenantId, quantity: { gt: 0 } },
        take: 30, orderBy: { supplyDate: 'desc' }, select: { fatContent: true, snfContent: true },
      });
      const avgOf = (vals: Array<number | null>) => {
        const v = vals.filter((x): x is number => x != null && x > 0);
        return v.length ? r2(v.reduce((s, x) => s + x, 0) / v.length) : null;
      };
      await tx.dairyFarmer.update({
        where: { id: farmer.id },
        data: {
          currentBalance: { increment: totalAmount },
          totalSupplied: { increment: qty },
          lastSupplyDate: when,
          avgFatContent: avgOf(recent.map((s) => s.fatContent)),
          avgSnfContent: avgOf(recent.map((s) => s.snfContent)),
        },
      });
      return { ...supply, stockProduct: product ? { id: product.id, name: product.name } : null };
    });
  }

  async list(user: AuthenticatedUser, params: { farmerId?: string; from?: string; to?: string; slot?: string; quality?: string; search?: string }) {
    const range = dayRange(params.from, params.to);
    const search = params.search?.trim();
    return this.prisma.dairyFarmerSupply.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.farmerId && { farmerId: params.farmerId }),
        ...(params.slot && params.slot in DairyDeliverySlot && { slot: params.slot as DairyDeliverySlot }),
        ...(params.quality && params.quality in DairyMilkQuality && { quality: params.quality as DairyMilkQuality }),
        ...(range && { supplyDate: range }),
        ...(search && { farmer: { OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { farmerNumber: { contains: search, mode: 'insensitive' as const } },
          { village: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search } },
        ] } }),
      },
      include: { farmer: { select: { id: true, name: true, farmerNumber: true, village: true, phone: true } } },
      orderBy: [{ supplyDate: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
  }

  async byFarmer(user: AuthenticatedUser, farmerId: string, params: { from?: string; to?: string }) {
    const range = dayRange(params.from, params.to);
    return this.prisma.dairyFarmerSupply.findMany({
      where: { tenantId: user.tenantId, farmerId, ...(range && { supplyDate: range }) },
      orderBy: { supplyDate: 'desc' },
      take: 500,
    });
  }

  /** Pays one slip in full: the gawala's balance goes down and cash leaves the drawer. */
  async markPaid(user: AuthenticatedUser, id: string, method?: string) {
    const s = await this.prisma.dairyFarmerSupply.findFirst({ where: { id, tenantId: user.tenantId }, include: { farmer: { select: { name: true } } } });
    if (!s) throw new NotFoundException('Entry nahi mili');
    if (s.notes?.startsWith(CANCELLED)) throw new BadRequestException('Cancel entry ka payment nahi hota');
    if (s.isPaid || s.totalAmount <= 0) return s;

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.dairyFarmerSupply.updateMany({ where: { id, isPaid: false }, data: { isPaid: true, paidAt: new Date() } });
      if (claimed.count === 0) return tx.dairyFarmerSupply.findUniqueOrThrow({ where: { id } });
      await tx.dairyFarmer.update({
        where: { id: s.farmerId },
        data: { currentBalance: { decrement: s.totalAmount }, totalPaid: { increment: s.totalAmount }, lastPaymentDate: new Date() },
      });
      await drawerCash(tx, user, {
        direction: 'OUT', amount: s.totalAmount, method,
        reason: `Gawale ko doodh ka payment: ${s.farmer.name} (${s.quantity} L, ${dayKey(s.supplyDate)})`, reference: s.id,
      });
      return tx.dairyFarmerSupply.findUniqueOrThrow({ where: { id } });
    });
  }

  /** Cancels a wrong entry: litres back out of stock, amount off the gawala's account. */
  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const s = await this.prisma.dairyFarmerSupply.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Entry nahi mili');
    if (s.notes?.startsWith(CANCELLED)) return s;
    // A paid slip is part of money already handed over; cancelling it would put the gawala's account out of step.
    if (s.isPaid) throw new BadRequestException('Is entry ka payment ho chuka — cancel nahi ho sakti');

    return this.prisma.$transaction(async (tx) => {
      const move = await tx.stockMovement.findFirst({ where: { tenantId: user.tenantId, reference: s.id, type: 'PURCHASE_IN' }, select: { shopId: true, productId: true, quantity: true, unitCost: true } });
      if (move?.shopId) {
        await applyStockDelta({
          tx, tenantId: user.tenantId, shopId: move.shopId, productId: move.productId, delta: -Number(move.quantity),
          movementType: 'PURCHASE_RETURN', reference: s.id, note: 'Gawale ki entry cancel', userId: user.id, unitCost: move.unitCost, batchMode: 'cap',
        });
      }
      if (s.totalAmount > 0 || s.quantity > 0) {
        await tx.dairyFarmer.update({ where: { id: s.farmerId }, data: { currentBalance: { decrement: s.totalAmount }, totalSupplied: { decrement: s.quantity } } });
      }
      const was = `${s.quantity} L @ ${s.ratePerLiter} = ${s.totalAmount}`;
      return tx.dairyFarmerSupply.update({
        where: { id },
        data: {
          quantity: 0, fatBonus: 0, otherAdjustment: 0, totalAmount: 0,
          notes: `${CANCELLED} ${was}${reason?.trim() ? ` — ${reason.trim()}` : ''}${s.notes ? ` | ${s.notes}` : ''}`.slice(0, 500),
        },
      });
    });
  }

  async dailySummary(user: AuthenticatedUser, date?: string) {
    const start = dayStart(date);
    const end = dayEnd(date);
    const supplies = await this.prisma.dairyFarmerSupply.findMany({
      where: { tenantId: user.tenantId, supplyDate: { gte: start, lte: end }, ...LIVE_SLIP },
      include: { farmer: { select: { id: true, name: true, farmerNumber: true } } },
    });
    const sum = (rows: typeof supplies, k: 'quantity' | 'totalAmount') => (k === 'quantity' ? r3 : r2)(rows.reduce((s, x) => s + x[k], 0));
    const morning = supplies.filter((s) => s.slot === 'MORNING');
    const evening = supplies.filter((s) => s.slot === 'EVENING');
    const liters = sum(supplies, 'quantity');
    const withFat = supplies.filter((s) => (s.fatContent ?? 0) > 0);
    return {
      date: dayKey(start),
      totalSupplies: supplies.length,
      totalLiters: liters,
      totalAmount: sum(supplies, 'totalAmount'),
      averageRate: liters > 0 ? r2(sum(supplies, 'totalAmount') / liters) : 0,
      averageFat: withFat.length ? r2(withFat.reduce((s, x) => s + (x.fatContent ?? 0) * x.quantity, 0) / withFat.reduce((s, x) => s + x.quantity, 0)) : null,
      morningLiters: sum(morning, 'quantity'),
      eveningLiters: sum(evening, 'quantity'),
      farmersCount: new Set(supplies.map((s) => s.farmerId)).size,
      supplies,
    };
  }
}
