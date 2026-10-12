import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CreateExpenseDto, PayExpenseDto, UpdateExpenseDto } from './dto/create-expense.dto';
import { ExpenseFilterDto, ListExpensesDto } from './dto/list-expenses.dto';
import { ExpensesService } from './expenses.service';

/**
 * Expenses. Reading needs `expenses.view`, every write `expenses.create`
 * (see permission-routes). `GET /expenses` and `/expenses/summary` keep their
 * old shapes for the mobile app and the offline cache.
 */
@ApiTags('Expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user, shop, dto);
  }

  @Get()
  findAll(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.expensesService.findAll(user, shop);
  }

  /** A page of the record with totals for the whole filter. */
  @Get('list')
  page(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListExpensesDto) {
    return this.expensesService.page(user, shop, q);
  }

  @Get('overview')
  overview(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('shopId') shopId?: string) {
    return this.expensesService.overview(user, shop, shopId);
  }

  @Get('analytics')
  analytics(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ExpenseFilterDto) {
    return this.expensesService.analytics(user, shop, q);
  }

  /** Bills that come back every month and whether this month's is recorded. */
  @Get('repeating')
  repeating(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('shopId') shopId?: string) {
    return this.expensesService.repeating(user, shop, shopId);
  }

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.expensesService.summary(user, shop);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.expensesService.update(user, shop, id, dto);
  }

  /** Pays a pending bill now. */
  @Post(':id/pay')
  pay(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: PayExpenseDto) {
    return this.expensesService.pay(user, shop, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string) {
    return this.expensesService.remove(user, shop, id);
  }
}
