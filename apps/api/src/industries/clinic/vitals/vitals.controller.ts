import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { VitalsService } from './vitals.service';

/** Vitals are medical records: read with bookings view, written with bookings manage. */
@ApiTags('Clinic - Vitals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.CLINIC_RECORDS_VIEW)
@Controller('clinic/vitals')
export class VitalsController {
  constructor(private readonly service: VitalsService) {}

  @Post('appointment/:appointmentId') @RequirePermissions(PERMISSIONS.CLINIC_RECORDS_MANAGE)
  record(@GetUser() user: AuthenticatedUser, @Param('appointmentId') appointmentId: string, @Body() dto: any) {
    return this.service.record(user, appointmentId, dto);
  }
  @Get('appointment/:appointmentId') byAppointment(@GetUser() user: AuthenticatedUser, @Param('appointmentId') appointmentId: string) {
    return this.service.byAppointment(user, appointmentId);
  }
  @Get('patient/:patientId') byPatient(@GetUser() user: AuthenticatedUser, @Param('patientId') patientId: string) {
    return this.service.byPatient(user, patientId);
  }
}
