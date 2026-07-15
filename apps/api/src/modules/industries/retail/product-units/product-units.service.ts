import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateProductUnitDto } from './dto/create-product-unit.dto';
import { UpdateProductUnitDto } from './dto/update-product-unit.dto';

@Injectable()
export class ProductUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateProductUnitDto) {
    // Verify product belongs to tenant
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: user.tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    // If setting as base, unset other base units
    if (dto.isBase) {
      await this.prisma.productUnit.updateMany({
        where: {
          productId: dto.productId,
          variantId: dto.variantId ?? null,
          isBase: true,
        },
        data: { isBase: false },
      });
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.productUnit.updateMany({
        where: {
          productId: dto.productId,
          variantId: dto.variantId ?? null,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    // Barcode uniqueness check within tenant
    if (dto.barcode) {
      const dup = await this.prisma.productUnit.findFirst({
        where: { tenantId: user.tenantId, barcode: dto.barcode },
      });
      if (dup) throw new BadRequestException(`Barcode ${dto.barcode} already exists`);
    }

    return this.prisma.productUnit.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
      },
    });
  }

  async findByProduct(user: AuthenticatedUser, productId: string, variantId?: string) {
    return this.prisma.productUnit.findMany({
      where: {
        tenantId: user.tenantId,
        productId,
        variantId: variantId ?? null,
      },
      orderBy: [{ isBase: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  async findByBarcode(user: AuthenticatedUser, barcode: string) {
    const unit = await this.prisma.productUnit.findFirst({
      where: { tenantId: user.tenantId, barcode, isActive: true },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
        variant: true,
      },
    });
    if (!unit) throw new NotFoundException(`No unit with barcode ${barcode}`);
    return unit;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateProductUnitDto) {
    const existing = await this.prisma.productUnit.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) throw new NotFoundException('Unit not found');

    if (dto.isBase && !existing.isBase) {
      await this.prisma.productUnit.updateMany({
        where: {
          productId: existing.productId,
          variantId: existing.variantId,
          isBase: true,
          id: { not: id },
        },
        data: { isBase: false },
      });
    }

    if (dto.isDefault && !existing.isDefault) {
      await this.prisma.productUnit.updateMany({
        where: {
          productId: existing.productId,
          variantId: existing.variantId,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    if (dto.barcode && dto.barcode !== existing.barcode) {
      const dup = await this.prisma.productUnit.findFirst({
        where: {
          tenantId: user.tenantId,
          barcode: dto.barcode,
          id: { not: id },
        },
      });
      if (dup) throw new BadRequestException(`Barcode ${dto.barcode} already exists`);
    }

    return this.prisma.productUnit.update({
      where: { id },
      data: dto,
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const existing = await this.prisma.productUnit.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) throw new NotFoundException('Unit not found');
    if (existing.isBase) {
      throw new BadRequestException('Cannot delete base unit');
    }
    return this.prisma.productUnit.delete({ where: { id } });
  }

  /**
   * Convert quantity from one unit to another (via base unit)
   * e.g., 2 dozens → pieces = 24
   */
  async convertQuantity(
    user: AuthenticatedUser,
    fromUnitId: string,
    toUnitId: string,
    quantity: number,
  ): Promise<number> {
    const [fromUnit, toUnit] = await Promise.all([
      this.prisma.productUnit.findFirst({
        where: { id: fromUnitId, tenantId: user.tenantId },
      }),
      this.prisma.productUnit.findFirst({
        where: { id: toUnitId, tenantId: user.tenantId },
      }),
    ]);

    if (!fromUnit || !toUnit) throw new NotFoundException('Unit not found');
    if (fromUnit.productId !== toUnit.productId) {
      throw new BadRequestException('Units belong to different products');
    }

    const baseQuantity = quantity * fromUnit.conversionRate;
    return baseQuantity / toUnit.conversionRate;
  }
}
