import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { ClassesService } from './classes.service';

@ApiTags('Gym - Classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/classes')
export class ClassesController {
  constructor(private readonly service: ClassesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('classType') classType?: string, @Query('status') status?: string, @Query('trainerId') trainerId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.list(user, { classType, status, trainerId, from, to });
  }
  @Get('calendar') calendar(@GetUser() user: AuthenticatedUser, @Query('from') from: string, @Query('to') to: string) { return this.service.calendar(user, from, to); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Post(':id/status') status(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string; cancelledReason?: string }) { return this.service.updateStatus(user, id, body.status, body.cancelledReason); }
  @Post(':id/book') book(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { memberId: string }) { return this.service.book(user, id, body.memberId); }
  @Post('bookings/:bookingId/cancel') cancelBooking(@GetUser() user: AuthenticatedUser, @Param('bookingId') bookingId: string, @Body() body: { reason?: string }) { return this.service.cancelBooking(user, bookingId, body.reason); }
  @Post('bookings/:bookingId/checkin') checkIn(@GetUser() user: AuthenticatedUser, @Param('bookingId') bookingId: string) { return this.service.checkIn(user, bookingId); }
}
