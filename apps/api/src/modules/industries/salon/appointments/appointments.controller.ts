import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@ApiTags('Industry: Salon - Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('industries/salon/appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Get('stats')
  stats(@GetUser() user: AuthenticatedUser) { return this.service.stats(user); }

  @Get('today')
  today(@GetUser() user: AuthenticatedUser) { return this.service.today(user); }

  @Get()
  list(
    @GetUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: AppointmentStatus,
    @Query('staffId') staffId?: string,
  ) {
    return this.service.list(user, { from, to, status, staffId });
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateAppointmentDto) {
    return this.service.create(user, dto);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: Partial<CreateAppointmentDto>) {
    return this.service.update(user, id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { status: AppointmentStatus },
  ) {
    return this.service.updateStatus(user, id, body.status);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
