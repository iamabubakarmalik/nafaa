import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CakeOrdersService, type CakeOrderQuery } from './cake-orders.service';
import {
  CakeOrderAssignDto, CakeOrderPaymentDto, CakeOrderRatingDto, CreateCakeOrderDto, UpdateCakeOrderDto, UpdateCakeOrderStatusDto,
} from './dto/create-cake-order.dto';

@ApiTags('Bakery - Cake Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bakery/cake-orders')
export class CakeOrdersController {
  constructor(private readonly service: CakeOrdersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateCakeOrderDto) { return this.service.create(user, shop, dto); }

  @Get() list(
    @GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope,
    @Query('status') status?: string, @Query('occasion') occasion?: string, @Query('deliveryType') deliveryType?: string,
    @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string, @Query('customerId') customerId?: string,
    @Query('open') open?: string,
  ) {
    return this.service.list(user, shop, { status, occasion, deliveryType, from, to, search, customerId, open });
  }

  /** Paged record for one view (active, today, late…) with the counts of all views. */
  @Get('page') page(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: Record<string, string>) {
    return this.service.page(user, shop, q as CakeOrderQuery);
  }

  /** Open-order numbers and analytics for a period of due dates (`from`/`to` business days). */
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(user, shop, from, to);
  }

  @Get('upcoming') upcoming(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('days') days?: string) { return this.service.upcoming(user, shop, days ? Number(days) : 7); }
  @Get('calendar') calendar(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('from') from: string, @Query('to') to: string) { return this.service.calendar(user, shop, from, to); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  /** The bill made at delivery, or null. */
  @Get(':id/bill') bill(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.bill(user, id); }

  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCakeOrderDto) { return this.service.update(user, id, dto); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCakeOrderStatusDto) { return this.service.updateStatus(user, id, dto); }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: CakeOrderPaymentDto) { return this.service.addPayment(user, id, body.amount, body.expectedPaid, body.method, body.withBill); }
  @Post(':id/assign') assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: CakeOrderAssignDto) { return this.service.assignBaker(user, id, body.bakerId, body.decoratorId); }
  @Post(':id/rating') rate(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: CakeOrderRatingDto) { return this.service.addRating(user, id, body.rating, body.feedback, body.photoUrls); }
}
