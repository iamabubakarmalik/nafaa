import {
  Controller, Get, Header, Param, Query, Res, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../_shared/constants/marketing-permissions.constants';
import { ExportsService } from './exports.service';

@Controller('admin/marketing/exports')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
export class ExportsController {
  constructor(private readonly svc: ExportsService) {}

  @Get(':entity')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.MARKETING_EXPORTS)
  @Header('Content-Type', 'text/csv')
  async export(
    @Param('entity') entity: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const { csv, count } = await this.svc.export(entity, from, to);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${entity}-${Date.now()}.csv"`,
    );
    res.setHeader('X-Total-Rows', String(count));
    res.send(csv);
  }
}
