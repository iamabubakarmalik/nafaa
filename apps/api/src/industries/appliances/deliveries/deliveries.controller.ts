import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ApplianceDeliveriesService } from './deliveries.service';
import {
  ApplianceDeliveryPaymentDto, AssignApplianceVehicleDto, ConfirmApplianceDeliveryDto, CreateApplianceDeliveryDto, UpdateApplianceDeliveryStatusDto,
} from './dto/create-delivery.dto';
import type { DeliveryView } from './deliveries.service';

@ApiTags('Appliances - Deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW)
@Controller('appliances/deliveries')
export class ApplianceDeliveriesController {
  constructor(private readonly service: ApplianceDeliveriesService) {}

  @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE) @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateApplianceDeliveryDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string,
    @Query('view') view?: DeliveryView, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.list(user, { status, customerId, from, to, search, view, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE) @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateApplianceDeliveryStatusDto) { return this.service.updateStatus(user, id, dto); }
  @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE) @Post(':id/assign-vehicle') assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignApplianceVehicleDto) { return this.service.assignVehicle(user, id, dto); }
  @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE) @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ApplianceDeliveryPaymentDto) { return this.service.addPayment(user, id, dto); }
  @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE) @Post(':id/confirm') confirm(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ConfirmApplianceDeliveryDto) { return this.service.confirmDelivery(user, id, dto); }
}
