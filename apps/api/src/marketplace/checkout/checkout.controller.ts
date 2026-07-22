import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { GetCustomer } from '../_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../auth/interfaces/customer-jwt.interface';
import { MarketplaceCheckoutService } from './checkout.service';
import { PreviewCheckoutDto } from './dto/preview-checkout.dto';
import { PlaceOrderDto } from './dto/place-order.dto';

@ApiTags('Marketplace / Checkout')
@Controller('marketplace/checkout')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class MarketplaceCheckoutController {
  constructor(private readonly svc: MarketplaceCheckoutService) {}

  @Post('preview')
  @ApiOperation({ summary: 'Preview checkout — totals, discounts, wallet, loyalty' })
  preview(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: PreviewCheckoutDto) {
    return this.svc.preview(c.id, dto);
  }

  @Post('place-order')
  @ApiOperation({ summary: 'Place order (splits into one order per shop)' })
  place(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: PlaceOrderDto) {
    return this.svc.placeOrder(c.id, dto);
  }

  @Get('delivery-slots')
  @ApiOperation({ summary: 'Available delivery time slots' })
  slots(@Query('shopId') shopId?: string) {
    return this.svc.getDeliverySlots(shopId);
  }
}
