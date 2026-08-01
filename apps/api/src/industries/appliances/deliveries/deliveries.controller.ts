import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ApplianceDeliveriesService } from './deliveries.service';
import { ConfirmApplianceDeliveryDto, CreateApplianceDeliveryDto, UpdateApplianceDeliveryStatusDto } from './dto/create-delivery.dto';

@ApiTags('Appliances - Deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appliances/deliveries')
export class ApplianceDeliveriesController {
  constructor(private readonly service: ApplianceDeliveriesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateApplianceDeliveryDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, customerId, from, to, search });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateApplianceDeliveryStatusDto) { return this.service.updateStatus(user, id, dto); }
  @Post(':id/assign-vehicle') assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.assignVehicle(user, id, dto); }
  @Post(':id/confirm') confirm(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ConfirmApplianceDeliveryDto) { return this.service.confirmDelivery(user, id, dto); }
}
