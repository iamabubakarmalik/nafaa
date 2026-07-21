import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { LabOrdersService } from './lab-orders.service';

@ApiTags('Clinic - Lab Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clinic/lab-orders')
export class LabOrdersController {
  constructor(private readonly service: LabOrdersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('patientId') patientId?: string, @Query('status') status?: string) {
    return this.service.list(user, { patientId, status });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id/status') status(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string }) { return this.service.updateStatus(user, id, body.status); }
  @Patch('tests/:testId/result') result(@GetUser() user: AuthenticatedUser, @Param('testId') testId: string, @Body() dto: any) { return this.service.recordResult(user, testId, dto); }
  @Post(':id/attach-report') attach(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reportUrl: string }) { return this.service.attachReport(user, id, body.reportUrl); }
}
