import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { LoyaltyTierLevel } from '@prisma/client';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { LoyaltyService } from './loyalty.service';

@ApiTags('Marketplace Loyalty')
@Controller('marketplace/loyalty')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LoyaltyController {
  constructor(private readonly svc: LoyaltyService) {}

  private ctx(req: Request) {
    const user = (req as any).user;
    return { tenantId: user?.tenantId as string, shopId: (user?.shopId as string | null | undefined) ?? null };
  }

  @Get()
  overview(@Req() req: Request) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.overview(tenantId, shopId);
  }

  @Patch('tiers/:level')
  updateTier(@Param('level') level: LoyaltyTierLevel, @Body() data: any) {
    return this.svc.updateTier(level, data);
  }

  @Get('customers')
  listCustomers(@Req() req: Request, @Query() query: any) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.listCustomers(tenantId, shopId, {
      tier: query.tier,
      search: query.search,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });
  }

  @Post('award-points')
  award(@Body() body: { customerId: string; points: number; reason: string }) {
    return this.svc.awardPoints(body.customerId, body.points, body.reason);
  }

  @Post('redeem-points')
  redeem(@Body() body: { customerId: string; points: number; orderId?: string }) {
    return this.svc.redeemPoints(body.customerId, body.points, body.orderId);
  }
}
