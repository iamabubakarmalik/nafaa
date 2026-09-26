import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopIdParam, ShopScope } from '../../../common/shop-scope';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SalesService } from './sales.service';

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Body() dto: CreateSaleDto,
  ) {
    return this.salesService.create(user, shop, dto);
  }

  @Get()
  findAll(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @ShopIdParam() shopId?: string,
  ) {
    return this.salesService.findAll(user, shop, shopId);
  }

  @Get('summary')
  summary(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @ShopIdParam() shopId?: string,
  ) {
    return this.salesService.summary(user, shop, shopId);
  }

  /**
   * Is customer ke paas pehle kaun kaun maal lene aaya tha.
   *
   * POS me naam type karte waqt suggestion ke liye — har dafa poora naam
   * likhna aur har dafa alag hijje karna (Bilal / bilal / Balal) record
   * ko be-kaar kar deta hai.
   *
   * `:id` wale route se PEHLE — warna Nest "receivers" ko sale ka id
   * samajh kar findOne chala deta hai.
   */
  @Get('receivers')
  receivers(
    @GetUser() user: AuthenticatedUser,
    @Query('customerId') customerId: string,
  ) {
    return this.salesService.recentReceivers(user, customerId);
  }

  @Get(':id')
  findOne(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Param('id') id: string,
  ) {
    return this.salesService.findOne(user, shop, id);
  }

  @Post(':id/void')
  voidSale(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.salesService.voidSale(user, shop, id, body?.reason);
  }

  
}

