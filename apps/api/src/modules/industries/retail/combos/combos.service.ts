import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreateComboDto } from './dto/create-combo.dto';
import { UpdateComboDto } from './dto/update-combo.dto';

@Injectable()
export class CombosService {
  constructor(private readonly prisma: PrismaService) {}

  private async calculateSavings(items: any[], comboPrice: number) {
    let originalTotal = 0;

    for (const item of items) {
      let unitPrice = item.originalPrice ?? 0;

      if (!unitPrice) {
        // Auto-fetch from product/unit
        if (item.unitId) {
          const unit = await this.prisma.productUnit.findUnique({
            where: { id: item.unitId },
          });
          unitPrice = unit?.price ?? 0;
        } else if (item.variantId) {
          const variant = await this.prisma.productVariant.findUnique({
            where: { id: item.variantId },
          });
          unitPrice = variant?.price ?? 0;
        } else {
          const product = await this.prisma.product.findUnique({
            where: { id: item.productId },
          });
          unitPrice = product?.price ?? 0;
        }
      }

      originalTotal += unitPrice * item.quantity;
    }

    const savingsAmount = Math.max(originalTotal - comboPrice, 0);
    const savingsPercentage =
      originalTotal > 0 ? (savingsAmount / originalTotal) * 100 : 0;

    return { originalTotal, savingsAmount, savingsPercentage };
  }

  async create(user: AuthenticatedUser, dto: CreateComboDto) {
    // Verify all products exist
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: productIds } },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    // Barcode uniqueness
    if (dto.barcode) {
      const dup = await this.prisma.productCombo.findFirst({
        where: { tenantId: user.tenantId, barcode: dto.barcode },
      });
      if (dup) throw new BadRequestException(`Barcode ${dto.barcode} already exists`);
    }

    const { originalTotal, savingsAmount, savingsPercentage } =
      await this.calculateSavings(dto.items, dto.comboPrice);

    return this.prisma.productCombo.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        slug: dto.slug,
        sku: dto.sku,
        barcode: dto.barcode,
        description: dto.description,
        imageUrl: dto.imageUrl,
        categoryId: dto.categoryId,
        comboPrice: dto.comboPrice,
        originalTotal,
        savingsAmount,
        savingsPercentage,
        status: dto.status ?? 'ACTIVE',
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        maxPurchasePerCustomer: dto.maxPurchasePerCustomer,
        stockAvailable: dto.stockAvailable,
        isFeatured: dto.isFeatured ?? false,
        tagLine: dto.tagLine,
        items: {
          create: dto.items.map((item, idx) => ({
            productId: item.productId,
            variantId: item.variantId,
            unitId: item.unitId,
            quantity: item.quantity,
            unitName: item.unitName,
            originalPrice: item.originalPrice ?? 0,
            sortOrder: idx,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
            unit: true,
          },
        },
        category: true,
      },
    });
  }

  async findAll(
    user: AuthenticatedUser,
    params: { status?: string; featured?: boolean; search?: string },
  ) {
    return this.prisma.productCombo.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { barcode: { contains: params.search } },
            { sku: { contains: params.search } },
          ],
        }),
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
            variant: true,
            unit: true,
          },
        },
        category: true,
      },
      orderBy: [
        { isFeatured: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const combo = await this.prisma.productCombo.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
                category: true,
                brand: true,
              },
            },
            variant: true,
            unit: true,
          },
        },
        category: true,
      },
    });
    if (!combo) throw new NotFoundException('Combo not found');
    return combo;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateComboDto) {
    const existing = await this.prisma.productCombo.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: true },
    });
    if (!existing) throw new NotFoundException('Combo not found');

    let updateData: any = { ...dto };
    delete updateData.items;

    // If items or price changed, recalculate savings
    if (dto.items || dto.comboPrice !== undefined) {
      const items = dto.items ?? existing.items;
      const price = dto.comboPrice ?? existing.comboPrice;
      const { originalTotal, savingsAmount, savingsPercentage } =
        await this.calculateSavings(items, price);
      updateData.originalTotal = originalTotal;
      updateData.savingsAmount = savingsAmount;
      updateData.savingsPercentage = savingsPercentage;
    }

    if (dto.validFrom) updateData.validFrom = new Date(dto.validFrom);
    if (dto.validTo) updateData.validTo = new Date(dto.validTo);

    // Handle items replacement
    if (dto.items) {
      await this.prisma.productComboItem.deleteMany({ where: { comboId: id } });
      updateData.items = {
        create: dto.items.map((item, idx) => ({
          productId: item.productId,
          variantId: item.variantId,
          unitId: item.unitId,
          quantity: item.quantity,
          unitName: item.unitName,
          originalPrice: item.originalPrice ?? 0,
          sortOrder: idx,
        })),
      };
    }

    return this.prisma.productCombo.update({
      where: { id },
      data: updateData,
      include: {
        items: { include: { product: true, variant: true, unit: true } },
        category: true,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const existing = await this.prisma.productCombo.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) throw new NotFoundException('Combo not found');
    return this.prisma.productCombo.delete({ where: { id } });
  }

  async toggleFeatured(user: AuthenticatedUser, id: string) {
    const combo = await this.prisma.productCombo.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!combo) throw new NotFoundException('Combo not found');
    return this.prisma.productCombo.update({
      where: { id },
      data: { isFeatured: !combo.isFeatured },
    });
  }
}
