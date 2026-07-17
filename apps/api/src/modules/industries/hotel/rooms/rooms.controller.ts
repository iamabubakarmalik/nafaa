import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { RoomsService } from './rooms.service';

@ApiTags('Hotel - Rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel/rooms')
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.list(user, { status: q.status, roomTypeId: q.roomTypeId, housekeepingStatus: q.housekeepingStatus, floor: q.floor, search: q.search });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get('availability') availability(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.checkAvailability(user, {
      checkInDate: q.checkInDate, checkOutDate: q.checkOutDate,
      roomTypeId: q.roomTypeId,
      adults: q.adults ? Number(q.adults) : undefined,
      children: q.children ? Number(q.children) : undefined,
    });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string; notes?: string }) {
    return this.service.updateStatus(user, id, body.status, body.notes);
  }
  @Patch(':id/housekeeping') updateHousekeeping(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { housekeepingStatus: string }) {
    return this.service.updateHousekeeping(user, id, body.housekeepingStatus);
  }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
