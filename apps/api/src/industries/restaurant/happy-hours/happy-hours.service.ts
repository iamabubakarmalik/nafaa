import { Injectable, NotFoundException } from '@nestjs/common';
import { dateKeyTz, tzParts, weekdayInTz } from '../../../common/helpers/business-time.helper';
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
    // Shop time, not server time (the server runs on UTC).
    const now = new Date();
    const p = tzParts(now);
    const day = weekdayInTz(now);
    const timeStr = `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
    const today = dateKeyTz(now);

    const rules = await this.prisma.happyHourRule.findMany({ where: { tenantId: user.tenantId, isActive: true } });

    return rules.filter((r) => {
      // Valid dates are whole days in shop time.
      if (r.validFrom && dateKeyTz(r.validFrom) > today) return false;
      if (r.validTo && dateKeyTz(r.validTo) < today) return false;
      const dayMatch = !r.daysOfWeek?.length || r.daysOfWeek.includes(day);
      // A window like 22:00–02:00 runs past midnight.
      const timeMatch = r.startTime <= r.endTime
        ? timeStr >= r.startTime && timeStr <= r.endTime
        : timeStr >= r.startTime || timeStr <= r.endTime;
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