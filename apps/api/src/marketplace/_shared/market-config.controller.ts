import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { MarketSettingsService } from './market-settings.service';

@ApiTags('Marketplace / Config')
@Controller('marketplace/config')
export class MarketConfigController {
  constructor(private readonly settings: MarketSettingsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Market sections (gates), filters, payments and launch cities' })
  get() {
    return this.settings.publicConfig();
  }
}
