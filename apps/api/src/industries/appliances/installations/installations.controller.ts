import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { InstallationsService } from './installations.service';
import {
  AssignTechnicianDto,
  CompleteInstallationDto,
  CreateInstallationDto,
  UpdateInstallationStatusDto,
} from './dto/create-installation.dto';

@ApiTags('Appliances - Installations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appliances/installations')
export class InstallationsController {
  constructor(private readonly service: InstallationsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateInstallationDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('serviceType') serviceType?: string, @Query('technicianId') technicianId?: string, @Query('customerId') customerId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, serviceType, technicianId, customerId, from, to, search });
  }
  @Get('today') today(@GetUser() user: AuthenticatedUser) { return this.service.todaySchedule(user); }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/assign-technician') assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignTechnicianDto) { return this.service.assignTechnician(user, id, dto); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateInstallationStatusDto) { return this.service.updateStatus(user, id, dto); }
  @Post(':id/complete') complete(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CompleteInstallationDto) { return this.service.complete(user, id, dto); }
  @Post(':id/reschedule') reschedule(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { newDate: string; reason?: string }) {
    return this.service.reschedule(user, id, body.newDate, body.reason);
  }
}
