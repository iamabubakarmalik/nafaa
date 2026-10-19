import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { EncountersService } from './encounters.service';

/** Visit notes are medical records: read with bookings view, written with bookings manage. */
@ApiTags('Clinic - Encounters (SOAP)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_VIEW)
@Controller('clinic/encounters')
export class EncountersController {
  constructor(private readonly service: EncountersService) {}

  @Post('appointment/:appointmentId') @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_MANAGE)
  upsert(@GetUser() user: AuthenticatedUser, @Param('appointmentId') appointmentId: string, @Body() dto: any) {
    return this.service.upsert(user, appointmentId, dto);
  }
  @Get('appointment/:appointmentId') byAppointment(@GetUser() user: AuthenticatedUser, @Param('appointmentId') appointmentId: string) {
    return this.service.byAppointment(user, appointmentId);
  }
  @Get('patient/:patientId') byPatient(@GetUser() user: AuthenticatedUser, @Param('patientId') patientId: string) {
    return this.service.byPatient(user, patientId);
  }
}
