import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { TrainersService } from './trainers.service';

@ApiTags('Gym - Trainers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/trainers')
export class TrainersController {
  constructor(private readonly service: TrainersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('role') role?: string, @Query('available') available?: string, @Query('search') search?: string) {
    return this.service.list(user, {
      role, search,
      available: available === 'true' ? true : available === 'false' ? false : undefined,
    });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Get(':id/availability') availability(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('date') date: string) { return this.service.availability(user, id, date); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
