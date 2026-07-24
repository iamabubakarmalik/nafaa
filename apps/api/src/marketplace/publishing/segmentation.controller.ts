import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SegmentationService } from './segmentation.service';

@ApiTags('Marketplace Customer Segmentation')
@Controller('marketplace/segments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SegmentationController {
  constructor(private readonly svc: SegmentationService) {}

  private ctx(req: Request) {
    const user = (req as any).user;
    return { tenantId: user?.tenantId as string, shopId: (user?.shopId as string | null | undefined) ?? null };
  }

  @Get()
  overview(@Req() req: Request) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.overview(tenantId, shopId);
  }

  @Post('recompute')
  recompute(@Req() req: Request) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.recompute(tenantId, shopId);
  }

  @Get('customers')
  customers(@Req() req: Request, @Query() query: any) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.customers(tenantId, shopId, query.segment, {
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
      search: query.search,
    });
  }

  @Post('broadcast')
  broadcast(@Req() req: Request, @Body() dto: any) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.broadcastToSegment(tenantId, shopId, dto);
  }

  @Get('customer/:customerId')
  customerDetails(@Req() req: Request, @Param('customerId') customerId: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.customerRfmDetails(tenantId, shopId, customerId);
  }
}
