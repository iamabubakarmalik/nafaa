import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import {
  AddLandedCostsDto, CancelPurchaseDto, CreatePurchaseDto, ListPurchasesDto, ReceivePurchaseDto, ReturnPurchaseDto,
} from './dto/create-purchase.dto';
import { PurchasesService } from './purchases.service';
import { PurchaseAnalyticsService } from './purchase-analytics.service';

@ApiTags('Purchases')
@ApiBearerAuth()
@Controller('purchases')
export class PurchasesController {
  constructor(
    private readonly purchasesService: PurchasesService,
    private readonly analyticsService: PurchaseAnalyticsService,
  ) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreatePurchaseDto) {
    return this.purchasesService.create(user, shop, dto);
  }

  /** Plain list for older screens. */
  @Get()
  findAll(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.purchasesService.findAll(user, shop);
  }

  /** Filtered, paged list with totals. */
  @Get('list')
  list(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListPurchasesDto) {
    return this.purchasesService.list(user, shop, q);
  }

  @Get('analytics')
  analytics(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.analytics(user, shop, from, to);
  }

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.purchasesService.summary(user, shop);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string) {
    return this.purchasesService.findOne(user, shop, id);
  }

  @Post(':id/receive')
  receive(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: ReceivePurchaseDto) {
    return this.purchasesService.receive(user, shop, id, dto);
  }

  @Post(':id/return')
  returnGoods(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: ReturnPurchaseDto) {
    return this.purchasesService.returnGoods(user, shop, id, dto);
  }

  /** Freight, customs, clearing, transport: spread over the lines into stock cost (purchases.create). */
  @Post(':id/landed-costs')
  addLandedCosts(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: AddLandedCostsDto) {
    return this.purchasesService.addLandedCosts(user, shop, id, dto);
  }

  @Delete(':id/landed-costs/:costId')
  removeLandedCost(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Param('costId') costId: string) {
    return this.purchasesService.removeLandedCost(user, shop, id, costId);
  }

  @Post(':id/cancel')
  cancel(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: CancelPurchaseDto) {
    return this.purchasesService.cancel(user, shop, id, dto);
  }
}
