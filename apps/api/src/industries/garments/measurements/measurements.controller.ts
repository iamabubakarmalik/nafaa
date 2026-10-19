import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { MeasurementsService } from './measurements.service';
import { UpsertMeasurementDto } from './dto/upsert-measurement.dto';

@ApiTags('Garments - Measurements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('garments/measurements')
export class MeasurementsController {
  constructor(private readonly service: MeasurementsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertMeasurementDto) { return this.service.create(user, dto); }
  /** With `page`, a paged answer with stats; without it, a plain list. */
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('gender') gender?: string, @Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.listAll(user, { gender, search, page, limit });
  }
  @Get('by-customer/:customerId') byCustomer(@GetUser() user: AuthenticatedUser, @Param('customerId') customerId: string) { return this.service.listByCustomer(user, customerId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertMeasurementDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
