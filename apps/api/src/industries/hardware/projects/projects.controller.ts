import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { ProjectsService } from './projects.service';
import { UpsertProjectDto, UpdateProjectStatusDto } from './dto/upsert-project.dto';

/** Contractor sites: customer records (customers.view / customers.edit). */
@ApiTags('Hardware - Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hardware/projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT)
  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertProjectDto) { return this.service.create(user, dto); }
  @RequirePermissions(PERMISSIONS.CUSTOMERS_VIEW)
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('city') city?: string, @Query('search') search?: string, @Query('active') active?: string) {
    return this.service.list(user, { status, customerId, city, search, active: active === 'true' ? true : active === 'false' ? false : undefined });
  }
  @RequirePermissions(PERMISSIONS.CUSTOMERS_VIEW)
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT)
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertProjectDto) { return this.service.update(user, id, dto); }
  @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT)
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateProjectStatusDto) { return this.service.updateStatus(user, id, dto); }
  @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT)
  @Post(':id/recalculate') recalculate(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.recalculateFinancials(user, id); }
  @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT)
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
