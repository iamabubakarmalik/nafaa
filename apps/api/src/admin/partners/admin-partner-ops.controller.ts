import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { PartnerCommissionService } from '../../modules/partners/commission/partner-commission.service';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminArea, AdminPermission } from '../access/admin-access.decorators';
import { AdminPartnersService, PartnerListQuery } from './admin-partners.service';
import { AdminPartnerActivityService, LeadsQuery, PerformanceQuery, VisitsQuery } from './admin-partner-activity.service';
import { AdminPartnerMoneyService, PlanInput } from './admin-partner-money.service';

/**
 * Partner programme pages that are not about one partner: stats, the list,
 * leads, visit audit, plans, earnings, payouts, performance, marketing kit
 * and the commission job. Registered before the "/:id" controller so these
 * fixed paths are matched first.
 */
@ApiTags('Admin - Partners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('partners')
@Controller('admin/partners')
export class AdminPartnerOpsController {
  constructor(
    private readonly partners: AdminPartnersService,
    private readonly activity: AdminPartnerActivityService,
    private readonly money: AdminPartnerMoneyService,
    private readonly commissions: PartnerCommissionService,
  ) {}

  @Get('stats')
  stats() {
    return this.partners.stats();
  }

  @Get()
  list(@Query() q: PartnerListQuery) {
    return this.partners.list(q);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    return this.partners.create(user.id, body ?? {});
  }

  @Get('leads')
  leads(@Query() q: LeadsQuery) {
    return this.activity.leads(q);
  }

  @Get('visits')
  visits(@Query() q: VisitsQuery) {
    return this.activity.visits(q);
  }

  @Patch('visits/:visitId')
  reviewVisit(@GetUser() user: AuthenticatedUser, @Param('visitId') visitId: string, @Body() body: { review?: unknown }) {
    return this.activity.reviewVisit(user.id, visitId, body?.review ?? null);
  }

  @Get('performance')
  performance(@Query() q: PerformanceQuery) {
    return this.activity.performance(q);
  }

  @Get('plans')
  plans() {
    return this.money.plans();
  }

  @Post('plans')
  createPlan(@Body() body: PlanInput) {
    return this.money.createPlan(body ?? {});
  }

  @Patch('plans/:planId')
  updatePlan(@Param('planId') planId: string, @Body() body: PlanInput) {
    return this.money.updatePlan(planId, body ?? {});
  }

  @Get('earnings')
  earnings(@Query() q: { partnerId?: string; status?: string; kind?: string; search?: string; page?: string; limit?: string }) {
    return this.money.earnings(q);
  }

  @Post('earnings/:earningId/reverse')
  reverse(@Param('earningId') earningId: string, @Body() body: { reason?: unknown }) {
    return this.money.reverse(earningId, body?.reason);
  }

  @Get('payouts')
  payouts(@Query() q: { status?: string; partnerId?: string; search?: string; page?: string; limit?: string }) {
    return this.money.payouts(q);
  }

  @Post('payouts/:payoutId/approve')
  @AdminPermission('partners.payouts')
  approvePayout(@GetUser() user: AuthenticatedUser, @Param('payoutId') payoutId: string) {
    return this.money.approvePayout(user.id, payoutId);
  }

  @Post('payouts/:payoutId/paid')
  @AdminPermission('partners.payouts')
  markPaid(@Param('payoutId') payoutId: string, @Body() body: { reference?: unknown; note?: unknown }) {
    return this.money.markPaid(payoutId, body ?? {});
  }

  @Post('payouts/:payoutId/reject')
  @AdminPermission('partners.payouts')
  rejectPayout(@GetUser() user: AuthenticatedUser, @Param('payoutId') payoutId: string, @Body() body: { reason?: unknown }) {
    return this.money.rejectPayout(user.id, payoutId, body?.reason);
  }

  @Get('kit')
  kit() {
    return this.money.kit();
  }

  @Put('kit')
  saveKit(@GetUser() user: AuthenticatedUser, @Body() body: { items?: unknown; demo?: unknown }) {
    return this.money.saveKit(user.id, body ?? {});
  }

  /** Runs the commission job now (it also runs every 30 minutes). */
  @Post('commissions/run')
  async runCommissions() {
    const result = await this.commissions.run();
    return Object.keys(result).length ? { running: false, result } : { running: true, result: null };
  }
}
