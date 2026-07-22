import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { FbrPosStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { FbrService } from './fbr.service';

@ApiTags('Integrations / FBR Tax')
@Controller('integrations/fbr')
@UseGuards(JwtAuthGuard) @ApiBearerAuth()
export class FbrController {
  constructor(private readonly svc: FbrService) {}
  private tid(r: Request) { return (r as any).user?.tenantId as string; }

  @Post('configure')
  configure(@Req() r: Request, @Body() dto: any) { return this.svc.configure(this.tid(r), dto); }

  @Post('activate')
  activate(@Req() r: Request) { return this.svc.activate(this.tid(r)); }

  @Post('submit-invoice')
  submit(@Req() r: Request, @Body() body: { saleId: string }) { return this.svc.submitInvoice(this.tid(r), body.saleId); }

  @Get('logs')
  logs(@Req() r: Request, @Query('status') status?: FbrPosStatus, @Query('limit') l?: string) {
    return this.svc.listLogs(this.tid(r), status, +(l ?? 50));
  }

  @Post('logs/:id/retry')
  retry(@Req() r: Request, @Param('id') id: string) { return this.svc.retryFailed(this.tid(r), id); }
}
