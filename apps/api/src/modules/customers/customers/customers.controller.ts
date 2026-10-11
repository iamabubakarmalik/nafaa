import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CustomersService } from './customers.service';
import { CustomerDirectoryService, type DirectoryQuery } from './customer-directory.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly directory: CustomerDirectoryService,
  ) {}

  @Post()
  create(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.create(user, shop, dto);
  }

  @Get()
  findAll(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query() query: QueryCustomersDto,
  ) {
    return this.customersService.findAll(user, shop, query);
  }

  @Get('stats')
  stats(@GetUser() user: AuthenticatedUser) {
    return this.customersService.stats(user);
  }

  /** Whole-list search, filters, sort, totals and credit ageing for the customers and khata pages. */
  @Get('directory')
  directoryList(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query() query: DirectoryQuery,
  ) {
    return this.directory.list(user, shop, query);
  }

  /** Spend by month, favourite products, visit rhythm and credit age for one customer. */
  @Get(':id/insights')
  insights(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Param('id') id: string,
  ) {
    return this.directory.insights(user, shop, id);
  }

  @Get(':id')
  findOne(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Param('id') id: string,
  ) {
    return this.customersService.findOne(user, shop, id);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(user, id, dto);
  }

  @Patch(':id/toggle-vip')
  toggleVip(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.customersService.toggleVip(user, id);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.customersService.remove(user, id);
  }

  @Get(':id/mobile-history')
  getMobileHistory(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.customersService.getMobileHistory(user, id);
  }

}
