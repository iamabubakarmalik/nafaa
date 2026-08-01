import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { GroomersService } from './groomers.service';
import { UpsertGroomerDto } from './dto/upsert-groomer.dto';

@ApiTags('Pet Shop - Groomers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('petshop/groomers')
export class GroomersController {
  constructor(private readonly service: GroomersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertGroomerDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('active') active?: string,
    @Query('availableToday') availableToday?: string,
    @Query('species') species?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      species, search,
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
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertGroomerDto) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
