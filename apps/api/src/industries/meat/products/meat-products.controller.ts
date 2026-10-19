import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS as P } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { MeatProductsService } from './meat-products.service';
import { UpsertMeatProductDto } from './dto/upsert-meat-product.dto';

@ApiTags('Meat - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meat/products')
export class MeatProductsController {
  constructor(private readonly service: MeatProductsService) {}

  @Post() @RequirePermissions(P.PRODUCTS_EDIT) upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertMeatProductDto) { return this.service.upsert(user, dto); }
  @Get() @RequirePermissions(P.PRODUCTS_VIEW) list(@GetUser() user: AuthenticatedUser, @Query('animalType') animalType?: string, @Query('cutCategory') cutCategory?: string, @Query('freshnessType') freshnessType?: string, @Query('featured') featured?: string, @Query('popular') popular?: string, @Query('onSale') onSale?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      animalType, cutCategory, freshnessType, search,
      featured: featured === 'true' ? true : undefined,
      popular: popular === 'true' ? true : undefined,
      onSale: onSale === 'true' ? true : undefined,
    });
  }
  /** Stock in, sold, cut, wasted and left per meat item for one shop day. */
  @Get('day-sheet') @RequirePermissions(P.STOCK_MOVEMENTS_VIEW)
  daySheet(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query('date') date?: string) { return this.service.daySheet(user, scope, date); }
  @Get('by-product/:productId') @RequirePermissions(P.PRODUCTS_VIEW) byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @Get(':id') @RequirePermissions(P.PRODUCTS_VIEW) getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  /** Removes the meat details only; the product, its stock and bills stay. */
  @Delete(':id') @RequirePermissions(P.PRODUCTS_EDIT) remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
