import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CampaignInput, MarketingService } from './marketing.service';
import { MetaCapiService } from './meta-capi.service';
import { AdCopyInput } from './ad-copy.service';

/**
 * Marketing hub. Under `ads/` so the ads permissions apply (permission-routes):
 * reading needs `ads.view`, every write `ads.manage`. Conversions API
 * settings are also limited to owners and managers in MetaCapiService.
 */
@ApiTags('Marketing hub')
@ApiBearerAuth()
@Controller('ads')
export class MarketingController {
  constructor(private readonly marketing: MarketingService, private readonly capi: MetaCapiService) {}

  @Get('marketing/report')
  @ApiOperation({ summary: 'Spend against delivered orders by campaign and traffic source: ROAS, cost per order, CAC, profit after ads' })
  report(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query('from') from?: string, @Query('to') to?: string) {
    return this.marketing.report(user, scope, { from, to });
  }

  @Get('marketing/campaigns')
  campaigns(@GetUser() user: AuthenticatedUser) {
    return this.marketing.campaigns(user);
  }

  @Post('marketing/campaigns')
  createCampaign(@GetUser() user: AuthenticatedUser, @Body() body: CampaignInput) {
    return this.marketing.createCampaign(user, body ?? {});
  }

  @Patch('marketing/campaigns/:id')
  updateCampaign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: CampaignInput) {
    return this.marketing.updateCampaign(user, id, body ?? {});
  }

  @Delete('marketing/campaigns/:id')
  removeCampaign(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.marketing.removeCampaign(user, id);
  }

  @Get('marketing/product-links')
  productLinks(@GetUser() user: AuthenticatedUser, @Query() q: { search?: string; limit?: string }) {
    return this.marketing.productLinks(user, q);
  }

  @Post('marketing/copy')
  @ApiOperation({ summary: 'Ad copy (headline, primary text, CTA) in Roman Urdu, Urdu and English' })
  copy(@GetUser() user: AuthenticatedUser, @Body() body: AdCopyInput) {
    return this.marketing.adCopy(user, body ?? {});
  }

  @Get('capi')
  capiOverview(@GetUser() user: AuthenticatedUser) {
    return this.capi.overview(user);
  }

  @Put('capi/settings')
  capiSave(@GetUser() user: AuthenticatedUser, @Body() body: Parameters<MetaCapiService['save']>[1]) {
    return this.capi.save(user, body ?? {});
  }

  @Post('capi/test')
  capiTest(@GetUser() user: AuthenticatedUser) {
    return this.capi.test(user);
  }

  @Get('capi/events')
  capiEvents(@GetUser() user: AuthenticatedUser, @Query() q: { status?: string; page?: string; limit?: string }) {
    return this.capi.events(user, q);
  }

  @Post('capi/events/:id/retry')
  capiRetry(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.capi.retry(user, id);
  }
}
