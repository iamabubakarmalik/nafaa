import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../modules/auth/decorators/public.decorator';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { PortalService } from './portal.service';

/** Customer portal (no login): the token in the link is the only key. */
@ApiTags('Customer portal (public)')
@Public()
@Controller('portal/v1')
export class PortalPublicController {
  constructor(private readonly svc: PortalService) {}

  @Get(':token')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @ApiOperation({ summary: 'Order (order link) or the customer order list (customer link)' })
  open(@Param('token') token: string) {
    return this.svc.open(token);
  }

  @Get(':token/orders/:orderId')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  order(@Param('token') token: string, @Param('orderId') orderId: string) {
    return this.svc.order(token, orderId);
  }

  @Post(':token/requests')
  @HttpCode(200)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @ApiOperation({ summary: 'Return, exchange, cancel, address change or reorder request' })
  request(@Param('token') token: string, @Body() body: any) {
    return this.svc.createRequest(token, body ?? {});
  }

  @Post(':token/requests/:id/withdraw')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  withdraw(@Param('token') token: string, @Param('id') id: string) {
    return this.svc.withdraw(token, id);
  }

  @Post(':token/upload')
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  upload(@Param('token') token: string, @Body() body: { fileName?: string; contentType?: string; fileSize?: number }) {
    return this.svc.uploadUrl(token, body ?? {});
  }
}

/** The shop's side: portal links and the "Returns & exchanges" queue. */
@ApiTags('Online Orders')
@ApiBearerAuth()
@Controller('online-orders/portal')
export class PortalAdminController {
  constructor(private readonly svc: PortalService) {}

  @Post('link')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.ONLINE_ORDERS_VIEW)
  @ApiOperation({ summary: 'Customer link for an order (or all orders of its phone)' })
  link(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() body: { orderId?: string; kind?: string }) {
    return this.svc.makeLink(user, scope, body ?? {});
  }

  @Get('requests')
  @RequirePermissions(PERMISSIONS.ONLINE_ORDERS_VIEW)
  list(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query() q: { status?: string; type?: string; search?: string }) {
    return this.svc.listRequests(user, scope, q ?? {});
  }

  @Post('requests/:id/approve')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.ONLINE_ORDERS_MANAGE)
  approve(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: { note?: string; pickupCourier?: string; pickupTracking?: string }) {
    return this.svc.approve(user, scope, id, body ?? {});
  }

  @Post('requests/:id/reject')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.ONLINE_ORDERS_MANAGE)
  reject(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: { note?: string }) {
    return this.svc.reject(user, scope, id, body ?? {});
  }

  @Post('requests/:id/done')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.ONLINE_ORDERS_MANAGE)
  done(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: { note?: string }) {
    return this.svc.done(user, scope, id, body ?? {});
  }

  @Post('requests/:id/refund-note')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.RETURNS_CREATE)
  refund(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: { note?: string; amount?: number }) {
    return this.svc.refundNote(user, scope, id, body ?? {});
  }
}
