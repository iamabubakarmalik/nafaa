import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { requireAny } from '../common/hotel-common';
import { RoomTypesService } from './room-types.service';
import { CreateRoomTypeDto, UpdateRoomTypeDto } from './dto/upsert-room-type.dto';

/** Room types are the hotel's catalog: products permissions; the desk reads them to book. */
const READ = [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.SERVICE_BOOKINGS_VIEW];

@ApiTags('Hotel - Room Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel/room-types')
export class RoomTypesController {
  constructor(private readonly service: RoomTypesService) {}

  @RequirePermissions(PERMISSIONS.PRODUCTS_CREATE)
  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateRoomTypeDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('type') type?: string, @Query('active') active?: string, @Query('search') search?: string) {
    requireAny(user, READ, 'Room types dekhne');
    return this.service.list(user, { type, search, active: active === 'true' ? true : active === 'false' ? false : undefined });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { requireAny(user, READ, 'Room types dekhne'); return this.service.getOne(user, id); }
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateRoomTypeDto) { return this.service.update(user, id, dto); }
  @RequirePermissions(PERMISSIONS.PRODUCTS_DELETE)
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
