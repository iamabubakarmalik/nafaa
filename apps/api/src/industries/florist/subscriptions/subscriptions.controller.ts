import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { FloristSubscriptionsService } from './subscriptions.service';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto/create-subscription.dto';

@ApiTags('Florist - Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
// The general `subscriptions` route rule is the shop's own plan (billing);
// flower subscriptions are counter work, as florist orders are.
@RequirePermissions(PERMISSIONS.POS_USE)
@Controller('florist/subscriptions')
export class FloristSubscriptionsController {
  constructor(private readonly service: FloristSubscriptionsService) {}

  @Post() create(@GetUser() u: AuthenticatedUser, @Body() dto: CreateSubscriptionDto) { return this.service.create(u, dto); }
  @Get() list(@GetUser() u: AuthenticatedUser, @Query('status') status?: string, @Query('search') search?: string) {
    return this.service.list(u, { status, search });
  }
  @Get('paged') paged(
    @GetUser() u: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('due') due?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) { return this.service.paged(u, { status, search, due: due === 'true', page: Number(page) || 1, limit: Number(limit) || 25 }); }
  @Get('summary') summary(@GetUser() u: AuthenticatedUser) { return this.service.summary(u); }
  @Get('due-today') due(@GetUser() u: AuthenticatedUser) { return this.service.dueToday(u); }
  @Get(':id') getOne(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(u, id); }
  @Patch(':id') update(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateSubscriptionDto) { return this.service.update(u, id, dto); }
  /** Bills the delivery to the customer's khata. */
  @Post(':id/mark-delivered') delivered(@GetUser() u: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string) { return this.service.markDelivered(u, scope, id); }
  @Post(':id/pause') pause(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.pause(u, id); }
  @Post(':id/resume') resume(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.resume(u, id); }
  @Post(':id/cancel') cancel(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.cancel(u, id); }
  /** Cancels the subscription; nothing is deleted. */
  @Delete(':id') remove(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(u, id); }
}
