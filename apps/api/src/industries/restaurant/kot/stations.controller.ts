import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { StationsService } from './stations.service';
import { UpsertStationDto } from './dto/upsert-station.dto';

@ApiTags('Restaurant - Kitchen Stations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/stations')
export class StationsController {
  constructor(private readonly service: StationsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertStationDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser) { return this.service.list(user); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertStationDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
