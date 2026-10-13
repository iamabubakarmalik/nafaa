import { Body, Controller, Get, Module, Param, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PrismaModule } from '../../prisma/prisma.module';
import { PERMISSIONS } from '../../common/constants/permissions.constants';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantTimezoneService } from '../../common/helpers/tenant-timezone.service';
import { CurrentShop } from '../../common/shop-scope/shop-scope.decorator';
import { ShopScope } from '../../common/shop-scope/shop-scope.types';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { TaxAuthorityService, type TaxQuery } from './tax-authority.service';

/* Reads need settings.view, writes settings.edit (permission-routes), and the
   service limits the tax screens to owners and managers. Sending a sale from
   the POS only needs pos.use, so a cashier's bill gets its fiscal number. */

@ApiTags('Tax authority (PRA / SRB / KPRA / FBR)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tax-authority')
export class TaxAuthorityController {
  constructor(private readonly svc: TaxAuthorityService) {}

  @Get()
  @ApiOperation({ summary: 'Settings: every authority profile, branches, activity (no secrets)' })
  overview(@GetUser() user: AuthenticatedUser) {
    return this.svc.overview(user);
  }

  @Get('pos')
  @ApiOperation({ summary: 'POS: is tax sending on for this branch' })
  pos(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope) {
    return this.svc.posStatus(user.tenantId, scope.shopId);
  }

  @Put()
  @ApiOperation({ summary: 'Save one authority profile (body.authority)' })
  save(@GetUser() user: AuthenticatedUser, @Body() body: any) {
    return this.svc.save(user, body ?? {});
  }

  @Post('test')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sandbox sample bill for one authority / terminal' })
  test(@GetUser() user: AuthenticatedUser, @Body() body: { authority?: string; shopId?: string | null }) {
    return this.svc.test(user, body ?? {});
  }

  @Get('analytics')
  analytics(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query() q: TaxQuery) {
    return this.svc.analytics(user, scope, q);
  }

  @Get('invoices')
  invoices(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query() q: TaxQuery) {
    return this.svc.invoices(user, scope, q);
  }

  @Post('invoices/retry-failed')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Re-send failed bills in the background' })
  retryFailed(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() body: { authority?: string }) {
    return this.svc.retryFailed(user, scope, body ?? {});
  }

  @Get('invoices/:id')
  invoice(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string) {
    return this.svc.invoice(user, scope, id);
  }

  @Post('invoices/:id/retry')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  retry(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string) {
    return this.svc.retry(user, scope, id);
  }

  @Get('report')
  report(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query() q: TaxQuery) {
    return this.svc.report(user, scope, q);
  }

  @Get('report.csv')
  async reportCsv(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query() q: TaxQuery, @Res() res: Response) {
    const f = await this.svc.reportFile(user, scope, q);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${f.name}"`);
    res.send(f.body);
  }

  @Post('sales/:saleId/submit')
  @RequirePermissions(PERMISSIONS.POS_USE)
  @ApiOperation({ summary: 'Send a sale before its bill prints; calling again returns the same number' })
  submit(@GetUser() user: AuthenticatedUser, @Param('saleId') saleId: string) {
    return this.svc.submitSale(user.tenantId, saleId);
  }

  @Get('sales/:saleId')
  status(@GetUser() user: AuthenticatedUser, @Param('saleId') saleId: string) {
    return this.svc.saleStatus(user.tenantId, saleId);
  }
}

@Module({ imports: [PrismaModule], controllers: [TaxAuthorityController], providers: [TaxAuthorityService, TenantTimezoneService] })
export class TaxAuthorityModule {}
