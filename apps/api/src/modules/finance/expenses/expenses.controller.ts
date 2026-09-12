import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/create-expense.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('Expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.create(user, shop, dto);
  }

  @Get()
  findAll(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.expensesService.findAll(user, shop);
  }

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.expensesService.summary(user, shop);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(user, id, dto);
  }

  @Delete(':id')
  remove(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Param('id') id: string,
  ) {
    return this.expensesService.remove(user, shop, id);
  }
}
