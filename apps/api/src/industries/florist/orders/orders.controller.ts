import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { FloristOrdersService } from './orders.service';
import { CreateFloristOrderDto, DeliveryConfirmDto, OrderFromSaleDto, UpdateFloristOrderDto, UpdateOrderStatusDto } from './dto/create-order.dto';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';

@ApiTags('Florist - Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
// Delivery orders are counter work: made from a bill, moved to delivered by counter staff.
@RequirePermissions(PERMISSIONS.POS_USE)
@Controller('florist/orders')
export class FloristOrdersController {
  constructor(private readonly service: FloristOrdersService) {}

  /** Delivery order for a counter bill (the POS calls this after the sale). */
  @Post('from-sale')
  fromSale(@GetUser() u: AuthenticatedUser, @Body() dto: OrderFromSaleDto) { return this.service.fromSale(u, dto); }
  @Get('paged') paged(
    @GetUser() u: AuthenticatedUser,
    @Query('orderType') orderType?: string,
    @Query('status') status?: string,
    @Query('scheduledDate') scheduledDate?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) { return this.service.paged(u, { orderType, status, scheduledDate, from, to, search, page: Number(page) || 1, limit: Number(limit) || 25 }); }
  @Get('analytics') analytics(@GetUser() u: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) { return this.service.analytics(u, { from, to }); }
  @Post() create(@GetUser() u: AuthenticatedUser, @Body() dto: CreateFloristOrderDto) { return this.service.create(u, dto); }
  @Get() list(
    @GetUser() u: AuthenticatedUser,
    @Query('orderType') orderType?: string,
    @Query('status') status?: string,
    @Query('scheduledDate') scheduledDate?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('bills') bills?: string,
  ) { return this.service.list(u, { orderType, status, scheduledDate, from, to, search, bills }); }
  @Get('summary') summary(@GetUser() u: AuthenticatedUser) { return this.service.summary(u); }
  @Get('today-deliveries') today(@GetUser() u: AuthenticatedUser) { return this.service.todayDeliveries(u); }
  @Get('by-time-slot') slots(@GetUser() u: AuthenticatedUser, @Query('date') date: string) { return this.service.byTimeSlot(u, date); }
  @Get(':id') getOne(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(u, id); }
  @Patch(':id') update(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateFloristOrderDto) { return this.service.update(u, id, dto); }
  @Patch(':id/status') status(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) { return this.service.updateStatus(u, id, dto); }
  @Post(':id/confirm-delivery') confirm(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() dto: DeliveryConfirmDto) { return this.service.confirmDelivery(u, id, dto); }
  @Delete(':id') remove(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(u, id); }
}
