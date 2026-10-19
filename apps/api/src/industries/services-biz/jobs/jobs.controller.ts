import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { JobsService } from './jobs.service';
import {
  AssignJobDto, BillJobDto, CancelJobDto, CounterSaleDto, CreateJobDto, JobPartDto, JobPaymentDto, JobPhotosDto, JobSignatureDto, JobStatusDto,
  ListJobsQuery, RatingDto, ReturnVisitDto, UpdateJobDto,
} from './dto/job.dto';

/**
 * Reads need service.jobs.view and changes service.jobs.manage through the
 * shared `jobs` route rule. Taking money (advance, bill, counter) also needs
 * the counter permission.
 */
@ApiTags('Service Business - Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services-biz/jobs')
export class JobsController {
  constructor(private readonly service: JobsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateJobDto) { return this.service.create(user, dto); }

  /** Services sold at the counter without a job card. */
  @Post('counter-sale') @RequirePermissions(PERMISSIONS.POS_USE)
  counterSale(@GetUser() user: AuthenticatedUser, @Body() dto: CounterSaleDto) { return this.service.counterSale(user, dto); }

  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: ListJobsQuery) { return this.service.list(user, q); }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) { return this.service.summary(user, from, to); }
  @Get('stats') stats(@GetUser() user: AuthenticatedUser, @Query('shopId') shopId?: string) { return this.service.stats(user, shopId); }
  /** Jobs and contracts behind the given bills, for sales history. */
  @Get('by-sales') bySales(@GetUser() user: AuthenticatedUser, @Query('ids') ids?: string) { return this.service.bySales(user, (ids ?? '').split(',')); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateJobDto) { return this.service.update(user, id, dto); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: JobStatusDto) { return this.service.updateStatus(user, id, dto); }
  @Post(':id/assign') assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignJobDto) { return this.service.assignTechnician(user, id, dto); }
  @Post(':id/parts') addPart(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: JobPartDto) { return this.service.addPart(user, id, dto); }
  @Patch(':id/parts/:partId/remove') removePart(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('partId') partId: string) { return this.service.removePart(user, id, partId); }

  @Post(':id/payments') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE, PERMISSIONS.POS_USE)
  addPayment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: JobPaymentDto) { return this.service.addPayment(user, id, dto.amount, dto.isAdvance, dto.paymentMethod); }

  /** Final bill: completes the job and posts the sale. */
  @Post(':id/bill') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE, PERMISSIONS.POS_USE)
  bill(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: BillJobDto) { return this.service.bill(user, id, dto); }

  @Post(':id/rating') rating(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RatingDto) { return this.service.submitRating(user, id, dto); }
  @Post(':id/signature') signature(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: JobSignatureDto) { return this.service.uploadCompletionSignature(user, id, dto.signatureUrl); }
  @Post(':id/photos/:stage') photos(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('stage') stage: string, @Body() dto: JobPhotosDto) { return this.service.addPhotos(user, id, stage, dto.urls); }
  @Post(':id/return-visit') returnVisit(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReturnVisitDto) { return this.service.createReturnVisit(user, id, dto); }
  @Post(':id/cancel') cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CancelJobDto) { return this.service.cancel(user, id, dto.reason); }
}
