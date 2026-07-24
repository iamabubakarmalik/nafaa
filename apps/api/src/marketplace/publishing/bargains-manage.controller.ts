import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { BargainsManageService } from './bargains-manage.service';

@ApiTags('Marketplace Bargains Management')
@Controller('marketplace/bargains/manage')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BargainsManageController {
  constructor(private readonly svc: BargainsManageService) {}

  private ctx(req: Request) {
    const user = (req as any).user;
    return {
      tenantId: user?.tenantId as string,
      shopId: (user?.shopId as string | null | undefined) ?? null,
    };
  }

  @Get()
  list(@Req() req: Request, @Query() query: any) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.list(tenantId, shopId, {
      status: query.status ? String(query.status).split(',') : undefined,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });
  }

  @Get(':id')
  get(@Req() req: Request, @Param('id') id: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.get(tenantId, shopId, id);
  }

  @Post(':id/accept')
  accept(@Req() req: Request, @Param('id') id: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.accept(tenantId, shopId, id);
  }

  @Post(':id/reject')
  reject(@Req() req: Request, @Param('id') id: string, @Body() body: { reason?: string }) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.reject(tenantId, shopId, id, body.reason);
  }

  @Post(':id/counter')
  counter(@Req() req: Request, @Param('id') id: string, @Body() body: { counterOffer: number; message?: string }) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.counter(tenantId, shopId, id, body.counterOffer, body.message);
  }
}
