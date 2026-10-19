import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import {
  BookingPaymentDto, CancelBookingDto, ChangeRoomDto, CheckInGuestDto, CheckOutDto, CreateBookingDto, ExtendDto, RefundAdvanceDto, UpdateBookingDto,
} from '../common/hotel.dto';
import { BookingsService } from './bookings.service';

/**
 * Reads need bookings view and changes bookings manage (route rules).
 * Taking money and making the bill are counter work (POS); an advance
 * refund is a refund, so it also needs the returns permission.
 */
@ApiTags('Hotel - Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel/bookings')
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateBookingDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: Record<string, string | undefined>) {
    return this.service.list(user, {
      status: q.status, source: q.source, guestId: q.guestId, from: q.from, to: q.to, search: q.search, saleId: q.saleId,
      upcomingOnly: q.upcomingOnly === 'true',
    });
  }
  @Get('page') page(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query() q: Record<string, string | undefined>) {
    return this.service.page(user, scope, q);
  }
  @Get('quote') quote(@GetUser() user: AuthenticatedUser, @Query() q: Record<string, string | undefined>) { return this.service.quote(user, q); }
  @Get('arrivals/today') arrivals(@GetUser() user: AuthenticatedUser) { return this.service.arrivalsToday(user); }
  @Get('departures/today') departures(@GetUser() user: AuthenticatedUser) { return this.service.departuresToday(user); }
  @Get('in-house') inHouse(@GetUser() user: AuthenticatedUser) { return this.service.inHouseGuests(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateBookingDto) { return this.service.update(user, id, dto); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string; reason?: string }) {
    return this.service.updateStatus(user, id, String(body?.status ?? ''), body?.reason);
  }
  @Post(':id/check-in') checkIn(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CheckInGuestDto) { return this.service.checkIn(user, id, dto ?? {}); }
  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post(':id/check-out') checkOut(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CheckOutDto) { return this.service.checkOut(user, id, dto ?? {}); }
  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: BookingPaymentDto) { return this.service.addPayment(user, id, dto); }
  @Post(':id/extend') extend(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ExtendDto) { return this.service.extendStay(user, id, dto.newCheckOutDate); }
  @Post(':id/change-room') changeRoom(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ChangeRoomDto) { return this.service.changeRoom(user, id, dto); }
  @Post(':id/cancel') cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CancelBookingDto) { return this.service.cancel(user, id, dto); }
  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_MANAGE, PERMISSIONS.RETURNS_CREATE)
  @Post(':id/refund') refund(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RefundAdvanceDto) { return this.service.refund(user, id, dto ?? {}); }
}
