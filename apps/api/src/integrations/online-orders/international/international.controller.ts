import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { InternationalService, PriceRow } from './international.service';
import { InternationalConfig } from './currency';

/**
 * International selling settings of a custom storefront: exchange rates,
 * countries, country price lists and the ships-abroad flag. Under
 * `online-orders`, so permission-routes asks online_orders.view to read and
 * online_orders.manage to write; saving is also limited to owner/manager.
 */
@ApiTags('Online Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-orders/international')
export class InternationalController {
  constructor(private readonly svc: InternationalService) {}

  @Put('ships-abroad')
  shipsAbroad(@GetUser() user: AuthenticatedUser, @Body() body: { ids?: string[]; value?: boolean }) {
    return this.svc.setShipsAbroad(user, body?.ids ?? [], body?.value !== false);
  }

  @Get(':channelId')
  settings(@GetUser() user: AuthenticatedUser, @Param('channelId') id: string) {
    return this.svc.settings(user, id);
  }

  @Put(':channelId')
  save(@GetUser() user: AuthenticatedUser, @Param('channelId') id: string, @Body() body: Partial<InternationalConfig>) {
    return this.svc.saveSettings(user, id, body ?? {});
  }

  @Get(':channelId/prices')
  prices(@GetUser() user: AuthenticatedUser, @Param('channelId') id: string, @Query() q: { country?: string; search?: string; page?: string }) {
    return this.svc.priceList(user, id, q);
  }

  @Put(':channelId/prices/:country')
  savePrices(@GetUser() user: AuthenticatedUser, @Param('channelId') id: string, @Param('country') country: string, @Body() body: { rows?: PriceRow[] }) {
    return this.svc.savePrices(user, id, country, body?.rows ?? []);
  }
}
