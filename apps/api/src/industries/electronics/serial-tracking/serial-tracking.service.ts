import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { BulkCreateSerialDto, SellSerialDto, UpsertSerialDto } from './dto/upsert-serial.dto';

@Injectable()
export class SerialTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertSerialDto) {
    const dup = await this.prisma.electronicsSerialTracking.findFirst({
      where: { tenantId: user.tenantId, serialNumber: dto.serialNumber },
    });
    if (dup) throw new BadRequestException(`Serial "${dto.serialNumber}" already exists`);

    // Shop: dto > user ki apni shop > pehli active shop
    const shopId = dto.shopId
      ?? user.shopId
      ?? (await this.prisma.shop.findFirst({
            where: { tenantId: user.tenantId, isActive: true },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
          }))?.id
      ?? null;

    return this.prisma.electronicsSerialTracking.create({
      data: {
        ...dto,
        shopId,
        tenantId: user.tenantId,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        warrantyStartDate: dto.warrantyStartDate ? new Date(dto.warrantyStartDate) : null,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : null,
      },
    });
  }

  async bulkCreate(user: AuthenticatedUser, dto: BulkCreateSerialDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    // Do tareeqe chalte hain: sirf serial numbers, ya poore entries
    // (serial + IMEI + MAC) — dono ko ek shakl me le aao.
    const entries = dto.entries?.length
      ? dto.entries.filter((e) => e.serialNumber?.trim())
      : (dto.serialNumbers ?? [])
          .filter((sn) => sn?.trim())
          .map((serialNumber) => ({ serialNumber, imei: undefined, imei2: undefined, macAddress: undefined }));

    if (entries.length === 0) {
      throw new BadRequestException('Koi serial number nahi diya gaya');
    }

    // Ek hi call me do dafa aaya hua serial hata do
    const seen = new Set<string>();
    const unique = entries.filter((e) => {
      const sn = e.serialNumber.trim();
      if (seen.has(sn)) return false;
      seen.add(sn);
      return true;
    });

    const existing = await this.prisma.electronicsSerialTracking.findMany({
      where: { tenantId: user.tenantId, serialNumber: { in: unique.map((e) => e.serialNumber.trim()) } },
      select: { serialNumber: true },
    });
    const existingSet = new Set(existing.map((e) => e.serialNumber));
    const fresh = unique.filter((e) => !existingSet.has(e.serialNumber.trim()));

    if (fresh.length === 0) {
      throw new BadRequestException('Ye saare serial pehle se mojood hain');
    }

    // Shop: dto > user ki apni shop > pehli active shop
    const shopId = dto.shopId
      ?? user.shopId
      ?? (await this.prisma.shop.findFirst({
            where: { tenantId: user.tenantId, isActive: true },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
          }))?.id
      ?? null;

    await this.prisma.electronicsSerialTracking.createMany({
      data: fresh.map((e) => ({
        tenantId: user.tenantId,
        shopId,
        productId: dto.productId,
        serialNumber: e.serialNumber.trim(),
        imei: e.imei?.trim() || null,
        imei2: e.imei2?.trim() || null,
        macAddress: e.macAddress?.trim() || null,
        status: 'IN_STOCK' as const,
        purchasePrice: dto.purchasePrice,
        purchaseDate: new Date(),
        supplierRef: dto.supplierRef,
        warrantyStartDate: dto.warrantyStartDate ? new Date(dto.warrantyStartDate) : null,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : null,
        warrantyStatus: dto.warrantyStartDate ? 'ACTIVE' : 'NO_WARRANTY' as any,
      })),
    });

    return {
      created: fresh.length,
      skipped: unique.length - fresh.length,
      duplicatesInRequest: entries.length - unique.length,
    };
  }

  async list(
    user: AuthenticatedUser,
    params: { productId?: string; status?: string; imei?: string; search?: string; shopId?: string },
  ) {
    const rows = await this.prisma.electronicsSerialTracking.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.productId && { productId: params.productId }),
        ...(params.status && { status: params.status as any }),
        // Shop filter — transfer ke waqt sirf usi dukan ke units chahiyen.
        // shopId null wale purane units bhi dikhao warna wo kabhi nazar
        // hi nahi aayenge (backfill se pehle ke records).
        ...(params.shopId && { OR: [{ shopId: params.shopId }, { shopId: null }] }),
        ...(params.imei && { OR: [{ imei: params.imei }, { imei2: params.imei }] }),
        ...(params.search && {
          OR: [
            { serialNumber: { contains: params.search, mode: 'insensitive' } },
            { imei: { contains: params.search } },
            { macAddress: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // Product ka naam sath bhejo — warna UI par sirf serial number
    // dikhta hai aur pata hi nahi chalta ke cheez kya hai.
    // (Product ka koi Prisma relation nahi hai, is liye alag query.)
    const productIds = [...new Set(rows.map((r) => r.productId))];
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true, name: true, sku: true, unit: true, price: true, costPrice: true,
            images: { select: { id: true, url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
          },
        })
      : [];
    const byId = new Map(products.map((p) => [p.id, p]));

    return rows.map((r) => ({ ...r, product: byId.get(r.productId) ?? null }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.electronicsSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial not found');
    const product = await this.prisma.product.findUnique({ where: { id: s.productId }, include: { images: true } });
    return { ...s, product };
  }

  async lookupBySerialOrImei(user: AuthenticatedUser, code: string) {
    return this.prisma.electronicsSerialTracking.findFirst({
      where: {
        tenantId: user.tenantId,
        OR: [
          { serialNumber: code },
          { imei: code },
          { imei2: code },
          { macAddress: code },
        ],
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertSerialDto) {
    const s = await this.prisma.electronicsSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial not found');
    return this.prisma.electronicsSerialTracking.update({
      where: { id },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        warrantyStartDate: dto.warrantyStartDate ? new Date(dto.warrantyStartDate) : undefined,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : undefined,
      },
    });
  }

  async sell(user: AuthenticatedUser, id: string, dto: SellSerialDto) {
    const s = await this.prisma.electronicsSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial not found');
    if (s.status !== 'IN_STOCK' && s.status !== 'RESERVED') {
      throw new BadRequestException(`Cannot sell serial with status ${s.status}`);
    }
    return this.prisma.electronicsSerialTracking.update({
      where: { id },
      data: {
        status: 'SOLD',
        soldPrice: dto.soldPrice,
        soldAt: new Date(),
        soldToCustomerId: dto.soldToCustomerId,
        saleId: dto.saleId,
        invoiceNumber: dto.invoiceNumber,
      },
    });
  }

  async returnSerial(user: AuthenticatedUser, id: string, reason: string) {
    const s = await this.prisma.electronicsSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial not found');
    return this.prisma.electronicsSerialTracking.update({
      where: { id },
      data: {
        status: 'RETURNED',
        notes: ((s.notes || '') + '\nReturned: ' + reason).trim(),
      },
    });
  }

  async markDefective(user: AuthenticatedUser, id: string, reason: string) {
    const s = await this.prisma.electronicsSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial not found');
    return this.prisma.electronicsSerialTracking.update({
      where: { id },
      data: {
        status: 'DEFECTIVE',
        notes: ((s.notes || '') + '\nDefective: ' + reason).trim(),
      },
    });
  }

  async warrantyCheck(user: AuthenticatedUser, code: string) {
    const s = await this.lookupBySerialOrImei(user, code);
    if (!s) return { found: false };

    const now = new Date();
    const isExpired = s.warrantyEndDate ? new Date(s.warrantyEndDate) < now : true;
    const daysRemaining = s.warrantyEndDate
      ? Math.max(0, Math.floor((new Date(s.warrantyEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      found: true,
      serial: s,
      warranty: {
        status: s.warrantyStatus,
        startDate: s.warrantyStartDate,
        endDate: s.warrantyEndDate,
        isExpired,
        daysRemaining,
        isValid: !isExpired && s.warrantyStatus === 'ACTIVE',
      },
    };
  }

  async remove(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.electronicsSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial not found');
    if (s.status === 'SOLD') throw new BadRequestException('Cannot delete sold serial');
    return this.prisma.electronicsSerialTracking.delete({ where: { id } });
  }
}
