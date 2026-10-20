import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShoeProductsService } from './products.service';
import { UpsertShoeProductDto, VariantSizesDto } from './dto/upsert-product.dto';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';

@ApiTags('Shoe - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shoe/products')
export class ShoeProductsController {
  constructor(private readonly service: ShoeProductsService) {}
  @Get('meta') meta(@GetUser() u: AuthenticatedUser) { return this.service.meta(u); }
  @Get('reorder') reorder(@GetUser() u: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('limit') limit?: string) { return this.service.reorder(u, shop, { limit }); }
  /** Brand sync touches the shop's brand list, so it needs products.edit. */
  @Post('brands/sync') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT) syncBrands(@GetUser() u: AuthenticatedUser) { return this.service.syncBrands(u); }
  @Get(':productId/size-grid') sizeGrid(@GetUser() u: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('productId') p: string) { return this.service.sizeGrid(u, shop, p); }
  @Post(':productId/variant-sizes') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT) variantSizes(@GetUser() u: AuthenticatedUser, @Param('productId') p: string, @Body() dto: VariantSizesDto) { return this.service.saveVariantSizes(u, p, dto); }
  /** Selling an older size product moves its stock to the sizes once; needed at the counter. */
  @Post(':productId/variant-stock-split') @RequirePermissions(PERMISSIONS.POS_USE) split(@GetUser() u: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('productId') p: string) { return this.service.splitVariantStock(u, p, shop.shopId); }
  @Post() upsert(@GetUser() u: AuthenticatedUser, @Body() dto: UpsertShoeProductDto) { return this.service.upsert(u, dto); }
  @Get() list(
    @GetUser() u: AuthenticatedUser,
    @Query('brandId') brandId?: string,
    @Query('categoryType') categoryType?: string,
    @Query('gender') gender?: string,
    @Query('sizeSystem') sizeSystem?: string,
    @Query('color') color?: string,
    @Query('sport') sport?: string,
    @Query('isWaterproof') isWaterproof?: string,
    @Query('isOrthopedic') isOrthopedic?: string,
    @Query('featured') featured?: string,
    @Query('bestSeller') bestSeller?: string,
    @Query('newArrival') newArrival?: string,
    @Query('trending') trending?: string,
    @Query('bridal') bridal?: string,
    @Query('eidSpecial') eidSpecial?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(u, {
      brandId, categoryType, gender, sizeSystem, color, sport, search,
      isWaterproof: isWaterproof === 'true' ? true : undefined,
      isOrthopedic: isOrthopedic === 'true' ? true : undefined,
      featured: featured === 'true' ? true : undefined,
      bestSeller: bestSeller === 'true' ? true : undefined,
      newArrival: newArrival === 'true' ? true : undefined,
      trending: trending === 'true' ? true : undefined,
      bridal: bridal === 'true' ? true : undefined,
      eidSpecial: eidSpecial === 'true' ? true : undefined,
    });
  }
  @Get('by-category-count') byCat(@GetUser() u: AuthenticatedUser) { return this.service.byCategory(u); }
  @Get('by-gender-count') byGender(@GetUser() u: AuthenticatedUser) { return this.service.byGender(u); }
  @Get('by-product/:productId') byProd(@GetUser() u: AuthenticatedUser, @Param('productId') p: string) { return this.service.byProduct(u, p); }
  @Get(':id') getOne(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(u, id); }
  @Delete(':id') remove(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(u, id); }
}
