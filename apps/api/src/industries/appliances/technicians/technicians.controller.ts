import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { TechniciansService } from './technicians.service';
import { UpsertTechnicianDto } from './dto/upsert-technician.dto';

@ApiTags('Appliances - Technicians')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appliances/technicians')
export class TechniciansController {
  constructor(private readonly service: TechniciansService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertTechnicianDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('active') active?: string, @Query('zone') zone?: string, @Query('category') category?: string, @Query('brand') brand?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      zone, category, brand, search,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }
  @Get('top') top(@GetUser() user: AuthenticatedUser, @Query('limit') limit?: string) { return this.service.topPerformers(user, limit ? Number(limit) : 10); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Get(':id/workload') workload(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('from') from: string, @Query('to') to: string) {
    return this.service.workload(user, id, from, to);
  }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertTechnicianDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
