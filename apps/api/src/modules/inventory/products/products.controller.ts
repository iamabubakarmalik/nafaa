import {
  Body, Controller, Delete, Get, NotFoundException,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from '../../../prisma/prisma.service';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateProductDto) {
    return this.productsService.create(user, dto);
  }

  @Get()
  findAll(@GetUser() user: AuthenticatedUser, @Query() query: QueryProductsDto) {
    return this.productsService.findAll(user, query);
  }

  @Get('low-stock')
  async lowStock(@GetUser() user: AuthenticatedUser) {
    return this.prisma.$queryRaw<any[]>`
      SELECT id, name, sku, barcode, unit, stock, "lowStockAlert", price, "costPrice"
      FROM "Product"
      WHERE "tenantId" = ${user.tenantId}
        AND "isActive" = true
        AND stock <= "lowStockAlert"
      ORDER BY stock ASC
      LIMIT 100
    `;
  }

  @Get('shop-stock')
  async shopStock(
    @GetUser() user: AuthenticatedUser,
    @Query('shopId') shopId: string,
  ) {
    if (!shopId) throw new NotFoundException('shopId required');
    return this.prisma.shopStock.findMany({
      where: { tenantId: user.tenantId, shopId, isActive: true },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
            images: { orderBy: [{ isPrimary: 'desc' }], take: 1 },
          },
        },
        variant: true,
      },
      orderBy: { product: { name: 'asc' } },
    });
  }

  @Get('barcode/:code')
  async findByBarcode(
    @GetUser() user: AuthenticatedUser,
    @Param('code') code: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: {
        tenantId: user.tenantId,
        OR: [{ barcode: code }, { sku: code }],
        isActive: true,
      },
      include: {
        category: true,
        brand: true,
        images: { orderBy: [{ isPrimary: 'desc' }], take: 1 },
        variants: { where: { isActive: true } },
      },
    });

    if (!product) {
      const variant = await this.prisma.productVariant.findFirst({
        where: {
          OR: [{ barcode: code }, { sku: code }],
          isActive: true,
          product: { tenantId: user.tenantId, isActive: true },
        },
        include: {
          product: {
            include: {
              images: { orderBy: [{ isPrimary: 'desc' }], take: 1 },
            },
          },
        },
      });
      if (!variant) throw new NotFoundException('Product not found for this code');
      return { ...variant.product, matchedVariant: variant };
    }
    return product;
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.productsService.findOne(user, id);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(user, id, dto);
  }

  @Patch(':id/toggle-featured')
  toggleFeatured(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.productsService.toggleFeatured(user, id);
  }

  @Patch(':id/toggle-active')
  toggleActive(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.productsService.toggleActive(user, id);
  }

  @Post('bulk-import/preview')
  bulkImportPreview(
    @GetUser() user: AuthenticatedUser,
    @Body() body: { rows: any[] },
  ) {
    return this.productsService.bulkImportPreview(user, body.rows || []);
  }

  @Post('bulk-import/apply')
  bulkImportApply(
    @GetUser() user: AuthenticatedUser,
    @Body() body: { rows: any[] },
  ) {
    return this.productsService.bulkImportApply(user, body.rows || []);
  }

  @Get('bulk-import/reference-data')
  async bulkImportReferenceData(@GetUser() user: AuthenticatedUser) {
    const [categories, brands, tags] = await Promise.all([
      this.prisma.category.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, color: true },
      }),
      this.prisma.brand.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      this.prisma.tag.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, color: true },
      }),
    ]);
    return { categories, brands, tags };
  }

  @Post('bulk-action')
  bulkAction(
    @GetUser() user: AuthenticatedUser,
    @Body() body: {
      productIds: string[];
      action: 'activate' | 'deactivate' | 'delete' | 'feature' | 'unfeature';
    },
  ) {
    return this.productsService.bulkAction(user, body.productIds, body.action);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.productsService.remove(user, id);
  }
}
