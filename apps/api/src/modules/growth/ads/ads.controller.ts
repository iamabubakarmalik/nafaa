import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { AdColumnMap, AdImportRow } from './ads-math';
import { AdEntryInput, AdsService } from './ads.service';

/**
 * Ads spend and ROAS. Reading needs `ads.view`, every write `ads.manage`, and
 * the expense setting `settings.edit` (permission-routes). Entries that are
 * written to expenses also need `expenses.create` (checked in AdsService).
 */
@ApiTags('Ads spend')
@ApiBearerAuth()
@Controller('ads')
export class AdsController {
  constructor(private readonly service: AdsService) {}

  @Get('settings')
  settings(@GetUser() user: AuthenticatedUser) {
    return this.service.getSettings(user);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Write new ads entries to expenses (P&L) or not' })
  saveSettings(@GetUser() user: AuthenticatedUser, @Body() body: { postExpenses?: boolean }) {
    return this.service.saveSettings(user, body);
  }

  @Get('entries')
  list(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Query() q: { from?: string; to?: string; platform?: string; page?: string; limit?: string },
  ) {
    return this.service.list(user, scope, q);
  }

  @Post('entries')
  create(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() body: AdEntryInput) {
    return this.service.create(user, scope, body ?? {});
  }

  @Patch('entries/:id')
  update(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: AdEntryInput) {
    return this.service.update(user, scope, id, body ?? {});
  }

  @Delete('entries/:id')
  remove(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string) {
    return this.service.remove(user, scope, id);
  }

  @Post('import/preview')
  @ApiOperation({ summary: 'Read an ads manager export (header row + rows)' })
  importPreview(@GetUser() user: AuthenticatedUser, @Body() body: { headers?: unknown[]; rows?: unknown[][]; platform?: string; mapping?: AdColumnMap }) {
    return this.service.importPreview(user, body ?? {});
  }

  @Post('import')
  importApply(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() body: { platform?: string; rows?: AdImportRow[]; integrationId?: string | null; shopId?: string }) {
    return this.service.importApply(user, scope, body ?? {});
  }

  @Get('report')
  @ApiOperation({ summary: 'Ads spend, online sales, ROAS, cost per order and profit after ads' })
  report(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.report(user, scope, { from, to });
  }
}
