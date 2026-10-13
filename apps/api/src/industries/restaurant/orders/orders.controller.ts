import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopIdParam, ShopScope } from '../../../common/shop-scope';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddItemsDto, AddPaymentDto, SplitBillDto, UpdateOrderStatusDto } from './dto/update-status.dto';

@ApiTags('Restaurant - Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: CreateOrderDto) {
    return this.service.create(user, scope, dto);
  }

  @Get() list(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId: string | undefined,
    @Query('status') status?: string, @Query('mode') mode?: string, @Query('tableId') tableId?: string,
    @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string, @Query('saleId') saleId?: string) {
    return this.service.list(user, { status, mode, tableId, from, to, search, saleId, shopId });
  }

  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(user, { from, to });
  }

  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.service.updateStatus(user, scope, id, dto);
  }

  /** Records a payment; once the order is fully paid (or closed on khata) it becomes a Sale. */
  @Post(':id/payments') addPayment(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: AddPaymentDto) {
    return this.service.addPayment(user, scope, id, dto);
  }

  @Post(':id/items') addItems(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddItemsDto) {
    return this.service.addItems(user, id, dto.items);
  }

  @Delete(':id/items/:itemId') removeItem(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.service.removeItem(user, id, itemId);
  }

  @Post(':id/split-bill') splitBill(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: SplitBillDto) {
    return this.service.splitBill(user, scope, id, dto);
  }
}
