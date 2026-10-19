import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS as P } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { WeightOrdersService } from './weight-orders.service';

/**
 * Orders are taken and paid at the counter (pos.use); reading them is a
 * sales view. Giving an advance back is a refund (returns.create, plus the
 * refund PIN when the shop asks for it).
 */
@ApiTags('Meat - Weight Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meat/weight-orders')
export class WeightOrdersController {
  constructor(private readonly service: WeightOrdersService) {}

  @Post() @RequirePermissions(P.POS_USE)
  create(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: unknown) { return this.service.create(user, scope, dto); }

  @Get() @RequirePermissions(P.SALES_VIEW)
  list(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, scope, { status, customerId, from, to, search });
  }

  @Get('page') @RequirePermissions(P.SALES_VIEW)
  page(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query() q: Record<string, string | undefined>) { return this.service.page(user, scope, q); }

  @Get('by-sales') @RequirePermissions(P.SALES_VIEW)
  bySales(@GetUser() user: AuthenticatedUser, @Query('ids') ids?: string) { return this.service.bySales(user, (ids ?? '').split(',')); }

  @Get(':id') @RequirePermissions(P.SALES_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Get(':id/bill') @RequirePermissions(P.SALES_VIEW)
  bill(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.bill(user, id); }

  @Patch(':id') @RequirePermissions(P.POS_USE)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: unknown) { return this.service.update(user, id, dto); }

  @Patch(':id/status') @RequirePermissions(P.POS_USE)
  updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string; cancellationReason?: string }) {
    return this.service.updateStatus(user, id, body?.status, body?.cancellationReason);
  }

  @Patch(':id/actual-weights') @RequirePermissions(P.POS_USE)
  actualWeights(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { items: Array<{ itemId: string; actualKg: number }> }) {
    return this.service.updateActualWeights(user, id, body?.items);
  }

  @Post(':id/payment') @RequirePermissions(P.POS_USE)
  payment(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: unknown) {
    return this.service.addPayment(user, scope, id, body);
  }

  @Post(':id/checkout') @RequirePermissions(P.POS_USE)
  checkout(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: unknown) {
    return this.service.checkout(user, scope, id, body);
  }

  @Post(':id/delivered') @RequirePermissions(P.POS_USE)
  delivered(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: unknown) { return this.service.delivered(user, id, body); }

  @Post(':id/refund') @RequirePermissions(P.RETURNS_CREATE)
  refund(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: { managerPin?: string }) {
    return this.service.refund(user, scope, id, body?.managerPin);
  }
}
