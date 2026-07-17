import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { DairyDeliveriesService } from './deliveries.service';
import { BulkGenerateDto, ConfirmDeliveryDto, CreateDeliveryDto } from './dto/create-delivery.dto';

@ApiTags('Dairy - Deliveries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dairy/deliveries')
export class DairyDeliveriesController {
  constructor(private readonly service: DairyDeliveriesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateDeliveryDto) { return this.service.create(user, dto); }
  @Post('bulk-generate') bulkGenerate(@GetUser() user: AuthenticatedUser, @Body() dto: BulkGenerateDto) { return this.service.bulkGenerate(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('customerId') customerId?: string, @Query('routeId') routeId?: string, @Query('slot') slot?: string, @Query('status') status?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.list(user, { customerId, routeId, slot, status, from, to });
  }
  @Get('today') today(@GetUser() user: AuthenticatedUser, @Query('slot') slot?: string, @Query('routeId') routeId?: string) { return this.service.todaysDeliveries(user, slot, routeId); }
  @Get('daily-summary') summary(@GetUser() user: AuthenticatedUser, @Query('date') date?: string) { return this.service.dailySummary(user, date); }
  @Post(':id/confirm') confirm(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ConfirmDeliveryDto) { return this.service.confirmDelivery(user, id, dto); }
  @Post(':id/skip') skip(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason: string }) { return this.service.skipDelivery(user, id, body.reason); }
  @Post(':id/cancel') cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.cancelDelivery(user, id); }
}
