import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { FloristOrdersService } from './orders.service';
import { CreateFloristOrderDto, DeliveryConfirmDto, UpdateOrderStatusDto } from './dto/create-order.dto';

@ApiTags('Florist - Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('florist/orders')
export class FloristOrdersController {
  constructor(private readonly service: FloristOrdersService) {}

  @Post() create(@GetUser() u: AuthenticatedUser, @Body() dto: CreateFloristOrderDto) { return this.service.create(u, dto); }
  @Get() list(
    @GetUser() u: AuthenticatedUser,
    @Query('orderType') orderType?: string,
    @Query('status') status?: string,
    @Query('scheduledDate') scheduledDate?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) { return this.service.list(u, { orderType, status, scheduledDate, from, to, search }); }
  @Get('summary') summary(@GetUser() u: AuthenticatedUser) { return this.service.summary(u); }
  @Get('today-deliveries') today(@GetUser() u: AuthenticatedUser) { return this.service.todayDeliveries(u); }
  @Get('by-time-slot') slots(@GetUser() u: AuthenticatedUser, @Query('date') date: string) { return this.service.byTimeSlot(u, date); }
  @Get(':id') getOne(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(u, id); }
  @Patch(':id') update(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() dto: Partial<CreateFloristOrderDto>) { return this.service.update(u, id, dto); }
  @Patch(':id/status') status(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) { return this.service.updateStatus(u, id, dto); }
  @Post(':id/confirm-delivery') confirm(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() dto: DeliveryConfirmDto) { return this.service.confirmDelivery(u, id, dto); }
  @Delete(':id') remove(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(u, id); }
}
