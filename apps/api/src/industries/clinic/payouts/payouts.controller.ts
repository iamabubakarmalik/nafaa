import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { PayoutsService } from './payouts.service';

/**
 * Doctor share is money per doctor, so reading it needs bookings view and
 * reports view (as the day close). Paying it writes an expense from the
 * drawer, so it also needs expenses.create.
 */
@ApiTags('Clinic - Doctor payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_VIEW, PERMISSIONS.REPORTS_VIEW)
@Controller('clinic/doctor-payouts')
export class PayoutsController {
  constructor(private readonly service: PayoutsService) {}

  @Get() list(@GetUser() user: AuthenticatedUser, @Query('doctorId') doctorId?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.list(user, { doctorId, page, limit });
  }

  @Get('due') due(@GetUser() user: AuthenticatedUser, @Query('doctorId') doctorId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.due(user, doctorId, from, to);
  }

  @Post() @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_VIEW, PERMISSIONS.REPORTS_VIEW, PERMISSIONS.EXPENSES_CREATE)
  create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: any) { return this.service.create(user, shop, dto); }
}
