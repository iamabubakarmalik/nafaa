import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { MoneyService } from './money.service';
import { MoneyLedgerDto, MoneyPeriodDto } from './dto/money-query.dto';

/**
 * Shop accounts. Reading needs `reports.view` (see permission-routes); cash
 * put into or taken out of the drawer goes through the cash register API.
 */
@ApiTags('Shop accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance/money')
export class MoneyController {
  constructor(private readonly service: MoneyService) {}

  @Get('position')
  @ApiOperation({ summary: 'Cash, stock, customer credit and supplier dues right now' })
  position(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.service.position(user, shop);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'In, out and net per account for a period and for today' })
  accounts(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: MoneyPeriodDto) {
    return this.service.accounts(user, shop, q);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Every money movement in a period, newest first' })
  ledger(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: MoneyLedgerDto) {
    return this.service.ledger(user, shop, q);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'In and out by day, source and account' })
  analytics(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: MoneyPeriodDto) {
    return this.service.analytics(user, shop, q);
  }
}
