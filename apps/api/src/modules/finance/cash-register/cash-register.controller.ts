import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CashRegisterService } from './cash-register.service';
import { CashRegisterReportService } from './cash-register-report.service';
import { OpenRegisterDto } from './dto/open-register.dto';
import { CloseRegisterDto } from './dto/close-register.dto';
import { CashTransactionDto } from './dto/cash-transaction.dto';
import { ListShiftsDto } from './dto/list-shifts.dto';

/**
 * A till belongs to one counter in one branch. Reads and writes are narrowed
 * to the branch in view; writes may name the exact register.
 */
@ApiTags('Cash Register')
@ApiBearerAuth()
@Controller('cash-register')
export class CashRegisterController {
  constructor(
    private readonly service: CashRegisterService,
    private readonly reports: CashRegisterReportService,
  ) {}

  @Get('current')
  current(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.service.getCurrent(user, shop);
  }

  /** Every open register in scope with its live count. */
  @Get('live')
  live(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.service.listOpen(user, shop);
  }

  /** Warns before a cash payout that would take the drawer below zero. */
  @Get('payout-check')
  payoutCheck(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('amount') amount?: string,
    @Query('registerId') registerId?: string,
  ) {
    return this.service.payoutCheck(user, shop, Number(amount) || 0, registerId || undefined);
  }

  @Post('open')
  open(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: OpenRegisterDto) {
    return this.service.open(user, shop, dto);
  }

  @Post('transaction')
  transaction(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CashTransactionDto) {
    return this.service.addTransaction(user, shop, dto);
  }

  @Post('close')
  @RequirePermissions(PERMISSIONS.CASH_REGISTER_CLOSE)
  close(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CloseRegisterDto) {
    return this.service.close(user, shop, dto);
  }

  @Get('history')
  history(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.service.history(user, shop);
  }

  @Get('shifts')
  shifts(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListShiftsDto) {
    return this.reports.shifts(user, shop, q);
  }

  @Get('shifts/:id')
  shift(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string) {
    return this.reports.shift(user, shop, id);
  }

  @Get('analytics')
  analytics(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListShiftsDto) {
    return this.reports.analytics(user, shop, q);
  }
}
