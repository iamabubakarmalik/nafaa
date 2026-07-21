import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { ClinicServicesService } from './services.service';

@ApiTags('Clinic - Services / Procedures')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clinic/services')
export class ClinicServicesController {
  constructor(private readonly service: ClinicServicesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('category') category?: string, @Query('active') active?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      category, search,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
