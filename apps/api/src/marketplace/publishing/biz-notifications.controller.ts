import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { BizNotificationsService } from './biz-notifications.service';

@ApiTags('Marketplace Notifications')
@Controller('marketplace/notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BizNotificationsController {
  constructor(private readonly svc: BizNotificationsService) {}

  private ctx(req: Request) {
    const user = (req as any).user;
    return { tenantId: user?.tenantId as string, userId: user?.id as string };
  }

  @Get()
  list(@Req() req: Request, @Query() query: any) {
    const { tenantId, userId } = this.ctx(req);
    return this.svc.list(tenantId, userId, {
      unreadOnly: query.unreadOnly === 'true',
      priority: query.priority,
      type: query.type,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });
  }

  @Post(':id/read')
  markRead(@Req() req: Request, @Param('id') id: string) {
    const { tenantId } = this.ctx(req);
    return this.svc.markRead(tenantId, id);
  }

  @Post('read-all')
  markAllRead(@Req() req: Request) {
    const { tenantId } = this.ctx(req);
    return this.svc.markAllRead(tenantId);
  }

  @Delete(':id')
  delete(@Req() req: Request, @Param('id') id: string) {
    const { tenantId } = this.ctx(req);
    return this.svc.delete(tenantId, id);
  }

  @Get('preferences')
  getPreferences(@Req() req: Request) {
    const { tenantId, userId } = this.ctx(req);
    return this.svc.getPreferences(tenantId, userId);
  }

  @Patch('preferences')
  updatePreferences(@Req() req: Request, @Body() data: any) {
    const { tenantId, userId } = this.ctx(req);
    return this.svc.updatePreferences(tenantId, userId, data);
  }
}
