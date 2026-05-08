import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateProductDto) {
    if (dto.sku) {
      const existingSku = await this.prisma.product.findFirst({
        where: { tenantId: user.tenantId, sku: dto.sku },
      });
      if (existingSku) throw new ConflictException('SKU already exists');
    }

    if (dto.barcode) {
      const existingBarcode = await this.prisma.product.findFirst({
        where: { tenantId: user.tenantId, barcode: dto.barcode },
      });
      if (existingBarcode) throw new ConflictException('Barcode already exists');
    }

    if (dto.categoryId) {
      const cat = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, tenantId: user.tenantId },
      });
      if (!cat) throw new NotFoundException('Category not found');
    }

    return this.prisma.product.create({
      data: {
        tenantId: user.tenantId,
        categoryId: dto.categoryId,
        name: dto.name,
        sku: dto.sku,
        barcode: dto.barcode,
        unit: dto.unit ?? 'pcs',
        price: dto.price,
        costPrice: dto.costPrice ?? 0,
        stock: dto.stock ?? 0,
        lowStockAlert: dto.lowStockAlert ?? 5,
        isActive: dto.isActive ?? true,
      },
      include: { category: true },
    });
  }

  async findAll(user: AuthenticatedUser, query: QueryProductsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      tenantId: user.tenantId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
              { barcode: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { category: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { category: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateProductDto) {
    await this.findOne(user, id);

    if (dto.sku) {
      const existingSku = await this.prisma.product.findFirst({
        where: {
          tenantId: user.tenantId,
          sku: dto.sku,
          NOT: { id },
        },
      });
      if (existingSku) throw new ConflictException('SKU already exists');
    }

    if (dto.barcode) {
      const existingBarcode = await this.prisma.product.findFirst({
        where: {
          tenantId: user.tenantId,
          barcode: dto.barcode,
          NOT: { id },
        },
      });
      if (existingBarcode) throw new ConflictException('Barcode already exists');
    }

    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.findOne(user, id);
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted successfully' };
  }
}
