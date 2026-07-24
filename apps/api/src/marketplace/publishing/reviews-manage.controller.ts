import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { ReviewsManageService } from './reviews-manage.service';

@ApiTags('Marketplace Reviews Management')
@Controller('marketplace/reviews/manage')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewsManageController {
  constructor(private readonly svc: ReviewsManageService) {}

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
      rating: query.rating ? Number(query.rating) : undefined,
      hasReply: query.hasReply === 'true' ? true : query.hasReply === 'false' ? false : undefined,
      productId: query.productId,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    });
  }

  @Post(':id/reply')
  reply(@Req() req: Request, @Param('id') id: string, @Body() body: { reply: string }) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.reply(tenantId, shopId, id, body.reply);
  }

  @Post(':id/hide')
  hide(@Req() req: Request, @Param('id') id: string) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.hide(tenantId, shopId, id);
  }

  @Post(':id/report')
  report(@Req() req: Request, @Param('id') id: string, @Body() body: { reason: string }) {
    const { tenantId, shopId } = this.ctx(req);
    return this.svc.report(tenantId, shopId, id, body.reason);
  }
}
