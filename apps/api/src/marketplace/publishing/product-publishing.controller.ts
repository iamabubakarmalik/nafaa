import {
  Body, Controller, Get, Param, Patch, Post, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { ProductPublishingService } from './product-publishing.service';

@ApiTags('Product Marketplace Publishing')
@Controller('products/:productId/marketplace-profile')
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

  @Get()
  getProfile(@Req() req: Request, @Param('productId') productId: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.getProfile(tenantId, shopId, productId);
  }

  @Patch()
  updateProfile(
    @Req() req: Request,
    @Param('productId') productId: string,
    @Body() dto: any,
  ) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.updateProfile(tenantId, shopId, productId, dto);
  }

  @Post('publish')
  publish(@Req() req: Request, @Param('productId') productId: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.publish(tenantId, shopId, productId);
  }

  @Post('unpublish')
  unpublish(@Req() req: Request, @Param('productId') productId: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.unpublish(tenantId, shopId, productId);
  }
}
