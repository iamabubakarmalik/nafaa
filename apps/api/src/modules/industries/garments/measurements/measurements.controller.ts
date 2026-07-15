import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { MeasurementsService } from './measurements.service';
import { UpsertMeasurementDto } from './dto/upsert-measurement.dto';

@ApiTags('Garments - Measurements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('garments/measurements')
export class MeasurementsController {
  constructor(private readonly service: MeasurementsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertMeasurementDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('gender') gender?: string, @Query('search') search?: string) { return this.service.listAll(user, { gender, search }); }
  @Get('by-customer/:customerId') byCustomer(@GetUser() user: AuthenticatedUser, @Param('customerId') customerId: string) { return this.service.listByCustomer(user, customerId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertMeasurementDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
