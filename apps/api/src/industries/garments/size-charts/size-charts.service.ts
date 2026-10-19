/**
 * Size charts (S/M/L with chest, length, waist…) that products point to and
 * the counter shows a customer. One chart per garment type can be the
 * default. Removing a chart switches it off; products keep the link.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { duplicateName } from '../common/garments-common';
import { UpsertSizeChartDto } from './dto/upsert-size-chart.dto';

/** Rows keep a size name and numbers only; empty rows are dropped. */
function cleanRows(rows: unknown[]): Prisma.InputJsonValue {
  const out: Array<Record<string, string | number>> = [];
  for (const raw of rows ?? []) {
    if (!raw || typeof raw !== 'object') continue;
    const row: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const key = String(k).trim().slice(0, 30);
      if (!key) continue;
      if (key === 'size') { const s = String(v ?? '').trim().slice(0, 20); if (s) row.size = s; continue; }
      const n = Number(v);
      if (v !== '' && v !== null && Number.isFinite(n) && n >= 0 && n <= 500) row[key] = n;
    }
    if (row.size) out.push(row);
  }
  if (!out.length) throw new BadRequestException('Kam az kam ek size ki line likhein');
  const sizes = out.map((r) => String(r.size).toLowerCase());
  if (new Set(sizes).size !== sizes.length) throw new BadRequestException('Ek size do dafa likha hai');
  return out;
}

@Injectable()
export class SizeChartsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertSizeChartDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Chart ka naam likhein');
    const rows = cleanRows(dto.rows);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await this.clearDefault(tx, user.tenantId, dto.categoryType ?? null);
      return tx.garmentSizeChart.create({ data: { tenantId: user.tenantId, ...dto, name, rows } });
    }).catch((e) => duplicateName(e, `"${name}" naam ka chart pehle se hai`));
  }

  /** Only one default chart per garment type. */
  private clearDefault(tx: Prisma.TransactionClient, tenantId: string, categoryType: string | null, exceptId?: string) {
    return tx.garmentSizeChart.updateMany({
      where: { tenantId, isDefault: true, categoryType: categoryType as never, ...(exceptId && { id: { not: exceptId } }) },
      data: { isDefault: false },
    });
  }

  async list(user: AuthenticatedUser, params: { categoryType?: string; gender?: string; active?: boolean }) {
    const charts = await this.prisma.garmentSizeChart.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.categoryType && { categoryType: params.categoryType as never }),
        ...(params.gender && { gender: params.gender as never }),
        ...(params.active !== undefined && { isActive: params.active }),
      },
      orderBy: [{ isActive: 'desc' }, { isDefault: 'desc' }, { name: 'asc' }],
    });
    const used = await this.prisma.garmentProductProfile.groupBy({
      by: ['sizeChartId'], where: { tenantId: user.tenantId, sizeChartId: { in: charts.map((c) => c.id) } }, _count: { _all: true },
    });
    const byId = new Map(used.map((u) => [u.sizeChartId, u._count._all]));
    return charts.map((c) => ({ ...c, productCount: byId.get(c.id) ?? 0 }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const chart = await this.prisma.garmentSizeChart.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!chart) throw new NotFoundException('Size chart nahi mila');
    return chart;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertSizeChartDto) {
    const chart = await this.getOne(user, id);
    const name = dto.name?.trim() || chart.name;
    const rows = dto.rows ? cleanRows(dto.rows) : undefined;
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await this.clearDefault(tx, user.tenantId, dto.categoryType ?? chart.categoryType ?? null, id);
      return tx.garmentSizeChart.update({ where: { id }, data: { ...dto, name, ...(rows && { rows }) } });
    }).catch((e) => duplicateName(e, `"${name}" naam ka chart pehle se hai`));
  }

  /** Switched off, never deleted: products keep their link. */
  async remove(user: AuthenticatedUser, id: string) {
    await this.getOne(user, id);
    return this.prisma.garmentSizeChart.update({ where: { id }, data: { isActive: false, isDefault: false } });
  }
}
