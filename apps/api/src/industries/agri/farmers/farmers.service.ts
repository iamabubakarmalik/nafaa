import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { cleanInput } from '../agri-common';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class FarmersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Farmer ka Customer — dono ek hi shakhs hain, ek hi khata.
   *
   * Pehle AgriFarmer akela banta tha aur `customerId` khali reh jata
   * tha. Us ka natija ye tha ke POS par farmer chunne ke bawajood
   * bikri BINA customer ke jati thi: udhaar kahin darj nahi hota
   * tha, aur Farmers safhe par outstanding hamesha 0 rehta tha.
   *
   * Ab rishta yahin ban jata hai — bilkul wohi tareeqa jo
   * `Product ↔ AgriProductProfile` ka hai: Customer asal khata,
   * AgriFarmer us ki agri tafseel (zameen, fasal, CNIC).
   *
   * Agar isi phone ka customer pehle se maujood ho to naya nahi
   * banate — usi se jor dete hain. Warna ek hi shakhs ke do khatay
   * ban jate aur udhaar do jagah bat jata.
   */
  private async linkOrCreateCustomer(
    tx: any,
    tenantId: string,
    farmer: { fullName: string; phone?: string | null; cnic?: string | null;
              village?: string | null; district?: string | null;
              address?: string | null; creditLimit?: number | null },
    shopId?: string | null,
  ): Promise<string> {
    const phone = (farmer.phone || '').trim();
    if (phone) {
      const existing = await tx.customer.findFirst({
        where: { tenantId, phone, isActive: true },
        select: { id: true },
      });
      if (existing) return existing.id;
    }

    const created = await tx.customer.create({
      data: {
        tenantId,
        shopId: shopId || null,
        name: farmer.fullName,
        phone: phone || null,
        cnic: farmer.cnic || null,
        address: farmer.address || null,
        /* Gaon/tehsil hi farmer ka "sheher" hota hai */
        city: farmer.district || farmer.village || null,
        area: farmer.village || null,
        creditLimit: Number(farmer.creditLimit) || 0,
        notes: 'Agri farmer',
      },
      select: { id: true },
    });
    return created.id;
  }

  /**
   * Udhaar lives on the farmer's Customer khata — that is where POS credit
   * sales and khata payments land. The copy on AgriFarmer was never updated
   * by the counter, so the Farmers page showed 0 owed for farmers who did
   * owe. Every read overlays the live khata on the farmer row.
   */
  private async withKhata<T extends { customerId: string | null; currentBalance: number; totalOutstanding: number; totalPurchases: number; lastPurchaseAt: Date | null }>(
    tenantId: string,
    farmers: T[],
  ): Promise<T[]> {
    const ids = farmers.map((f) => f.customerId).filter((x): x is string => !!x);
    if (!ids.length) return farmers;
    const [customers, lastSales] = await Promise.all([
      this.prisma.customer.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, balance: true, totalSpent: true } }),
      this.prisma.sale.groupBy({
        by: ['customerId'],
        where: { tenantId, customerId: { in: ids } },
        _max: { createdAt: true },
      }),
    ]);
    const balance = new Map(customers.map((c) => [c.id, c.balance]));
    const spent = new Map(customers.map((c) => [c.id, c.totalSpent]));
    const last = new Map(lastSales.map((r) => [r.customerId as string, r._max.createdAt]));
    return farmers.map((f) => {
      if (!f.customerId || !balance.has(f.customerId)) return f;
      const owed = Math.max(balance.get(f.customerId) ?? 0, 0);
      const lastSale = last.get(f.customerId) ?? null;
      return {
        ...f,
        currentBalance: owed,
        totalOutstanding: owed,
        totalPurchases: Math.max(spent.get(f.customerId) ?? 0, f.totalPurchases),
        lastPurchaseAt: lastSale && (!f.lastPurchaseAt || lastSale > f.lastPurchaseAt) ? lastSale : f.lastPurchaseAt,
      };
    });
  }

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.farmerNumber) {
      const count = await this.prisma.agriFarmer.count({ where: { tenantId: user.tenantId } });
      dto.farmerNumber = 'FRM-' + String(count + 1).padStart(5, '0');
    }
    if (dto.cnic) {
      const dup = await this.prisma.agriFarmer.findFirst({ where: { tenantId: user.tenantId, cnic: dto.cnic } });
      if (dup) throw new BadRequestException('Farmer with this CNIC already exists');
    }

    /* shopId sirf Customer ke liye hai — AgriFarmer me aisa koi
       khana nahi, is liye alag kar ke bhejte hain. */
    const { shopId, customerId: givenCustomerId, ...farmerData } = cleanInput(dto);
    if (givenCustomerId) {
      const own = await this.prisma.customer.findFirst({ where: { id: givenCustomerId, tenantId: user.tenantId }, select: { id: true } });
      if (!own) throw new BadRequestException('Customer nahi mila');
    }

    return this.prisma.$transaction(async (tx) => {
      const customerId = givenCustomerId
        ?? await this.linkOrCreateCustomer(tx, user.tenantId, farmerData, shopId);

      return tx.agriFarmer.create({
        data: {
          tenantId: user.tenantId,
          ...farmerData,
          customerId,
          creditLimit: Number(dto.creditLimit) || 0,
          landAreaAcres: dto.landAreaAcres ? Number(dto.landAreaAcres) : null,
          landAreaKanals: dto.landAreaKanals ? Number(dto.landAreaKanals) : null,
        },
      });
    });
  }

  /**
   * Purane farmer ko Customer se jorna.
   *
   * Jo farmer is badlaav se pehle bane, un ka `customerId` khali hai.
   * Ye un ke liye hai — ek click me khata jur jata hai, purani bikri
   * chhori nahi jati (wo pehle se jis customer par thi wahin rahegi).
   */
  async linkCustomer(user: AuthenticatedUser, id: string, customerId?: string) {
    const farmer = await this.prisma.agriFarmer.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!farmer) throw new NotFoundException('Farmer not found');
    if (farmer.customerId) return farmer;

    return this.prisma.$transaction(async (tx) => {
      if (customerId) {
        const own = await tx.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true } });
        if (!own) throw new BadRequestException('Customer nahi mila');
      }
      const linkId = customerId
        ?? await this.linkOrCreateCustomer(tx, user.tenantId, farmer);
      return tx.agriFarmer.update({
        where: { id: farmer.id },
        data: { customerId: linkId },
      });
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; district?: string; search?: string }) {
    const rows = await this.prisma.agriFarmer.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.status && { status: params.status as any }),
        ...(params.district && { district: { contains: params.district, mode: 'insensitive' } }),
        ...(params.search && {
          OR: [
            { farmerNumber: { contains: params.search, mode: 'insensitive' } },
            { fullName: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search } },
            { cnic: { contains: params.search } },
            { village: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    return this.withKhata(user.tenantId, rows);
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const f = await this.prisma.agriFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Farmer not found');
    return (await this.withKhata(user.tenantId, [f]))[0];
  }

  async byCustomer(user: AuthenticatedUser, customerId: string) {
    const f = await this.prisma.agriFarmer.findFirst({ where: { customerId, tenantId: user.tenantId } });
    return f ? (await this.withKhata(user.tenantId, [f]))[0] : null;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const f = await this.prisma.agriFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Farmer not found');
    return this.prisma.agriFarmer.update({
      where: { id },
      data: {
        ...cleanInput(dto),
        creditLimit: dto.creditLimit !== undefined ? Number(dto.creditLimit) : undefined,
        landAreaAcres: dto.landAreaAcres !== undefined ? Number(dto.landAreaAcres) : undefined,
        landAreaKanals: dto.landAreaKanals !== undefined ? Number(dto.landAreaKanals) : undefined,
      },
    });
  }

  async suspend(user: AuthenticatedUser, id: string, reason: string) {
    await this.getOne(user, id);
    return this.prisma.agriFarmer.update({
      where: { id },
      data: { status: 'SUSPENDED', suspendedAt: new Date(), suspensionReason: reason },
    });
  }

  async reactivate(user: AuthenticatedUser, id: string) {
    await this.getOne(user, id);
    return this.prisma.agriFarmer.update({
      where: { id },
      data: { status: 'ACTIVE', suspendedAt: null, suspensionReason: null },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.getOne(user, id);
    return this.prisma.agriFarmer.update({ where: { id }, data: { isActive: false } });
  }

  async recordPurchase(user: AuthenticatedUser, id: string, amount: number) {
    const f = await this.prisma.agriFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Farmer not found');
    return this.prisma.agriFarmer.update({
      where: { id },
      data: {
        totalOrders: f.totalOrders + 1,
        totalPurchases: f.totalPurchases + amount,
        currentBalance: f.currentBalance + amount,
        totalOutstanding: f.totalOutstanding + amount,
        lastPurchaseAt: new Date(),
      },
    });
  }

  async recordPayment(user: AuthenticatedUser, id: string, amount: number) {
    const f = await this.prisma.agriFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Farmer not found');
    return this.prisma.agriFarmer.update({
      where: { id },
      data: {
        totalPaid: f.totalPaid + amount,
        currentBalance: Math.max(f.currentBalance - amount, 0),
        totalOutstanding: Math.max(f.totalOutstanding - amount, 0),
      },
    });
  }

  async overdueList(user: AuthenticatedUser) {
    const rows = await this.prisma.agriFarmer.findMany({
      where: { tenantId: user.tenantId, isActive: true },
    });
    const live = await this.withKhata(user.tenantId, rows);
    return live
      .filter((f) => f.totalOutstanding > 0)
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding)
      .slice(0, 100);
  }

  async summary(user: AuthenticatedUser) {
    const [rows, byDistrict] = await Promise.all([
      this.prisma.agriFarmer.findMany({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.agriFarmer.groupBy({
        by: ['district'],
        where: { tenantId: user.tenantId, isActive: true, district: { not: null } },
        _count: { _all: true },
      }),
    ]);
    const live = await this.withKhata(user.tenantId, rows);
    const sum = (pick: (f: (typeof live)[number]) => number) => live.reduce((a, f) => a + (pick(f) || 0), 0);
    return {
      total: live.length,
      active: live.filter((f) => f.status === 'ACTIVE').length,
      suspended: live.filter((f) => f.status === 'SUSPENDED').length,
      byDistrict,
      totals: {
        totalOutstanding: sum((f) => f.totalOutstanding),
        currentBalance: sum((f) => f.currentBalance),
        totalPurchases: sum((f) => f.totalPurchases),
        creditLimit: sum((f) => f.creditLimit),
      },
      farmersWithCredit: live.filter((f) => f.currentBalance > 0).length,
    };
  }
}
