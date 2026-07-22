import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CustomerVehiclesService } from './customer-vehicles.service';
import { UpsertCustomerVehicleDto } from './dto/upsert-customer-vehicle.dto';

@ApiTags('Auto Parts - Customer Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('autoparts/customer-vehicles')
export class CustomerVehiclesController {
  constructor(private readonly service: CustomerVehiclesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertCustomerVehicleDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('customerId') customerId?: string, @Query('makeId') makeId?: string, @Query('vehicleType') vehicleType?: string, @Query('search') search?: string, @Query('active') active?: string) {
    return this.service.list(user, { customerId, makeId, vehicleType, search, active: active === 'true' ? true : active === 'false' ? false : undefined });
  }
  @Get('expiring-documents') expiring(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.service.expiringDocuments(user, days ? parseInt(days) : 30);
  }
  @Get('by-customer/:customerId') byCustomer(@GetUser() user: AuthenticatedUser, @Param('customerId') customerId: string) { return this.service.byCustomer(user, customerId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertCustomerVehicleDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
