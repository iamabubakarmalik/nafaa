import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { WorkshopJobsService } from './workshop-jobs.service';
import {
  AddPaymentDto, CreateWorkshopJobDto, DeliverJobDto, ExternalWorkDto, LaborItemDto, ListJobsQuery, PartItemDto, RateJobDto,
  SetWarrantyDto, UpdateJobStatusDto, UpdateWorkshopJobDto,
} from './dto/create-workshop-job.dto';

@ApiTags('Auto Parts - Workshop Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('autoparts/workshop-jobs')
export class WorkshopJobsController {
  constructor(private readonly service: WorkshopJobsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateWorkshopJobDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: ListJobsQuery) { return this.service.list(user, q); }
  /** `ids` = comma-separated sale ids; returns the job behind each workshop bill. */
  @Get('by-sales') bySales(@GetUser() user: AuthenticatedUser, @Query('ids') ids?: string) { return this.service.bySales(user, (ids ?? '').split(',')); }
  @Get('stats') stats(@GetUser() user: AuthenticatedUser, @Query('shopId') shopId?: string) { return this.service.stats(user, shopId || undefined); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateWorkshopJobDto) { return this.service.update(user, id, dto); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateJobStatusDto) { return this.service.updateStatus(user, id, dto); }
  @Post(':id/deliver') deliver(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: DeliverJobDto) { return this.service.deliver(user, id, dto); }
  @Post(':id/labor') addLabor(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: LaborItemDto) { return this.service.addLabor(user, id, dto); }
  @Delete(':id/labor/:laborId') removeLabor(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('laborId') laborId: string) { return this.service.removeLabor(user, id, laborId); }
  @Post(':id/parts') addPart(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: PartItemDto) { return this.service.addPart(user, id, dto); }
  @Delete(':id/parts/:partId') removePart(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('partId') partId: string) { return this.service.removePart(user, id, partId); }
  @Post(':id/external') addExternal(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ExternalWorkDto) { return this.service.addExternal(user, id, dto); }
  @Delete(':id/external/:externalId') removeExternal(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('externalId') externalId: string) { return this.service.removeExternal(user, id, externalId); }
  @Post(':id/payments') addPayment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddPaymentDto) { return this.service.addPayment(user, id, dto); }
  @Post(':id/warranty') setWarranty(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SetWarrantyDto) { return this.service.setWarranty(user, id, dto); }
  @Post(':id/rating') rate(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: RateJobDto) { return this.service.submitRating(user, id, body.rating, body.feedback); }
  @Post(':id/recalculate') recalc(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.recalculate(user, id); }
}
