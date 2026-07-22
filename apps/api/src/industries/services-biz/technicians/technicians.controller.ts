import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { TechniciansService } from './technicians.service';

@ApiTags('Service Business - Technicians')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services-biz/technicians')
export class TechniciansController {
  constructor(private readonly service: TechniciansService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('primarySkill') primarySkill?: string, @Query('level') level?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, primarySkill, level, search });
  }
  @Get('available-now') availableNow(@GetUser() user: AuthenticatedUser, @Query('businessType') businessType?: string, @Query('city') city?: string) {
    return this.service.availableNow(user, businessType, city);
  }
  @Get('by-staff/:staffId') byStaff(@GetUser() user: AuthenticatedUser, @Param('staffId') staffId: string) { return this.service.byStaffId(user, staffId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Get(':id/availability') availability(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('date') date: string) { return this.service.availability(user, id, date); }
  @Get(':id/performance') performance(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('from') from?: string, @Query('to') to?: string) { return this.service.performance(user, id, from, to); }
  @Post(':id/skills') assignSkills(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { skills: any[] }) { return this.service.assignSkills(user, id, body.skills); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string }) { return this.service.updateStatus(user, id, body.status); }
  @Patch(':id/location') updateLocation(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { lat: number; lng: number }) { return this.service.updateLocation(user, id, body.lat, body.lng); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
