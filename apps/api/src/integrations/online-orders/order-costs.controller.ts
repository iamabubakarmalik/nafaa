import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../common/shop-scope';
import { OnlineOrdersService } from './online-orders.service';
import { OrderCostsService } from './order-costs.service';
import { CodReconcileService } from './cod-reconcile.service';
import { CourierRulesService } from './courier-rules.service';
import { CostKind } from './order-costs';
import { ColumnMap } from './cod-reconcile';
import { OrderScanService } from './order-scan.service';
import { OrderToolsService, RiskSettings } from './order-tools.service';

/**
 * Online order money: selling costs and true profit, COD statement
 * reconciliation, courier auto-booking rules and suggestions, and the
 * per-order delivery choice. Under `online-orders`, so reading needs
 * online_orders.view and every write online_orders.manage (permission-routes);
 * settings also need the owner or a manager. Registered before the main
 * orders controller so `online-orders/:id` never takes these paths.
 */
@ApiTags('Online Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-orders')
export class OrderMoneyController {
  constructor(
    private readonly orders: OnlineOrdersService,
    private readonly costs: OrderCostsService,
    private readonly reconcile: CodReconcileService,
    private readonly rules: CourierRulesService,
    private readonly scan: OrderScanService,
    private readonly tools: OrderToolsService,
  ) {}

  @Get('scan')
  @ApiOperation({ summary: 'Find an order by its number or courier CN, with each line’s barcodes (packing and returns desk)' })
  lookup(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query('code') code: string) {
    return this.scan.lookup(user, scope, code);
  }

  @Get('risk/settings')
  @ApiOperation({ summary: 'Risky-order rule: ask for an advance when the risk is HIGH' })
  riskSettings(@GetUser() user: AuthenticatedUser) {
    return this.tools.riskSettings(user.tenantId);
  }

  @Put('risk/settings')
  saveRiskSettings(@GetUser() user: AuthenticatedUser, @Body() body: Partial<RiskSettings>) {
    return this.tools.saveRiskSettings(user, body ?? {});
  }

  @Post(':id/packed')
  @ApiOperation({ summary: 'Every item scanned: the order is packed (READY)' })
  packed(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: { counts?: Record<string, number>; manual?: number[] }) {
    return this.scan.packed(user, scope, id, body ?? {});
  }

  @Post(':id/rto-receive')
  @ApiOperation({ summary: 'Returned parcel received: order returned (stock back via the bill void), damaged items written off' })
  rtoReceive(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: { damaged?: Record<string, number>; reason?: string }) {
    return this.scan.rtoReceive(user, scope, id, body ?? {});
  }

  @Get('costs/settings')
  @ApiOperation({ summary: 'Selling costs: courier rate cards, COD fee, packaging, gateway fee, post to expenses' })
  costSettings(@GetUser() user: AuthenticatedUser) {
    return this.costs.getSettings(user);
  }

  @Put('costs/settings')
  saveCostSettings(@GetUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.costs.saveSettings(user, body);
  }

  @Get('report/profit')
  @ApiOperation({ summary: 'True profit of online orders by channel, courier, city and product' })
  profit(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('integrationId') integrationId?: string,
  ) {
    return this.costs.profitReport(user, scope, { from, to, integrationId });
  }

  @Post('cod/reconcile')
  @ApiOperation({ summary: 'Match a courier payment statement (header + rows) to orders' })
  reconcilePreview(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Body() body: { headers?: unknown[]; rows?: unknown[][]; mapping?: ColumnMap; courier?: string },
  ) {
    return this.reconcile.preview(user, scope, body ?? {});
  }

  @Post('cod/reconcile/settle')
  @ApiOperation({ summary: 'Statement rows paid: orders settled, courier charges kept as costs' })
  reconcileSettle(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Body() body: { reference?: string; withCharges?: boolean; items?: Array<{ orderId?: string; received?: number; charge?: number | null; codFee?: number | null }> },
  ) {
    return this.reconcile.settle(user, scope, body ?? {});
  }

  @Get('courier-rules')
  @ApiOperation({ summary: 'Courier auto-booking rules' })
  courierRules(@GetUser() user: AuthenticatedUser) {
    return this.rules.get(user);
  }

  @Put('courier-rules')
  saveCourierRules(@GetUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.rules.save(user, body);
  }

  @Get(':id/courier-suggest')
  @ApiOperation({ summary: "Couriers ranked by the shop's own delivered share and charge for the order's city" })
  suggest(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string) {
    return this.rules.suggest(user, scope, id);
  }

  @Post(':id/costs')
  @ApiOperation({ summary: "Correct an order's selling costs by hand (empty clears back to the rate card)" })
  setCosts(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: Partial<Record<CostKind, number | null>>) {
    return this.costs.setCosts(user, scope, id, body ?? {});
  }

  @Post(':id/delivery')
  @ApiOperation({ summary: 'Delivery on this order: CUSTOMER (in the bill), FREE (shop pays) or RIDER (rider keeps it)' })
  delivery(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: { mode?: string }) {
    return this.orders.setDeliveryMode(user, scope, id, body ?? {});
  }
}
