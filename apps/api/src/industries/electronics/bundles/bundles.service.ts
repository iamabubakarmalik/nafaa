import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { PatchBundleDto, UpsertBundleDto } from './dto/upsert-bundle.dto';

@Injectable()
export class BundlesService {
  constructor(private readonly prisma: PrismaService) {}


  /**
   * `items` ek JSON column hai — us me sirf productId/quantity/unitPrice
   * hota hai. Naam ke baghair list aur edit form dono par "Product"
   * likha aata tha. Yahan ek batched query se naam/tasveer/stock jod dete hain.
   */
  private async attachProducts<T extends { items: any }>(tenantId: string, bundles: T[]) {
    const ids = [
      ...new Set(
        bundles.flatMap((b) =>
          Array.isArray(b.items) ? b.items.map((i: any) => i?.productId).filter(Boolean) : [],
        ),
      ),
    ] as string[];

    if (ids.length === 0) return bundles.map((b) => ({ ...b, items: b.items ?? [] }));

    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, tenantId },
      select: {
        id: true, name: true, sku: true, unit: true, price: true, stock: true,
        images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    return bundles.map((b) => ({
      ...b,
      items: (Array.isArray(b.items) ? b.items : []).map((it: any) => {
        const p = byId.get(it?.productId);
        return {
          ...it,
          product: p
            ? { ...p, imageUrl: p.images?.[0]?.url ?? null }
            // Product delete ho chuka ho to bhi bundle na toote
            : null,
        };
      }),
    }));
  }

  async create(user: AuthenticatedUser, dto: UpsertBundleDto) {
    const dup = await this.prisma.electronicsBundle.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException(`Bundle "${dto.name}" exists`);

    const savings = dto.originalPrice - dto.bundlePrice;
    const savingsPct = dto.originalPrice > 0 ? (savings / dto.originalPrice) * 100 : 0;

    return this.prisma.electronicsBundle.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        savings,
        savingsPct,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { active?: boolean; featured?: boolean; search?: string }) {
    const rows = await this.prisma.electronicsBundle.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.search && { name: { contains: params.search, mode: 'insensitive' } }),
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });
    return this.attachProducts(user.tenantId, rows as any[]);
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.electronicsBundle.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Bundle not found');
    const [withProducts] = await this.attachProducts(user.tenantId, [b as any]);
    return withProducts;
  }

  async update(user: AuthenticatedUser, id: string, dto: PatchBundleDto) {
    const b = await this.prisma.electronicsBundle.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Bundle not found');

    // Sirf isActive/isFeatured toggle ho raha ho to purani qeematein rehne do
    const originalPrice = dto.originalPrice ?? b.originalPrice;
    const bundlePrice = dto.bundlePrice ?? b.bundlePrice;
    const savings = originalPrice - bundlePrice;
    const savingsPct = originalPrice > 0 ? (savings / originalPrice) * 100 : 0;

    const updated = await this.prisma.electronicsBundle.update({
      where: { id },
      data: {
        ...dto,
        originalPrice,
        bundlePrice,
        savings,
        savingsPct,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
    });
    const [withProducts] = await this.attachProducts(user.tenantId, [updated as any]);
    return withProducts;
  }

  async remove(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.electronicsBundle.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Bundle not found');
    // Pehle ye sirf isActive=false karta tha lekin UI "delete ho gaya" kehta tha
    // aur bundle list me para rehta tha. Band karne ka apna button ab mojood hai,
    // is liye delete ka matlab asal delete.
    return this.prisma.electronicsBundle.delete({ where: { id } });
  }
}
