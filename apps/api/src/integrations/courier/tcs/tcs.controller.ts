import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { TcsService } from './tcs.service';

@ApiTags('Integrations / TCS Courier')
@Controller('integrations/courier/tcs')
@UseGuards(JwtAuthGuard) @ApiBearerAuth()
export class TcsController {
  constructor(private readonly svc: TcsService) {}
  private tid(r: Request) { return (r as any).user?.tenantId as string; }

  @Post('book') book(@Req() r: Request, @Body() dto: any) { return this.svc.bookShipment(this.tid(r), dto); }
  @Get('track/:trackingNumber') track(@Req() r: Request, @Param('trackingNumber') tn: string) { return this.svc.track(this.tid(r), tn); }
  @Post('cancel/:trackingNumber') cancel(@Req() r: Request, @Param('trackingNumber') tn: string) { return this.svc.cancel(this.tid(r), tn); }
}
