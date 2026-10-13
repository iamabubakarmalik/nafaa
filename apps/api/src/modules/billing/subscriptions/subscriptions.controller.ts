import { Body, Controller, Delete, ForbiddenException, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BillingInterval } from '@prisma/client';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionCronService } from './subscription-cron.service';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly service: SubscriptionsService,
    private readonly cron: SubscriptionCronService,
  ) {}

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

  @Post('cleanup-pending')
  @ApiOperation({ summary: 'Cleanup duplicate pending subscriptions (keeps latest)' })
  cleanupPending(@GetUser() user: AuthenticatedUser) {
    return this.service.cleanupPendingSubscriptions(user.tenantId);
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

  @Post('admin/run-cron')
  @ApiOperation({ summary: 'Manually trigger daily expiry check (platform admin)' })
  runCron(@GetUser() user: AuthenticatedUser) {
    // The check runs across every business, so a shop owner may not start it.
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Sirf Nafaa admin ye chala sakta hai');
    }
    return this.cron.runNow();
  }
}
