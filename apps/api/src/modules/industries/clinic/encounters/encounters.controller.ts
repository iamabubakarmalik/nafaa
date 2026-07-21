import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { EncountersService } from './encounters.service';

@ApiTags('Clinic - Encounters (SOAP)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clinic/encounters')
export class EncountersController {
  constructor(private readonly service: EncountersService) {}

  @Post('appointment/:appointmentId') upsert(@GetUser() user: AuthenticatedUser, @Param('appointmentId') appointmentId: string, @Body() dto: any) {
    return this.service.upsert(user, appointmentId, dto);
  }
  @Get('appointment/:appointmentId') byAppointment(@GetUser() user: AuthenticatedUser, @Param('appointmentId') appointmentId: string) {
    return this.service.byAppointment(user, appointmentId);
  }
  @Get('patient/:patientId') byPatient(@GetUser() user: AuthenticatedUser, @Param('patientId') patientId: string) {
    return this.service.byPatient(user, patientId);
  }
}
