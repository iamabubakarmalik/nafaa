import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MarketplaceDashboardService } from './marketplace-dashboard.service';

@ApiTags('Marketplace Dashboard')
@Controller('marketplace/dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MarketplaceDashboardController {
  constructor(private readonly svc: MarketplaceDashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get marketplace dashboard data' })
  getDashboard(@Req() req: Request) {
    const user = (req as any).user;
    return this.svc.getDashboard(user?.tenantId, user?.shopId);
  }
}
