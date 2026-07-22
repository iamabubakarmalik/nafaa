import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { BookingsService } from './bookings.service';

@ApiTags('Hotel - Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel/bookings')
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.list(user, {
      status: q.status, source: q.source, guestId: q.guestId,
      from: q.from, to: q.to, search: q.search,
      upcomingOnly: q.upcomingOnly === 'true',
    });
  }
  @Get('arrivals/today') arrivals(@GetUser() user: AuthenticatedUser) { return this.service.arrivalsToday(user); }
  @Get('departures/today') departures(@GetUser() user: AuthenticatedUser) { return this.service.departuresToday(user); }
  @Get('in-house') inHouse(@GetUser() user: AuthenticatedUser) { return this.service.inHouseGuests(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string; reason?: string }) {
    return this.service.updateStatus(user, id, body.status, body.reason);
  }
  @Post(':id/check-in') checkIn(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.checkIn(user, id); }
  @Post(':id/check-out') checkOut(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.checkOut(user, id); }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { amount: number }) {
    return this.service.addPayment(user, id, body.amount);
  }
  @Post(':id/extend') extend(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { newCheckOutDate: string }) {
    return this.service.extendStay(user, id, body.newCheckOutDate);
  }
}
