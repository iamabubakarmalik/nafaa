import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopIdParam, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { OrdersService } from './orders.service';
import { OrderReportsService } from './order-reports.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  AddItemsDto, AddPaymentDto, CheckoutDto, MergeOrderDto, MoveTableDto, OrderPageQueryDto, SplitBillDto, SplitItemsDto,
  UpdateOrderDto, UpdateOrderStatusDto, VoidItemDto,
} from './dto/update-status.dto';

@ApiTags('Restaurant - Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/orders')
export class OrdersController {
  constructor(private readonly service: OrdersService, private readonly reports: OrderReportsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: CreateOrderDto) {
    return this.service.create(user, scope, dto);
  }

  /** `open=true`: every order still on the floor, in the kitchen or with a rider; `saleIds`: the orders behind these bills. */
  @Get() list(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId: string | undefined,
    @Query('status') status?: string, @Query('mode') mode?: string, @Query('tableId') tableId?: string,
    @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string, @Query('saleId') saleId?: string,
    @Query('open') open?: string, @Query('waiterId') waiterId?: string, @Query('saleIds') saleIds?: string) {
    return this.service.list(user, {
      status, mode, tableId, from, to, search, saleId, shopId, open: open === 'true', waiterId,
      saleIds: saleIds ? saleIds.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 200) : undefined,
    });
  }

  /** Orders list with server paging, filters on business days and totals for the whole filter. */
  @Get('page') page(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId: string | undefined, @Query() q: OrderPageQueryDto) {
    return this.reports.page(user, q, shopId);
  }

  /** End of day: open orders, money by order type / waiter / table, voids and rider cash. */
  @Get('day-close') dayClose(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId: string | undefined, @Query('date') date?: string) {
    return this.reports.dayClose(user, date, shopId);
  }

  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId: string | undefined, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(user, { from, to, shopId });
  }

  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.service.update(user, id, dto);
  }

  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.service.updateStatus(user, scope, id, dto);
  }

  /** Records a payment; once the order is fully paid (or closed on khata) it becomes a Sale. */
  @RequirePermissions(PERMISSIONS.RESTAURANT_ORDERS_MANAGE, PERMISSIONS.POS_USE)
  @Post(':id/payments') addPayment(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: AddPaymentDto) {
    return this.service.addPayment(user, scope, id, dto);
  }

  /** Pays the bill in one step (one or several methods, rest on khata) and makes the Sale. */
  @RequirePermissions(PERMISSIONS.RESTAURANT_ORDERS_MANAGE, PERMISSIONS.POS_USE)
  @Post(':id/checkout') checkout(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: CheckoutDto) {
    return this.service.checkout(user, scope, id, dto);
  }

  @Post(':id/items') addItems(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddItemsDto) {
    return this.service.addItems(user, id, dto.items, dto.sendToKitchen);
  }

  @Post(':id/items/:itemId/void') voidItem(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('itemId') itemId: string, @Body() dto: VoidItemDto) {
    return this.service.voidItem(user, id, itemId, dto);
  }

  @Delete(':id/items/:itemId') removeItem(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.service.removeItem(user, id, itemId);
  }

  /** Sends the lines not yet in the kitchen, one ticket per station. */
  @Post(':id/kitchen') sendToKitchen(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.sendToKitchen(user, id);
  }

  /** Pre-bill printed for the table. */
  @Post(':id/bill') printBill(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.printBill(user, id);
  }

  @Post(':id/move') moveTable(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: MoveTableDto) {
    return this.service.moveTable(user, id, dto.tableId);
  }

  @Post(':id/merge') merge(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: MergeOrderDto) {
    return this.service.merge(user, id, dto.fromOrderId);
  }

  @Post(':id/split-items') splitItems(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SplitItemsDto) {
    return this.service.splitItems(user, id, dto);
  }

  @RequirePermissions(PERMISSIONS.RESTAURANT_ORDERS_MANAGE, PERMISSIONS.POS_USE)
  @Post(':id/split-bill') splitBill(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: SplitBillDto) {
    return this.service.splitBill(user, scope, id, dto);
  }
}
