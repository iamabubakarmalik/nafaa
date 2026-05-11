import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UpsertVariantDto } from './dto/upsert-variant.dto';

@Injectable()
export class ProductVariantsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureProduct(user: AuthenticatedUser, productId: string) {
    const p = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: user.tenantId },
    });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async list(user: AuthenticatedUser, productId: string) {
    await this.ensureProduct(user, productId);
    return this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(user: AuthenticatedUser, productId: string, dto: UpsertVariantDto) {
    await this.ensureProduct(user, productId);

    if (dto.sku) {
      const existing = await this.prisma.productVariant.findFirst({
        where: { sku: dto.sku, product: { tenantId: user.tenantId } },
      });
      if (existing) throw new ConflictException('Variant SKU already exists');
    }

    if (dto.barcode) {
      const existing = await this.prisma.productVariant.findFirst({
        where: { barcode: dto.barcode, product: { tenantId: user.tenantId } },
      });
      if (existing) throw new ConflictException('Variant barcode already exists');
    }

    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        name: dto.name,
        sku: dto.sku,
        barcode: dto.barcode,
        color: dto.color,
        colorHex: dto.colorHex,
        size: dto.size,
        weight: dto.weight,
        unit: dto.unit,
        price: dto.price,
        costPrice: dto.costPrice ?? 0,
        wholesalePrice: dto.wholesalePrice,
        stock: dto.stock ?? 0,
        lowStockAlert: dto.lowStockAlert ?? 5,
        imageUrl: dto.imageUrl,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: { hasVariants: true },
    });

    return variant;
  }

  async update(user: AuthenticatedUser, productId: string, id: string, dto: UpsertVariantDto) {
    await this.ensureProduct(user, productId);
    const variant = await this.prisma.productVariant.findFirst({
      where: { id, productId },
    });
    if (!variant) throw new NotFoundException('Variant not found');

    return this.prisma.productVariant.update({
      where: { id },
      data: dto,
    });
  }

  async remove(user: AuthenticatedUser, productId: string, id: string) {
    await this.ensureProduct(user, productId);
    await this.prisma.productVariant.delete({ where: { id } });

    const remaining = await this.prisma.productVariant.count({ where: { productId } });
    if (remaining === 0) {
      await this.prisma.product.update({
        where: { id: productId },
        data: { hasVariants: false },
      });
    }

    return { message: 'Variant deleted' };
  }

  async bulkCreate(
    user: AuthenticatedUser,
    productId: string,
    variants: UpsertVariantDto[],
  ) {
    await this.ensureProduct(user, productId);

    const created = await this.prisma.$transaction(
      variants.map((v, i) =>
        this.prisma.productVariant.create({
          data: {
            productId,
            name: v.name,
            sku: v.sku,
            barcode: v.barcode,
            color: v.color,
            colorHex: v.colorHex,
            size: v.size,
            weight: v.weight,
            unit: v.unit,
            price: v.price,
            costPrice: v.costPrice ?? 0,
            wholesalePrice: v.wholesalePrice,
            stock: v.stock ?? 0,
            lowStockAlert: v.lowStockAlert ?? 5,
            imageUrl: v.imageUrl,
            isActive: v.isActive ?? true,
            sortOrder: v.sortOrder ?? i,
          },
        }),
      ),
    );

    await this.prisma.product.update({
      where: { id: productId },
      data: { hasVariants: true },
    });

    return { created: created.length, items: created };
  }
}
