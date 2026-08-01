import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ServiceRequestsService } from './service-requests.service';
import { CompleteServiceDto, CreateServiceRequestDto, UpdateServiceStatusDto } from './dto/create-service-request.dto';

@ApiTags('Appliances - Service Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appliances/service-requests')
export class ServiceRequestsController {
  constructor(private readonly service: ServiceRequestsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateServiceRequestDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('serviceType') serviceType?: string, @Query('technicianId') technicianId?: string, @Query('customerId') customerId?: string, @Query('priority') priority?: string, @Query('coveredUnderWarranty') w?: string, @Query('coveredUnderAmc') a?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      status, serviceType, technicianId, customerId, priority, from, to, search,
      coveredUnderWarranty: w === 'true' ? true : w === 'false' ? false : undefined,
      coveredUnderAmc: a === 'true' ? true : a === 'false' ? false : undefined,
    });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/assign-technician') assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { technicianId: string; scheduledDate?: string; scheduledTimeSlot?: string }) {
    return this.service.assignTechnician(user, id, body.technicianId, body.scheduledDate, body.scheduledTimeSlot);
  }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateServiceStatusDto) { return this.service.updateStatus(user, id, dto); }
  @Post(':id/complete') complete(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CompleteServiceDto) { return this.service.complete(user, id, dto); }
}
