import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CreateIncomeDto, IncomeCategoryDto, ListIncomeDto, UpdateIncomeDto } from './dto/income.dto';
import { IncomeService } from './income.service';

/** Other income ("Doosri aamdani"). Reading needs `income.view`, every write `income.manage` (permission-routes). */
@ApiTags('Other income')
@ApiBearerAuth()
@Controller('income')
export class IncomeController {
  constructor(private readonly service: IncomeService) {}

  @Get('list')
  page(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListIncomeDto) {
    return this.service.page(user, shop, q);
  }

  @Get('overview')
  overview(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('shopId') shopId?: string) {
    return this.service.overview(user, shop, shopId);
  }

  @Get('categories')
  categories(@GetUser() user: AuthenticatedUser) {
    return this.service.categories(user);
  }

  @Post('categories')
  createCategory(@GetUser() user: AuthenticatedUser, @Body() dto: IncomeCategoryDto) {
    return this.service.createCategory(user, dto);
  }

  @Patch('categories/:id')
  updateCategory(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: IncomeCategoryDto) {
    return this.service.updateCategory(user, id, dto);
  }

  @Delete('categories/:id')
  removeCategory(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.removeCategory(user, id);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateIncomeDto) {
    return this.service.create(user, shop, dto);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: UpdateIncomeDto) {
    return this.service.update(user, shop, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string) {
    return this.service.remove(user, shop, id);
  }
}
