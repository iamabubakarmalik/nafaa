/**
 * The shop's service rate list. Every saved service keeps a matching
 * service product (no stock) so it sells at the shared counter and shows in
 * product reports; removing a service switches both off.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertCatalogDto } from './dto/upsert-catalog.dto';
import { ensureServiceProduct, serviceProductIds } from './service-product';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  private clean(dto: UpsertCatalogDto) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Service ka naam likhein');
    if (dto.maxCharge != null && dto.minCharge != null && dto.maxCharge > 0 && dto.maxCharge < dto.minCharge) {
      throw new BadRequestException('Zyada se zyada charge kam se kam se chhota nahi ho sakta');
    }
    const { shopId: _shop, ...rest } = dto;
    // A partial save (e.g. switching on) keeps the code it has.
    return { ...rest, name, ...(dto.code !== undefined && { code: dto.code?.trim() || null }) };
  }

  private async withProducts<T extends { id: string }>(tenantId: string, rows: T[]) {
    const ids = await serviceProductIds(this.prisma, tenantId, rows.map((r) => r.id));
    return rows.map((r) => ({ ...r, productId: ids.get(r.id) ?? null }));
  }

  async create(user: AuthenticatedUser, dto: UpsertCatalogDto) {
    const data = this.clean(dto);
    const dup = await this.prisma.serviceCatalog.findFirst({ where: { tenantId: user.tenantId, name: { equals: data.name, mode: 'insensitive' } } });
    if (dup) throw new BadRequestException(`"${data.name}" naam ki service pehle se hai`);
    return this.prisma.$transaction(async (tx) => {
      const svc = await tx.serviceCatalog.create({ data: { tenantId: user.tenantId, ...data } });
      const productId = await ensureServiceProduct(tx, user.tenantId, svc);
      return { ...svc, productId };
    });
  }

  async list(user: AuthenticatedUser, params: { category?: string; businessType?: string; search?: string; active?: boolean; featured?: boolean; popular?: boolean; emergency?: boolean }) {
    const rows = await this.prisma.serviceCatalog.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.category && { category: params.category as Prisma.ServiceCatalogWhereInput['category'] }),
        ...(params.businessType && { businessType: params.businessType as Prisma.ServiceCatalogWhereInput['businessType'] }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.popular !== undefined && { isPopular: params.popular }),
        ...(params.emergency !== undefined && { isEmergency: params.emergency }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { code: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { name: 'asc' }],
    });
    return this.withProducts(user.tenantId, rows);
  }

  async byCategory(user: AuthenticatedUser) {
    const all = await this.prisma.serviceCatalog.findMany({ where: { tenantId: user.tenantId, isActive: true }, orderBy: { displayOrder: 'asc' } });
    const grouped: Record<string, typeof all> = {};
    for (const s of all) (grouped[s.category] ??= []).push(s);
    return grouped;
  }

  async byBusinessType(user: AuthenticatedUser) {
    const all = await this.prisma.serviceCatalog.findMany({ where: { tenantId: user.tenantId, isActive: true, businessType: { not: null } }, orderBy: { displayOrder: 'asc' } });
    const grouped: Record<string, typeof all> = {};
    for (const s of all) (grouped[s.businessType || 'OTHER'] ??= []).push(s);
    return grouped;
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.serviceCatalog.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Service nahi mili');
    const [withProduct] = await this.withProducts(user.tenantId, [s]);
    const [jobs, recent] = await Promise.all([
      this.prisma.serviceJob.groupBy({ by: ['status'], where: { tenantId: user.tenantId, serviceId: id }, _count: { _all: true } }),
      this.prisma.serviceJob.findMany({
        where: { tenantId: user.tenantId, serviceId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, jobNumber: true, customerName: true, status: true, totalCharge: true, createdAt: true },
      }),
    ]);
    return { ...withProduct, jobsByStatus: jobs.map((j) => ({ status: j.status, count: j._count._all })), recentJobs: recent };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertCatalogDto) {
    const s = await this.prisma.serviceCatalog.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Service nahi mili');
    const data = this.clean(dto);
    if (data.name.toLowerCase() !== s.name.toLowerCase()) {
      const dup = await this.prisma.serviceCatalog.findFirst({ where: { tenantId: user.tenantId, name: { equals: data.name, mode: 'insensitive' }, id: { not: id } } });
      if (dup) throw new BadRequestException(`"${data.name}" naam ki service pehle se hai`);
    }
    return this.prisma.$transaction(async (tx) => {
      const svc = await tx.serviceCatalog.update({ where: { id }, data });
      const productId = await ensureServiceProduct(tx, user.tenantId, svc);
      return { ...svc, productId };
    });
  }

  /** Switches the service off (and its counter product); its jobs and bills stay. */
  async remove(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.serviceCatalog.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Service nahi mili');
    return this.prisma.$transaction(async (tx) => {
      const svc = await tx.serviceCatalog.update({ where: { id }, data: { isActive: false } });
      await ensureServiceProduct(tx, user.tenantId, svc);
      return svc;
    });
  }

  /** Makes the counter product for services saved before products were linked. */
  async syncProducts(user: AuthenticatedUser) {
    const rows = await this.prisma.serviceCatalog.findMany({ where: { tenantId: user.tenantId } });
    const have = await serviceProductIds(this.prisma, user.tenantId, rows.map((r) => r.id));
    const missing = rows.filter((r) => !have.has(r.id));
    await this.prisma.$transaction(async (tx) => {
      for (const svc of missing) await ensureServiceProduct(tx, user.tenantId, svc);
    }, { timeout: 60_000 });
    return { created: missing.length, total: rows.length };
  }
}
