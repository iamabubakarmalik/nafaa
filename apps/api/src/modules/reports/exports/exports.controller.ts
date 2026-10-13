import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { ExportQueryDto } from './dto/export-query.dto';
import { ExportsService } from './exports.service';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 *   GET /exports/history            recent file downloads
 *   GET /exports/:kind/excel        sales, products, customers, suppliers,
 *                                   expenses, purchases, ledger, stock-movements
 *   GET /exports/sales/pdf
 * Optional ?from=&to= business-day keys; branch follows the shop switcher.
 */
@ApiTags('Exports')
@ApiBearerAuth()
@Controller('exports')
export class ExportsController {
  constructor(private readonly service: ExportsService) {}

  @Get('history')
  history(@GetUser() user: AuthenticatedUser) {
    return this.service.history(user);
  }

  @Get('sales/pdf')
  async salesPdf(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Query() q: ExportQueryDto,
    @Res({ passthrough: false }) res: Response,
  ) {
    const buffer = await this.service.salesPdf(user, scope, q);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="nafaa-sales-${Date.now()}.pdf"`);
    res.send(buffer);
  }

  @Get(':kind/excel')
  async excel(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Param('kind') kind: string,
    @Query() q: ExportQueryDto,
    @Res({ passthrough: false }) res: Response,
  ) {
    const buffer = await this.service.excel(user, scope, kind, q);
    res.setHeader('Content-Type', XLSX);
    res.setHeader('Content-Disposition', `attachment; filename="nafaa-${kind}-${Date.now()}.xlsx"`);
    res.send(buffer);
  }
}
