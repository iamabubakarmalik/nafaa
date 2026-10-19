import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { ExchangeService } from './exchange.service';
import { ExchangeDto } from './dto/exchange.dto';

/** Under `garments/returns` so the returns permissions apply (view / create). */
@ApiTags('Garments - Exchange')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('garments/returns/exchange')
export class ExchangeController {
  constructor(private readonly service: ExchangeService) {}

  /** Lines of the bill that can come back, the days since the bill and the shop's exchange window. */
  @Get(':saleId') preview(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('saleId') saleId: string) {
    return this.service.preview(user, shop, saleId);
  }

  /** Return from the old bill and the new bill in one step; the return pays toward the new bill. */
  @Post() exchange(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: ExchangeDto) {
    return this.service.exchange(user, shop, dto);
  }
}
