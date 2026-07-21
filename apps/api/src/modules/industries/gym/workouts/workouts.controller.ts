import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { WorkoutsService } from './workouts.service';

@ApiTags('Gym - Workouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/workouts')
export class WorkoutsController {
  constructor(private readonly service: WorkoutsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get('by-member/:memberId') list(@GetUser() user: AuthenticatedUser, @Param('memberId') memberId: string) { return this.service.list(user, memberId); }
  @Get('summary/:memberId') summary(@GetUser() user: AuthenticatedUser, @Param('memberId') memberId: string) { return this.service.summary(user, memberId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
