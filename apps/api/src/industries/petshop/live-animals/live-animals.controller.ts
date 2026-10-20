import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { LiveAnimalsService } from './live-animals.service';
import { AddMedicalRecordDto, SellAnimalDto, UpdateAnimalStatusDto, UpsertLiveAnimalDto } from './dto/upsert-live-animal.dto';

const bool = (v?: string) => (v === 'true' ? true : v === 'false' ? false : undefined);

@ApiTags('Pet Shop - Live Animals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('petshop/live-animals')
export class LiveAnimalsController {
  constructor(private readonly service: LiveAnimalsService) {}

  @Post() @RequirePermissions(PERMISSIONS.PRODUCTS_CREATE) create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertLiveAnimalDto) { return this.service.create(user, dto); }

  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('species') species?: string,
    @Query('status') status?: string,
    @Query('breed') breed?: string,
    @Query('featured') featured?: string,
    @Query('vaccinated') vaccinated?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      species, status, breed, search,
      featured: bool(featured), vaccinated: bool(vaccinated),
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  }

  @Get('paged') paged(@GetUser() user: AuthenticatedUser,
    @Query('species') species?: string,
    @Query('status') status?: string,
    @Query('vaccinated') vaccinated?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.paged(user, { species, status, search, vaccinated: bool(vaccinated), page: Number(page) || 1, limit: Number(limit) || 24 });
  }
  @Get('analytics') analytics(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) { return this.service.analytics(user, { from, to }); }
  /** Marks every animal on a counter bill sold (the POS calls this after the sale). */
  @Post('from-sale/:saleId') @RequirePermissions(PERMISSIONS.POS_USE)
  fromSale(@GetUser() user: AuthenticatedUser, @Param('saleId', new ParseUUIDPipe()) saleId: string) { return this.service.fromSale(user, saleId); }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get('long-stay') longStay(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.service.longStay(user, days ? Number(days) : 60);
  }
  @Get('health-alerts') health(@GetUser() user: AuthenticatedUser) { return this.service.healthAlerts(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT) update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertLiveAnimalDto) { return this.service.update(user, id, dto); }
  @Post(':id/reserve') @RequirePermissions(PERMISSIONS.POS_USE) reserve(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { customerName?: string }) {
    return this.service.reserve(user, id, body?.customerName);
  }
  @Post(':id/unreserve') @RequirePermissions(PERMISSIONS.POS_USE) unreserve(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.unreserve(user, id); }
  @Post(':id/counter-item') @RequirePermissions(PERMISSIONS.POS_USE) counterItem(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string) {
    return this.service.counterItem(user, scope, id);
  }
  @Post(':id/sell') @RequirePermissions(PERMISSIONS.POS_USE) sell(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: SellAnimalDto) {
    return this.service.sell(user, scope, id, dto);
  }
  @Post(':id/medical-record') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT) medical(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: AddMedicalRecordDto) {
    return this.service.addMedicalRecord(user, scope, id, dto);
  }
  @Patch(':id/status') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT) updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateAnimalStatusDto) {
    return this.service.updateStatus(user, id, dto);
  }
  /** Marks the animal gone back (wapas); nothing is deleted. */
  @Delete(':id') @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT) remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
