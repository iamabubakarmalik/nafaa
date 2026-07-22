import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { DeliveriesService } from './deliveries.service';
import { ConfirmDeliveryDto, CreateDeliveryDto, UpdateDeliveryStatusDto } from './dto/create-delivery.dto';

@ApiTags('Hardware - Deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hardware/deliveries')
export class DeliveriesController {
  constructor(private readonly service: DeliveriesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateDeliveryDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('projectId') projectId?: string, @Query('customerId') customerId?: string, @Query('vehicleType') vehicleType?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, projectId, customerId, vehicleType, from, to, search });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateDeliveryStatusDto) { return this.service.updateStatus(user, id, dto); }
  @Post(':id/assign-vehicle') assignVehicle(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.assignVehicle(user, id, dto); }
  @Post(':id/confirm') confirmDelivery(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ConfirmDeliveryDto) { return this.service.confirmDelivery(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
