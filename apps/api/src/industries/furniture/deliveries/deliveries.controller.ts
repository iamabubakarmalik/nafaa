import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { FurnitureDeliveriesService } from './deliveries.service';
import { ConfirmDeliveryDto, CreateFurnitureDeliveryDto, UpdateDeliveryStatusDto } from './dto/create-delivery.dto';

@ApiTags('Furniture - Deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('furniture/deliveries')
export class FurnitureDeliveriesController {
  constructor(private readonly service: FurnitureDeliveriesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateFurnitureDeliveryDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, { status, customerId, from, to, search });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get('today') today(@GetUser() user: AuthenticatedUser) { return this.service.todaySchedule(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/assign-vehicle') assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.assignVehicle(user, id, dto); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateDeliveryStatusDto) { return this.service.updateStatus(user, id, dto); }
  @Post(':id/confirm') confirm(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ConfirmDeliveryDto) { return this.service.confirmDelivery(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
