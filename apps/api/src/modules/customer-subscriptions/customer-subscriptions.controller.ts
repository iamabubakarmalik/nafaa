import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomerSubscriptionStatus } from '@prisma/client';
import { CustomerAuthGuard } from '../../marketplace/_shared/guards/customer-auth.guard';
import { GetCustomer } from '../../marketplace/_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../../marketplace/auth/interfaces/customer-jwt.interface';
import { CustomerSubscriptionsService } from './customer-subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@ApiTags('Marketplace / Subscriptions (Subscribe & Save)')
@Controller('marketplace/subscriptions')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class CustomerSubscriptionsController {
  constructor(private readonly svc: CustomerSubscriptionsService) {}

  @Post() create(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: CreateSubscriptionDto) { return this.svc.create(c.id, dto); }

  @Get() list(@GetCustomer() c: AuthenticatedCustomer, @Query('status') status?: CustomerSubscriptionStatus) { return this.svc.list(c.id, status); }

  @Get(':id') detail(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string) { return this.svc.get(c.id, id); }

  @Post(':id/pause')
  pause(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string, @Body() body?: { until?: string }) {
    return this.svc.pause(c.id, id, body?.until);
  }

  @Post(':id/resume') resume(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string) { return this.svc.resume(c.id, id); }

  @Post(':id/cancel')
  cancel(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string, @Body() body?: { reason?: string }) {
    return this.svc.cancel(c.id, id, body?.reason);
  }

  @Post(':id/skip-next') skip(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string) { return this.svc.skipNext(c.id, id); }
}
