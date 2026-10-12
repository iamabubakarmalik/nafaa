import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CreateReturnDto } from './dto/create-return.dto';
import { ListReturnsDto } from './dto/list-returns.dto';
import { ReturnsRecordsService } from './returns-records.service';
import { ReturnsService } from './returns.service';

@ApiTags('Sales Returns')
@ApiBearerAuth()
@Controller('returns')
export class ReturnsController {
  constructor(
    private readonly service: ReturnsService,
    private readonly records: ReturnsRecordsService,
  ) {}

  /** Latest 50 returns (mobile app). */
  @Get()
  list(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.service.list(user, shop);
  }

  /** Filtered, paged returns with totals for the whole filter. Before `:id`. */
  @Get('records')
  recordList(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListReturnsDto) {
    return this.records.records(user, shop, q);
  }

  @Get('analytics')
  analytics(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ListReturnsDto) {
    return this.records.analytics(user, shop, q);
  }

  /** Bills to start a return from: bill number, customer, phone or IMEI/serial. */
  @Get('find-bill')
  findBill(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('q') q?: string) {
    return this.records.findBills(user, shop, q);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string) {
    return this.service.findOne(user, shop, id);
  }

  @Post()
  create(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Body() dto: CreateReturnDto,
  ) {
    return this.service.create(user, shop, dto);
  }
}
