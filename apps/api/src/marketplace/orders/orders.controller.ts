import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { GetCustomer } from '../_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../auth/interfaces/customer-jwt.interface';
import { MarketplaceOrdersService } from './orders.service';
import { ListOrdersDto } from './dto/list-orders.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { RateOrderDto } from './dto/rate-order.dto';

@ApiTags('Marketplace / Orders')
@Controller('marketplace/orders')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class MarketplaceOrdersController {
  constructor(private readonly svc: MarketplaceOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders with filters, status counts' })
  list(@GetCustomer() c: AuthenticatedCustomer, @Query() dto: ListOrdersDto) {
    return this.svc.listOrders(c.id, dto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Currently active orders (for home banner)' })
  active(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.getActiveOrders(c.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Order statistics for profile screen' })
  stats(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.getCustomerStats(c.id);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Full order detail' })
  detail(@GetCustomer() c: AuthenticatedCustomer, @Param('orderId') orderId: string) {
    return this.svc.getOrderDetail(c.id, orderId);
  }

  @Get(':orderId/track')
  @ApiOperation({ summary: 'Live tracking with status timeline' })
  track(@GetCustomer() c: AuthenticatedCustomer, @Param('orderId') orderId: string) {
    return this.svc.trackOrder(c.id, orderId);
  }

  @Post(':orderId/cancel')
  @ApiOperation({ summary: 'Cancel order (only PENDING/CONFIRMED)' })
  cancel(
    @GetCustomer() c: AuthenticatedCustomer,
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.svc.cancelOrder(c.id, orderId, dto);
  }

  @Post(':orderId/reorder')
  @ApiOperation({ summary: 'Copy order items into cart at current prices' })
  reorder(@GetCustomer() c: AuthenticatedCustomer, @Param('orderId') orderId: string) {
    return this.svc.reorder(c.id, orderId);
  }

  @Post(':orderId/rate')
  @ApiOperation({ summary: 'Rate a delivered order (shop + rider + quality)' })
  rate(
    @GetCustomer() c: AuthenticatedCustomer,
    @Param('orderId') orderId: string,
    @Body() dto: RateOrderDto,
  ) {
    return this.svc.rateOrder(c.id, orderId, dto);
  }
}
