import {
  Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { ProductPublishingService } from './product-publishing.service';

@ApiTags('Product Marketplace Publishing')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductPublishingController {
  constructor(private readonly svc: ProductPublishingService) {}

  private ctx(req: Request) {
    const user = (req as any).user;
    return {
      tenantId: user?.tenantId as string,
      shopId: (user?.shopId as string | null | undefined) ?? null,
    };
  }

  // ═══ LIST + BULK ═══════════════════════════════════════════
  @Get('marketplace/products/manage')
  @ApiOperation({ summary: 'List all products with marketplace status' })
  list(@Req() req: Request, @Query() query: any) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.listForManagement(tenantId, shopId, {
      isListedOnMarketplace: query.isListedOnMarketplace === 'true' ? true
        : query.isListedOnMarketplace === 'false' ? false : undefined,
      search: query.search,
      category: query.category,
      sortBy: query.sortBy || 'listed',
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 24,
    });
  }

  @Post('marketplace/products/manage/bulk-publish')
  @ApiOperation({ summary: 'Publish multiple products to marketplace' })
  bulkPublish(@Req() req: Request, @Body() body: { productIds: string[] }) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.bulkPublish(tenantId, shopId, body.productIds || []);
  }

  @Post('marketplace/products/manage/bulk-unpublish')
  @ApiOperation({ summary: 'Unpublish multiple products from marketplace' })
  bulkUnpublish(@Req() req: Request, @Body() body: { productIds: string[] }) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.bulkUnpublish(tenantId, shopId, body.productIds || []);
  }

  // ═══ SINGLE PRODUCT PROFILE ═══════════════════════════════
  @Get('products/:productId/marketplace-profile')
  @ApiOperation({ summary: 'Get single product marketplace profile' })
  getProfile(@Req() req: Request, @Param('productId') productId: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.getProfile(tenantId, shopId, productId);
  }

  @Patch('products/:productId/marketplace-profile')
  @ApiOperation({ summary: 'Update single product marketplace profile' })
  updateProfile(
    @Req() req: Request,
    @Param('productId') productId: string,
    @Body() dto: any,
  ) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.updateProfile(tenantId, shopId, productId, dto);
  }

  @Post('products/:productId/marketplace-profile/publish')
  @ApiOperation({ summary: 'Publish single product to marketplace' })
  publish(@Req() req: Request, @Param('productId') productId: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.publish(tenantId, shopId, productId);
  }

  @Post('products/:productId/marketplace-profile/unpublish')
  @ApiOperation({ summary: 'Unpublish single product from marketplace' })
  unpublish(@Req() req: Request, @Param('productId') productId: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.unpublish(tenantId, shopId, productId);
  }
}
