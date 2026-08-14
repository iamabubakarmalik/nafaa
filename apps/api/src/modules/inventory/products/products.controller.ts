import {
  Body, Controller, Delete, Get, NotFoundException, ForbiddenException,
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
  async lowStock(
    @GetUser() user: AuthenticatedUser,
    @Query('shopId') shopId?: string,
  ) {
    // Non-owner locked to their shop
    if (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN' && user.shopId) {
      shopId = user.shopId;
    }

    if (shopId) {
      // Shop-specific low stock (from ShopStock)
      const shop = await this.prisma.shop.findFirst({
        where: { id: shopId, tenantId: user.tenantId },
      });
      if (!shop) throw new NotFoundException('Shop not found');

      const rows = await this.prisma.shopStock.findMany({
        where: {
          tenantId: user.tenantId,
          shopId,
          isActive: true,
          stock: { lte: 10 },
        },
        include: {
          product: {
            select: {
              id: true, name: true, sku: true, barcode: true, unit: true,
              price: true, costPrice: true,
              images: { take: 1, select: { url: true } },
            },
          },
        },
        orderBy: { stock: 'asc' },
        take: 100,
      });

      return rows.map((r) => ({
        id: r.product.id,
        name: r.product.name,
        sku: r.product.sku,
        barcode: r.product.barcode,
        unit: r.product.unit,
        stock: r.stock,
        lowStockAlert: r.lowStockAlert,
        price: r.product.price,
        costPrice: r.product.costPrice,
        image: r.product.images[0]?.url ?? null,
        shopId: r.shopId,
      }));
    }

    // Global low stock (tenant-wide)
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

  /**
   * Shop-specific stock — used by POS to show only products available in current shop
   */
  @Get('shop-stock')
  async shopStock(
    @GetUser() user: AuthenticatedUser,
    @Query('shopId') shopId: string,
  ) {
    if (!shopId) throw new NotFoundException('shopId required');

    // Non-owner locked to their shop
    if (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN' && user.shopId) {
      if (user.shopId !== shopId) {
        throw new ForbiddenException('Aap sirf apni shop ka stock dekh sakte hain');
      }
    }

    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId: user.tenantId },
    });
    if (!shop) throw new NotFoundException('Shop not found');

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
    @Query('shopId') shopId?: string,
  ) {
    if (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN' && user.shopId) {
      shopId = user.shopId;
    }

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

      // If shopId provided, enrich with shop-specific stock
      if (shopId) {
        const shopStock = await this.prisma.shopStock.findFirst({
          where: {
            shopId,
            productId: variant.productId,
            variantId: variant.id,
          },
        });
        return {
          ...variant.product,
          matchedVariant: variant,
          shopStock: shopStock?.stock ?? 0,
          shopId,
        };
      }

      return { ...variant.product, matchedVariant: variant };
    }

    // If shopId provided, enrich with shop-specific stock
    if (shopId) {
      const shopStock = await this.prisma.shopStock.findFirst({
        where: {
          shopId,
          productId: product.id,
          variantId: null,
        },
      });
      return {
        ...product,
        shopStock: shopStock?.stock ?? 0,
        shopId,
      };
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

  @Post(':id/generate-barcode')
  async generateBarcode(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const timestamp = Date.now().toString().slice(-10);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const barcode = `200${timestamp}${random}`.slice(0, 13);

    const product = await this.prisma.product.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.product.update({
      where: { id },
      data: { barcode },
    });
  }

  @Post('bulk-generate-barcodes')
  async bulkGenerateBarcodes(
    @GetUser() user: AuthenticatedUser,
    @Body() body: { productIds: string[] },
  ) {
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: body.productIds },
        tenantId: user.tenantId,
        OR: [{ barcode: null }, { barcode: '' }],
      },
    });

    const updates = await Promise.all(
      products.map((p, idx) => {
        const timestamp = Date.now().toString().slice(-10);
        const random = (idx + Math.floor(Math.random() * 100)).toString().padStart(2, '0');
        const barcode = `200${timestamp}${random}`.slice(0, 13);
        return this.prisma.product.update({
          where: { id: p.id },
          data: { barcode },
        });
      }),
    );

    return { count: updates.length, products: updates };
  }

  @Post('backfill-shop-stock')
  async backfillShopStock(@GetUser() user: AuthenticatedUser) {
    if (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Sirf Owner backfill kar sakta hai');
    }
    return this.productsService.backfillShopStock(user);
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

  /**
   * One-time repair: tenant ki saari empty/orphan sales delete karo
   * (dashboard pe "0 items • Rs X" wali ghost sales ke liye).
   */
  @Post('cleanup-orphan-sales')
  cleanupOrphanSales(@GetUser() user: AuthenticatedUser) {
    if (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Sirf Owner kar sakta hai');
    }
    return this.productsService.cleanupOrphanSales(user);
  }

  /**
   * Quick Setup — GET catalog (Pakistan grocery FMCG products list)
   * Frontend shows this as a picker; user selects items to import.
   */
  @Get('quick-setup/catalog')
  getQuickSetupCatalog(@GetUser() user: AuthenticatedUser) {
    return this.productsService.getQuickSetupCatalog(user);
  }

  /**
   * Quick Setup — POST selected catalog IDs
   * Auto-creates brands, categories, tags, and products in one shot.
   */
  @Post('quick-setup/import')
  quickSetupImport(
    @GetUser() user: AuthenticatedUser,
    @Body() body: {
      catalogIds: string[];
      priceOverrides?: Record<string, { price?: number; costPrice?: number; stock?: number }>;
      shopId?: string;
    },
  ) {
    if (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Sirf Owner import kar sakta hai');
    }
    return this.productsService.quickSetupImport(
      user,
      body.catalogIds || [],
      body.priceOverrides || {},
      body.shopId,
    );
  }

  @Delete(':id')
  remove(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('force') force?: string,
  ) {
    const isForce = force === 'true' || force === '1';
    return this.productsService.remove(user, id, isForce);
  }
}
