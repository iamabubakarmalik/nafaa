import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { parseDay } from '../meat-common';
import { ShopScope } from '../../../common/shop-scope';
import { recordKhataPayment, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { payMethod, positive, r2, str } from '../meat-money';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

/**
 * Fields the account form may set. The customer link, number and running
 * totals are owned by the server (a body could otherwise move an account
 * to another shop's customer).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- request bodies here are untyped
function accountFields(dto: any) {
  const out: Record<string, unknown> = {};
  for (const k of ['businessName', 'businessType', 'deliveryTimeSlot', 'contactPerson', 'contactPhone', 'contactEmail', 'billingAddress', 'deliveryAddress', 'gstNumber', 'ntnNumber', 'notes'] as const) {
    if (dto?.[k] !== undefined) out[k] = str(dto[k], 1000);
  }
  if (dto?.businessName !== undefined && !out.businessName) throw new BadRequestException('Business ka naam likhein');
  if (dto?.businessType !== undefined && !out.businessType) throw new BadRequestException('Business ka type chunein');
  if (dto?.creditLimit !== undefined) out.creditLimit = r2(Math.max(Number(dto.creditLimit) || 0, 0));
  if (dto?.creditDays !== undefined) out.creditDays = Math.max(Math.round(Number(dto.creditDays) || 0), 0);
  if (dto?.discountPct !== undefined) {
    const d = Number(dto.discountPct) || 0;
    if (d < 0 || d > 50) throw new BadRequestException('Discount 0 se 50% tak');
    out.discountPct = r2(d);
  }
  if (dto?.requiresDelivery !== undefined) out.requiresDelivery = !!dto.requiresDelivery;
  if (dto?.isActive !== undefined) out.isActive = !!dto.isActive;
  if (dto?.deliveryDays !== undefined) out.deliveryDays = (Array.isArray(dto.deliveryDays) ? dto.deliveryDays : []).map(Number).filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6);
  if (dto?.specialPricing !== undefined) out.specialPricing = dto.specialPricing ?? null;
  return out;
}

@Injectable()
export class WholesaleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const customer = await this.prisma.customer.findFirst({ where: { id: String(dto?.customerId ?? ''), tenantId: user.tenantId } });
    if (!customer) throw new NotFoundException('Customer chunein');
    if (!str(dto?.businessName)) throw new BadRequestException('Business ka naam likhein');
    if (!str(dto?.businessType)) throw new BadRequestException('Business ka type chunein (hotel, restaurant…)');

    const existing = await this.prisma.meatWholesaleAccount.findUnique({ where: { customerId: dto.customerId } });
    if (existing) throw new BadRequestException('Is customer ka wholesale account pehle se hai');

    const count = await this.prisma.meatWholesaleAccount.count({ where: { tenantId: user.tenantId } });
    const accountNumber = 'WS-' + String(count + 1).padStart(5, '0');

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.meatWholesaleAccount.create({
        data: {
          ...(accountFields(dto) as Omit<Prisma.MeatWholesaleAccountUncheckedCreateInput, 'customerId' | 'tenantId' | 'accountNumber'>),
          customerId: customer.id,
          tenantId: user.tenantId,
          accountNumber,
          contractStart: parseDay(dto.contractStart),
          contractEnd: parseDay(dto.contractEnd),
        },
      });
      await this.syncCreditLimit(tx, customer.id, dto.creditLimit);
      return account;
    });
  }

  /** The counter checks udhaar against the customer's limit, so keep it the same as the account's. */
  private async syncCreditLimit(tx: any, customerId: string, creditLimit: unknown) {
    if (creditLimit === undefined || creditLimit === null || creditLimit === '') return;
    const limit = Number(creditLimit);
    if (!Number.isFinite(limit) || limit < 0) return;
    await tx.customer.update({ where: { id: customerId }, data: { creditLimit: limit } });
  }

  /**
   * Udhaar and purchases live on the customer's khata, where every counter
   * bill lands. The copies on the account were never updated, so the
   * Wholesale page showed 0 outstanding for buyers who did owe.
   */
  private async withKhata<T extends { customerId: string; currentBalance: number; totalOutstanding: number; totalPurchases: number; totalOrders: number }>(
    tenantId: string,
    rows: T[],
  ): Promise<T[]> {
    if (!rows.length) return rows;
    const ids = rows.map((r) => r.customerId);
    const [customers, bills] = await Promise.all([
      this.prisma.customer.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, balance: true, totalSpent: true } }),
      this.prisma.sale.groupBy({ by: ['customerId'], where: { tenantId, customerId: { in: ids }, status: { not: 'VOIDED' } }, _count: { _all: true } }),
    ]);
    const byId = new Map(customers.map((c) => [c.id, c]));
    const count = new Map(bills.map((b) => [b.customerId as string, b._count._all]));
    return rows.map((r) => {
      const c = byId.get(r.customerId);
      if (!c) return r;
      const owed = Math.max(c.balance, 0);
      return { ...r, currentBalance: owed, totalOutstanding: owed, totalPurchases: c.totalSpent, totalOrders: count.get(r.customerId) ?? 0 };
    });
  }

  async list(user: AuthenticatedUser, params: { active?: boolean; search?: string }) {
    const rows = await this.prisma.meatWholesaleAccount.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.search && {
          OR: [
            { accountNumber: { contains: params.search, mode: 'insensitive' } },
            { businessName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    return this.withKhata(user.tenantId, rows);
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.meatWholesaleAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account nahi mila');
    return (await this.withKhata(user.tenantId, [a]))[0];
  }

  async byCustomer(user: AuthenticatedUser, customerId: string) {
    const a = await this.prisma.meatWholesaleAccount.findFirst({ where: { customerId, tenantId: user.tenantId } });
    return a ? (await this.withKhata(user.tenantId, [a]))[0] : null;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const a = await this.prisma.meatWholesaleAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account nahi mila');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.meatWholesaleAccount.update({
        where: { id },
        data: {
          ...accountFields(dto),
          contractStart: dto.contractStart !== undefined ? parseDay(dto.contractStart) : undefined,
          contractEnd: dto.contractEnd !== undefined ? parseDay(dto.contractEnd) : undefined,
        },
      });
      await this.syncCreditLimit(tx, a.customerId, dto.creditLimit);
      return updated;
    });
  }

  /**
   * Payment from a wholesale buyer: a real khata payment (drawer for cash,
   * bank or wallet otherwise), the same as taking it on the Khata page.
   */
  async recordPayment(user: AuthenticatedUser, scope: ShopScope, id: string, body: { amount?: unknown; paymentMethod?: unknown; note?: unknown }) {
    const a = await this.prisma.meatWholesaleAccount.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Account nahi mila');
    const amount = r2(positive(body?.amount, 'Amount likhein'));
    const method = payMethod(body?.paymentMethod);
    await this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, scope.shopId);
      await recordKhataPayment(tx, user, {
        customerId: a.customerId, shopId, amount, method, reference: a.accountNumber,
        note: str(body?.note, 200) ?? `Wholesale payment: ${a.businessName}`,
      });
    });
    return this.getOne(user, id);
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.getOne(user, id);
    return this.prisma.meatWholesaleAccount.update({ where: { id }, data: { isActive: false } });
  }
}
