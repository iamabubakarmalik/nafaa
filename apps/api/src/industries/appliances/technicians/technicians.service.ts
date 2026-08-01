import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertTechnicianDto } from './dto/upsert-technician.dto';

@Injectable()
export class TechniciansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertTechnicianDto) {
    const dup = await this.prisma.applianceTechnician.findFirst({
      where: { tenantId: user.tenantId, employeeCode: dto.employeeCode },
    });
    if (dup) throw new BadRequestException(`Employee code "${dto.employeeCode}" already exists`);
    return this.prisma.applianceTechnician.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: {
    active?: boolean;
    zone?: string;
    category?: string;
    brand?: string;
    search?: string;
  }) {
    return this.prisma.applianceTechnician.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.zone && { currentZone: { contains: params.zone, mode: 'insensitive' } }),
        ...(params.category && { categoriesExpertise: { has: params.category as any } }),
        ...(params.brand && { brandsExpertise: { has: params.brand } }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search } },
            { employeeCode: { contains: params.search, mode: 'insensitive' } },
            { cnic: { contains: params.search } },
          ],
        }),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.applianceTechnician.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Technician not found');

    const recentJobs = await this.prisma.applianceInstallation.findMany({
      where: { technicianId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const activeServiceRequests = await this.prisma.applianceServiceRequest.findMany({
      where: {
        technicianId: id,
        status: { in: ['TECHNICIAN_ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'IN_PROGRESS'] },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    return { ...t, recentJobs, activeServiceRequests };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertTechnicianDto) {
    const t = await this.prisma.applianceTechnician.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Technician not found');
    return this.prisma.applianceTechnician.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.applianceTechnician.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Technician not found');
    return this.prisma.applianceTechnician.update({ where: { id }, data: { isActive: false } });
  }

  async workload(user: AuthenticatedUser, id: string, from: string, to: string) {
    const t = await this.prisma.applianceTechnician.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Technician not found');

    const start = new Date(from);
    const end = new Date(to);

    const [installations, serviceRequests] = await Promise.all([
      this.prisma.applianceInstallation.findMany({
        where: { technicianId: id, scheduledDate: { gte: start, lte: end } },
        orderBy: { scheduledDate: 'asc' },
      }),
      this.prisma.applianceServiceRequest.findMany({
        where: { technicianId: id, scheduledDate: { gte: start, lte: end } },
        orderBy: { scheduledDate: 'asc' },
      }),
    ]);

    return {
      technician: t,
      installations,
      serviceRequests,
      totals: {
        installations: installations.length,
        serviceRequests: serviceRequests.length,
        totalJobs: installations.length + serviceRequests.length,
      },
    };
  }

  async topPerformers(user: AuthenticatedUser, limit = 10) {
    return this.prisma.applianceTechnician.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { totalRevenue: 'desc' },
      take: limit,
    });
  }
}
