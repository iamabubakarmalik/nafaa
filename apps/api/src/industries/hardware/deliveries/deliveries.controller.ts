import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { DeliveriesService } from './deliveries.service';
import { ConfirmDeliveryDto, CreateDeliveryDto, UpdateDeliveryStatusDto } from './dto/create-delivery.dto';

/**
 * Delivery challans. Reading them is sales work (sales.view); making and
 * moving them is counter work (pos.use). They never move stock or money.
 */
@ApiTags('Hardware - Deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hardware/deliveries')
export class DeliveriesController {
  constructor(private readonly service: DeliveriesService) {}

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateDeliveryDto) { return this.service.create(user, shop, dto); }

  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  @Get() list(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('status') status?: string, @Query('projectId') projectId?: string, @Query('customerId') customerId?: string, @Query('vehicleType') vehicleType?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, shop, { status, projectId, customerId, vehicleType, from, to, search });
  }

  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  @Get('page') page(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('tab') tab?: string, @Query('search') search?: string, @Query('from') from?: string, @Query('to') to?: string,
    @Query('saleId') saleId?: string, @Query('projectId') projectId?: string, @Query('customerId') customerId?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.page(user, shop, { tab, search, from, to, saleId, projectId, customerId, page: Number(page) || 1, limit: Number(limit) || 25 });
  }

  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) { return this.service.summary(user, shop); }

  /** Bill lines with what is still to send, for a new challan. */
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  @Get('sale/:saleId') billLines(@GetUser() user: AuthenticatedUser, @Param('saleId') saleId: string) { return this.service.billLines(user.tenantId, saleId); }

  /** Challan marks for a page of bills (`ids` comma separated). */
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  @Get('for-sales') forSales(@GetUser() user: AuthenticatedUser, @Query('ids') ids?: string) { return this.service.forSales(user, (ids ?? '').split(',')); }

  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateDeliveryStatusDto) { return this.service.updateStatus(user, id, dto); }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post(':id/assign-vehicle') assignVehicle(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: Record<string, string>) { return this.service.assignVehicle(user, id, dto); }

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post(':id/confirm') confirmDelivery(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ConfirmDeliveryDto) { return this.service.confirmDelivery(user, id, dto); }

  /** Cancels the challan; the record stays. */
  @RequirePermissions(PERMISSIONS.POS_USE)
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('reason') reason?: string) { return this.service.remove(user, id, reason); }
}
