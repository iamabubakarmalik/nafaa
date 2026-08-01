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

  async summary(user: AuthenticatedUser) {
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const [active, expiringSoon, expired, cancelled, revenue] = await Promise.all([
      this.prisma.applianceAmcContract.count({ where: { tenantId: user.tenantId, status: 'ACTIVE' } }),
      this.prisma.applianceAmcContract.count({
        where: { tenantId: user.tenantId, status: 'ACTIVE', expiryDate: { gte: now, lte: in30Days } },
      }),
      this.prisma.applianceAmcContract.count({ where: { tenantId: user.tenantId, expiryDate: { lt: now } } }),
      this.prisma.applianceAmcContract.count({ where: { tenantId: user.tenantId, status: 'CANCELLED' } }),
      this.prisma.applianceAmcContract.aggregate({
        where: { tenantId: user.tenantId, status: 'ACTIVE' },
        _sum: { contractValue: true, paidAmount: true },
      }),
    ]);

    return {
      active,
      expiringSoon,
      expired,
      cancelled,
      totalContractValue: revenue._sum.contractValue ?? 0,
      totalCollected: revenue._sum.paidAmount ?? 0,
    };
  }
}
