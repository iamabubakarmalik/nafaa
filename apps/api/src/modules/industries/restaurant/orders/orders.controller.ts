import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddPaymentDto, UpdateOrderStatusDto } from './dto/update-status.dto';

@ApiTags('Restaurant - Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) { return this.service.create(user, dto); }

  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('status') status?: string, @Query('mode') mode?: string, @Query('tableId') tableId?: string,
    @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, mode, tableId, from, to, search });
  }

  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(user, { from, to });
  }

  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.service.updateStatus(user, id, dto);
  }

  @Post(':id/payments') addPayment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddPaymentDto) {
    return this.service.addPayment(user, id, dto);
  }

  @Post(':id/items') addItems(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { items: CreateOrderDto['items'] }) {
    return this.service.addItems(user, id, body.items);
  }

  @Delete(':id/items/:itemId') removeItem(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.service.removeItem(user, id, itemId);
  }

  @Post(':id/split-bill') splitBill(@GetUser() user: AuthenticatedUser, @Param('id') id: string,
    @Body() body: { splits: { paidBy: string; amount: number; paymentMethod: string }[] }) {
    return this.service.splitBill(user, id, body.splits);
  }
}
