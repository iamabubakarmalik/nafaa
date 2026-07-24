import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { LiveShopManageService } from './live-shop-manage.service';

@ApiTags('Marketplace Live Shop Management')
@Controller('marketplace/live-shop/manage')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LiveShopManageController {
  constructor(private readonly svc: LiveShopManageService) {}

  private ctx(req: Request) {
    const user = (req as any).user;
    return { tenantId: user?.tenantId as string, shopId: (user?.shopId as string | null | undefined) ?? null };
  }

  @Get()
  list(@Req() req: Request, @Query() query: any) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.list(tenantId, shopId, {
      status: query.status,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });
  }

  @Post()
  create(@Req() req: Request, @Body() dto: any) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.create(tenantId, shopId, dto);
  }

  @Post(':id/go-live')
  goLive(@Req() req: Request, @Param('id') id: string, @Body() body: { streamUrl: string }) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.goLive(tenantId, shopId, id, body.streamUrl);
  }

  @Post(':id/end')
  end(@Req() req: Request, @Param('id') id: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.endLive(tenantId, shopId, id);
  }

  @Post(':id/cancel')
  cancel(@Req() req: Request, @Param('id') id: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.cancel(tenantId, shopId, id);
  }
}
