import { Controller, Get, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ExportsService } from './exports.service';

@ApiTags('Exports')
@ApiBearerAuth()
@Controller('exports')
export class ExportsController {
  constructor(private readonly service: ExportsService) {}

  @Get('sales/excel')
  async exportSalesExcel(
    @GetUser() user: AuthenticatedUser,
    @Res({ passthrough: false }) res: Response,
  ) {
    const buffer = await this.service.exportSalesExcel(user);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="nafaa-sales-${Date.now()}.xlsx"`,
    );
    res.send(buffer);
  }

  @Get('products/excel')
  async exportProductsExcel(
    @GetUser() user: AuthenticatedUser,
    @Res({ passthrough: false }) res: Response,
  ) {
    const buffer = await this.service.exportProductsExcel(user);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="nafaa-products-${Date.now()}.xlsx"`,
    );
    res.send(buffer);
  }

  @Get('customers/excel')
  async exportCustomersExcel(
    @GetUser() user: AuthenticatedUser,
    @Res({ passthrough: false }) res: Response,
  ) {
    const buffer = await this.service.exportCustomersExcel(user);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="nafaa-customers-${Date.now()}.xlsx"`,
    );
    res.send(buffer);
  }

  @Get('sales/pdf')
  async exportSalesPdf(
    @GetUser() user: AuthenticatedUser,
    @Res({ passthrough: false }) res: Response,
  ) {
    const buffer = await this.service.exportSalesPdf(user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="nafaa-sales-${Date.now()}.pdf"`,
    );
    res.send(buffer);
  }
}
