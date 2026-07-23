import {
  Body, Controller, Get, Patch, Post, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { ShopPublishingService } from './shop-publishing.service';

@ApiTags('Shop Marketplace Publishing')
@Controller('shops/current/marketplace-profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ShopPublishingController {
  constructor(private readonly svc: ShopPublishingService) {}

  private ctx(req: Request) {
    const user = (req as any).user;
    return {
      tenantId: user?.tenantId as string,
      shopId: (user?.shopId as string | null | undefined) ?? null,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get current shop marketplace profile' })
  getProfile(@Req() req: Request) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.getProfile(tenantId, shopId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update shop marketplace profile' })
  updateProfile(@Req() req: Request, @Body() dto: any) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.updateProfile(tenantId, shopId, dto);
  }

  @Post('publish')
  @ApiOperation({ summary: 'Publish shop to marketplace' })
  publish(@Req() req: Request) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.publish(tenantId, shopId);
  }

  @Post('unpublish')
  @ApiOperation({ summary: 'Unpublish shop from marketplace' })
  unpublish(@Req() req: Request) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.unpublish(tenantId, shopId);
  }
}
