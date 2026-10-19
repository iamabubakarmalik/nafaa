/**
 * Rate plans: season, peak, off-season, weekend, corporate and long-stay
 * rates over a date range, as a fixed season rate (peak / off-season price
 * of the room type) or a +/- adjustment. The first active plan that covers
 * a night sets its rate (see quoteNights); plans are switched off, never
 * deleted.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { dayOf, found } from '../common/hotel-common';
import { RatePlanDto } from '../common/hotel.dto';

@Injectable()
export class RatePlansService {
  constructor(private readonly prisma: PrismaService) {}

  private async clean(user: AuthenticatedUser, dto: RatePlanDto, base?: { startDate: Date; endDate: Date; minNights: number | null; maxNights: number | null }) {
    const startDate = dto.startDate !== undefined ? dayOf(dto.startDate, 'Shuru ki date') : base?.startDate;
    const endDate = dto.endDate !== undefined ? dayOf(dto.endDate, 'Aakhri date') : base?.endDate;
    if (startDate && endDate && endDate < startDate) throw new BadRequestException('Aakhri date shuru ki date se pehle nahi ho sakti');
    const minNights = dto.minNights !== undefined ? dto.minNights : base?.minNights;
    const maxNights = dto.maxNights !== undefined ? dto.maxNights : base?.maxNights;
    if (minNights && maxNights && maxNights < minNights) throw new BadRequestException('Zyada se zyada raatein kam se kam se choti nahi ho sakti');
    if (dto.isPercentage && dto.adjustment != null && dto.adjustment < -100) throw new BadRequestException('Rate 100% se zyada kam nahi ho sakta');
    if (dto.applicableRoomTypeIds?.length) {
      const n = await this.prisma.hotelRoomType.count({ where: { tenantId: user.tenantId, id: { in: dto.applicableRoomTypeIds } } });
      if (n !== new Set(dto.applicableRoomTypeIds).size) throw new BadRequestException('Room type nahi mila');
    }
    const data: Prisma.HotelRatePlanUncheckedUpdateInput = {
      ...(dto.code !== undefined && { code: dto.code.trim().toUpperCase() }),
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.description !== undefined && { description: dto.description.trim() || null }),
      ...(startDate && { startDate }), ...(endDate && { endDate }),
      ...(dto.planType !== undefined && { planType: dto.planType }),
      ...(dto.mealPlan !== undefined && { mealPlan: dto.mealPlan }),
      ...(dto.isPercentage !== undefined && { isPercentage: dto.isPercentage }),
      ...(dto.adjustment !== undefined && { adjustment: dto.adjustment }),
      ...(dto.minNights !== undefined && { minNights: dto.minNights }),
      ...(dto.maxNights !== undefined && { maxNights: dto.maxNights }),
      ...(dto.applicableDays !== undefined && { applicableDays: [...new Set(dto.applicableDays)].sort() }),
      ...(dto.applicableRoomTypeIds !== undefined && { applicableRoomTypeIds: [...new Set(dto.applicableRoomTypeIds)] }),
      ...(dto.applicableSources !== undefined && { applicableSources: [...new Set(dto.applicableSources)] }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
    };
    return data;
  }

  async create(user: AuthenticatedUser, dto: RatePlanDto) {
    if (!dto.name?.trim()) throw new BadRequestException('Plan ka naam likhein');
    if (!dto.startDate || !dto.endDate) throw new BadRequestException('Plan kab se kab tak — dono dates likhein');
    const code = (dto.code?.trim() || dto.name.trim().replace(/[^A-Za-z0-9]+/g, '-').slice(0, 20)).toUpperCase();
    const dup = await this.prisma.hotelRatePlan.findFirst({ where: { tenantId: user.tenantId, code } });
    if (dup) throw new BadRequestException(`Code "${code}" pehle se hai`);
    const data = await this.clean(user, { ...dto, code });
    return this.prisma.hotelRatePlan.create({ data: { ...(data as Prisma.HotelRatePlanUncheckedCreateInput), tenantId: user.tenantId, planType: dto.planType ?? 'SEASON' } });
  }

  async list(user: AuthenticatedUser, params: { active?: boolean; planType?: string }) {
    return this.prisma.hotelRatePlan.findMany({
      where: { tenantId: user.tenantId, ...(params.active !== undefined && { isActive: params.active }), ...(params.planType && { planType: params.planType }) },
      orderBy: [{ isActive: 'desc' }, { displayOrder: 'asc' }, { startDate: 'desc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    return found(await this.prisma.hotelRatePlan.findFirst({ where: { id, tenantId: user.tenantId } }), 'Rate plan');
  }

  async update(user: AuthenticatedUser, id: string, dto: RatePlanDto) {
    const rp = await this.getOne(user, id);
    if (dto.code && dto.code.trim().toUpperCase() !== rp.code) {
      const dup = await this.prisma.hotelRatePlan.findFirst({ where: { tenantId: user.tenantId, code: dto.code.trim().toUpperCase(), id: { not: id } } });
      if (dup) throw new BadRequestException(`Code "${dto.code.trim().toUpperCase()}" pehle se hai`);
    }
    return this.prisma.hotelRatePlan.update({ where: { id }, data: await this.clean(user, dto, rp) });
  }

  /** Switches the plan off; bookings already priced keep their rate. */
  async remove(user: AuthenticatedUser, id: string) {
    await this.getOne(user, id);
    return this.prisma.hotelRatePlan.update({ where: { id }, data: { isActive: false } });
  }

  async applicableFor(user: AuthenticatedUser, params: { date: string; roomTypeId?: string; source?: string }) {
    const date = dayOf(params.date, 'Date');
    const rows = await this.prisma.hotelRatePlan.findMany({
      where: { tenantId: user.tenantId, isActive: true, startDate: { lte: date }, endDate: { gte: date } },
      orderBy: [{ displayOrder: 'asc' }, { startDate: 'desc' }],
    });
    return rows.filter((p) => (!p.applicableRoomTypeIds.length || (params.roomTypeId && p.applicableRoomTypeIds.includes(params.roomTypeId)))
      && (!p.applicableSources.length || (params.source && p.applicableSources.includes(params.source)))
      && (!p.applicableDays.length || p.applicableDays.includes(date.getUTCDay())));
  }
}
