import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { PatientsService } from './patients.service';

@ApiTags('Clinic - Patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clinic/patients')
export class PatientsController {
  constructor(private readonly service: PatientsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('search') search?: string, @Query('gender') gender?: string, @Query('bloodGroup') bloodGroup?: string) {
    return this.service.list(user, { search, gender, bloodGroup });
  }
  @Get('by-mrn/:mrn') byMrn(@GetUser() user: AuthenticatedUser, @Param('mrn') mrn: string) { return this.service.byMrn(user, mrn); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Get(':id/history') history(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.history(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
