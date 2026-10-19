import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ZonesService } from './zones.service';
import { UpsertZoneDto } from './dto/zone.dto';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';

@ApiTags('Service Business - Zones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services-biz/zones')
export class ZonesController {
  constructor(private readonly service: ZonesService) {}

  @Post() @RequirePermissions(PERMISSIONS.SETTINGS_EDIT) create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertZoneDto) { return this.service.create(user, dto); }
  @Get() @RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW) list(@GetUser() user: AuthenticatedUser) { return this.service.list(user); }
  @Get(':id') @RequirePermissions(PERMISSIONS.SERVICE_JOBS_VIEW) getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') @RequirePermissions(PERMISSIONS.SETTINGS_EDIT) update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertZoneDto) { return this.service.update(user, id, dto); }
  @Delete(':id') @RequirePermissions(PERMISSIONS.SETTINGS_EDIT) remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
