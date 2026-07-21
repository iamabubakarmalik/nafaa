import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class ClinicServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const dup = await this.prisma.clinicService.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException(`"${dto.name}" already exists`);
    return this.prisma.clinicService.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: { category?: string; active?: boolean; search?: string }) {
    return this.prisma.clinicService.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.category && { category: params.category }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { code: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    return this.prisma.clinicService.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.clinicService.update({ where: { id }, data: { isActive: false } });
  }
}
