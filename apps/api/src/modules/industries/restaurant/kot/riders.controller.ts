import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { RidersService } from './riders.service';
import { UpsertRiderDto } from './dto/upsert-rider.dto';

@ApiTags('Restaurant - Riders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/riders')
export class RidersController {
  constructor(private readonly service: RidersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertRiderDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('active') active?: string) {
    return this.service.list(user, { status, active: active === 'true' ? true : active === 'false' ? false : undefined });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertRiderDto) { return this.service.update(user, id, dto); }
  @Post(':id/location') updateLocation(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { lat: number; lng: number }) {
    return this.service.updateLocation(user, id, body.lat, body.lng);
  }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
