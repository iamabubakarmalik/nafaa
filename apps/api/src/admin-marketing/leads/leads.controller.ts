import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../_shared/constants/marketing-permissions.constants';
import { LeadsService } from './leads.service';
import { ListLeadsDto } from './dto/list-leads.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LogActivityDto } from './dto/log-activity.dto';

@Controller('admin/marketing/leads')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
export class LeadsController {
  constructor(private readonly svc: LeadsService) {}

  @Get('stats')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.LEADS_VIEW)
  stats() {
    return this.svc.getStats();
  }

  @Get()
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.LEADS_VIEW)
  list(@Query() dto: ListLeadsDto) {
    return this.svc.list(dto);
  }

  @Get('export')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.LEADS_EXPORT)
  @Header('Content-Type', 'text/csv')
  async export(@Query() dto: ListLeadsDto, @Res() res: Response) {
    const { csv, count } = await this.svc.exportCsv(dto);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="leads-${Date.now()}.csv"`,
    );
    res.setHeader('X-Total-Rows', String(count));
    res.send(csv);
  }

  @Get(':id')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.LEADS_VIEW)
  get(@Param('id') id: string) {
    return this.svc.getOne(id);
  }

  @Patch(':id')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.LEADS_MANAGE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @Req() req: any,
  ) {
    return this.svc.update(id, dto, req.user.id);
  }

  @Post(':id/assign')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.LEADS_ASSIGN)
  assign(
    @Param('id') id: string,
    @Body() body: { assigneeId: string },
    @Req() req: any,
  ) {
    return this.svc.assign(id, body.assigneeId, req.user.id);
  }

  @Post(':id/activities')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.LEADS_MANAGE)
  logActivity(
    @Param('id') id: string,
    @Body() dto: LogActivityDto,
    @Req() req: any,
  ) {
    return this.svc.logActivity(id, dto, req.user.id);
  }
}
