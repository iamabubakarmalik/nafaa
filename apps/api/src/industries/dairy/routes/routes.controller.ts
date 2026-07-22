import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RoutesService } from './routes.service';
import { UpsertRouteDto } from './dto/upsert-route.dto';

@ApiTags('Dairy - Routes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dairy/routes')
export class RoutesController {
  constructor(private readonly service: RoutesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertRouteDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('slot') slot?: string, @Query('status') status?: string, @Query('active') active?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      slot, status, search,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Get(':id/today-deliveries') today(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.todayDeliveries(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertRouteDto) { return this.service.update(user, id, dto); }
  @Post(':id/recalculate') recalc(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.recalculateStats(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
