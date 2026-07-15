import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { VehicleModelsService } from './vehicle-models.service';
import { UpsertVehicleModelDto } from './dto/upsert-vehicle-model.dto';

@ApiTags('Auto Parts - Vehicle Models')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('autoparts/vehicle-models')
export class VehicleModelsController {
  constructor(private readonly service: VehicleModelsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertVehicleModelDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('makeId') makeId?: string, @Query('vehicleType') vehicleType?: string, @Query('search') search?: string, @Query('active') active?: string) {
    return this.service.list(user, { makeId, vehicleType, search, active: active === 'true' ? true : active === 'false' ? false : undefined });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertVehicleModelDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
