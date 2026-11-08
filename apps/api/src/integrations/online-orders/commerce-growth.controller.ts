import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../common/shop-scope';
import { AbandonedCartsService } from './abandoned-carts.service';
import { CommerceGrowthService } from './commerce-growth.service';

/**
 * Commerce growth and protection: abandoned checkouts, payment health, the
 * profit statement, the team queue, WhatsApp templates and scammer reports.
 * Under `online-orders`, so reading needs online_orders.view and every write
 * online_orders.manage (permission-routes). The profit statement also needs
 * cost.view and profit_report.view; templates are saved by the owner or a
 * manager. Registered before the main orders controller so
 * `online-orders/:id` never takes these paths.
 */
@ApiTags('Online Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-orders')
export class CommerceGrowthController {
  constructor(
    private readonly carts: AbandonedCartsService,
    private readonly growth: CommerceGrowthService,
  ) {}

  @Get('abandoned')
  @ApiOperation({ summary: 'Abandoned checkouts with recovery stats (reads Shopify again when stale)' })
  abandoned(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Query() q: { status?: string; search?: string; days?: string },
  ) {
    return this.carts.list(user, scope, q);
  }

  @Post('abandoned/sync')
  @ApiOperation({ summary: 'Read Shopify abandoned checkouts now' })
  syncAbandoned(@GetUser() user: AuthenticatedUser) {
    return this.carts.sync(user, true);
  }

  @Post('abandoned/:id/contacted')
  contacted(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { undo?: boolean }) {
    return this.carts.markContacted(user, id, !!body?.undo);
  }

  @Get('payment-health')
  @ApiOperation({ summary: 'COD outstanding by courier and age, payment mix, links, settlement forecast, losses' })
  paymentHealth(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query('from') from?: string, @Query('to') to?: string) {
    return this.growth.paymentHealth(user, scope, { from, to });
  }

  @Get('profit')
  @ApiOperation({ summary: 'Profit statement: sales − product cost − ads − courier − returns − other expenses' })
  profit(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Query() q: { from?: string; to?: string; integrationId?: string; expenses?: string },
  ) {
    return this.growth.profit(user, scope, q);
  }

  @Get('team')
  @ApiOperation({ summary: 'Per staff member: open assigned orders, follow-ups due, moved today' })
  team(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope) {
    return this.growth.team(user, scope);
  }

  @Get('wa-templates')
  waTemplates(@GetUser() user: AuthenticatedUser) {
    return this.growth.waTemplates(user.tenantId);
  }

  @Put('wa-templates')
  saveWaTemplates(@GetUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.growth.saveWaTemplates(user, body);
  }

  @Get('scam-report')
  @ApiOperation({ summary: 'Block list with order history, and numbers worth a look' })
  scamReport(@GetUser() user: AuthenticatedUser) {
    return this.growth.scamOverview(user);
  }

  @Post(':id/report-scam')
  @ApiOperation({ summary: 'Report the customer of an order: block the number with reason and evidence' })
  reportScam(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Param('id') id: string,
    @Body() body: { reason?: string; evidence?: string },
  ) {
    return this.growth.reportScam(user, scope, id, body ?? {});
  }
}
