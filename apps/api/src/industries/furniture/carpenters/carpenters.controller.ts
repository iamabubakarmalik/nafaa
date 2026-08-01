import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CarpentersService } from './carpenters.service';
import { UpsertCarpenterDto } from './dto/upsert-carpenter.dto';

@ApiTags('Furniture - Carpenters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('furniture/carpenters')
export class CarpentersController {
  constructor(private readonly service: CarpentersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertCarpenterDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('active') active?: string,
    @Query('workshop') workshop?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      workshop, search,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }
  @Get('top') top(@GetUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.service.topPerformers(user, limit ? Number(limit) : 10);
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Get(':id/workload') workload(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('from') from: string, @Query('to') to: string) {
    return this.service.workload(user, id, from, to);
  }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertCarpenterDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
