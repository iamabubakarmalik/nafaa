import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { AppointmentsService } from './appointments.service';

/**
 * Appointments follow the route rule for `appointments` (bookings view /
 * manage). Taking a fee is a counter sale, so it needs pos.use; the doctor
 * day close shows money per doctor, so it also needs reports.view.
 */
@ApiTags('Clinic - Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clinic/appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: any) { return this.service.create(user, shop, dto); }

  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: Record<string, string | undefined>) {
    return this.service.list(user, {
      status: q.status, doctorId: q.doctorId, patientId: q.patientId, from: q.from, to: q.to, search: q.search,
      paymentStatus: q.paymentStatus, panelId: q.panelId, page: q.page, limit: q.limit, sort: q.sort,
    });
  }

  @Get('queue') queue(@GetUser() user: AuthenticatedUser, @Query('doctorId') doctorId?: string, @Query('date') date?: string) {
    return this.service.queue(user, doctorId || undefined, date);
  }

  @Get('fee-quote') feeQuote(@GetUser() user: AuthenticatedUser, @Query('doctorId') doctorId: string, @Query('patientId') patientId?: string) {
    return this.service.feeQuote(user, doctorId, patientId || undefined);
  }

  @Get('follow-ups') followUps(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.followUps(user, from, to);
  }

  @Get('day-close')
  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_VIEW, PERMISSIONS.REPORTS_VIEW)
  dayClose(@GetUser() user: AuthenticatedUser, @Query('date') date?: string) { return this.service.dayClose(user, date); }

  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id/status') status(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string; cancellationReason?: string }) {
    return this.service.updateStatus(user, id, body?.status, body?.cancellationReason);
  }

  @Patch(':id/panel') setPanel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { panelId?: string | null }) {
    return this.service.setPanel(user, id, body?.panelId);
  }

  @Post(':id/reschedule') reschedule(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.reschedule(user, id, dto); }

  @Post(':id/payment')
  @RequirePermissions(PERMISSIONS.POS_USE)
  payment(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() body: any) {
    return this.service.addPayment(user, shop, id, body);
  }

  @Post(':id/rating') rate(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { rating: number; feedback?: string }) {
    return this.service.submitRating(user, id, body?.rating, body?.feedback);
  }
}
