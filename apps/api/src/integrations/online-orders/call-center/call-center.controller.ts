import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CallCenterService, LogCallBody } from './call-center.service';

/**
 * Call center. Under `online-orders`, so reading needs online_orders.view
 * and logging a call online_orders.manage (permission-routes). Registered
 * before the main orders controller so `online-orders/:id` never takes
 * these paths.
 */
@ApiTags('Online Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-orders/calls')
export class CallCenterController {
  constructor(private readonly svc: CallCenterService) {}

  @Get('queue')
  @ApiOperation({ summary: 'Confirmation call queue: open orders by priority (age, risk, COD, due callback)' })
  queue(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query('mine') mine?: string) {
    return this.svc.queue(user, scope, { mine });
  }

  @Get('follow-ups')
  @ApiOperation({ summary: 'Callbacks still to make, due first' })
  followUps(@GetUser() user: AuthenticatedUser, @Query('mine') mine?: string) {
    return this.svc.followUps(user, { mine });
  }

  @Get('performance')
  @ApiOperation({ summary: 'Per agent: calls, confirmed, confirm rate, reach rate' })
  performance(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.performance(user, { from, to });
  }

  @Get()
  @ApiOperation({ summary: 'Call log: ?orderId= or ?phone= or a period (from, to), agentId, outcome' })
  list(@GetUser() user: AuthenticatedUser, @Query() q: { orderId?: string; phone?: string; agentId?: string; outcome?: string; from?: string; to?: string; limit?: string }) {
    return this.svc.list(user, q);
  }

  @Post()
  @ApiOperation({ summary: 'Log a call: orderId or phone, outcome, note, callBackAt (CALL_BACK)' })
  log(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() body: LogCallBody) {
    return this.svc.log(user, scope, body ?? {});
  }

  @Post(':id/done')
  @ApiOperation({ summary: 'Mark a callback done (or undo)' })
  done(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { undo?: boolean }) {
    return this.svc.followUpDone(user, id, !!body?.undo);
  }
}
