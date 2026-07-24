import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';

@ApiTags('Marketplace AI')
@Controller('marketplace/ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly svc: AiService) {}

  private ctx(req: Request) {
    const user = (req as any).user;
    return { tenantId: user?.tenantId as string, shopId: (user?.shopId as string | null | undefined) ?? null };
  }

  @Get('insights')
  insights(@Req() req: Request) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.insights(tenantId, shopId);
  }

  @Get('demand-forecast')
  demandForecast(@Req() req: Request) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.demandForecast(tenantId, shopId);
  }

  @Get('price-optimization')
  priceOptimization(@Req() req: Request) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.priceOptimization(tenantId, shopId);
  }

  @Post('apply-price')
  applyPrice(@Req() req: Request, @Body() body: { productId: string; newPrice: number }) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.applyPriceSuggestion(tenantId, shopId, body.productId, body.newPrice);
  }

  @Get('customer-recommendations')
  customerRecs(@Req() req: Request, @Query('limit') limit?: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.customerRecommendations(tenantId, shopId, limit ? Number(limit) : 20);
  }

  @Get('cross-sell/:productId')
  crossSell(@Req() req: Request, @Param('productId') productId: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.crossSellSuggestions(tenantId, shopId, productId);
  }
}
