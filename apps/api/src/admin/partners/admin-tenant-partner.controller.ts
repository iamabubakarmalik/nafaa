import { BadRequestException, Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { PartnerAttributionService } from '../../modules/partners/attribution/partner-attribution.service';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminArea } from '../access/admin-access.decorators';
import { AdminPartnersService } from './admin-partners.service';

/** The partner who brought a shop, shown and changed from the shop page. */
@ApiTags('Admin - Partners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('tenants')
@Controller('admin/tenants')
export class AdminTenantPartnerController {
  constructor(
    private readonly partners: AdminPartnersService,
    private readonly attribution: PartnerAttributionService,
  ) {}

  @Get(':id/partner')
  get(@Param('id') id: string) {
    return this.partners.tenantPartner(id);
  }

  @Patch(':id/partner')
  async set(@Param('id') id: string, @Body() body: { partnerId?: unknown }) {
    const partnerId = body?.partnerId;
    if (partnerId !== null && (typeof partnerId !== 'string' || !partnerId)) throw new BadRequestException('partnerId must be a partner id or null');
    await this.attribution.assignByAdmin(id, partnerId);
    return this.partners.tenantPartner(id);
  }
}
