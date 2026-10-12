import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { MoneyAccountsService } from './money-accounts.service';
import {
  AccountEntryDto, CreateMoneyAccountDto, DrawerMoveDto, ListMoneyAccountsDto, StatementDto, TransferDto, UpdateMoneyAccountDto,
} from './dto/money-account.dto';

/**
 * Money accounts (safe, bank, wallet) and the movements between them.
 *
 * Reading: `reports.view`, from the `money` route rule.
 * Setting up accounts: `settings.edit` (shop setup, like the receipt's pay accounts).
 * Moving money: `expenses.create`, the existing write rule of this page.
 * Moves that touch the drawer also need `cash_register.open`, the same as a
 * manual cash in/out on the cash register.
 */
@ApiTags('Shop accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance/money')
export class MoneyAccountsController {
  constructor(private readonly service: MoneyAccountsService) {}

  @Get('money-accounts')
  @ApiOperation({ summary: 'Safe, bank and wallet accounts with live balances' })
  list(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListMoneyAccountsDto) {
    return this.service.list(user, shop, q);
  }

  @Get('money-accounts/:id/statement')
  @ApiOperation({ summary: 'Opening, every line with running balance, closing' })
  statement(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query() q: StatementDto) {
    return this.service.statement(user, id, q);
  }

  @Post('money-accounts')
  @RequirePermissions(PERMISSIONS.SETTINGS_EDIT)
  @ApiOperation({ summary: 'Create an account' })
  create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateMoneyAccountDto) {
    return this.service.create(user, shop, dto);
  }

  @Post('money-accounts/import-receipt')
  @RequirePermissions(PERMISSIONS.SETTINGS_EDIT)
  @ApiOperation({ summary: 'Create accounts from the pay-to accounts in Settings → Receipt' })
  importFromReceipt(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.service.importFromReceipt(user, shop);
  }

  @Patch('money-accounts/:id')
  @RequirePermissions(PERMISSIONS.SETTINGS_EDIT)
  @ApiOperation({ summary: 'Edit or reactivate an account' })
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateMoneyAccountDto) {
    return this.service.update(user, id, dto);
  }

  @Delete('money-accounts/:id')
  @RequirePermissions(PERMISSIONS.SETTINGS_EDIT)
  @ApiOperation({ summary: 'Remove an unused account, or turn off an empty one' })
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }

  @Post('transfer')
  @RequirePermissions(PERMISSIONS.EXPENSES_CREATE)
  @ApiOperation({ summary: 'Move money from one account to another' })
  transfer(@GetUser() user: AuthenticatedUser, @Body() dto: TransferDto) {
    return this.service.transfer(user, dto);
  }

  @Post('drawer-to-account')
  @RequirePermissions(PERMISSIONS.EXPENSES_CREATE, PERMISSIONS.CASH_REGISTER_OPEN)
  @ApiOperation({ summary: 'Cash from the open drawer into an account' })
  drawerToAccount(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: DrawerMoveDto) {
    return this.service.drawerToAccount(user, shop, dto);
  }

  @Post('account-to-drawer')
  @RequirePermissions(PERMISSIONS.EXPENSES_CREATE, PERMISSIONS.CASH_REGISTER_OPEN)
  @ApiOperation({ summary: 'Cash from an account into the open drawer' })
  accountToDrawer(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: DrawerMoveDto) {
    return this.service.accountToDrawer(user, shop, dto);
  }

  @Post('entry')
  @RequirePermissions(PERMISSIONS.EXPENSES_CREATE)
  @ApiOperation({ summary: 'Deposit, withdraw or adjust an account' })
  entry(@GetUser() user: AuthenticatedUser, @Body() dto: AccountEntryDto) {
    return this.service.entry(user, dto);
  }
}
