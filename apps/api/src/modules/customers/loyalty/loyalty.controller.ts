import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { LoyaltyService } from './loyalty.service';

@ApiTags('Loyalty Points')
@ApiBearerAuth()
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly service: LoyaltyService) {}

  /** Members, outstanding points, issued/redeemed for a period (from/to business days), by day and branch. */
  @Get('overview')
  overview(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.overview(user, shop, { from, to });
  }

  @Get('members')
  members(
    @GetUser() user: AuthenticatedUser,
    @Query('search') search?: string, @Query('sort') sort?: string,
    @Query('page') page?: string, @Query('limit') limit?: string, @Query('min') min?: string,
  ) {
    return this.service.members(user, { search, sort, page, limit, min });
  }

  @Get('leaderboard')
  leaderboard(@GetUser() user: AuthenticatedUser) {
    return this.service.leaderboard(user);
  }

  /** Points that would lapse now under the shop's expiry setting. */
  @Get('expiry-preview')
  expiryPreview(@GetUser() user: AuthenticatedUser) {
    return this.service.expire(user.tenantId, false);
  }

  @Post('expire-now')
  expireNow(@GetUser() user: AuthenticatedUser) {
    return this.service.expire(user.tenantId, true);
  }

  @Get('customer/:customerId')
  history(@GetUser() user: AuthenticatedUser, @Param('customerId') customerId: string) {
    return this.service.customerHistory(user, customerId);
  }

  @Post('customer/:customerId/adjust')
  adjust(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Param('customerId') customerId: string,
    @Body() body: { points: number; note?: string },
  ) {
    return this.service.adjust(user, shop, customerId, body);
  }
}
