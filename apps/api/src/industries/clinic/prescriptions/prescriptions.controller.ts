import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { PrescriptionsService } from './prescriptions.service';

/** Prescriptions are medical records: read with bookings view, written with bookings manage. */
@ApiTags('Clinic - Prescriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_VIEW)
@Controller('clinic/prescriptions')
export class PrescriptionsController {
  constructor(private readonly service: PrescriptionsService) {}

  @Post() @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_MANAGE)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }

  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: Record<string, string | undefined>) {
    return this.service.list(user, { patientId: q.patientId, doctorId: q.doctorId, status: q.status, search: q.search, from: q.from, to: q.to, page: q.page, limit: q.limit });
  }

  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Patch(':id/status') @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_MANAGE)
  status(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string }) { return this.service.updateStatus(user, id, body?.status); }
}
