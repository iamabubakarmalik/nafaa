import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { VaccinationsService } from './vaccinations.service';

@ApiTags('Clinic - Vaccinations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clinic/vaccinations')
export class VaccinationsController {
  constructor(private readonly service: VaccinationsService) {}

  @Post() schedule(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.schedule(user, dto); }
  @Post('bulk-epi') bulkEpi(@GetUser() user: AuthenticatedUser, @Body() body: { patientId: string; birthDate: string }) {
    return this.service.bulkScheduleEPI(user, body.patientId, body.birthDate);
  }
  @Post(':id/administer') administer(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.administer(user, id, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('patientId') patientId?: string, @Query('status') status?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.list(user, { patientId, status, from, to });
  }
  @Get('due/list') due(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.service.due(user, days ? Number(days) : 7);
  }
}
