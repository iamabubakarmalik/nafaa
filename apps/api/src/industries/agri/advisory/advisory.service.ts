/**
 * Crop advisory notes: what the farmer brought in (crop, stage, problem),
 * what the shop advised and which products, and a follow-up date.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SeasonType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { dayEnd, parseDay, shopYear } from '../agri-common';

const SEASONS = new Set(Object.values(SeasonType) as string[]);
const str = (v: unknown, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/** Fields a request may set, checked and typed. */
function fields(dto: Record<string, unknown>, partial: boolean): Prisma.AgriCropAdvisoryUncheckedUpdateInput {
  const has = (k: string) => Object.prototype.hasOwnProperty.call(dto, k);
  const out: Prisma.AgriCropAdvisoryUncheckedUpdateInput = {};
  if (!partial || has('cropName')) {
    const crop = str(dto.cropName, 80);
    if (!crop) throw new BadRequestException('Fasal ka naam likhein');
    out.cropName = crop;
  }
  for (const k of ['farmerId', 'advisorName', 'cropVariety', 'stage'] as const) if (has(k)) out[k] = str(dto[k], 120);
  for (const k of ['currentIssues', 'notes'] as const) if (has(k)) out[k] = str(dto[k], 4000);
  for (const k of ['sowingDate', 'expectedHarvest', 'followUpDate'] as const) if (has(k)) out[k] = parseDay(dto[k] as string);
  if (has('season')) out.season = SEASONS.has(String(dto.season)) ? (dto.season as SeasonType) : null;
  if (has('landAreaAcres')) {
    const v = dto.landAreaAcres === '' || dto.landAreaAcres == null ? null : Number(dto.landAreaAcres);
    if (v !== null && (!Number.isFinite(v) || v < 0)) throw new BadRequestException('Zameen sahi likhein');
    out.landAreaAcres = v;
  }
  for (const k of ['recommendations', 'productSuggestions'] as const) {
    if (has(k)) out[k] = Array.isArray(dto[k]) ? (dto[k] as Prisma.InputJsonValue) : Prisma.DbNull;
  }
  if (has('completed')) out.completed = !!dto.completed;
  return out;
}

@Injectable()
export class AdvisoryService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkFarmer(user: AuthenticatedUser, farmerId: unknown) {
    if (!farmerId) return;
    const f = await this.prisma.agriFarmer.findFirst({ where: { id: String(farmerId), tenantId: user.tenantId }, select: { id: true } });
    if (!f) throw new NotFoundException('Farmer nahi mila');
  }

  async create(user: AuthenticatedUser, dto: Record<string, unknown>) {
    const data = fields(dto ?? {}, false);
    await this.checkFarmer(user, data.farmerId);
    const year = shopYear();
    const count = await this.prisma.agriCropAdvisory.count({ where: { tenantId: user.tenantId, advisoryNumber: { startsWith: `ADV-${year}-` } } });
    return this.prisma.agriCropAdvisory.create({
      data: {
        ...(data as Prisma.AgriCropAdvisoryUncheckedCreateInput),
        tenantId: user.tenantId,
        advisorId: user.id,
        advisorName: (data.advisorName as string | null) ?? user.email ?? null,
        advisoryNumber: `ADV-${year}-${String(count + 1).padStart(4, '0')}`,
      },
    });
  }

  private where(user: AuthenticatedUser, params: { farmerId?: string; cropName?: string; completed?: boolean; season?: string; search?: string }): Prisma.AgriCropAdvisoryWhereInput {
    const q = params.search?.trim();
    return {
      tenantId: user.tenantId,
      ...(params.farmerId && { farmerId: params.farmerId }),
      ...(params.cropName && { cropName: { contains: params.cropName, mode: 'insensitive' } }),
      ...(params.completed !== undefined && { completed: params.completed }),
      ...(params.season && SEASONS.has(params.season) && { season: params.season as SeasonType }),
      ...(q && {
        OR: [
          { advisoryNumber: { contains: q, mode: 'insensitive' } },
          { cropName: { contains: q, mode: 'insensitive' } },
          { currentIssues: { contains: q, mode: 'insensitive' } },
          { stage: { contains: q, mode: 'insensitive' } },
        ],
      }),
    };
  }

  /** Attaches the farmer's name, phone and village to each note. */
  private async withFarmers<T extends { farmerId: string | null }>(tenantId: string, rows: T[]) {
    const ids = [...new Set(rows.map((r) => r.farmerId).filter((x): x is string => !!x))];
    const farmers = ids.length
      ? await this.prisma.agriFarmer.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, fullName: true, phone: true, village: true } })
      : [];
    const by = new Map(farmers.map((f) => [f.id, f]));
    return rows.map((r) => ({ ...r, farmer: r.farmerId ? by.get(r.farmerId) ?? null : null }));
  }

  async list(user: AuthenticatedUser, params: { farmerId?: string; cropName?: string; completed?: boolean; season?: string; search?: string }) {
    const rows = await this.prisma.agriCropAdvisory.findMany({ where: this.where(user, params), orderBy: { createdAt: 'desc' }, take: 500 });
    return this.withFarmers(user.tenantId, rows);
  }

  /**
   * One page of notes with tab counts (open, follow-up due, done) and the
   * crops asked about most, for the advisory page.
   */
  async page(user: AuthenticatedUser, params: { farmerId?: string; season?: string; search?: string; tab?: string; page?: number; limit?: number }) {
    const limit = Math.min(Math.max(Number(params.limit) || 25, 1), 100);
    const page = Math.max(Number(params.page) || 1, 1);
    const base = this.where(user, { ...params, completed: undefined });
    const today = dayEnd();
    const tabs: Record<string, Prisma.AgriCropAdvisoryWhereInput> = {
      open: { completed: false },
      due: { completed: false, followUpDate: { lte: today } },
      done: { completed: true },
      all: {},
    };
    const where = { ...base, ...(tabs[params.tab ?? 'open'] ?? tabs.open) };
    const [rows, total, open, due, done, crops, stages] = await Promise.all([
      this.prisma.agriCropAdvisory.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: params.tab === 'due' ? [{ followUpDate: 'asc' }] : [{ createdAt: 'desc' }],
      }),
      this.prisma.agriCropAdvisory.count({ where }),
      this.prisma.agriCropAdvisory.count({ where: { ...base, ...tabs.open } }),
      this.prisma.agriCropAdvisory.count({ where: { ...base, ...tabs.due } }),
      this.prisma.agriCropAdvisory.count({ where: { ...base, ...tabs.done } }),
      this.prisma.agriCropAdvisory.groupBy({ by: ['cropName'], where: base, _count: { _all: true }, orderBy: { _count: { cropName: 'desc' } }, take: 8 }),
      this.prisma.agriCropAdvisory.groupBy({ by: ['stage'], where: base, _count: { _all: true }, orderBy: { _count: { stage: 'desc' } }, take: 8 }),
    ]);
    return {
      items: await this.withFarmers(user.tenantId, rows),
      total, page, limit,
      counts: { open, due, done, all: open + done },
      analytics: {
        crops: crops.map((g) => ({ crop: g.cropName, notes: g._count._all })),
        stages: stages.filter((g) => g.stage).map((g) => ({ stage: g.stage as string, notes: g._count._all })),
      },
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.agriCropAdvisory.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Mashwara nahi mila');
    return a;
  }

  async update(user: AuthenticatedUser, id: string, dto: Record<string, unknown>) {
    await this.getOne(user, id);
    const data = fields(dto ?? {}, true);
    await this.checkFarmer(user, data.farmerId);
    return this.prisma.agriCropAdvisory.update({ where: { id }, data });
  }

  async markComplete(user: AuthenticatedUser, id: string) {
    await this.getOne(user, id);
    return this.prisma.agriCropAdvisory.update({ where: { id }, data: { completed: true } });
  }
}
