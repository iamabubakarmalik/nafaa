import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CollectionsService } from './collections.service';
import { CollectionProductsDto, CollectionSaleDto, CollectionSalePercentDto, UpsertCollectionDto } from './dto/upsert-collection.dto';

@ApiTags('Garments - Collections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('garments/collections')
export class CollectionsController {
  constructor(private readonly service: CollectionsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertCollectionDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('season') season?: string, @Query('active') active?: string, @Query('featured') featured?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      season,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      featured: featured === 'true' ? true : undefined,
      search,
    });
  }
  /** Stock and sales per collection for the branch being viewed. */
  @Get('stats') stats(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('days') days?: string) { return this.service.stats(user, shop, Number(days) || 30); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertCollectionDto) { return this.service.update(user, id, dto); }
  @Post(':id/toggle-featured') toggle(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.toggleFeatured(user, id); }
  /** Percent off every price of the collection; null ends the sale and puts the regular prices back. */
  @Post(':id/sale') sale(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: CollectionSalePercentDto) { return this.service.setSale(user, id, body.percent ?? null); }
  @Post(':id/on-sale') onSale(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: CollectionSaleDto) { return this.service.setOnSale(user, id, body.onSale); }
  @Post(':id/products') addProducts(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: CollectionProductsDto) { return this.service.addProducts(user, id, body.productIds); }
  @Post(':id/products/remove') removeProducts(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: CollectionProductsDto) { return this.service.removeProducts(user, id, body.productIds); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
