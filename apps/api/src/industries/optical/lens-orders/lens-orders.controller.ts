import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { LensOrdersService } from './lens-orders.service';
import { CreateLensOrderDto, DeliverLensOrderDto, LensOrderPaymentDto, SendToLabDto, UpdateLensOrderStatusDto } from './dto/create-lens-order.dto';

/**
 * Glasses and repair orders. Booking, payments and hand-over take money at
 * the counter (pos.use); lab tracking changes no money.
 */
@ApiTags('Optical - Lens Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('optical/lens-orders')
export class LensOrdersController {
  constructor(private readonly service: LensOrdersService) {}

  @Post() @RequirePermissions(PERMISSIONS.POS_USE)
  create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateLensOrderDto) { return this.service.create(user, shop, dto); }

  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('labName') labName?: string,
    @Query('pendingPayment') pendingPayment?: string,
    @Query('overdue') overdue?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      status, customerId, labName, from, to, search,
      pendingPayment: pendingPayment === 'true',
      overdue: overdue === 'true',
    });
  }

  @Get('page') page(@GetUser() user: AuthenticatedUser, @Query() q: { view?: string; page?: string; limit?: string; search?: string; from?: string; to?: string; customerId?: string }) {
    return this.service.page(user, q);
  }

  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get('lab-performance') labs(@GetUser() user: AuthenticatedUser) { return this.service.labPerformance(user); }
  /** Sale id → order, for bills in the sales history. */
  @Get('by-sales') @RequirePermissions(PERMISSIONS.SALES_VIEW)
  bySales(@GetUser() user: AuthenticatedUser, @Query('ids') ids = '') { return this.service.forSales(user, ids.split(',').filter(Boolean)); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.service.getOne(user, id); }

  @Post(':id/send-to-lab') sendToLab(@GetUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: SendToLabDto) {
    return this.service.sendToLab(user, id, body);
  }
  /** Cancelling can give the advance back, so status changes are counter work. */
  @Patch(':id/status') @RequirePermissions(PERMISSIONS.POS_USE)
  updateStatus(@GetUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLensOrderStatusDto) {
    return this.service.updateStatus(user, id, dto);
  }
  @Post(':id/payment') @RequirePermissions(PERMISSIONS.POS_USE)
  payment(@GetUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: LensOrderPaymentDto) {
    return this.service.recordPayment(user, id, dto);
  }
  @Post(':id/deliver') @RequirePermissions(PERMISSIONS.POS_USE)
  deliver(@GetUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: DeliverLensOrderDto) {
    return this.service.deliver(user, id, body);
  }
  /** Kept for old callers: cancels an order with no money on it. */
  @Delete(':id') @RequirePermissions(PERMISSIONS.POS_USE)
  remove(@GetUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.service.remove(user, id); }
}
