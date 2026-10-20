/**
 * Crop calendar: when each crop is sown and harvested, and which products
 * it needs, so stock is ready before the sowing rush. Deleting a plan
 * switches it off.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SeasonType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { parseDay } from '../agri-common';

const SEASONS = new Set(Object.values(SeasonType) as string[]);
const DATES = ['sowingStart', 'sowingEnd', 'harvestStart', 'harvestEnd'] as const;

@Injectable()
export class SeasonalPlansService {
  constructor(private readonly prisma: PrismaService) {}

  /** Checked plan fields; a full plan on create, only the given fields on update. */
  private fields(dto: Record<string, unknown>, current?: { sowingStart: Date; sowingEnd: Date; harvestStart: Date; harvestEnd: Date }) {
    const has = (k: string) => Object.prototype.hasOwnProperty.call(dto, k);
    const out: Prisma.AgriSeasonalPlanUncheckedUpdateInput = {};
    if (!current || has('cropName')) {
      const crop = typeof dto.cropName === 'string' ? dto.cropName.trim().slice(0, 80) : '';
      if (!crop) throw new BadRequestException('Fasal ka naam likhein');
      out.cropName = crop;
    }
    if (!current || has('season')) {
      if (!SEASONS.has(String(dto.season))) throw new BadRequestException('Season chunein (Rabi, Kharif…)');
      out.season = dto.season as SeasonType;
    }
    if (!current || has('year')) {
      const y = Number(dto.year);
      if (!Number.isInteger(y) || y < 2000 || y > 2100) throw new BadRequestException('Saal sahi likhein');
      out.year = y;
    }
    const dates: Record<string, Date> = {};
    for (const k of DATES) {
      const d = has(k) ? parseDay(dto[k] as string) : null;
      if (!current && !d) throw new BadRequestException('Bijai aur katai ki saari dates likhein');
      if (d) out[k] = d;
      dates[k] = d ?? (current as Record<string, Date>)[k];
    }
    if (dates.sowingEnd < dates.sowingStart) throw new BadRequestException('Bijai ka aakhri din shuru se pehle nahi ho sakta');
    if (dates.harvestEnd < dates.harvestStart) throw new BadRequestException('Katai ka aakhri din shuru se pehle nahi ho sakta');
    if (dates.harvestStart < dates.sowingStart) throw new BadRequestException('Katai bijai se pehle nahi ho sakti');
    for (const k of ['recommendedProducts', 'applicationSchedule'] as const) {
      if (has(k)) out[k] = Array.isArray(dto[k]) ? (dto[k] as Prisma.InputJsonValue) : Prisma.DbNull;
    }
    if (has('isActive')) out.isActive = !!dto.isActive;
    return out;
  }

  private async noDuplicate(tenantId: string, season: unknown, year: unknown, cropName: unknown, id?: string) {
    const dup = await this.prisma.agriSeasonalPlan.findFirst({
      where: { tenantId, season: season as SeasonType, year: Number(year), cropName: { equals: String(cropName), mode: 'insensitive' }, ...(id && { id: { not: id } }) },
      select: { id: true },
    });
    if (dup) throw new BadRequestException('Is season aur saal me is fasal ka plan pehle se hai');
  }

  async create(user: AuthenticatedUser, dto: Record<string, unknown>) {
    const data = this.fields(dto ?? {});
    await this.noDuplicate(user.tenantId, data.season, data.year, data.cropName);
    return this.prisma.agriSeasonalPlan.create({ data: { ...(data as Prisma.AgriSeasonalPlanUncheckedCreateInput), tenantId: user.tenantId } });
  }

  async list(user: AuthenticatedUser, params: { season?: string; year?: number; active?: boolean }) {
    return this.prisma.agriSeasonalPlan.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.season && SEASONS.has(params.season) && { season: params.season as SeasonType }),
        ...(params.year && { year: params.year }),
        ...(params.active !== undefined && { isActive: params.active }),
      },
      orderBy: [{ year: 'desc' }, { sowingStart: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.agriSeasonalPlan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Plan nahi mila');
    return p;
  }

  async update(user: AuthenticatedUser, id: string, dto: Record<string, unknown>) {
    const p = await this.getOne(user, id);
    const data = this.fields(dto ?? {}, p);
    await this.noDuplicate(user.tenantId, data.season ?? p.season, data.year ?? p.year, data.cropName ?? p.cropName, id);
    return this.prisma.agriSeasonalPlan.update({ where: { id }, data });
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.getOne(user, id);
    return this.prisma.agriSeasonalPlan.update({ where: { id }, data: { isActive: false } });
  }
}
