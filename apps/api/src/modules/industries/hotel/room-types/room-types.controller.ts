import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { RoomTypesService } from './room-types.service';
import { UpsertRoomTypeDto } from './dto/upsert-room-type.dto';

@ApiTags('Hotel - Room Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel/room-types')
export class RoomTypesController {
  constructor(private readonly service: RoomTypesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertRoomTypeDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('type') type?: string, @Query('active') active?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      type, search,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertRoomTypeDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
