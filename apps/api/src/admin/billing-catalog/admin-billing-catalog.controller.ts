import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingSettings, loadBillingSettings, saveBillingSettings } from '../../modules/billing/entitlements/billing-settings';
import { FEATURES, LIMIT_KEYS, UNLIMITED } from '../../modules/billing/entitlements/feature-catalog';
import { BillingLifecycleService } from '../../modules/billing/pricing/billing-lifecycle.service';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminArea } from '../access/admin-access.decorators';
import { AdminBillingCatalogService } from './admin-billing-catalog.service';
import { addOnInput } from './billing-catalog-input';

const SETTING_KEYS: Array<keyof BillingSettings> = ['trialDays', 'graceDays', 'addOnPayDays', 'renewalLeadDays', 'reminderDays', 'grandfatherNoticeDays'];

/** Add-on catalog, billing rules, the billing check and the revenue summary. */
@ApiTags('Admin - Billing catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('plans')
@Controller('admin/billing-catalog')
export class AdminBillingCatalogController {
  constructor(
    private readonly service: AdminBillingCatalogService,
    private readonly prisma: PrismaService,
    private readonly moduleRef: ModuleRef,
  ) {}

  /** Feature keys and limit names, for the plan, add-on and shop editors. */
  @Get('features')
  features() {
    return { features: FEATURES, limitKeys: LIMIT_KEYS, unlimited: UNLIMITED };
  }

  @Get('addons')
  addOns() {
    return this.service.listAddOns();
  }

  @Post('addons')
  createAddOn(@Body() body: Record<string, unknown>) {
    return this.service.createAddOn(addOnInput(body, true));
  }

  @Patch('addons/:id')
  updateAddOn(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.updateAddOn(id, addOnInput(body, false));
  }

  @Get('settings')
  settings() {
    return loadBillingSettings(this.prisma, true);
  }

  @Put('settings')
  saveSettings(@GetUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    const input: Partial<BillingSettings> = {};
    for (const k of SETTING_KEYS) {
      const v = body?.[k];
      if (v === undefined) continue;
      const isList = k === 'reminderDays' || k === 'grandfatherNoticeDays';
      if (isList ? !Array.isArray(v) || v.some((x) => typeof x !== 'number') : typeof v !== 'number' || !Number.isFinite(v)) {
        throw new BadRequestException(`${k} must be ${isList ? 'a list of numbers' : 'a number'}`);
      }
      (input as Record<string, unknown>)[k] = v;
    }
    return saveBillingSettings(this.prisma, user.id, input);
  }

  /** Runs the hourly billing check now (bills, reminders, add-on switch-offs). */
  @AdminArea('billing')
  @Post('run-lifecycle')
  async runLifecycle() {
    const lifecycle = this.moduleRef.get(BillingLifecycleService, { strict: false });
    if (!lifecycle) throw new NotFoundException('Billing check is not available');
    const result = await lifecycle.run();
    return { ran: Object.keys(result).length > 0, result };
  }

  @AdminArea('billing')
  @Get('revenue')
  revenue() {
    return this.service.revenue();
  }
}
