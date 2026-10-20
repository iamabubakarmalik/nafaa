import { Controller, Get, UseFilters, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../../_shared/constants/marketing-permissions.constants';
import { DEFAULT_LOCALE, type LlmsPreviewResponse } from '../contract/cms-contract';
import { CmsSettingsService } from '../settings/cms-settings.service';
import { CmsCardsService } from './cms-cards.service';
import { CmsExceptionFilter } from './cms-exception.filter';
import { organizationJsonLd, renderLlmsTxt } from './cms-llms-preview';
import { CmsPublicService } from './cms-public.service';

/** `GET /admin/marketing/cms/settings/preview/llms` (API-CONTRACT 8.7); lives here because it reads the public payload. */
@Controller('admin/marketing/cms/settings/preview')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
@UseFilters(CmsExceptionFilter)
export class CmsLlmsPreviewController {
  constructor(
    private readonly site: CmsPublicService,
    private readonly cards: CmsCardsService,
    private readonly settings: CmsSettingsService,
  ) {}

  @Get('llms')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CMS_VIEW)
  async llms(): Promise<LlmsPreviewResponse> {
    const [payload, siteUrl, site] = await Promise.all([this.site.llms(DEFAULT_LOCALE), this.cards.siteUrl(), this.settings.get('site')]);
    const logo = site?.logoMediaId ? (await this.cards.mediaMap([site.logoMediaId], DEFAULT_LOCALE)).get(site.logoMediaId) : undefined;
    return { llmsTxt: renderLlmsTxt(payload), organizationJsonLd: organizationJsonLd(payload.entity, siteUrl, logo?.url ?? null) };
  }
}
