import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CompleteServiceDto, CreateServiceRequestDto, UpdateServiceStatusDto } from './dto/create-service-request.dto';

@Injectable()
export class ServiceRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateServiceRequestDto) {
    const count = await this.prisma.applianceServiceRequest.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const requestNumber = `SR-${year}-${String(count + 1).padStart(4, '0')}`;

    let technicianName: string | undefined;
    let technicianPhone: string | undefined;
    if (dto.technicianId) {
      const tech = await this.prisma.applianceTechnician.findFirst({
        where: { id: dto.technicianId, tenantId: user.tenantId },
      });
      if (tech) {
        technicianName = tech.name;
        technicianPhone = tech.phone;
      }
    }

    // Check AMC coverage if number provided
    if (dto.amcContractNumber) {
      const amc = await this.prisma.applianceAmcContract.findFirst({
        where: { tenantId: user.tenantId, contractNumber: dto.amcContractNumber, status: 'ACTIVE' },
      });
      if (!amc) throw new BadRequestException('AMC contract not found or inactive');
      if (amc.freeVisitsUsed >= amc.freeVisitsAllowed) {
        throw new BadRequestException('All free AMC visits used');
      }
    }

    return this.prisma.applianceServiceRequest.create({
      data: {
        tenantId: user.tenantId,
        requestNumber,
        ...dto,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        technicianName,
        technicianPhone,
        status: dto.technicianId ? 'TECHNICIAN_ASSIGNED' : dto.scheduledDate ? 'SCHEDULED' : 'REQUESTED',
        createdById: user.id,
      },
    });
  }

  async list(user: AuthenticatedUser, params: {
    status?: string;
    serviceType?: string;
    technicianId?: string;
    customerId?: string;
    priority?: string;
    coveredUnderWarranty?: boolean;
    coveredUnderAmc?: boolean;
    from?: string;
    to?: string;
    search?: string;
  }) {
    return this.prisma.applianceServiceRequest.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.serviceType && { serviceType: params.serviceType as any }),
        ...(params.technicianId && { technicianId: params.technicianId }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.priority && { priority: params.priority }),
        ...(params.coveredUnderWarranty !== undefined && { coveredUnderWarranty: params.coveredUnderWarranty }),
        ...(params.coveredUnderAmc !== undefined && { coveredUnderAmc: params.coveredUnderAmc }),
        ...(params.from || params.to
          ? {
              requestedAt: {
                ...(params.from && { gte: new Date(params.from) }),
                ...(params.to && { lte: new Date(params.to) }),
              },
            }
          : {}),
        ...(params.search && {
          OR: [
            { requestNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { serialNumber: { contains: params.search, mode: 'insensitive' } },
            { productName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { requestedAt: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.applianceServiceRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Service request not found');
    return r;
  }

  async assignTechnician(user: AuthenticatedUser, id: string, technicianId: string, scheduledDate?: string, timeSlot?: string) {
    const r = await this.prisma.applianceServiceRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Service request not found');

    const tech = await this.prisma.applianceTechnician.findFirst({
      where: { id: technicianId, tenantId: user.tenantId },
    });
    if (!tech) throw new NotFoundException('Technician not found');

    return this.prisma.applianceServiceRequest.update({
      where: { id },
      data: {
        technicianId: tech.id,
        technicianName: tech.name,
        technicianPhone: tech.phone,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        scheduledTimeSlot: timeSlot,
        status: 'TECHNICIAN_ASSIGNED',
      },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateServiceStatusDto) {
    const r = await this.prisma.applianceServiceRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Service request not found');

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'EN_ROUTE') patch.enRouteAt = now;
    if (dto.status === 'ON_SITE') patch.arrivedAt = now;
    if (dto.status === 'IN_PROGRESS') patch.workStartedAt = patch.workStartedAt ?? now;
    if (dto.status === 'COMPLETED') patch.completedAt = now;
    if (dto.notes) patch.internalNotes = ((r.internalNotes || '') + '\n' + dto.notes).trim();

    return this.prisma.applianceServiceRequest.update({ where: { id }, data: patch });
  }

  async complete(user: AuthenticatedUser, id: string, dto: CompleteServiceDto) {
    const r = await this.prisma.applianceServiceRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Service request not found');

    const visitCharge = dto.visitCharge ?? 0;
    const laborCharge = dto.laborCharge ?? 0;
    const partsCharge = dto.partsCharge ?? 0;
    const totalCharge = visitCharge + laborCharge + partsCharge;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.applianceServiceRequest.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          ...dto,
          followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
          visitCharge,
          laborCharge,
          partsCharge,
          totalCharge,
        },
      });

      // Update technician stats
      if (r.technicianId) {
        await tx.applianceTechnician.update({
          where: { id: r.technicianId },
          data: {
            totalJobs: { increment: 1 },
            completedJobs: { increment: 1 },
            totalRevenue: { increment: totalCharge },
          },
        });
      }

      // Update AMC usage
      if (r.amcContractNumber && dto.coveredUnderAmc) {
        await tx.applianceAmcContract.updateMany({
          where: { tenantId: user.tenantId, contractNumber: r.amcContractNumber },
          data: {
            freeVisitsUsed: { increment: 1 },
            totalVisitsUsed: { increment: 1 },
            totalPartsClaimed: { increment: partsCharge },
            totalLaborSaved: { increment: laborCharge },
          },
        });
      }

      return updated;
    });
  }

  async summary(user: AuthenticatedUser) {
    const [requested, scheduled, inProgress, completed, unresolved, followUps] = await Promise.all([
      this.prisma.applianceServiceRequest.count({ where: { tenantId: user.tenantId, status: 'REQUESTED' } }),
      this.prisma.applianceServiceRequest.count({ where: { tenantId: user.tenantId, status: { in: ['SCHEDULED', 'TECHNICIAN_ASSIGNED'] } } }),
      this.prisma.applianceServiceRequest.count({ where: { tenantId: user.tenantId, status: { in: ['EN_ROUTE', 'ON_SITE', 'IN_PROGRESS'] } } }),
      this.prisma.applianceServiceRequest.count({ where: { tenantId: user.tenantId, status: 'COMPLETED' } }),
      this.prisma.applianceServiceRequest.count({ where: { tenantId: user.tenantId, status: 'UNRESOLVED' } }),
      this.prisma.applianceServiceRequest.count({
        where: {
          tenantId: user.tenantId,
          requiresFollowUp: true,
          followUpDate: { lte: new Date() },
        },
      }),
    ]);
    return { requested, scheduled, inProgress, completed, unresolved, pendingFollowUps: followUps };
  }
}
