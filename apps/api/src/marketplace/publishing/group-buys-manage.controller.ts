import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { GroupBuysManageService } from './group-buys-manage.service';

@ApiTags('Marketplace Group Buys Management')
@Controller('marketplace/group-buys/manage')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GroupBuysManageController {
  constructor(private readonly svc: GroupBuysManageService) {}

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

  @Post(':id/cancel')
  cancel(@Req() req: Request, @Param('id') id: string, @Body() body: { reason?: string }) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.cancel(tenantId, shopId, id, body.reason);
  }
}
