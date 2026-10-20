import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { OpeningStockDto } from '../common/opening-stock.helper';
import { ToyProductsService } from './products.service';
import { UpsertToyProductDto } from './dto/upsert-toy-product.dto';

const bool = (v?: string) => (v === 'true' ? true : v === 'false' ? false : undefined);

@ApiTags('Toy Store - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('toystore/products')
export class ToyProductsController {
  constructor(private readonly service: ToyProductsService) {}

  /** First stock of new variants (sizes/colours), booked as opening stock. */
  @Post(':productId/opening-stock')
  openingStock(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('productId') productId: string, @Body() dto: OpeningStockDto) {
    return this.service.openingStock(user, productId, dto, shop.shopId);
  }

  /** Moves units of an older variant product from the product row to its variants, when exact. */
  @Post(':productId/variant-stock-split')
  splitVariantStock(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('productId') productId: string) {
    return this.service.splitVariantStock(user, productId, shop.shopId);
  }

  /** Gift wrapping charge (a service line at the counter). */
  @Get('gift-wrap') giftWrap(@GetUser() user: AuthenticatedUser) { return this.service.giftWrap(user); }
  @Post('gift-wrap') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  setGiftWrap(@GetUser() user: AuthenticatedUser, @Body() body: { price?: number; name?: string }) { return this.service.setGiftWrap(user, body); }

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertToyProductDto) { return this.service.upsert(user, dto); }

  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('categoryType') categoryType?: string,
    @Query('ageGroup') ageGroup?: string,
    @Query('genderTarget') genderTarget?: string,
    @Query('brand') brand?: string,
    @Query('franchise') franchise?: string,
    @Query('educational') educational?: string,
    @Query('rc') rc?: string,
    @Query('requiresBatteries') requiresBatteries?: string,
    @Query('montessori') montessori?: string,
    @Query('collectible') collectible?: string,
    @Query('multiplayer') multiplayer?: string,
    @Query('noChokingHazard') noChokingHazard?: string,
    @Query('featured') featured?: string,
    @Query('bestSeller') bestSeller?: string,
    @Query('newArrival') newArrival?: string,
    @Query('trending') trending?: string,
    @Query('birthdayGift') birthdayGift?: string,
    @Query('eidGift') eidGift?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      categoryType, ageGroup, genderTarget, brand, franchise, search,
      educational: bool(educational), rc: bool(rc), requiresBatteries: bool(requiresBatteries),
      montessori: bool(montessori), collectible: bool(collectible), multiplayer: bool(multiplayer),
      noChokingHazard: noChokingHazard === 'true',
      featured: bool(featured), bestSeller: bool(bestSeller),
      newArrival: bool(newArrival), trending: bool(trending),
      birthdayGift: bool(birthdayGift), eidGift: bool(eidGift),
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  }

  @Get('for-age') forAge(@GetUser() user: AuthenticatedUser,
    @Query('years') years: string,
    @Query('gender') gender?: string,
    @Query('maxBudget') maxBudget?: string,
    @Query('educationalOnly') educationalOnly?: string,
    @Query('safeOnly') safeOnly?: string,
  ) {
    return this.service.forAge(user, {
      years: Number(years),
      gender,
      maxBudget: maxBudget ? Number(maxBudget) : undefined,
      educationalOnly: educationalOnly === 'true',
      safeOnly: safeOnly !== 'false',
    });
  }

  @Get('facts') facts(@GetUser() user: AuthenticatedUser) { return this.service.facts(user); }
  @Get('safety-review') safety(@GetUser() user: AuthenticatedUser) { return this.service.safetyReview(user); }
  @Get('battery-upsell') battery(@GetUser() user: AuthenticatedUser) { return this.service.batteryUpsell(user); }
  @Get('counts') counts(@GetUser() user: AuthenticatedUser) { return this.service.counts(user); }
  @Get('brands') brands(@GetUser() user: AuthenticatedUser) { return this.service.brands(user); }
  @Get('by-product/:productId') byProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) { return this.service.byProduct(user, productId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
