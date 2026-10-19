import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { BulkOrdersService } from './bulk-orders.service';

@ApiTags('Bakery - Bulk Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bakery/bulk-orders')
export class BulkOrdersController {
  constructor(private readonly service: BulkOrdersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: any) { return this.service.create(user, shop, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('status') status?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string, @Query('open') open?: string) {
    return this.service.list(user, shop, { status, from, to, search, open });
  }

  /** Paged record for one view (active, this week, late…) with the counts of all views. */
  @Get('page') page(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: Record<string, string>) { return this.service.page(user, shop, q); }

  /** Open-order numbers and analytics for a period of event dates. */
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('from') from?: string, @Query('to') to?: string) { return this.service.summary(user, shop, from, to); }

  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  /** The bill made at delivery, or null. */
  @Get(':id/bill') bill(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.bill(user, id); }

  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Patch(':id/status') status(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string }) { return this.service.updateStatus(user, id, body?.status); }
  @Post(':id/payment') payment(
    @GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string,
    @Body() body: { amount: number; expectedPaid?: number; method?: string; withBill?: boolean },
  ) {
    return this.service.addPayment(user, shop, id, body?.amount, body?.expectedPaid, body?.method, body?.withBill === true);
  }

  /** Cash refund of a cancelled order's advance: a refund, so it also needs the returns permission. */
  @RequirePermissions(PERMISSIONS.BAKERY_ORDERS_MANAGE, PERMISSIONS.RETURNS_CREATE)
  @Post(':id/refund') refund(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() body: { managerPin?: string }) {
    return this.service.refundAdvance(user, shop, id, body?.managerPin);
  }
}
