import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BillingInterval } from '@prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get('current')
  current(@GetUser() user: AuthenticatedUser) {
    return this.service.getCurrent(user);
  }

  @Get('pending-upgrade')
  pendingUpgrade(@GetUser() user: AuthenticatedUser) {
    return this.service.getPendingUpgrade(user);
  }

  @Post('start')
  start(
    @GetUser() user: AuthenticatedUser,
    @Body() body: { planId: string; interval: BillingInterval },
  ) {
    return this.service.startSubscription(user, body.planId, body.interval);
  }

  @Delete('pending/:id')
  cancelPending(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.cancelPendingUpgrade(user, id);
  }

  @Post('cancel')
  cancel(@GetUser() user: AuthenticatedUser) {
    return this.service.cancel(user);
  }

  @Post('reactivate')
  reactivate(@GetUser() user: AuthenticatedUser) {
    return this.service.reactivate(user);
  }
}
