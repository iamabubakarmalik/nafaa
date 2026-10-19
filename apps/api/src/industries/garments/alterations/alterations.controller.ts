import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AlterationQuery, AlterationsService } from './alterations.service';
import { AlterationPaymentDto, AlterationStatusDto, CreateAlterationDto, UpdateAlterationDto } from './dto/create-alteration.dto';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';

@ApiTags('Garments - Alterations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('garments/alterations')
export class AlterationsController {
  constructor(private readonly service: AlterationsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateAlterationDto) { return this.service.create(user, dto, shop.shopId); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('priority') priority?: string, @Query('customerId') customerId?: string, @Query('tailorId') tailorId?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, priority, customerId, tailorId, search });
  }
  /** One page of a view (active, today, late, ready, unpaid, done, all) with counts. */
  @Get('page') page(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: AlterationQuery) { return this.service.page(user, shop, q); }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('from') from?: string, @Query('to') to?: string) { return this.service.summary(user, shop, { from, to }); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateAlterationDto) { return this.service.update(user, id, dto); }
  @Post(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: AlterationStatusDto) { return this.service.updateStatus(user, id, body.status, body.afterImageUrls, body.paymentMethod, body.paidNow, body.reason); }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: AlterationPaymentDto) { return this.service.recordPayment(user, id, body.amount, body.paymentMethod); }
}
