import {
  Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { FbrInvoiceStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { FbrService } from './fbr.service';
import { SkipInvoiceDto, SubmitInvoiceDto, UpsertFbrConfigDto } from './dto/fbr-config.dto';

@ApiTags('Integrations / FBR Tax')
@Controller('integrations/fbr')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FbrController {
  constructor(private readonly svc: FbrService) {}

  private tid(req: Request) { return (req as any).user?.tenantId as string; }
  private uid(req: Request) { return (req as any).user?.id as string; }

  @Get('config')
  @ApiOperation({ summary: 'Get FBR configuration + stats' })
  getConfig(@Req() req: Request) {
    return this.svc.getConfig(this.tid(req));
  }

  @Put('config')
  @ApiOperation({ summary: 'Update FBR configuration' })
  updateConfig(@Req() req: Request, @Body() dto: UpsertFbrConfigDto) {
    return this.svc.upsertConfig(this.tid(req), dto);
  }

  @Post('test-connection')
  @ApiOperation({ summary: 'Test FBR API connection' })
  testConnection(@Req() req: Request) {
    return this.svc.testConnection(this.tid(req));
  }

  @Post('submit')
  @ApiOperation({ summary: 'Manually submit a sale to FBR' })
  submit(@Req() req: Request, @Body() dto: SubmitInvoiceDto) {
    return this.svc.submitSale(this.tid(req), dto.saleId, { forceResubmit: dto.forceResubmit });
  }

  @Post('skip')
  @ApiOperation({ summary: 'Skip FBR submission for a sale' })
  skip(@Req() req: Request, @Body() dto: SkipInvoiceDto) {
    return this.svc.skipSale(this.tid(req), dto.saleId, dto.reason, this.uid(req));
  }

  @Post('retry-pending')
  @ApiOperation({ summary: 'Retry all pending/rejected invoices' })
  retryPending(@Req() req: Request) {
    return this.svc.retryPending(this.tid(req));
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List FBR invoices' })
  listInvoices(
    @Req() req: Request,
    @Query('status') status?: FbrInvoiceStatus,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.listInvoices(this.tid(req), {
      status,
      dateFrom,
      dateTo,
      limit: limit ? +limit : undefined,
      offset: offset ? +offset : undefined,
    });
  }

  @Get('invoices/:id')
  getInvoice(@Req() req: Request, @Param('id') id: string) {
    return this.svc.getInvoice(this.tid(req), id);
  }

  @Get('reports/monthly')
  @ApiOperation({ summary: 'Monthly sales tax report for filing' })
  monthlyReport(
    @Req() req: Request,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.svc.monthlyReport(this.tid(req), +year, +month);
  }

  @Get('sale/:saleId/status')
  @ApiOperation({ summary: 'FBR status for a specific sale (POS/detail page)' })
  saleStatus(@Req() req: Request, @Param('saleId') saleId: string) {
    return this.svc.getSaleFbrStatus(this.tid(req), saleId);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel FBR invoice for a sale' })
  async cancel(@Req() req: Request, @Body() body: { saleId: string; reason: string }) {
    return this.svc.cancelInvoice(this.tid(req), body.saleId, body.reason);
  }

  @Post('bulk-submit')
  @ApiOperation({ summary: 'Bulk submit multiple sales to FBR' })
  async bulkSubmit(@Req() req: Request, @Body() body: {
    saleIds?: string[];
    dateFrom?: string;
    dateTo?: string;
    onlyPending?: boolean;
  }) {
    return this.svc.bulkSubmit(this.tid(req), body);
  }

  @Get('analytics')
  @ApiOperation({ summary: '12-month trends, rejection rate, top errors' })
  analytics(@Req() req: Request) {
    return this.svc.getAnalytics(this.tid(req));
  }
}
