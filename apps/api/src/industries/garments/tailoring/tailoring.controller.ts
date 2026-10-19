import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { TailoringQuery, TailoringService } from './tailoring.service';
import { AddPaymentDto, CreateTailoringOrderDto, UpdateOrderStatusDto, UpdateTailoringOrderDto } from './dto/create-tailoring-order.dto';

@ApiTags('Garments - Tailoring Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('garments/tailoring')
export class TailoringController {
  constructor(private readonly service: TailoringService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateTailoringOrderDto) { return this.service.create(user, dto, shop.shopId); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('priority') priority?: string, @Query('customerId') customerId?: string, @Query('tailorId') tailorId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, priority, customerId, tailorId, from, to, search });
  }
  /** One page of a view (active, today, late, trial, ready, unpaid, done, all) with counts. */
  @Get('page') page(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: TailoringQuery) { return this.service.page(user, shop, q); }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('from') from?: string, @Query('to') to?: string) { return this.service.summary(user, shop, { from, to }); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateTailoringOrderDto) { return this.service.update(user, id, dto); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) { return this.service.updateStatus(user, id, dto); }
  @Post(':id/payments') addPayment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddPaymentDto) { return this.service.addPayment(user, id, dto); }
}
