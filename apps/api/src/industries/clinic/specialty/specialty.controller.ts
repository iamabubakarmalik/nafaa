import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { SpecialtyService } from './specialty.service';

/** Dental, antenatal and physio records: read with bookings view, written with bookings manage. */
@ApiTags('Clinic - Specialty Records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_VIEW)
@Controller('clinic/specialty')
export class SpecialtyController {
  constructor(private readonly service: SpecialtyService) {}

  // Dental
  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_MANAGE) @Post('dental') dental(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.recordDental(user, dto); }
  @Get('dental/patient/:patientId') dentalChart(@GetUser() user: AuthenticatedUser, @Param('patientId') patientId: string) { return this.service.dentalChart(user, patientId); }
  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_MANAGE) @Patch('dental/:id') updateDental(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.updateDental(user, id, dto); }
  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_MANAGE) @Delete('dental/:id') removeDental(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.removeDental(user, id); }

  // ANC
  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_MANAGE) @Post('anc') anc(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.createAncVisit(user, dto); }
  @Get('anc/patient/:patientId') ancHistory(@GetUser() user: AuthenticatedUser, @Param('patientId') patientId: string) { return this.service.ancHistory(user, patientId); }

  // Physio
  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_MANAGE) @Post('physio') physio(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.createPhysioSession(user, dto); }
  @Get('physio/patient/:patientId') physioHistory(@GetUser() user: AuthenticatedUser, @Param('patientId') patientId: string) { return this.service.physioHistory(user, patientId); }
}
