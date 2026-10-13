import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { LayawayService } from './layaway.service';

@ApiTags('Garments - Layaway')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('garments/layaway')
export class LayawayController {
  constructor(private readonly service: LayawayService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: any) { return this.service.create(user, dto, shop.shopId); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string) { return this.service.list(user, { status, customerId }); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/installments/:installmentId/pay') pay(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('installmentId') installmentId: string, @Body() body: any) { return this.service.payInstallment(user, id, installmentId, body); }
  @Post(':id/cancel') cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string }) { return this.service.cancel(user, id, body.reason); }
}
