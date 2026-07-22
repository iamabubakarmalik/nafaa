import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { VehicleMakesService } from './vehicle-makes.service';
import { UpsertVehicleMakeDto } from './dto/upsert-vehicle-make.dto';

@ApiTags('Auto Parts - Vehicle Makes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('autoparts/vehicle-makes')
export class VehicleMakesController {
  constructor(private readonly service: VehicleMakesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertVehicleMakeDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('search') search?: string, @Query('active') active?: string) {
    return this.service.list(user, { search, active: active === 'true' ? true : active === 'false' ? false : undefined });
  }
  @Post('seed-pakistani') seed(@GetUser() user: AuthenticatedUser) { return this.service.seedPakistaniMakes(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertVehicleMakeDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
