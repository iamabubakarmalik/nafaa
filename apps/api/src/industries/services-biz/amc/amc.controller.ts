import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AmcService } from './amc.service';
import { AmcPaymentDto, CancelAmcDto, CompleteVisitDto, CreateAmcDto, ListAmcQuery, RenewAmcDto, ScheduleVisitDto, VisitJobDto } from './dto/amc.dto';

/**
 * Contracts are job-board work (service.jobs.view / manage). Signing and
 * renewing post a bill and payments take money, so they also need the
 * counter permission.
 */
@ApiTags('Service Business - AMC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services-biz/amc')
export class AmcController {
  constructor(private readonly service: AmcService) {}

  @Post() @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE, PERMISSIONS.POS_USE)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateAmcDto) { return this.service.create(user, dto); }

  @Get() @RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW)
  list(@GetUser() user: AuthenticatedUser, @Query() q: ListAmcQuery) { return this.service.list(user, q); }

  @Get('renewal-due') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW)
  renewalDue(@GetUser() user: AuthenticatedUser, @Query('daysAhead') daysAhead?: string) { return this.service.renewalDue(user, daysAhead ? Number(daysAhead) : 30); }

  @Post('expire-old') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE)
  expireOld(@GetUser() user: AuthenticatedUser) { return this.service.expireOldOnes(user); }

  @Get(':id') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Post(':id/visits/schedule') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE)
  schedule(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ScheduleVisitDto) { return this.service.scheduleVisit(user, id, dto); }

  @Post(':id/visits/:visitId/job') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE)
  visitJob(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('visitId') visitId: string, @Body() dto: VisitJobDto) { return this.service.visitJob(user, id, visitId, dto); }

  @Post(':id/visits/:visitId/complete') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE)
  complete(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('visitId') visitId: string, @Body() dto: CompleteVisitDto) { return this.service.completeVisit(user, id, visitId, dto); }

  @Post(':id/payments') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE, PERMISSIONS.POS_USE)
  pay(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AmcPaymentDto) { return this.service.addPayment(user, id, dto.amount, dto.paymentMethod); }

  @Post(':id/renew') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE, PERMISSIONS.POS_USE)
  renew(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RenewAmcDto) { return this.service.renew(user, id, dto); }

  @Post(':id/cancel') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE)
  cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CancelAmcDto) { return this.service.cancel(user, id, dto); }
}
