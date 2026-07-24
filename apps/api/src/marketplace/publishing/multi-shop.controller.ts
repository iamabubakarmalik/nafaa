import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MultiShopService } from './multi-shop.service';

@ApiTags('Marketplace Multi-Shop')
@Controller('marketplace/multi-shop')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MultiShopController {
  constructor(private readonly svc: MultiShopService) {}

  private tid(req: Request) { return (req as any).user?.tenantId as string; }

  @Get('overview')
  overview(@Req() req: Request) {
    return this.svc.overview(this.tid(req));
  }

  @Post('compare')
  compare(@Req() req: Request, @Body() body: { shopIds: string[]; range?: '7d' | '30d' | '90d' }) {
    return this.svc.compareShops(this.tid(req), body.shopIds, body.range || '30d');
  }

  @Post('transfer-products')
  transfer(@Req() req: Request, @Body() body: { fromShopId: string; toShopId: string; productIds: string[] }) {
    return this.svc.transferProducts(this.tid(req), body.fromShopId, body.toShopId, body.productIds);
  }

  @Post('clone-setup')
  clone(@Req() req: Request, @Body() body: { sourceShopId: string; targetShopId: string; sections: string[] }) {
    return this.svc.cloneShopSetup(this.tid(req), body.sourceShopId, body.targetShopId, body.sections);
  }
}
