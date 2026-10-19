import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { GiftVouchersService } from './gift-vouchers.service';
import { SellVoucherDto, VoucherListQuery } from './dto/gift-voucher.dto';

@ApiTags('Salon - Gift vouchers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('salon/gift-vouchers')
export class GiftVouchersController {
  constructor(private readonly service: GiftVouchersService) {}

  @Post() sell(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: SellVoucherDto) {
    return this.service.sell(user, { ...dto, shopId: dto.shopId ?? shop.shopId ?? undefined });
  }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: VoucherListQuery) { return this.service.list(user, q); }
  /** Balance of a code for the counter, or why it cannot be used. */
  @Get('lookup') lookup(@GetUser() user: AuthenticatedUser, @Query('code') code: string) { return this.service.lookup(user, code); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/cancel') cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.cancel(user, id); }
}
