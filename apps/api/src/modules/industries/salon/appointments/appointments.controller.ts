import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { AppointmentsService } from './appointments.service';
import { AddPaymentDto, CreateAppointmentDto, RescheduleDto, UpdateAppointmentStatusDto } from './dto/create-appointment.dto';

@ApiTags('Salon - Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('salon/appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateAppointmentDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('staffProfileId') staffProfileId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, customerId, staffProfileId, from, to, search });
  }
  @Get('calendar') calendar(@GetUser() user: AuthenticatedUser, @Query('from') from: string, @Query('to') to: string, @Query('staffProfileId') staffProfileId?: string) {
    return this.service.calendar(user, { from, to, staffProfileId });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateAppointmentStatusDto) { return this.service.updateStatus(user, id, dto); }
  @Post(':id/reschedule') reschedule(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RescheduleDto) { return this.service.reschedule(user, id, dto); }
  @Post(':id/payments') addPayment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddPaymentDto) { return this.service.addPayment(user, id, dto); }
  @Post(':id/rating') rate(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { rating: number; feedback?: string }) { return this.service.submitRating(user, id, body.rating, body.feedback); }
}
