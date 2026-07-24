import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { TrackingService } from './tracking.service';

@ApiTags('Marketplace Rider Tracking')
@Controller('marketplace/tracking')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TrackingController {
  constructor(private readonly svc: TrackingService) {}

  private ctx(req: Request) {
    const user = (req as any).user;
    return { tenantId: user?.tenantId as string, shopId: (user?.shopId as string | null | undefined) ?? null };
  }

  @Get('live')
  live(@Req() req: Request) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.liveRiders(tenantId, shopId);
  }

  @Get('rider/:riderId/trail')
  trail(@Req() req: Request, @Param('riderId') riderId: string, @Query('hours') hours?: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.riderTrail(tenantId, shopId, riderId, hours ? Number(hours) : 4);
  }

  @Get('active-deliveries')
  activeDeliveries(@Req() req: Request) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.activeDeliveries(tenantId, shopId);
  }
}
