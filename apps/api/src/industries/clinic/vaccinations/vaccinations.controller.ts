import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { VaccinationsService } from './vaccinations.service';

/** The vaccine register is a medical record: read with bookings view, written with bookings manage. */
@ApiTags('Clinic - Vaccinations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.CLINIC_RECORDS_VIEW)
@Controller('clinic/vaccinations')
export class VaccinationsController {
  constructor(private readonly service: VaccinationsService) {}

  @Post() @RequirePermissions(PERMISSIONS.CLINIC_RECORDS_MANAGE)
  schedule(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.schedule(user, dto); }

  @Post('bulk-epi') @RequirePermissions(PERMISSIONS.CLINIC_RECORDS_MANAGE)
  bulkEpi(@GetUser() user: AuthenticatedUser, @Body() body: { patientId: string; birthDate: string }) {
    return this.service.bulkScheduleEPI(user, body?.patientId, body?.birthDate);
  }

  @Post(':id/administer') @RequirePermissions(PERMISSIONS.CLINIC_RECORDS_MANAGE)
  administer(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.administer(user, id, dto); }

  @Patch(':id/status') @RequirePermissions(PERMISSIONS.CLINIC_RECORDS_MANAGE)
  setStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string; notes?: string; dueDate?: string }) {
    return this.service.setStatus(user, id, body ?? ({} as { status: string }));
  }

  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: Record<string, string | undefined>) {
    return this.service.list(user, { patientId: q.patientId, status: q.status, from: q.from, to: q.to, search: q.search, page: q.page, limit: q.limit });
  }

  @Get('due/list') due(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.service.due(user, days ? Number(days) : 7);
  }
}
