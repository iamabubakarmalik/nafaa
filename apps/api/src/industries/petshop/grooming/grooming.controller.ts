import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { GroomingService } from './grooming.service';
import {
  CheckInDto, CompleteGroomingDto, CreateGroomingAppointmentDto,
  GroomingPaymentDto, PickupGroomingDto, RateGroomingDto, UpdateGroomingAppointmentDto, UpdateGroomingStatusDto,
} from './dto/create-appointment.dto';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';

@ApiTags('Pet Shop - Grooming')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
// Appointments are counter work: booking, taking advances and the pickup bill.
@RequirePermissions(PERMISSIONS.POS_USE)
@Controller('petshop/grooming')
export class GroomingController {
  constructor(private readonly service: GroomingService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateGroomingAppointmentDto) { return this.service.create(user, dto); }

  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('groomerId') groomerId?: string,
    @Query('species') species?: string,
    @Query('today') today?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, { status, customerId, groomerId, species, from, to, search, today: today === 'true' });
  }

  @Get('paged') paged(@GetUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('groomerId') groomerId?: string,
    @Query('species') species?: string,
    @Query('today') today?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.paged(user, { status, groomerId, species, from, to, search, today: today === 'true', page: Number(page) || 1, limit: Number(limit) || 25 });
  }
  @Get('analytics') analytics(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) { return this.service.analytics(user, { from, to }); }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get('today') today(@GetUser() user: AuthenticatedUser) { return this.service.todaySchedule(user); }
  @Get('available-slots') slots(@GetUser() user: AuthenticatedUser, @Query('groomerId') groomerId: string, @Query('date') date: string) {
    return this.service.availableSlots(user, groomerId, date);
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Post(':id/assign-groomer') assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { groomerId: string }) {
    return this.service.assignGroomer(user, id, body.groomerId);
  }
  @Post(':id/check-in') checkIn(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CheckInDto) { return this.service.checkIn(user, id, dto); }
  @Post(':id/start') start(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.start(user, id); }
  @Post(':id/complete') complete(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CompleteGroomingDto) { return this.service.complete(user, id, dto); }
  /** Makes the bill; money at the counter. */
  @Post(':id/pickup') pickup(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: PickupGroomingDto) {
    return this.service.pickup(user, scope, id, dto ?? {});
  }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: GroomingPaymentDto) {
    return this.service.recordPayment(user, scope, id, dto);
  }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateGroomingAppointmentDto) { return this.service.update(user, id, dto); }
  @Post(':id/rate') rate(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RateGroomingDto) { return this.service.rate(user, id, dto); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateGroomingStatusDto) { return this.service.updateStatus(user, id, dto); }
  /** Cancels the appointment; nothing is deleted. */
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
