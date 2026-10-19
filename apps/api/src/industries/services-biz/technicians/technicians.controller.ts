import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { TechniciansService } from './technicians.service';
import { CommissionService } from './commission.service';
import { CommissionQuery, PayCommissionDto, TechnicianLocationDto, TechnicianSkillsDto, TechnicianStatusDto, UpsertTechnicianDto } from './dto/technician.dto';

/**
 * Technicians are read from the job board (service.jobs.view). Setting one
 * up (skills, pay terms) is staff work; status and location are changed by
 * whoever runs the jobs. Commission routes also match the shared
 * `commission` rule, and the service checks view/manage and expenses.
 */
@ApiTags('Service Business - Technicians')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services-biz/technicians')
export class TechniciansController {
  constructor(
    private readonly service: TechniciansService,
    private readonly commission: CommissionService,
  ) {}

  @Post() @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertTechnicianDto) { return this.service.upsert(user, dto); }

  @Get() @RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW)
  list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('primarySkill') primarySkill?: string, @Query('level') level?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, primarySkill, level, search });
  }

  /** Commission earned on billed jobs in a period (YYYY-MM-DD shop days). */
  @Get('commission') commissionStatement(@GetUser() user: AuthenticatedUser, @Query() q: CommissionQuery) { return this.commission.statement(user, q); }
  @Get('commission/payouts') payouts(@GetUser() user: AuthenticatedUser, @Query('technicianId') technicianId?: string) { return this.commission.payouts(user, technicianId); }
  @Get('commission/payouts/:ref') payoutSlip(@GetUser() user: AuthenticatedUser, @Param('ref') ref: string) { return this.commission.slip(user, ref); }
  /** Pays the unpaid commission as one expense (drawer cash by default). */
  @Post('commission/pay') pay(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: PayCommissionDto) { return this.commission.pay(user, shop, dto); }

  @Get('available-now') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW)
  availableNow(@GetUser() user: AuthenticatedUser, @Query('businessType') businessType?: string, @Query('city') city?: string) {
    return this.service.availableNow(user, businessType, city);
  }
  @Get('by-staff/:staffId') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW)
  byStaff(@GetUser() user: AuthenticatedUser, @Param('staffId') staffId: string) { return this.service.byStaffId(user, staffId); }
  @Get(':id') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Get(':id/availability') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW)
  availability(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('date') date: string) { return this.service.availability(user, id, date); }
  @Get(':id/performance') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW)
  performance(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('from') from?: string, @Query('to') to?: string) { return this.service.performance(user, id, from, to); }

  @Post(':id/skills') @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  assignSkills(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: TechnicianSkillsDto) { return this.service.assignSkills(user, id, body.skills); }
  @Patch(':id/status') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE)
  updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: TechnicianStatusDto) { return this.service.updateStatus(user, id, body.status); }
  @Patch(':id/location') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_MANAGE)
  updateLocation(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: TechnicianLocationDto) { return this.service.updateLocation(user, id, body.lat, body.lng); }
  /** Switches the technician off; jobs and history stay. */
  @Delete(':id') @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
