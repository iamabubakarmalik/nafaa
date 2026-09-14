import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ServiceRequestsService } from './service-requests.service';
import {
  AddServicePaymentDto,
  CancelServiceDto,
  CompleteServiceDto,
  CreateServiceRequestDto,
  UpdateServiceRequestDto,
  UpdateServiceStatusDto,
} from './dto/create-service-request.dto';

const bool = (v?: string) => (v === 'true' ? true : v === 'false' ? false : undefined);

@ApiTags('Appliances - Service Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appliances/service-requests')
export class ServiceRequestsController {
  constructor(private readonly service: ServiceRequestsService) {}

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateServiceRequestDto) {
    return this.service.create(user, dto);
  }

  @Get()
  list(
    @GetUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('open') open?: string,
    @Query('serviceType') serviceType?: string,
    @Query('technicianId') technicianId?: string,
    @Query('customerId') customerId?: string,
    @Query('priority') priority?: string,
    @Query('coveredUnderWarranty') w?: string,
    @Query('coveredUnderAmc') a?: string,
    @Query('unpaidOnly') unpaid?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(user, {
      status, serviceType, technicianId, customerId, priority, from, to, search,
      open: bool(open),
      coveredUnderWarranty: bool(w),
      coveredUnderAmc: bool(a),
      unpaidOnly: bool(unpaid),
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /** Khula hua kaam — urgent aur late sab se upar. */
  @Get('queue')
  queue(@GetUser() user: AuthenticatedUser) {
    return this.service.queue(user);
  }

  @Get('summary')
  summary(@GetUser() user: AuthenticatedUser) {
    return this.service.summary(user);
  }

  @Get(':id')
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getOne(user, id);
  }

  @Patch(':id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateServiceRequestDto) {
    return this.service.update(user, id, dto);
  }

  @Post(':id/assign-technician')
  assign(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { technicianId: string; scheduledDate?: string; scheduledTimeSlot?: string },
  ) {
    return this.service.assignTechnician(user, id, body.technicianId, body.scheduledDate, body.scheduledTimeSlot);
  }

  @Patch(':id/status')
  updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateServiceStatusDto) {
    return this.service.updateStatus(user, id, dto);
  }

  @Post(':id/complete')
  complete(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CompleteServiceDto) {
    return this.service.complete(user, id, dto);
  }

  @Post(':id/payment')
  addPayment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddServicePaymentDto) {
    return this.service.addPayment(user, id, dto);
  }

  @Post(':id/cancel')
  cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CancelServiceDto) {
    return this.service.cancel(user, id, dto?.reason);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
