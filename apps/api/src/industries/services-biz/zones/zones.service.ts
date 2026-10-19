/** Service areas: which localities a zone covers and its travel charge. */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import type { UpsertZoneDto } from './dto/zone.dto';

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  private clean(dto: UpsertZoneDto) {
    const name = dto.name?.trim();
    const city = dto.city?.trim();
    if (!name) throw new BadRequestException('Zone ka naam likhein');
    if (!city) throw new BadRequestException('Shehar likhein');
    return { ...dto, name, city, areas: [...new Set((dto.areas ?? []).map((a) => a.trim()).filter(Boolean))] };
  }

  async create(user: AuthenticatedUser, dto: UpsertZoneDto) {
    const data = this.clean(dto);
    const dup = await this.prisma.serviceZone.findFirst({ where: { tenantId: user.tenantId, name: { equals: data.name, mode: 'insensitive' } } });
    if (dup?.isActive) throw new BadRequestException(`"${data.name}" zone pehle se hai`);
    // A switched-off zone with the same name comes back instead of a duplicate.
    if (dup) return this.prisma.serviceZone.update({ where: { id: dup.id }, data: { ...data, isActive: true } });
    return this.prisma.serviceZone.create({ data: { tenantId: user.tenantId, ...data } });
  }

  async list(user: AuthenticatedUser) {
    return this.prisma.serviceZone.findMany({ where: { tenantId: user.tenantId, isActive: true }, orderBy: { name: 'asc' } });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const z = await this.prisma.serviceZone.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!z) throw new NotFoundException('Zone nahi mila');
    return z;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertZoneDto) {
    await this.getOne(user, id);
    const data = this.clean(dto);
    const dup = await this.prisma.serviceZone.findFirst({ where: { tenantId: user.tenantId, name: { equals: data.name, mode: 'insensitive' }, id: { not: id } } });
    if (dup) throw new BadRequestException(`"${data.name}" zone pehle se hai`);
    return this.prisma.serviceZone.update({ where: { id }, data });
  }

  /** Switches the zone off; jobs keep their area text. */
  async remove(user: AuthenticatedUser, id: string) {
    await this.getOne(user, id);
    return this.prisma.serviceZone.update({ where: { id }, data: { isActive: false } });
  }
}
