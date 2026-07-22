import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CuttingJobsService } from './cutting-jobs.service';

@ApiTags('Meat - Cutting Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meat/cutting-jobs')
export class CuttingJobsController {
  constructor(private readonly service: CuttingJobsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('butcherId') butcherId?: string) { return this.service.list(user, { status, butcherId }); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/complete') complete(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.complete(user, id, dto); }
}
