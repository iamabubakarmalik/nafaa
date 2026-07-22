import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { GetCustomer } from '../_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../auth/interfaces/customer-jwt.interface';
import { MarketplaceWishlistService } from './wishlist.service';
import { AddWishlistDto } from './dto/add-wishlist.dto';
import { ListWishlistDto } from './dto/list-wishlist.dto';

@ApiTags('Marketplace / Wishlist')
@Controller('marketplace/wishlist')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class MarketplaceWishlistController {
  constructor(private readonly svc: MarketplaceWishlistService) {}

  @Get()
  @ApiOperation({ summary: 'List wishlist items with sort & filter' })
  list(@GetCustomer() c: AuthenticatedCustomer, @Query() dto: ListWishlistDto) {
    return this.svc.list(c.id, dto);
  }

  @Get('count')
  @ApiOperation({ summary: 'Wishlist count for badge' })
  count(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.getCount(c.id);
  }

  @Post('check-batch')
  @ApiOperation({ summary: 'Batch check which productIds are in wishlist' })
  check(@GetCustomer() c: AuthenticatedCustomer, @Body() body: { productIds: string[] }) {
    return this.svc.checkBatch(c.id, body.productIds ?? []);
  }

  @Post()
  @ApiOperation({ summary: 'Add product to wishlist' })
  add(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: AddWishlistDto) {
    return this.svc.add(c.id, dto);
  }

  @Post(':productId/toggle')
  @ApiOperation({ summary: 'Toggle wishlist state (add/remove)' })
  toggle(@GetCustomer() c: AuthenticatedCustomer, @Param('productId') productId: string) {
    return this.svc.toggle(c.id, productId);
  }

  @Post(':productId/move-to-cart')
  @ApiOperation({ summary: 'Move a wishlist item into cart' })
  moveToCart(
    @GetCustomer() c: AuthenticatedCustomer,
    @Param('productId') productId: string,
    @Body() body: { quantity?: number },
  ) {
    return this.svc.moveToCart(c.id, productId, body?.quantity ?? 1);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  remove(@GetCustomer() c: AuthenticatedCustomer, @Param('productId') productId: string) {
    return this.svc.remove(c.id, productId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear entire wishlist' })
  clear(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.clearAll(c.id);
  }
}
