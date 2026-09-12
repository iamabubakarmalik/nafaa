import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchasesService } from './purchases.service';

@ApiTags('Purchases')
@ApiBearerAuth()
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  create(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.purchasesService.create(user, shop, dto);
  }

  @Get()
  findAll(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.purchasesService.findAll(user, shop);
  }

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.purchasesService.summary(user, shop);
  }

  @Get(':id')
  findOne(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Param('id') id: string,
  ) {
    return this.purchasesService.findOne(user, shop, id);
  }
}
