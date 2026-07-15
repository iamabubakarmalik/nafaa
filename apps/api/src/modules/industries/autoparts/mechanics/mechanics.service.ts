import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class MechanicsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: any) {
    const staff = await this.prisma.staff.findFirst({ where: { id: dto.staffId, tenantId: user.tenantId } });
    if (!staff) throw new NotFoundException('Staff not found');

    const existing = await this.prisma.mechanicProfile.findUnique({ where: { staffId: dto.staffId } });
    if (existing) {
      return this.prisma.mechanicProfile.update({
        where: { staffId: dto.staffId },
        data: { ...dto, tenantId: user.tenantId },
      });
    }
    return this.prisma.mechanicProfile.create({
      data: { ...dto, tenantId: user.tenantId },
    });
  }

  async list(user: AuthenticatedUser, params: { available?: boolean; search?: string }) {
    const profiles = await this.prisma.mechanicProfile.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.available !== undefined && { isAvailable: params.available }),
      },
      orderBy: { updatedAt: 'desc' },
    });

    const staffIds = profiles.map((p) => p.staffId);
    const staffs = await this.prisma.staff.findMany({
      where: {
        id: { in: staffIds },
        ...(params.search && { OR: [{ firstName: { contains: params.search, mode: 'insensitive' } }, { lastName: { contains: params.search, mode: 'insensitive' } }] } as any),
      } as any,
    });
    const staffMap = new Map(staffs.map((s) => [s.id, s]));
    return profiles.filter((p) => staffMap.has(p.staffId)).map((p) => ({ ...p, staff: staffMap.get(p.staffId) }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.mechanicProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Mechanic not found');
    const staff = await this.prisma.staff.findUnique({ where: { id: p.staffId } });

    // Current active jobs
    const activeJobs = await this.prisma.workshopJob.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [{ primaryMechanicId: p.id }, { assistantMechanicIds: { has: p.id } }],
        status: { in: ['APPROVED', 'IN_PROGRESS', 'WAITING_PARTS'] },
      },
      take: 10,
      orderBy: { promisedAt: 'asc' },
    });

    return { ...p, staff, activeJobs };
  }

  async byStaff(user: AuthenticatedUser, staffId: string) {
    return this.prisma.mechanicProfile.findFirst({ where: { staffId, tenantId: user.tenantId } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.mechanicProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Mechanic not found');
    return this.prisma.mechanicProfile.update({ where: { id }, data: { isActive: false } });
  }

  async toggleAvailability(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.mechanicProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Mechanic not found');
    return this.prisma.mechanicProfile.update({ where: { id }, data: { isAvailable: !p.isAvailable } });
  }
}
