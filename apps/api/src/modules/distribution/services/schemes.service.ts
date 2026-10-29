/**
 * Trade schemes: free goods, percent off, rupees per pack and slabs, set by
 * the business or a principal. Applying them is the pure resolver's job
 * (helpers/scheme-resolver); this service stores and checks them.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { SaveSchemeDto } from '../dto/setup.dto';
import { schemeIsLive } from '../helpers/scheme-resolver';
import { parseWhen } from '../distribution.support';

@Injectable()
export class SchemesService {
  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  async list(user: AuthenticatedUser, q: { status?: string } = {}) {
    const tenantId = user.tenantId;
    const rows = await this.prisma.tradeScheme.findMany({ where: { tenantId }, orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }] });
    const now = new Date();
    const productIds = [...new Set(rows.flatMap((r) => [...r.productIds, ...(r.freeProductId ? [r.freeProductId] : [])]))];
    const [products, suppliers] = await Promise.all([
      productIds.length ? this.prisma.product.findMany({ where: { tenantId, id: { in: productIds } }, select: { id: true, name: true } }) : [],
      this.prisma.supplier.findMany({ where: { tenantId, id: { in: rows.map((r) => r.supplierId).filter((x): x is string => !!x) } }, select: { id: true, name: true } }),
    ]);
    const pName = new Map(products.map((p) => [p.id, p.name]));
    const sName = new Map(suppliers.map((s) => [s.id, s.name]));
    const out = rows.map((r) => ({
      ...r,
      live: schemeIsLive({ ...r, slabs: null }, now),
      productNames: r.productIds.map((id) => pName.get(id) ?? null),
      freeProductName: r.freeProductId ? pName.get(r.freeProductId) ?? null : null,
      supplierName: r.supplierId ? sName.get(r.supplierId) ?? null : null,
    }));
    if (q.status === 'live') return out.filter((r) => r.live);
    if (q.status === 'inactive') return out.filter((r) => !r.live);
    return out;
  }

  async get(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.tradeScheme.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!row) throw new NotFoundException('Scheme nahi mili');
    return row;
  }

  async create(user: AuthenticatedUser, dto: SaveSchemeDto) {
    const data = await this.toData(user.tenantId, dto);
    return this.prisma.tradeScheme.create({ data: { tenantId: user.tenantId, ...data } as Prisma.TradeSchemeUncheckedCreateInput });
  }

  async update(user: AuthenticatedUser, id: string, dto: Partial<SaveSchemeDto>) {
    const old = await this.get(user, id);
    const merged = { ...old, slabs: (old.slabs as unknown[] | null) ?? undefined, ...stripUndefined(dto) } as SaveSchemeDto;
    const data = await this.toData(user.tenantId, merged);
    return this.prisma.tradeScheme.update({ where: { id }, data });
  }

  /** Schemes are kept for history once orders used them; then they are switched off. */
  async remove(user: AuthenticatedUser, id: string) {
    await this.get(user, id);
    const used = await this.prisma.salesOrderItem.count({ where: { schemeId: id, salesOrder: { tenantId: user.tenantId } } });
    if (used) {
      await this.prisma.tradeScheme.update({ where: { id }, data: { isActive: false } });
      return { deleted: false, deactivated: true };
    }
    await this.prisma.tradeScheme.delete({ where: { id } });
    return { deleted: true, deactivated: false };
  }

  private async toData(tenantId: string, dto: SaveSchemeDto) {
    const clock = await this.tz.clock(tenantId);
    const buyQty = Number(dto.buyQty) || 0;
    const freeQty = Number(dto.freeQty) || 0;
    const value = Number(dto.value) || 0;
    switch (dto.type) {
      case 'FREE_QTY':
        if (!(buyQty > 0) || !(freeQty > 0)) throw new BadRequestException('Free scheme me kitna lena hai aur kitna free, dono likhein');
        break;
      case 'PERCENT_OFF':
        if (!(value > 0) || value > 100) throw new BadRequestException('Percent 0 se 100 ke beech likhein');
        break;
      case 'AMOUNT_PER_UNIT':
        if (!(value > 0)) throw new BadRequestException('Har pack par kitne rupay kam, ye likhein');
        break;
      case 'SLAB':
        if (!dto.slabs?.length) throw new BadRequestException('Slab scheme me kam se kam ek slab likhein');
        for (const s of dto.slabs) {
          if (!(Number(s.percent) > 0) && !(Number(s.amountPerUnit) > 0) && !(Number(s.freeQty) > 0)) {
            throw new BadRequestException('Har slab par percent, rupay ya free quantity me se ek likhein');
          }
        }
        break;
      default:
        throw new BadRequestException('Scheme ki type sahi nahi');
    }
    const ids = (v?: string[] | null) => [...new Set((v ?? []).filter(Boolean))];
    const productIds = ids(dto.productIds);
    const checkProducts = [...productIds, ...(dto.freeProductId ? [dto.freeProductId] : [])];
    if (checkProducts.length) {
      const found = await this.prisma.product.count({ where: { tenantId, id: { in: checkProducts } } });
      if (found !== new Set(checkProducts).size) throw new BadRequestException('Kuch items nahi mile');
    }
    if (dto.supplierId) {
      const s = await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, tenantId }, select: { id: true } });
      if (!s) throw new BadRequestException('Supplier (principal) nahi mila');
    }
    const startsAt = parseWhen(dto.startsAt as string | null | undefined, clock);
    const endsAt = parseWhen(dto.endsAt as string | null | undefined, clock, true);
    if (startsAt && endsAt && endsAt < startsAt) throw new BadRequestException('Scheme khatam hone ki date shuru se pehle hai');
    return {
      name: dto.name.trim(), type: dto.type, supplierId: dto.supplierId || null,
      productIds, brandIds: ids(dto.brandIds), categoryIds: ids(dto.categoryIds), priceListIds: ids(dto.priceListIds),
      buyQty, buyUnitName: dto.buyUnitName?.trim() || null, freeQty, freeProductId: dto.freeProductId || null, value,
      slabs: dto.type === 'SLAB' ? (dto.slabs as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
      minOrderValue: Number(dto.minOrderValue) > 0 ? Number(dto.minOrderValue) : null,
      startsAt, endsAt, isClaimable: !!dto.isClaimable, isActive: dto.isActive ?? true, note: dto.note?.trim() || null,
    };
  }
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
