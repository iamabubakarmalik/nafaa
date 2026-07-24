import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MessagesManageService } from './messages-manage.service';

@ApiTags('Marketplace Messages Management')
@Controller('marketplace/messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesManageController {
  constructor(private readonly svc: MessagesManageService) {}

  private ctx(req: Request) {
    const user = (req as any).user;
    return {
      tenantId: user?.tenantId as string,
      shopId: (user?.shopId as string | null | undefined) ?? null,
      userId: user?.id as string,
    };
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

  @Get(':id')
  get(@Req() req: Request, @Param('id') id: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.get(tenantId, shopId, id);
  }

  @Post(':id/reply')
  send(@Req() req: Request, @Param('id') id: string, @Body() body: { body: string; attachments?: string[] }) {
    const { tenantId, shopId, userId } = this.ctx(req);
    return this.svc.send(tenantId, shopId, id, userId, body.body, body.attachments || []);
  }

  @Post(':id/mark-read')
  markRead(@Req() req: Request, @Param('id') id: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.markRead(tenantId, shopId, id);
  }

  @Post(':id/close')
  close(@Req() req: Request, @Param('id') id: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.close(tenantId, shopId, id);
  }
}
