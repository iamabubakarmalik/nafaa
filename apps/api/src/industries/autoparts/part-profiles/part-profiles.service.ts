import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertPartProfileDto } from './dto/upsert-part-profile.dto';

/**
 * Fitment check. The wizard saves `{ isUniversal, fitments: [...] }`; older rows
 * may hold a bare array. A universal part fits every vehicle.
 */
function fits(compatibility: unknown, makeId?: string, modelId?: string, year?: number): boolean {
  if (!compatibility) return false;
  const c = compatibility as { isUniversal?: boolean; fitments?: unknown };
  if (!Array.isArray(compatibility) && c.isUniversal) return true;
  const list: any[] = Array.isArray(compatibility) ? compatibility : Array.isArray(c.fitments) ? c.fitments : [];
  return list.some((f) => {
    if (makeId && f.makeId && f.makeId !== makeId) return false;
    if (modelId && f.modelId && f.modelId !== modelId) return false;
    if (year && f.yearFrom && year < f.yearFrom) return false;
    if (year && f.yearTo && year > f.yearTo) return false;
    return true;
  });
}

interface Fit { makeId?: string; modelId?: string; makeName?: string; modelName?: string; yearFrom?: number | null; yearTo?: number | null }

/** "Toyota Corolla 2014-2020" */
function fitText(f: Fit): string {
  const years = f.yearFrom && f.yearTo ? `${f.yearFrom}-${f.yearTo}` : f.yearFrom ? `${f.yearFrom}+` : f.yearTo ? `-${f.yearTo}` : '';
  return [f.makeName, f.modelName, years].filter(Boolean).join(' ');
}

@Injectable()
export class PartProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertPartProfileDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.autoPartProfile.findUnique({ where: { productId: dto.productId } });
    if (existing) {
      return this.prisma.autoPartProfile.update({
        where: { productId: dto.productId },
        data: { ...dto, tenantId: user.tenantId },
      });
    }
    return this.prisma.autoPartProfile.create({
      data: { ...dto, tenantId: user.tenantId },
    });
  }

  async list(user: AuthenticatedUser, params: { category?: string; condition?: string; brand?: string; fastMoving?: boolean; critical?: boolean; search?: string; makeId?: string; modelId?: string; includeAll?: boolean }) {
    const profiles = await this.prisma.autoPartProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.category && { category: params.category as any }),
        ...(params.condition && { condition: params.condition as any }),
        ...(params.brand && { brand: { contains: params.brand, mode: 'insensitive' } }),
        ...(params.fastMoving !== undefined && { isFastMoving: params.fastMoving }),
        ...(params.critical !== undefined && { isCritical: params.critical }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 2000,
    });

    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: profiles.map((p) => p.productId) } },
      include: { images: { where: { isPrimary: true }, take: 1 }, category: true, brand: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let results: any[] = profiles.filter((p) => productMap.has(p.productId)).map((p) => ({ ...p, product: productMap.get(p.productId) }));

    // Parts added from the plain Products page (or bulk import) have no profile;
    // the POS still has to find and sell them.
    const plainAllowed = params.includeAll && !params.category && !params.condition && !params.brand
      && params.fastMoving === undefined && params.critical === undefined && !params.makeId && !params.modelId;
    if (plainAllowed) {
      const plain = await this.prisma.product.findMany({
        where: { tenantId: user.tenantId, isActive: true, id: { notIn: profiles.map((p) => p.productId) } },
        include: { images: { where: { isPrimary: true }, take: 1 }, category: true, brand: true },
        orderBy: { updatedAt: 'desc' },
        take: 2000,
      });
      results = results.concat(plain.map((p) => ({
        id: `product:${p.id}`, productId: p.id, partNumber: p.sku, oemNumber: null, alternateNumbers: [],
        category: 'OTHER', condition: 'NEW', brand: p.brand?.name ?? null, compatibility: null,
        isFastMoving: false, isCritical: false, warrantyMonths: 0, product: p,
      })));
    }

    // Name, SKU, barcode, part number, OEM, alternates or brand — any one is enough.
    const q = params.search?.trim().toLowerCase();
    if (q) {
      const has = (v?: string | null) => !!v && v.toLowerCase().includes(q);
      results = results.filter((r) =>
        has(r.product?.name) || has(r.product?.sku) || has(r.product?.barcode) || has(r.partNumber)
        || has(r.oemNumber) || has(r.brand) || (r.alternateNumbers ?? []).some((a: string) => has(a)));
    }

    if (params.makeId || params.modelId) {
      results = results.filter((r) => fits(r.compatibility, params.makeId, params.modelId));
    }

    return results.slice(0, 500);
  }

  /**
   * One light row per part for the counter, the parts list and the job card:
   * numbers, brand, condition and which vehicles it fits, as text to search.
   */
  async facts(user: AuthenticatedUser) {
    const rows = await this.prisma.autoPartProfile.findMany({
      where: { tenantId: user.tenantId },
      select: {
        productId: true, partNumber: true, oemNumber: true, alternateNumbers: true, brand: true, condition: true,
        category: true, warrantyMonths: true, compatibility: true, isFastMoving: true, isCritical: true,
      },
      take: 20_000,
    });
    return rows.map(({ compatibility, ...r }) => {
      const c = (compatibility ?? null) as { isUniversal?: boolean; fitments?: Fit[] } | Fit[] | null;
      const list: Fit[] = Array.isArray(c) ? c : Array.isArray(c?.fitments) ? c!.fitments! : [];
      const universal = !Array.isArray(c) && !!c?.isUniversal;
      return {
        ...r,
        universal,
        fits: list.map((f) => ({ makeId: f.makeId ?? null, modelId: f.modelId ?? null, makeName: f.makeName ?? null, modelName: f.modelName ?? null, yearFrom: f.yearFrom ?? null, yearTo: f.yearTo ?? null })),
        fitment: universal ? 'Har gaari' : list.map(fitText).filter(Boolean).join(', '),
      };
    });
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.autoPartProfile.findFirst({
      where: { productId, tenantId: user.tenantId },
    });
  }

  async findByPartNumber(user: AuthenticatedUser, partNumber: string) {
    const profiles = await this.prisma.autoPartProfile.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [
          { partNumber: { equals: partNumber, mode: 'insensitive' } },
          { oemNumber: { equals: partNumber, mode: 'insensitive' } },
          { alternateNumbers: { has: partNumber } },
        ],
      },
    });
    const productIds = profiles.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId: user.tenantId },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    return profiles.map((p) => ({ ...p, product: productMap.get(p.productId) }));
  }

  async findCompatible(user: AuthenticatedUser, makeId: string, modelId: string, year?: number) {
    const profiles = await this.prisma.autoPartProfile.findMany({
      where: { tenantId: user.tenantId },
      take: 1000,
    });
    const filtered = profiles.filter((p) => fits(p.compatibility, makeId, modelId, year));

    const productIds = filtered.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId: user.tenantId },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    return filtered.map((p) => ({ ...p, product: productMap.get(p.productId) }));
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.autoPartProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Part profile not found');
    return this.prisma.autoPartProfile.delete({ where: { id } });
  }
}
