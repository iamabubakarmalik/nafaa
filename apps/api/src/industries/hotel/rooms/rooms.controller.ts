import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { requireAny } from '../common/hotel-common';
import { CreateRoomDto, RoomHousekeepingDto, RoomStatusDto, UpdateRoomDto } from '../common/hotel.dto';
import { RoomsService } from './rooms.service';

const READ = [PERMISSIONS.SERVICE_BOOKINGS_VIEW, PERMISSIONS.PRODUCTS_VIEW];

/**
 * Rooms are the hotel's catalog: products permissions set them up. The desk
 * (bookings manage) changes a room's status and cleaning state.
 */
@ApiTags('Hotel - Rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel/rooms')
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  @RequirePermissions(PERMISSIONS.PRODUCTS_CREATE)
  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateRoomDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: Record<string, string | undefined>) {
    requireAny(user, READ, 'Rooms dekhne');
    return this.service.list(user, { status: q.status, roomTypeId: q.roomTypeId, housekeepingStatus: q.housekeepingStatus, floor: q.floor, search: q.search, includeInactive: q.includeInactive === 'true' });
  }
  @Get('board') board(@GetUser() user: AuthenticatedUser) { requireAny(user, READ, 'Rooms dekhne'); return this.service.board(user); }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { requireAny(user, READ, 'Rooms dekhne'); return this.service.summary(user); }
  @Get('availability') availability(@GetUser() user: AuthenticatedUser, @Query() q: Record<string, string | undefined>) {
    requireAny(user, READ, 'Rooms dekhne');
    return this.service.checkAvailability(user, {
      checkInDate: q.checkInDate ?? '', checkOutDate: q.checkOutDate ?? '', roomTypeId: q.roomTypeId, exceptBookingId: q.exceptBookingId,
      adults: q.adults ? Number(q.adults) : undefined, children: q.children ? Number(q.children) : undefined,
    });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { requireAny(user, READ, 'Rooms dekhne'); return this.service.getOne(user, id); }
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateRoomDto) { return this.service.update(user, id, dto); }
  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_MANAGE)
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: RoomStatusDto) {
    return this.service.updateStatus(user, id, body.status, body.notes);
  }
  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_MANAGE)
  @Patch(':id/housekeeping') updateHousekeeping(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: RoomHousekeepingDto) {
    return this.service.updateHousekeeping(user, id, body.housekeepingStatus);
  }
  @RequirePermissions(PERMISSIONS.PRODUCTS_DELETE)
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
