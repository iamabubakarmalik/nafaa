import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { OptometristsService } from './optometrists.service';
import { UpsertOptometristDto } from './dto/upsert-optometrist.dto';

@ApiTags('Optical - Optometrists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('optical/optometrists')
export class OptometristsController {
  constructor(private readonly service: OptometristsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertOptometristDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('active') active?: string,
    @Query('availableToday') availableToday?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      search,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      availableToday: availableToday === 'true',
    });
  }
  @Get('top') top(@GetUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.service.topPerformers(user, limit ? Number(limit) : 10);
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Get(':id/workload') workload(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('from') from: string, @Query('to') to: string) {
    return this.service.workload(user, id, from, to);
  }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertOptometristDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
