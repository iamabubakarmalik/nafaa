import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { PersonalTrainingService } from './personal-training.service';

@ApiTags('Gym - Personal Training')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/personal-training')
export class PersonalTrainingController {
  constructor(private readonly service: PersonalTrainingService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('memberId') memberId?: string, @Query('trainerId') trainerId?: string, @Query('status') status?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.list(user, { memberId, trainerId, status, from, to });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/status') status(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string; cancellationReason?: string }) { return this.service.updateStatus(user, id, body.status, body.cancellationReason); }
  @Post(':id/rate') rate(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { rating: number; feedback?: string }) { return this.service.rate(user, id, body.rating, body.feedback); }
  @Post(':id/workout-log') log(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.logWorkout(user, id, dto); }
}
