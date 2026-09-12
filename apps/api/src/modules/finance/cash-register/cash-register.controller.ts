import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CashRegisterService } from './cash-register.service';
import { OpenRegisterDto } from './dto/open-register.dto';
import { CloseRegisterDto } from './dto/close-register.dto';
import { CashTransactionDto } from './dto/cash-transaction.dto';

/**
 * A till belongs to one counter in one branch. Every endpoint here is narrowed
 * to the branch being viewed — previously the scope was never passed through,
 * so an owner with two shops saw whichever register happened to be open first.
 */
@ApiTags('Cash Register')
@ApiBearerAuth()
@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly service: CashRegisterService) {}

  @Get('current')
  current(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.service.getCurrent(user, shop);
  }

  @Post('open')
  open(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Body() dto: OpenRegisterDto,
  ) {
    return this.service.open(user, shop, dto);
  }

  @Post('transaction')
  transaction(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Body() dto: CashTransactionDto,
  ) {
    return this.service.addTransaction(user, shop, dto);
  }

  @Post('close')
  close(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Body() dto: CloseRegisterDto,
  ) {
    return this.service.close(user, shop, dto);
  }

  @Get('history')
  history(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.service.history(user, shop);
  }
}
