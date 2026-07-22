import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertHappyHourDto } from './dto/upsert-happy-hour.dto';

@Injectable()
export class HappyHoursService {
  constructor(private readonly prisma: PrismaService) {}

  create(user: AuthenticatedUser, dto: UpsertHappyHourDto) {
    return this.prisma.happyHourRule.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validTo: dto.validTo ? new Date(dto.validTo) : null,
      },
    });
  }

  list(user: AuthenticatedUser, activeOnly = false) {
    return this.prisma.happyHourRule.findMany({
      where: { tenantId: user.tenantId, ...(activeOnly && { isActive: true }) },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findActiveNow(user: AuthenticatedUser) {
    const now = new Date();
    const day = now.getDay();
    const timeStr = now.toTimeString().slice(0, 5);

    const rules = await this.prisma.happyHourRule.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        OR: [
          { validFrom: null, validTo: null },
          { validFrom: { lte: now }, validTo: { gte: now } },
          { validFrom: { lte: now }, validTo: null },
          { validFrom: null, validTo: { gte: now } },
        ],
      },
    });

    return rules.filter((r) => {
      const dayMatch = !r.daysOfWeek?.length || r.daysOfWeek.includes(day);
      const timeMatch = timeStr >= r.startTime && timeStr <= r.endTime;
      return dayMatch && timeMatch;
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertHappyHourDto) {
    const r = await this.prisma.happyHourRule.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Rule not found');
    return this.prisma.happyHourRule.update({
      where: { id },
      data: {
        ...dto,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.happyHourRule.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Rule not found');
    return this.prisma.happyHourRule.delete({ where: { id } });
  }

  async toggle(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.happyHourRule.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Rule not found');
    return this.prisma.happyHourRule.update({ where: { id }, data: { isActive: !r.isActive } });
  }
}