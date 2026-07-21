import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const dup = await this.prisma.serviceZone.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException('Zone already exists');
    return this.prisma.serviceZone.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser) {
    return this.prisma.serviceZone.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const z = await this.prisma.serviceZone.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!z) throw new NotFoundException('Zone not found');
    return z;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const z = await this.prisma.serviceZone.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!z) throw new NotFoundException('Zone not found');
    return this.prisma.serviceZone.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.serviceZone.update({ where: { id }, data: { isActive: false } });
  }
}
