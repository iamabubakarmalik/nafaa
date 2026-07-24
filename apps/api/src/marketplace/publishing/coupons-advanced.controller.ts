import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { CouponsAdvancedService } from './coupons-advanced.service';

@ApiTags('Marketplace Coupons Advanced')
@Controller('promotions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CouponsAdvancedController {
  constructor(private readonly svc: CouponsAdvancedService) {}

  private ctx(req: Request) {
    const user = (req as any).user;
    return { tenantId: user?.tenantId as string, shopId: (user?.shopId as string | null | undefined) ?? null };
  }

  @Post('bulk-generate')
  bulkGenerate(@Req() req: Request, @Body() dto: any) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.bulkGenerate(tenantId, shopId, dto);
  }

  @Get('analytics')
  analytics(@Req() req: Request, @Query('range') range?: '7d' | '30d' | '90d' | 'year') {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.analytics(tenantId, shopId, range || '30d');
  }

  @Get(':id/redemptions')
  redemptions(@Req() req: Request, @Param('id') id: string, @Query() query: any) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.listRedemptions(tenantId, shopId, id, {
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });
  }
}
