import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MarketplaceOrdersManageService } from './marketplace-orders-manage.service';

@ApiTags('Marketplace Orders Management (Shop-side)')
@Controller('marketplace/orders/manage')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MarketplaceOrdersManageController {
  constructor(private readonly svc: MarketplaceOrdersManageService) {}

  private ctx(req: Request) {
    const user = (req as any).user;
    return {
      tenantId: user?.tenantId as string,
      shopId: (user?.shopId as string | null | undefined) ?? null,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List incoming marketplace orders' })
  list(@Req() req: Request, @Query() query: any) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.list(tenantId, shopId, {
      status: query.status ? String(query.status).split(',') : undefined,
      search: query.search,
      fromDate: query.fromDate,
      toDate: query.toDate,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  getOne(@Req() req: Request, @Param('id') id: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.getOne(tenantId, shopId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(@Req() req: Request, @Param('id') id: string, @Body() body: { status: string; note?: string }) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.updateStatus(tenantId, shopId, id, body.status, body.note);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept order (change to CONFIRMED)' })
  accept(@Req() req: Request, @Param('id') id: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.accept(tenantId, shopId, id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject order' })
  reject(@Req() req: Request, @Param('id') id: string, @Body() body: { reason: string }) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.reject(tenantId, shopId, id, body.reason);
  }

  @Post(':id/mark-ready')
  @ApiOperation({ summary: 'Mark order as ready for pickup' })
  markReady(@Req() req: Request, @Param('id') id: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.markReady(tenantId, shopId, id);
  }

  @Post(':id/mark-delivered')
  @ApiOperation({ summary: 'Mark order as delivered' })
  markDelivered(@Req() req: Request, @Param('id') id: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.markDelivered(tenantId, shopId, id);
  }
}
