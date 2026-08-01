import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import {
  AssignTechnicianDto,
  CompleteInstallationDto,
  CreateInstallationDto,
  UpdateInstallationStatusDto,
} from './dto/create-installation.dto';

@Injectable()
export class InstallationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateInstallationDto) {
    const count = await this.prisma.applianceInstallation.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const installationNumber = `INST-${year}-${String(count + 1).padStart(4, '0')}`;

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

    return this.prisma.applianceInstallation.create({
      data: {
        tenantId: user.tenantId,
        installationNumber,
        ...dto,
        serviceType: dto.serviceType ?? 'INSTALLATION',
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        technicianName,
        technicianPhone,
        status: dto.technicianId ? 'ASSIGNED' : 'PENDING',
        createdById: user.id,
      },
    });
  }

  async list(user: AuthenticatedUser, params: {
    status?: string;
    serviceType?: string;
    technicianId?: string;
    customerId?: string;
    from?: string;
    to?: string;
    search?: string;
  }) {
    return this.prisma.applianceInstallation.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.serviceType && { serviceType: params.serviceType as any }),
        ...(params.technicianId && { technicianId: params.technicianId }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.from || params.to
          ? {
              scheduledDate: {
                ...(params.from && { gte: new Date(params.from) }),
                ...(params.to && { lte: new Date(params.to) }),
              },
            }
          : {}),
        ...(params.search && {
          OR: [
            { installationNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { serialNumber: { contains: params.search, mode: 'insensitive' } },
            { productName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { scheduledDate: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const i = await this.prisma.applianceInstallation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Installation not found');
    return i;
  }

  async assignTechnician(user: AuthenticatedUser, id: string, dto: AssignTechnicianDto) {
    const i = await this.prisma.applianceInstallation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Installation not found');

    const tech = await this.prisma.applianceTechnician.findFirst({
      where: { id: dto.technicianId, tenantId: user.tenantId },
    });
    if (!tech) throw new NotFoundException('Technician not found');
    if (!tech.isActive) throw new BadRequestException('Technician is not active');

    return this.prisma.applianceInstallation.update({
      where: { id },
      data: {
        technicianId: tech.id,
        technicianName: tech.name,
        technicianPhone: tech.phone,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
        scheduledTimeSlot: dto.scheduledTimeSlot,
        status: 'ASSIGNED',
      },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateInstallationStatusDto) {
    const i = await this.prisma.applianceInstallation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Installation not found');

    const patch: any = { status: dto.status };
    const now = new Date();
    if (dto.status === 'IN_PROGRESS') {
      patch.arrivedAt = patch.arrivedAt ?? now;
      patch.startedAt = now;
    }
    if (dto.status === 'COMPLETED') patch.completedAt = now;
    if (dto.status === 'CANCELLED') {
      patch.cancelledAt = now;
      patch.cancellationReason = dto.cancellationReason;
    }
    if (dto.notes) patch.internalNotes = ((i.internalNotes || '') + '\n' + dto.notes).trim();

    return this.prisma.applianceInstallation.update({ where: { id }, data: patch });
  }

  async complete(user: AuthenticatedUser, id: string, dto: CompleteInstallationDto) {
    const i = await this.prisma.applianceInstallation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Installation not found');

    const materialsCharge = dto.materialsCharge ?? 0;
    const laborCharge = dto.laborCharge ?? 0;
    const visitCharge = dto.visitCharge ?? 0;
    const totalCharge = materialsCharge + laborCharge + visitCharge;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.applianceInstallation.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          ...dto,
          materialsCharge,
          laborCharge,
          visitCharge,
          totalCharge,
        },
      });

      // Update technician stats
      if (i.technicianId) {
        await tx.applianceTechnician.update({
          where: { id: i.technicianId },
          data: {
            totalJobs: { increment: 1 },
            completedJobs: { increment: 1 },
            totalRevenue: { increment: totalCharge },
          },
        });
      }

      // Update serial tracking installation status
      if (i.serialTrackingId) {
        await tx.applianceSerialTracking.update({
          where: { id: i.serialTrackingId },
          data: {
            installationStatus: 'COMPLETED',
            installedAt: new Date(),
            installedByTechnicianId: i.technicianId,
          },
        });
      }

      return updated;
    });
  }

  async reschedule(user: AuthenticatedUser, id: string, newDate: string, reason?: string) {
    const i = await this.prisma.applianceInstallation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!i) throw new NotFoundException('Installation not found');
    return this.prisma.applianceInstallation.update({
      where: { id },
      data: {
        scheduledDate: new Date(newDate),
        status: 'RESCHEDULED',
        internalNotes: ((i.internalNotes || '') + '\nRescheduled: ' + (reason || '')).trim(),
      },
    });
  }

  async todaySchedule(user: AuthenticatedUser) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return this.prisma.applianceInstallation.findMany({
      where: {
        tenantId: user.tenantId,
        scheduledDate: { gte: start, lte: end },
        status: { in: ['SCHEDULED', 'ASSIGNED', 'IN_PROGRESS'] },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async summary(user: AuthenticatedUser) {
    const [pending, scheduled, inProgress, completed, cancelled] = await Promise.all([
      this.prisma.applianceInstallation.count({ where: { tenantId: user.tenantId, status: 'PENDING' } }),
      this.prisma.applianceInstallation.count({ where: { tenantId: user.tenantId, status: { in: ['SCHEDULED', 'ASSIGNED'] } } }),
      this.prisma.applianceInstallation.count({ where: { tenantId: user.tenantId, status: 'IN_PROGRESS' } }),
      this.prisma.applianceInstallation.count({ where: { tenantId: user.tenantId, status: 'COMPLETED' } }),
      this.prisma.applianceInstallation.count({ where: { tenantId: user.tenantId, status: 'CANCELLED' } }),
    ]);
    return { pending, scheduled, inProgress, completed, cancelled };
  }
}
