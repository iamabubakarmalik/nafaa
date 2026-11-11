import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminArea } from '../access/admin-access.decorators';
import { AdminPartnersService, PartnerInput } from './admin-partners.service';
import { AdminPartnerMoneyService } from './admin-partner-money.service';

/** One partner: profile, status, access, shops, targets and adjustments. */
@ApiTags('Admin - Partners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('partners')
@Controller('admin/partners')
export class AdminPartnersController {
  constructor(
    private readonly partners: AdminPartnersService,
    private readonly money: AdminPartnerMoneyService,
  ) {}

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.partners.detail(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: PartnerInput) {
    return this.partners.update(id, body ?? {});
  }

  @Post(':id/approve')
  approve(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.partners.approve(user.id, id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() body: { reason?: unknown }) {
    return this.partners.reject(id, body?.reason);
  }

  @Post(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.partners.suspend(id);
  }

  @Post(':id/reactivate')
  reactivate(@Param('id') id: string) {
    return this.partners.reactivate(id);
  }

  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string) {
    return this.partners.resetPassword(id);
  }

  @Post(':id/sign-out')
  signOut(@Param('id') id: string) {
    return this.partners.signOut(id);
  }

  @Get(':id/shops')
  shops(@Param('id') id: string, @Query() q: { search?: string; page?: string; limit?: string }) {
    return this.partners.shops(id, q);
  }

  @Get(':id/targets')
  targets(@Param('id') id: string) {
    return this.partners.targets(id);
  }

  @Put(':id/targets/:month')
  setTarget(@Param('id') id: string, @Param('month') month: string, @Body() body: { visits?: unknown; signups?: unknown; activations?: unknown }) {
    return this.partners.setTarget(id, month, body ?? {});
  }

  @Post(':id/adjustments')
  adjust(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { amount?: unknown; note?: unknown }) {
    return this.money.adjust(user.id, id, body ?? {});
  }
}
