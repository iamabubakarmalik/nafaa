import { Body, Controller, Get, Module, Param, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PrismaModule } from '../../prisma/prisma.module';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { TaxAuthorityService } from './tax-authority.service';

@ApiTags('Tax authority (PRA / SRB / KPRA)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax-authority')
export class TaxAuthorityController {
  constructor(private readonly svc: TaxAuthorityService) {}

  @Get()
  overview(@GetUser() user: AuthenticatedUser) {
    return this.svc.overview(user);
  }

  @Get('pos')
  @ApiOperation({ summary: 'POS ke liye: on hai ya nahi' })
  pos(@GetUser() user: AuthenticatedUser) {
    return this.svc.posStatus(user.tenantId);
  }

  @Put()
  save(@GetUser() user: AuthenticatedUser, @Body() body: any) {
    return this.svc.save(user, body ?? {});
  }

  @Post('test')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  test(@GetUser() user: AuthenticatedUser) {
    return this.svc.test(user);
  }

  @Get('analytics')
  analytics(@GetUser() user: AuthenticatedUser) {
    return this.svc.analytics(user);
  }

  @Get('invoices')
  invoices(@GetUser() user: AuthenticatedUser, @Query() q: { status?: string; kind?: string; search?: string; from?: string; to?: string; page?: string }) {
    return this.svc.invoices(user, q);
  }

  @Post('invoices/:id/retry')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  retry(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.retry(user, id);
  }

  @Get('report')
  report(@GetUser() user: AuthenticatedUser, @Query('month') month?: string) {
    return this.svc.report(user, month);
  }

  @Get('report.csv')
  async reportCsv(@GetUser() user: AuthenticatedUser, @Query('month') month: string, @Res() res: Response) {
    const f = await this.svc.reportFile(user, month);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${f.name}"`);
    res.send(f.body);
  }

  @Post('sales/:saleId/submit')
  @ApiOperation({ summary: 'Sale authority ko (bill chhapne se pehle) — dobara bulane par wahi number' })
  submit(@GetUser() user: AuthenticatedUser, @Param('saleId') saleId: string) {
    return this.svc.submitSale(user.tenantId, saleId);
  }

  @Get('sales/:saleId')
  status(@GetUser() user: AuthenticatedUser, @Param('saleId') saleId: string) {
    return this.svc.saleStatus(user.tenantId, saleId);
  }
}

@Module({ imports: [PrismaModule], controllers: [TaxAuthorityController], providers: [TaxAuthorityService] })
export class TaxAuthorityModule {}
