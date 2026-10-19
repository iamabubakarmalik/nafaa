import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS as P } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { SubscriptionsService } from './subscriptions.service';

/**
 * Customer supply plans are customer records. The decorators also keep the
 * general `subscriptions` route rule (Nafaa billing) off these routes.
 */
@ApiTags('Meat - Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meat/subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Post() @RequirePermissions(P.CUSTOMERS_EDIT)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: unknown) { return this.service.create(user, dto); }

  @Get() @RequirePermissions(P.CUSTOMERS_VIEW)
  list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('frequency') frequency?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, customerId, frequency, search });
  }

  @Get(':id') @RequirePermissions(P.CUSTOMERS_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id') @RequirePermissions(P.CUSTOMERS_EDIT)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: unknown) { return this.service.update(user, id, dto); }

  @Post(':id/pause') @RequirePermissions(P.CUSTOMERS_EDIT)
  pause(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string }) { return this.service.pause(user, id, body?.reason); }

  @Post(':id/resume') @RequirePermissions(P.CUSTOMERS_EDIT)
  resume(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.resume(user, id); }

  @Post(':id/cancel') @RequirePermissions(P.CUSTOMERS_EDIT)
  cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string }) { return this.service.cancel(user, id, body?.reason); }

  /** Makes today's order (an order is taken at the counter). */
  @Post(':id/deliver') @RequirePermissions(P.POS_USE)
  deliver(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string) { return this.service.deliver(user, scope, id); }
}
