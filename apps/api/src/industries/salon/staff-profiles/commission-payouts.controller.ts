import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CommissionPayoutsService } from './commission-payouts.service';
import { PayCommissionDto } from './dto/commission-payout.dto';

/** Under `salon/commission`, so the shared commission route rule guards it. */
@ApiTags('Salon - Commission payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('salon/commission/payouts')
export class CommissionPayoutsController {
  constructor(private readonly service: CommissionPayoutsService) {}

  @Post() pay(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: PayCommissionDto) {
    return this.service.pay(user, shop, dto);
  }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('staffProfileId') staffProfileId?: string) {
    return this.service.list(user, { staffProfileId });
  }
  @Get(':ref') slip(@GetUser() user: AuthenticatedUser, @Param('ref') ref: string) { return this.service.slip(user, ref); }
}
