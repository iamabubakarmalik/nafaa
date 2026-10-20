import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShoeExchangesService } from './exchanges.service';
import { CreateExchangeDto, UpdateExchangeStatusDto } from './dto/create-exchange.dto';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';

@ApiTags('Shoe - Exchanges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
/**
 * Older size-exchange requests. New exchanges run from the bill (return +
 * new bill); these records stay readable and can still be closed.
 */
@RequirePermissions(PERMISSIONS.RETURNS_CREATE)
@Controller('shoe/exchanges')
export class ShoeExchangesController {
  constructor(private readonly service: ShoeExchangesService) {}
  @Post() create(@GetUser() u: AuthenticatedUser, @Body() dto: CreateExchangeDto) { return this.service.create(u, dto); }
  @RequirePermissions(PERMISSIONS.RETURNS_VIEW)
  @Get() list(
    @GetUser() u: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('reasonCategory') reasonCategory?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) { return this.service.list(u, { status, reasonCategory, from, to, search }); }
  @RequirePermissions(PERMISSIONS.RETURNS_VIEW)
  @Get('summary') summary(@GetUser() u: AuthenticatedUser, @CurrentShop() shop: ShopScope) { return this.service.summary(u, shop); }
  @RequirePermissions(PERMISSIONS.RETURNS_VIEW)
  @Get('by-reason-category') byReason(@GetUser() u: AuthenticatedUser) { return this.service.byReasonCategory(u); }
  @RequirePermissions(PERMISSIONS.RETURNS_VIEW)
  @Get(':id') getOne(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(u, id); }
  @Patch(':id/status') status(@GetUser() u: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: UpdateExchangeStatusDto) {
    return this.service.updateStatus(u, id, dto, shop.shopId);
  }
  @Delete(':id') remove(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(u, id); }
}
