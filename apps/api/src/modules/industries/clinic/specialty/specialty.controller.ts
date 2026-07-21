import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { SpecialtyService } from './specialty.service';

@ApiTags('Clinic - Specialty Records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clinic/specialty')
export class SpecialtyController {
  constructor(private readonly service: SpecialtyService) {}

  // Dental
  @Post('dental') dental(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.recordDental(user, dto); }
  @Get('dental/patient/:patientId') dentalChart(@GetUser() user: AuthenticatedUser, @Param('patientId') patientId: string) { return this.service.dentalChart(user, patientId); }
  @Patch('dental/:id') updateDental(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.updateDental(user, id, dto); }
  @Delete('dental/:id') removeDental(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.removeDental(user, id); }

  // ANC
  @Post('anc') anc(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.createAncVisit(user, dto); }
  @Get('anc/patient/:patientId') ancHistory(@GetUser() user: AuthenticatedUser, @Param('patientId') patientId: string) { return this.service.ancHistory(user, patientId); }

  // Physio
  @Post('physio') physio(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.createPhysioSession(user, dto); }
  @Get('physio/patient/:patientId') physioHistory(@GetUser() user: AuthenticatedUser, @Param('patientId') patientId: string) { return this.service.physioHistory(user, patientId); }
}
