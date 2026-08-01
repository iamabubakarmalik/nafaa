import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { GroomingService } from './grooming.service';
import {
  CheckInDto, CompleteGroomingDto, CreateGroomingAppointmentDto,
  GroomingPaymentDto, RateGroomingDto, UpdateGroomingStatusDto,
} from './dto/create-appointment.dto';

@ApiTags('Pet Shop - Grooming')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
  @Post(':id/pickup') pickup(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.pickup(user, id); }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: GroomingPaymentDto) { return this.service.recordPayment(user, id, dto); }
  @Post(':id/rate') rate(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RateGroomingDto) { return this.service.rate(user, id, dto); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateGroomingStatusDto) { return this.service.updateStatus(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
