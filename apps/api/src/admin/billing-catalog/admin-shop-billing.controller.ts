import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { LIMIT_KEYS, LimitKey } from '../../modules/billing/entitlements/feature-catalog';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminArea } from '../access/admin-access.decorators';
import { AdminShopBillingService } from './admin-shop-billing.service';
import { featureKeys, giveAddOnInput, limitMap, optDate } from './billing-catalog-input';

/** One shop's plan, add-ons and admin deals (Shop 360 → Plan & add-ons). */
@ApiTags('Admin - Shop billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('tenants')
@Controller('admin/tenants')
export class AdminShopBillingController {
  constructor(private readonly service: AdminShopBillingService) {}

  @Get(':id/billing')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id/billing')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const b = body ?? {};
    let limitOverrides: Partial<Record<LimitKey, number | null>> | null | undefined;
    if (b.limitOverrides === null) limitOverrides = null;
    else if (b.limitOverrides !== undefined) {
      if (typeof b.limitOverrides !== 'object' || Array.isArray(b.limitOverrides)) throw new BadRequestException('limitOverrides must be an object');
      const raw = b.limitOverrides as Record<string, unknown>;
      // A key sent as null clears that override; the rest are checked as limits.
      limitOverrides = { ...(limitMap(Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== null)), 'limitOverrides') ?? {}) };
      for (const [k, v] of Object.entries(raw)) {
        if (v !== null) continue;
        if (!LIMIT_KEYS.includes(k as LimitKey)) throw new BadRequestException(`Unknown limit: ${k}`);
        limitOverrides[k as LimitKey] = null;
      }
    }
    return this.service.updateDeals(id, {
      extraFeatures: b.extraFeatures === undefined ? undefined : featureKeys(b.extraFeatures, 'extraFeatures'),
      limitOverrides,
      billingGrandfatherUntil: optDate(b.billingGrandfatherUntil, 'billingGrandfatherUntil'),
    });
  }

  @Post(':id/addons')
  give(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.giveAddOn(id, user.id, giveAddOnInput(body));
  }

  @Delete(':id/addons/:key')
  remove(@Param('id') id: string, @Param('key') key: string) {
    return this.service.removeAddOn(id, key);
  }
}
