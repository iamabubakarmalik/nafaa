import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { StationsService } from './stations.service';
import { UpdateStationDto, UpsertStationDto } from './dto/upsert-station.dto';

@ApiTags('Restaurant - Kitchen Stations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/stations')
export class StationsController {
  constructor(private readonly service: StationsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertStationDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser) { return this.service.list(user); }
  /**
   * Categories per station, the ones on no station, and dish counts. With
   * `productIds` (comma separated) also the station each product goes to,
   * so a KOT can be split per station.
   */
  @Get('routing') routing(@GetUser() user: AuthenticatedUser, @Query('productIds') productIds?: string) {
    const ids = (productIds ?? '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 300);
    return this.service.routing(user, ids);
  }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateStationDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
