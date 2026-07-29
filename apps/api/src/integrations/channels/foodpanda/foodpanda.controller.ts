import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../../modules/auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { FoodpandaService } from './foodpanda.service';
import { IntegrationService } from '../../core/integration.service';

@ApiTags('Integrations / Foodpanda')
@Controller('integrations/foodpanda')
export class FoodpandaController {
  constructor(
    private readonly svc: FoodpandaService,
    private readonly integrationSvc: IntegrationService,
  ) {}

  private tid(req: Request) { return (req as any).user?.tenantId as string; }

  // ─── Webhook (Foodpanda calls this) ───
  @Public()
  @Post('webhook/:integrationId')
  @ApiOperation({ summary: 'Foodpanda webhook receiver' })
  webhook(@Param('integrationId') id: string, @Body() body: any) {
    return this.svc.handleWebhook(id, body);
  }

  // ─── Manual sync ───
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post(':integrationId/sync')
  @ApiOperation({ summary: 'Manually sync orders from Foodpanda' })
  sync(@Param('integrationId') id: string) {
    return this.svc.syncOrders(id);
  }

  // ─── Accept order ───
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post(':integrationId/orders/:externalOrderId/accept')
  accept(@Param('integrationId') id: string, @Param('externalOrderId') oid: string) {
    return this.svc.acceptOrder(id, oid);
  }

  // ─── Reject order ───
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post(':integrationId/orders/:externalOrderId/reject')
  reject(@Param('integrationId') id: string, @Param('externalOrderId') oid: string, @Body() body: { reason: string }) {
    return this.svc.rejectOrder(id, oid, body.reason);
  }
}
