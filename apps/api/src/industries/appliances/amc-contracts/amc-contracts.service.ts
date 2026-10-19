import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { addMonths, differenceInDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AmcPaymentDto, RenewAmcDto, UpdateAmcStatusDto, UpsertAmcDto } from './dto/upsert-amc.dto';
import { billJob, billOf, receiveJobMoney } from '../common/books';
import { checkLinks, nextInSequence, optDate, r2, stamp, yearPrefix } from '../common/appliance-common';
import { addDaysTz, startOfDayTz, startOfMonthTz } from '../../../common/helpers/business-time.helper';

/** An AMC contract is sold like any other item: one bill for its value, paid now or on khata. */
const amcParty = (c: { contractNumber: string; customerId: string | null; customerName: string; customerPhone: string }) => ({
  number: c.contractNumber, customerId: c.customerId, customerName: c.customerName, customerPhone: c.customerPhone,
});

function amcLines(c: { contractNumber: string; amcType: string; productName: string | null; serialNumber: string | null; durationMonths: number; contractValue: number }) {
  const what = [c.productName, c.serialNumber].filter(Boolean).join(' ');
  return [{ label: `AMC ${c.contractNumber} (${c.amcType}, ${c.durationMonths} mahine)${what ? ` — ${what}` : ''}`, amount: Number(c.contractValue) || 0 }];
}

@Injectable()
export class AmcContractsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Next contract number after the highest used this year (a count would repeat numbers). */
  private async nextNumber(tenantId: string) {
    const prefix = yearPrefix('AMC');
    const last = await this.prisma.applianceAmcContract.findFirst({
      where: { tenantId, contractNumber: { startsWith: prefix } },
      orderBy: { contractNumber: 'desc' },
      select: { contractNumber: true },
    });
    return nextInSequence(prefix, last?.contractNumber);
  }

  async create(user: AuthenticatedUser, dto: UpsertAmcDto) {
    const { paymentMethod, ...fields } = dto;
    await checkLinks(this.prisma, user.tenantId, dto);
    const contractNumber = await this.nextNumber(user.tenantId);

    const startDate = optDate(dto.startDate);
    if (!startDate) throw new BadRequestException('Shuru ki tareekh chunein');
    const expiryDate = addMonths(startDate, dto.durationMonths);

    if ((Number(dto.paidAmount) || 0) > (Number(dto.contractValue) || 0) + 0.01) {
      throw new BadRequestException('Receive amount contract ki qeemat se zyada nahi ho sakti');
    }
    return this.prisma.$transaction(async (tx) => {
      const c = await tx.applianceAmcContract.create({
        data: {
          tenantId: user.tenantId,
          contractNumber,
          ...fields,
          startDate,
          expiryDate,
          status: 'ACTIVE',
          createdById: user.id,
        },
      });
      const bill = await billJob(tx, user, amcParty(c), amcLines(c), Number(c.paidAmount) || 0, paymentMethod);
      if (bill?.customerId && bill.customerId !== c.customerId) {
        return tx.applianceAmcContract.update({ where: { id: c.id }, data: { customerId: bill.customerId } });
      }
      return c;
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
    const now = startOfDayTz();
    const in30Days = addDaysTz(now, 31);

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

    const daysRemaining = differenceInDays(new Date(c.expiryDate), startOfDayTz());
    const bill = await billOf(this.prisma, user.tenantId, c.contractNumber);
    const visitsRemaining = Math.max(c.freeVisitsAllowed - c.freeVisitsUsed, 0);

    return {
      ...c,
      saleId: bill?.id ?? null,
      dueAmount: Math.max(r2(Number(c.contractValue) - Number(c.paidAmount)), 0),
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

    const fields: Partial<UpsertAmcDto> = { ...dto };
    delete fields.paymentMethod;
    if (c.status === 'CANCELLED' || c.status === 'RENEWED') throw new BadRequestException('Band contract edit nahi hota');
    await checkLinks(this.prisma, user.tenantId, dto);
    const startDate = optDate(dto.startDate);
    if (!startDate) throw new BadRequestException('Shuru ki tareekh chunein');
    const expiryDate = addMonths(startDate, dto.durationMonths);
    if ((Number(dto.paidAmount) || 0) > (Number(dto.contractValue) || 0) + 0.01) {
      throw new BadRequestException('Receive amount contract ki qeemat se zyada nahi ho sakti');
    }

    // Once billed, money changes go through the khata, not by editing the contract.
    const moneyChanged = (dto.contractValue !== undefined && Number(dto.contractValue) !== Number(c.contractValue))
      || (dto.paidAmount !== undefined && Number(dto.paidAmount) !== Number(c.paidAmount));
    if (moneyChanged && await billOf(this.prisma, user.tenantId, c.contractNumber)) {
      throw new BadRequestException('Is contract ka bill ban chuka hai — qeemat ya receiving customer ke Khata se badlein');
    }

    return this.prisma.applianceAmcContract.update({
      where: { id },
      data: { ...fields, startDate, expiryDate },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateAmcStatusDto) {
    const c = await this.prisma.applianceAmcContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('AMC contract not found');
    if (dto.status === 'RENEWED') throw new BadRequestException('Renew ke liye "Renew" button istemal karein');
    if (c.status === 'RENEWED') throw new BadRequestException('Renew ho chuka contract nahi badalta — naya contract dekhein');
    if (dto.status === 'CANCELLED' && !dto.reason?.trim()) throw new BadRequestException('Cancel ki wajah likhein');

    return this.prisma.applianceAmcContract.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.reason ? stamp(c.notes, `Halat ${dto.status}: ${dto.reason}`) : undefined,
      },
    });
  }

  async renew(user: AuthenticatedUser, id: string, dto: RenewAmcDto) {
    const c = await this.prisma.applianceAmcContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('AMC contract not found');
    if (c.status === 'RENEWED' || c.status === 'CANCELLED') throw new BadRequestException('Ye contract pehle hi band ya renew ho chuka hai');
    if ((Number(dto.paidAmount) || 0) > (Number(dto.contractValue) || 0) + 0.01) {
      throw new BadRequestException('Receive amount contract ki qeemat se zyada nahi ho sakti');
    }

    const contractNumber = await this.nextNumber(user.tenantId);
    // A contract renewed before it ends continues from its expiry, not from today.
    const today = startOfDayTz();
    const startDate = new Date(c.expiryDate) > today ? new Date(c.expiryDate) : today;
    const expiryDate = addMonths(startDate, dto.durationMonths);

    return this.prisma.$transaction(async (tx) => {
      // The old contract is closed and a new one sold, in one step.
      await tx.applianceAmcContract.update({ where: { id }, data: { status: 'RENEWED' } });
      const renewed = await tx.applianceAmcContract.create({
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
      const bill = await billJob(tx, user, amcParty(renewed), amcLines(renewed), Number(renewed.paidAmount) || 0, dto.paymentMethod);
      if (bill?.customerId && bill.customerId !== renewed.customerId) {
        return tx.applianceAmcContract.update({ where: { id: renewed.id }, data: { customerId: bill.customerId } });
      }
      return renewed;
    });
  }

  /** Money received later on a contract sold on khata: a khata payment against its bill. */
  async addPayment(user: AuthenticatedUser, id: string, dto: AmcPaymentDto) {
    const c = await this.prisma.applianceAmcContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('AMC contract not found');
    if (c.status === 'CANCELLED') throw new BadRequestException('Cancel hue contract par paisa nahi liya ja sakta');
    const due = r2(Number(c.contractValue) - Number(c.paidAmount));
    if (due <= 0) throw new BadRequestException('Is contract ka poora paisa mil chuka hai');
    if (dto.amount > due + 0.005) throw new BadRequestException(`Sirf Rs ${due} baqi hai`);
    return this.prisma.$transaction(async (tx) => {
      const customerId = await receiveJobMoney(tx, user, amcParty(c), dto.amount, `AMC ${c.contractNumber} wusooli`, dto.paymentMethod);
      return tx.applianceAmcContract.update({
        where: { id },
        data: {
          customerId,
          paidAmount: { increment: dto.amount },
          notes: stamp(c.notes, `Wusooli: ${dto.amount}${dto.note ? ` — ${dto.note}` : ''}`),
        },
      });
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
    const now = startOfDayTz();
    const future = addDaysTz(now, Math.min(Math.max(Number(days) || 30, 1), 365) + 1);

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
    const now = startOfDayTz();
    const in30Days = addDaysTz(now, 31);
    const monthStart = startOfMonthTz();

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
