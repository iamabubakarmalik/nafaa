import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MarketplaceAnalyticsService } from './analytics.service';

@ApiTags('Marketplace Analytics')
@Controller('marketplace/analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MarketplaceAnalyticsController {
  constructor(private readonly svc: MarketplaceAnalyticsService) {}

  @Get()
  get(@Req() req: Request, @Query('range') range?: '7d' | '30d' | '90d' | 'year') {
    const user = (req as any).user;
    return this.svc.get(user?.tenantId, user?.shopId, range || '30d');
  }
}
