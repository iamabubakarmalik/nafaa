import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { WorkshopJobsService } from './workshop-jobs.service';
import { AddPaymentDto, CreateWorkshopJobDto, SetWarrantyDto, UpdateJobStatusDto } from './dto/create-workshop-job.dto';

@ApiTags('Auto Parts - Workshop Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('autoparts/workshop-jobs')
export class WorkshopJobsController {
  constructor(private readonly service: WorkshopJobsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateWorkshopJobDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('priority') priority?: string, @Query('jobType') jobType?: string, @Query('customerId') customerId?: string, @Query('vehicleId') vehicleId?: string, @Query('mechanicId') mechanicId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, priority, jobType, customerId, vehicleId, mechanicId, from, to, search });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateJobStatusDto) { return this.service.updateStatus(user, id, dto); }
  @Post(':id/payments') addPayment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddPaymentDto) { return this.service.addPayment(user, id, dto); }
  @Post(':id/warranty') setWarranty(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SetWarrantyDto) { return this.service.setWarranty(user, id, dto); }
  @Post(':id/rating') rate(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { rating: number; feedback?: string }) { return this.service.submitRating(user, id, body.rating, body.feedback); }
  @Post(':id/recalculate') recalc(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.recalculate(user, id); }
}
