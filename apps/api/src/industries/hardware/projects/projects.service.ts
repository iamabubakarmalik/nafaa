import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertProjectDto, UpdateProjectStatusDto } from './dto/upsert-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertProjectDto) {
    const count = await this.prisma.hardwareProject.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const projectNumber = `PRJ-${year}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.hardwareProject.create({
      data: {
        tenantId: user.tenantId,
        projectNumber,
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        expectedEndDate: dto.expectedEndDate ? new Date(dto.expectedEndDate) : null,
        createdById: user.id,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; city?: string; search?: string; active?: boolean }) {
    return this.prisma.hardwareProject.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.city && { city: { contains: params.city, mode: 'insensitive' } }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.search && {
          OR: [
            { projectNumber: { contains: params.search, mode: 'insensitive' } },
            { name: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.hardwareProject.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Project not found');

    const [quotations, deliveries] = await Promise.all([
      this.prisma.hardwareQuotation.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.hardwareDelivery.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);

    return { ...p, quotations, deliveries };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertProjectDto) {
    const p = await this.prisma.hardwareProject.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Project not found');
    return this.prisma.hardwareProject.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        expectedEndDate: dto.expectedEndDate ? new Date(dto.expectedEndDate) : undefined,
      },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateProjectStatusDto) {
    const p = await this.prisma.hardwareProject.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Project not found');

    const patch: any = { status: dto.status };
    if (dto.status === 'COMPLETED') patch.actualEndDate = new Date();
    if (dto.notes) patch.notes = ((p.notes || '') + '\n' + dto.notes).trim();

    return this.prisma.hardwareProject.update({ where: { id }, data: patch });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.hardwareProject.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Project not found');
    return this.prisma.hardwareProject.update({ where: { id }, data: { isActive: false } });
  }

  async recalculateFinancials(user: AuthenticatedUser, id: string) {
    const project = await this.prisma.hardwareProject.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!project) throw new NotFoundException('Project not found');

    const [quotedAgg, orderedAgg, deliveredAgg] = await Promise.all([
      this.prisma.hardwareQuotation.aggregate({ where: { projectId: id, status: 'ACCEPTED' }, _sum: { total: true } }),
      this.prisma.hardwareDelivery.aggregate({ where: { projectId: id }, _sum: { totalCharges: true } }),
      this.prisma.hardwareDelivery.aggregate({ where: { projectId: id, status: 'DELIVERED' }, _sum: { totalCharges: true } }),
    ]);

    return this.prisma.hardwareProject.update({
      where: { id },
      data: {
        totalQuoted: quotedAgg._sum.total ?? 0,
        totalOrdered: orderedAgg._sum.totalCharges ?? 0,
        totalDelivered: deliveredAgg._sum.totalCharges ?? 0,
      },
    });
  }
}
