import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertStationDto } from './dto/upsert-station.dto';

@Injectable()
export class StationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(user: AuthenticatedUser, dto: UpsertStationDto) { return this.prisma.kitchenStation.create({ data: { tenantId: user.tenantId, ...dto } }); }
  list(user: AuthenticatedUser) { return this.prisma.kitchenStation.findMany({ where: { tenantId: user.tenantId, isActive: true }, orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] }); }
  async update(user: AuthenticatedUser, id: string, dto: UpsertStationDto) {
    const s = await this.prisma.kitchenStation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Station not found');
    return this.prisma.kitchenStation.update({ where: { id }, data: dto });
  }
  async remove(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.kitchenStation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Station not found');
    return this.prisma.kitchenStation.delete({ where: { id } });
  }
}