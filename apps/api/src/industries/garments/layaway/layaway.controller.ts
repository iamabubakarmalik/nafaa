import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { LayawayQuery, LayawayService } from './layaway.service';
import { CancelDto, CreateLayawayDto, PayInstallmentDto } from './dto/layaway.dto';

@ApiTags('Garments - Layaway')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('garments/layaway')
export class LayawayController {
  constructor(private readonly service: LayawayService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateLayawayDto) { return this.service.create(user, dto, shop.shopId); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string) { return this.service.list(user, { status, customerId }); }
  /** One page of a view (active, overdue, week, completed, cancelled, all) with counts. */
  @Get('page') page(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: LayawayQuery) { return this.service.page(user, shop, q); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/pay') pay(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: PayInstallmentDto) { return this.service.pay(user, id, body); }
  @Post(':id/installments/:installmentId/pay') payInstallment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('installmentId') installmentId: string, @Body() body: PayInstallmentDto) { return this.service.payInstallment(user, id, installmentId, body); }
  /** Makes the bill of a paid-off plan when that step failed before. */
  @Post(':id/complete') complete(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.complete(user, id); }
  @Post(':id/cancel') cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: CancelDto) { return this.service.cancel(user, id, body.reason); }
}
