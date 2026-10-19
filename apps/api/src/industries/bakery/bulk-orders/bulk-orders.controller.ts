import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { BulkOrdersService } from './bulk-orders.service';

@ApiTags('Bakery - Bulk Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bakery/bulk-orders')
export class BulkOrdersController {
  constructor(private readonly service: BulkOrdersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: any) { return this.service.create(user, shop, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string, @Query('open') open?: string) {
    return this.service.list(user, { status, from, to, search, open });
  }

  /** Paged record for one view (active, this week, late…) with the counts of all views. */
  @Get('page') page(@GetUser() user: AuthenticatedUser, @Query() q: Record<string, string>) { return this.service.page(user, q); }

  /** Open-order numbers and analytics for a period of event dates. */
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) { return this.service.summary(user, from, to); }

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
}
