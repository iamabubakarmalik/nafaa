import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { FurnitureDeliveriesService } from './deliveries.service';
import { AssignVehicleDto, BillChargesDto, ConfirmDeliveryDto, CreateFurnitureDeliveryDto, UpdateDeliveryStatusDto } from './dto/create-delivery.dto';

/** Deliveries are jobs (view / manage); billing their charges is counter work. */
@ApiTags('Furniture - Deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('furniture/deliveries')
export class FurnitureDeliveriesController {
  constructor(private readonly service: FurnitureDeliveriesService) {}

  @Post() @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateFurnitureDeliveryDto) { return this.service.create(user, dto); }

  @Get() @RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW)
  list(@GetUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(user, { status, customerId, from, to, search, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });
  }

  @Get('summary') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW)
  summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }

  @Get('today') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW)
  today(@GetUser() user: AuthenticatedUser) { return this.service.todaySchedule(user); }

  @Get(':id') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Post(':id/assign-vehicle') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE)
  assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignVehicleDto) { return this.service.assignVehicle(user, id, dto); }

  @Patch(':id/status') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE)
  updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateDeliveryStatusDto) { return this.service.updateStatus(user, id, dto); }

  @Post(':id/confirm') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE)
  confirm(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ConfirmDeliveryDto) { return this.service.confirmDelivery(user, id, dto); }

  /** Bills the delivery charges (FDV-…): cash to the drawer, the rest on the khata. */
  @Post(':id/bill') @RequirePermissions(PERMISSIONS.POS_USE)
  bill(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: BillChargesDto) { return this.service.billCharges(user, id, dto); }

  /** Older screens: cancels the delivery (nothing is deleted). */
  @Delete(':id') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
