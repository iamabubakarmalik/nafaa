import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AppointmentsService } from './appointments.service';

@ApiTags('Clinic - Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clinic/appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('doctorId') doctorId?: string, @Query('patientId') patientId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, doctorId, patientId, from, to, search });
  }
  @Get('queue') queue(@GetUser() user: AuthenticatedUser, @Query('doctorId') doctorId: string, @Query('date') date: string) {
    return this.service.queue(user, doctorId, date);
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id/status') status(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string; cancellationReason?: string }) {
    return this.service.updateStatus(user, id, body.status, body.cancellationReason);
  }
  @Post(':id/reschedule') reschedule(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.reschedule(user, id, dto); }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { amount: number }) { return this.service.addPayment(user, id, body.amount); }
  @Post(':id/rating') rate(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { rating: number; feedback?: string }) { return this.service.submitRating(user, id, body.rating, body.feedback); }
}
