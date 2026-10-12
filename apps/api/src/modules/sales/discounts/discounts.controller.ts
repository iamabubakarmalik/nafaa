import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CreateDiscountDto, UpdateDiscountDto } from './dto/create-discount.dto';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { DiscountsService } from './discounts.service';

@ApiTags('Discount Codes')
@ApiBearerAuth()
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly service: DiscountsService) {}

  /** Codes with uses, sales and discount given, for a period (from/to business days) at the active branch. */
  @Get()
  list(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.list(user, { from, to, shopId: shop.shopId ?? undefined });
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateDiscountDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateDiscountDto) {
    return this.service.update(user, id, dto);
  }

  @Patch(':id/toggle')
  toggle(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.toggle(user, id);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }

  @Get('validate')
  validate(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('code') code: string,
    @Query('amount') amount: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.service.validate(user, code, Number(amount || 0), { shopId: shop.shopId, customerId });
  }
}
