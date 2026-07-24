import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SalesFunnelService } from './sales-funnel.service';

@ApiTags('Marketplace Sales Funnel')
@Controller('marketplace/funnel')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SalesFunnelController {
  constructor(private readonly svc: SalesFunnelService) {}

  @Get()
  get(@Req() req: Request, @Query('range') range?: '7d' | '30d' | '90d' | 'year') {
    const user = (req as any).user;
    return this.svc.get(user?.tenantId, user?.shopId, range || '30d');
  }
}
