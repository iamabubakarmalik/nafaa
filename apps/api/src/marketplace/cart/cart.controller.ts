import {
  Body, Controller, Delete, Get, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { GetCustomer } from '../_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../auth/interfaces/customer-jwt.interface';
import { MarketplaceCartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateLineDto } from './dto/update-line.dto';

@ApiTags('Marketplace / Cart')
@Controller('marketplace/cart')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class MarketplaceCartController {
  constructor(private readonly svc: MarketplaceCartService) {}

  @Get()
  @ApiOperation({ summary: 'Get cart grouped by shop with totals & validation' })
  get(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.getCart(c.id);
  }

  @Get('count')
  @ApiOperation({ summary: 'Total item count for cart badge' })
  count(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.getCartCount(c.id);
  }

  @Post('add')
  @ApiOperation({ summary: 'Add product / variant / bargain / group-buy to cart' })
  add(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: AddToCartDto) {
    return this.svc.addToCart(c.id, dto);
  }

  @Patch('lines/:lineId')
  @ApiOperation({ summary: 'Update line quantity / notes / modifiers' })
  update(
    @GetCustomer() c: AuthenticatedCustomer,
    @Param('lineId') lineId: string,
    @Body() dto: UpdateLineDto,
  ) {
    return this.svc.updateLine(c.id, lineId, dto);
  }

  @Delete('lines/:lineId')
  @ApiOperation({ summary: 'Remove line from cart' })
  remove(@GetCustomer() c: AuthenticatedCustomer, @Param('lineId') lineId: string) {
    return this.svc.removeLine(c.id, lineId);
  }

  @Post('lines/:lineId/move-to-wishlist')
  @ApiOperation({ summary: 'Move a cart line to wishlist' })
  moveToWishlist(
    @GetCustomer() c: AuthenticatedCustomer,
    @Param('lineId') lineId: string,
  ) {
    return this.svc.moveLineToWishlist(c.id, lineId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear entire cart' })
  clear(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.clearCart(c.id);
  }

  @Delete('shop/:shopId')
  @ApiOperation({ summary: 'Clear all items belonging to a specific shop' })
  clearShop(@GetCustomer() c: AuthenticatedCustomer, @Param('shopId') shopId: string) {
    return this.svc.clearShopGroup(c.id, shopId);
  }
}
