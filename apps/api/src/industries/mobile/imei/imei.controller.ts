import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ImeiStatus, PtaStatus } from '@prisma/client';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CreateImeiDto } from './dto/create-imei.dto';
import { BulkCreateImeiDto } from './dto/bulk-create-imei.dto';
import { UpdateImeiDto } from './dto/update-imei.dto';
import { ImeiService, type ImeiSort } from './imei.service';
import { ShopIdParam } from '../../../common/shop-scope';

/*
 * Routes under `industries/` are open in the route map, so the rights are
 * set here: reading needs mobile.imei.view, changing stock mobile.imei.manage.
 */
@ApiTags('IMEI Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.MOBILE_IMEI_VIEW)
@Controller('industries/mobile/imei')
export class ImeiController {
  constructor(private readonly service: ImeiService) {}

  @Get()
  listAll(
    @GetUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('status') status?: ImeiStatus,
    @Query('ptaStatus') ptaStatus?: PtaStatus,
    @Query('productId') productId?: string,
    @Query('variantId') variantId?: string,
    @ShopIdParam() shopId?: string,
    @Query('agedDays') agedDays?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sort') sort?: ImeiSort,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listAll(user, {
      search,
      status: status && Object.values(ImeiStatus).includes(status) ? status : undefined,
      ptaStatus: ptaStatus && Object.values(PtaStatus).includes(ptaStatus) ? ptaStatus : undefined,
      productId,
      variantId,
      shopId,
      agedDays: agedDays ? Number(agedDays) || undefined : undefined,
      from,
      to,
      sort,
      page: page ? Number(page) || 1 : 1,
      limit: limit ? Number(limit) || 100 : 100,
    });
  }

  @Get('stats')
  stats(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId?: string) {
    return this.service.stats(user, shopId);
  }

  /** IMEIs, used phones, trade-ins and EMI plans of up to 200 bills (`ids` comma separated). */
  @Get('for-sales')
  forSales(@GetUser() user: AuthenticatedUser, @Query('ids') ids?: string) {
    return this.service.forSales(user, (ids ?? '').split(',').map((x) => x.trim()));
  }

  /** Phones on the shelf per product next to the branch stock. */
  @Get('shelf-counts')
  shelfCounts(@GetUser() user: AuthenticatedUser, @ShopIdParam() shopId?: string) {
    return this.service.shelfCounts(user, shopId);
  }

  /** Everything known about one IMEI: stock, bill, warranty, buy-backs and repairs. */
  @Get('lookup')
  lookup(@GetUser() user: AuthenticatedUser, @Query('code') code: string) {
    return this.service.lookup(user, code ?? '');
  }

  @Post('recalc-stocks')
  @RequirePermissions(PERMISSIONS.MOBILE_IMEI_MANAGE)
  recalcStocks(@GetUser() user: AuthenticatedUser) {
    return this.service.recalcAllStocks(user);
  }

  @Get('search')
  search(
    @GetUser() user: AuthenticatedUser,
    @Query('q') q: string,
    @Query('status') status?: ImeiStatus,
  ) {
    return this.service.search(user, q ?? '', status);
  }

  @Get('product/:productId')
  listByProduct(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Query('status') status?: ImeiStatus,
  ) {
    return this.service.listByProduct(user, productId, status);
  }

  @Get('product/:productId/available')
  available(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Query('variantId') variantId?: string,
    @ShopIdParam() shopId?: string,
  ) {
    return this.service.availableForSale(user, productId, variantId, shopId);
  }

  @Get('variant/:variantId')
  listByVariant(
    @GetUser() user: AuthenticatedUser,
    @Param('variantId') variantId: string,
    @Query('status') status?: ImeiStatus,
  ) {
    return this.service.listByVariant(user, variantId, status);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MOBILE_IMEI_MANAGE)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateImeiDto) {
    return this.service.create(user, dto);
  }

  @Post('bulk')
  @RequirePermissions(PERMISSIONS.MOBILE_IMEI_MANAGE)
  bulkCreate(@GetUser() user: AuthenticatedUser, @Body() dto: BulkCreateImeiDto) {
    return this.service.bulkCreate(user, dto);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.MOBILE_IMEI_MANAGE)
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateImeiDto,
  ) {
    return this.service.update(user, id, body);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.MOBILE_IMEI_MANAGE)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
