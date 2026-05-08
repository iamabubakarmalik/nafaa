import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminExportsService } from './admin-exports.service';

@ApiTags('Admin - Exports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/exports')
export class AdminExportsController {
  constructor(private readonly service: AdminExportsService) {}

  @Get('tenants')
  async tenants(@Res({ passthrough: false }) res: Response) {
    const buffer = await this.service.exportTenants();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="nafaa-tenants-${Date.now()}.xlsx"`,
    );
    res.send(buffer);
  }

  @Get('payments')
  async payments(@Res({ passthrough: false }) res: Response) {
    const buffer = await this.service.exportPayments();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="nafaa-payments-${Date.now()}.xlsx"`,
    );
    res.send(buffer);
  }
}
