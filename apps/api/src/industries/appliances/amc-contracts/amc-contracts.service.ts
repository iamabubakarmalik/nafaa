import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { addMonths, differenceInDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RenewAmcDto, UpdateAmcStatusDto, UpsertAmcDto } from './dto/upsert-amc.dto';

@Injectable()
export class AmcContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertAmcDto) {
    const count = await this.prisma.applianceAmcContract.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const contractNumber = `AMC-${year}-${String(count + 1).padStart(4, '0')}`;

    const startDate = new Date(dto.startDate);
    const expiryDate = addMonths(startDate, dto.durationMonths);

    return this.prisma.applianceAmcContract.create({
      data: {
        tenantId: user.tenantId,
        contractNumber,
        ...dto,
        startDate,
        expiryDate,
        status: 'ACTIVE',
        createdById: user.id,
      },
    });
  }

  async list(user: AuthenticatedUser, params: {
    status?: string;
    amcType?: string;
    customerId?: string;
    expiringSoon?: boolean;
    expired?: boolean;
    search?: string;
  }) {
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    return this.prisma.applianceAmcContract.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.amcType && { amcType: params.amcType as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.expiringSoon && {
          status: 'ACTIVE',
          expiryDate: { gte: now, lte: in30Days },
        }),
        ...(params.expired && { expiryDate: { lt: now } }),
        ...(params.search && {
          OR: [
            { contractNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { serialNumber: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { expiryDate: 'asc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.applianceAmcContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('AMC contract not found');

    const relatedRequests = await this.prisma.applianceServiceRequest.findMany({
      where: { tenantId: user.tenantId, amcContractNumber: c.contractNumber },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const daysRemaining = differenceInDays(new Date(c.expiryDate), new Date());
    const visitsRemaining = Math.max(c.freeVisitsAllowed - c.freeVisitsUsed, 0);

    return {
      ...c,
      relatedRequests,
      computed: {
        daysRemaining,
        visitsRemaining,
        isExpired: daysRemaining < 0,
        isExpiringSoon: daysRemaining >= 0 && daysRemaining <= 30,
      },
    };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertAmcDto) {
    const c = await this.prisma.applianceAmcContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('AMC contract not found');

    const startDate = new Date(dto.startDate);
    const expiryDate = addMonths(startDate, dto.durationMonths);

    return this.prisma.applianceAmcContract.update({
      where: { id },
      data: { ...dto, startDate, expiryDate },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateAmcStatusDto) {
    const c = await this.prisma.applianceAmcContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('AMC contract not found');

    return this.prisma.applianceAmcContract.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.reason ? ((c.notes || '') + '\nStatus change: ' + dto.reason).trim() : undefined,
      },
    });
  }

  async renew(user: AuthenticatedUser, id: string, dto: RenewAmcDto) {
    const c = await this.prisma.applianceAmcContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('AMC contract not found');

    // Mark current as renewed
    await this.prisma.applianceAmcContract.update({
      where: { id },
      data: { status: 'RENEWED' },
    });

    // Create new renewal contract
    const count = await this.prisma.applianceAmcContract.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const contractNumber = `AMC-${year}-${String(count + 1).padStart(4, '0')}`;

    const startDate = new Date();
    const expiryDate = addMonths(startDate, dto.durationMonths);

    return this.prisma.applianceAmcContract.create({
      data: {
        tenantId: user.tenantId,
        contractNumber,
        amcType: c.amcType,
        customerId: c.customerId,
        customerName: c.customerName,
        customerPhone: c.customerPhone,
        customerAddress: c.customerAddress,
        productId: c.productId,
        productName: c.productName,
        serialNumber: c.serialNumber,
        serialTrackingId: c.serialTrackingId,
        startDate,
        expiryDate,
        durationMonths: dto.durationMonths,
        contractValue: dto.contractValue,
        paidAmount: dto.paidAmount ?? 0,
        freeVisitsAllowed: dto.freeVisitsAllowed ?? c.freeVisitsAllowed,
        freePartsAllowed: c.freePartsAllowed,
        laborCovered: c.laborCovered,
        gasRefillCovered: c.gasRefillCovered,
        emergencyCallsAllowed: c.emergencyCallsAllowed,
        servicesIncluded: c.servicesIncluded,
        servicesExcluded: c.servicesExcluded,
        exclusions: c.exclusions,
        status: 'ACTIVE',
        notes: 'Renewed from ' + c.contractNumber,
        createdById: user.id,
      },
    });
  }

  async sendReminder(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.applianceAmcContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('AMC contract not found');
    return this.prisma.applianceAmcContract.update({
      where: { id },
      data: { renewalReminderSent: true },
    });
  }

  async expiringSoon(user: AuthenticatedUser, days = 30) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return this.prisma.applianceAmcContract.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
        expiryDate: { gte: now, lte: future },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  /**
   * Summary — paisa aur tanbeeh dono.
   *
   * Pehle `expired` sirf `expiryDate < now` se ginta tha, is liye
   * cancel aur renew ho chuke contracts bhi "expired" me shumar hote thay.
   */
  async summary(user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    const now = new Date();
    const in30Days = new Date(); in30Days.setDate(in30Days.getDate() + 30);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [byStatus, activeRows, newThisMonth] = await Promise.all([
      this.prisma.applianceAmcContract.groupBy({
        by: ['status'], where: { tenantId }, _count: { _all: true },
      }),
      this.prisma.applianceAmcContract.findMany({
        where: { tenantId, status: 'ACTIVE' },
        select: {
          id: true, contractNumber: true, amcType: true, customerName: true, customerPhone: true,
          expiryDate: true, contractValue: true, paidAmount: true,
          freeVisitsAllowed: true, freeVisitsUsed: true, autoRenew: true,
          totalPartsClaimed: true, totalLaborSaved: true,
        },
      }),
      this.prisma.applianceAmcContract.findMany({
        where: { tenantId, createdAt: { gte: monthStart } },
        select: { contractValue: true, paidAmount: true },
      }),
    ]);

    const map = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all]));

    const billed = activeRows.reduce((s, r) => s + Number(r.contractValue), 0);
    const collected = activeRows.reduce((s, r) => s + Number(r.paidAmount), 0);

    const expiringRows = activeRows
      .filter((r) => new Date(r.expiryDate) >= now && new Date(r.expiryDate) <= in30Days)
      .map((r) => ({
        ...r,
        daysLeft: Math.floor((new Date(r.expiryDate).getTime() - now.getTime()) / 86_400_000),
        visitsLeft: Math.max(r.freeVisitsAllowed - r.freeVisitsUsed, 0),
        pending: Number(r.contractValue) - Number(r.paidAmount),
      }))
      .sort((a, b) => a.daysLeft - b.daysLeft);

    // Jo contract tareekh guzarne ke bawajood ACTIVE para hai — is par
    // kaam roz hota reh sakta hai jabke paisa khatam ho chuka
    const staleActive = activeRows.filter((r) => new Date(r.expiryDate) < now);

    const byType = new Map<string, { type: string; count: number; value: number; collected: number }>();
    for (const r of activeRows) {
      const t = byType.get(r.amcType) ?? { type: r.amcType, count: 0, value: 0, collected: 0 };
      t.count += 1;
      t.value += Number(r.contractValue);
      t.collected += Number(r.paidAmount);
      byType.set(r.amcType, t);
    }

    return {
      // Purane naam waise hi
      active: map['ACTIVE'] ?? 0,
      expiringSoon: expiringRows.length,
      expired: map['EXPIRED'] ?? 0,
      cancelled: map['CANCELLED'] ?? 0,
      totalContractValue: billed,
      totalCollected: collected,

      renewed: map['RENEWED'] ?? 0,
      suspended: map['SUSPENDED'] ?? 0,
      /** Contract ka baqi paisa */
      pendingAmount: billed - collected,
      /** Tareekh guzar chuki lekin status abhi ACTIVE hai */
      staleActive: staleActive.length,
      /** In par free visits khatam ho chuki hain */
      visitsExhausted: activeRows.filter((r) => r.freeVisitsUsed >= r.freeVisitsAllowed).length,
      autoRenewCount: activeRows.filter((r) => r.autoRenew).length,
      /** Customer ne AMC se kitna bachaya — bechne ki sab se achhi daleel */
      customerSaved: activeRows.reduce(
        (s, r) => s + Number(r.totalPartsClaimed) + Number(r.totalLaborSaved), 0,
      ),

      month: {
        newContracts: newThisMonth.length,
        billed: newThisMonth.reduce((s, r) => s + Number(r.contractValue), 0),
        collected: newThisMonth.reduce((s, r) => s + Number(r.paidAmount), 0),
      },

      byType: [...byType.values()].sort((a, b) => b.value - a.value),
      expiringList: expiringRows.slice(0, 30),
    };
  }
}
