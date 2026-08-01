import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { StationsService } from './stations.service';
import { UpsertStationDto } from './dto/upsert-station.dto';

@ApiTags('Gaming - Stations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gaming/stations')
export class StationsController {
  constructor(private readonly service: StationsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertStationDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('type') type?: string, @Query('active') active?: string, @Query('available') available?: string) {
    return this.service.list(user, {
      type,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      available: available === 'true',
    });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertStationDto) { return this.service.update(user, id, dto); }
  @Post(':id/toggle-maintenance') maintenance(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { notes?: string }) { return this.service.toggleMaintenance(user, id, body.notes); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
