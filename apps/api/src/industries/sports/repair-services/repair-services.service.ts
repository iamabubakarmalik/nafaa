import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateRepairServiceDto, UpdateRepairStatusDto } from './dto/create-repair.dto';

@Injectable()
export class RepairServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateRepairServiceDto) {
    const count = await this.prisma.sportsRepairService.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const serviceNumber = `RS-${year}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.sportsRepairService.create({
      data: {
        tenantId: user.tenantId,
        serviceNumber,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        itemType: dto.itemType,
        itemBrand: dto.itemBrand,
        itemDescription: dto.itemDescription,
        issue: dto.issue,
        repairType: dto.repairType,
        estimatedCost: dto.estimatedCost ?? 0,
        advancePaid: dto.advancePaid ?? 0,
        estimatedReadyAt: dto.estimatedReadyAt ? new Date(dto.estimatedReadyAt) : null,
        photosBeforeUrls: dto.photosBeforeUrls ?? [],
        notes: dto.notes,
        status: 'RECEIVED',
      },
    });
  }

  async list(user: AuthenticatedUser, params: {
    status?: string;
    itemType?: string;
    repairType?: string;
    customerId?: string;
    from?: string;
    to?: string;
    search?: string;
  }) {
    return this.prisma.sportsRepairService.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.itemType && { itemType: params.itemType }),
        ...(params.repairType && { repairType: params.repairType }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.from || params.to
          ? {
              receivedAt: {
                ...(params.from && { gte: new Date(params.from) }),
                ...(params.to && { lte: new Date(params.to) }),
              },
            }
          : {}),
        ...(params.search && {
          OR: [
            { serviceNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { itemType: { contains: params.search, mode: 'insensitive' } },
            { itemBrand: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { receivedAt: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.sportsRepairService.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Repair service not found');
    return r;
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateRepairStatusDto) {
    const r = await this.prisma.sportsRepairService.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Repair service not found');

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'COMPLETED' && !r.completedAt) patch.completedAt = now;
    if (dto.status === 'DELIVERED' && !r.deliveredAt) patch.deliveredAt = now;
    if (dto.workDone) patch.workDone = dto.workDone;
    if (dto.partsUsed) patch.partsUsed = dto.partsUsed;
    if (dto.finalCost !== undefined) patch.finalCost = dto.finalCost;
    if (dto.photosAfterUrls) patch.photosAfterUrls = dto.photosAfterUrls;
    if (dto.notes) patch.notes = ((r.notes || '') + '\n' + dto.notes).trim();

    return this.prisma.sportsRepairService.update({ where: { id }, data: patch });
  }

  async recordPayment(user: AuthenticatedUser, id: string, amount: number) {
    const r = await this.prisma.sportsRepairService.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Repair service not found');
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    return this.prisma.sportsRepairService.update({
      where: { id },
      data: { advancePaid: Number(r.advancePaid || 0) + amount },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.sportsRepairService.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Repair service not found');
    return this.prisma.sportsRepairService.delete({ where: { id } });
  }

  async summary(user: AuthenticatedUser) {
    const [received, inProgress, completed, delivered] = await Promise.all([
      this.prisma.sportsRepairService.count({ where: { tenantId: user.tenantId, status: 'RECEIVED' } }),
      this.prisma.sportsRepairService.count({ where: { tenantId: user.tenantId, status: 'IN_PROGRESS' } }),
      this.prisma.sportsRepairService.count({ where: { tenantId: user.tenantId, status: 'COMPLETED' } }),
      this.prisma.sportsRepairService.count({ where: { tenantId: user.tenantId, status: 'DELIVERED' } }),
    ]);
    const revenue = await this.prisma.sportsRepairService.aggregate({
      where: { tenantId: user.tenantId, status: 'DELIVERED' },
      _sum: { finalCost: true, advancePaid: true },
    });
    return {
      received, inProgress, completed, delivered,
      totalRevenue: revenue._sum.finalCost ?? 0,
      totalCollected: revenue._sum.advancePaid ?? 0,
    };
  }

  async overdueRepairs(user: AuthenticatedUser) {
    const now = new Date();
    return this.prisma.sportsRepairService.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['RECEIVED', 'IN_PROGRESS'] },
        estimatedReadyAt: { lt: now },
      },
      orderBy: { estimatedReadyAt: 'asc' },
    });
  }
}
