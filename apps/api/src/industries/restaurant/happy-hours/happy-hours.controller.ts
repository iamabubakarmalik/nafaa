import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { HappyHoursService } from './happy-hours.service';
import { UpsertHappyHourDto } from './dto/upsert-happy-hour.dto';

@ApiTags('Restaurant - Happy Hours')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/happy-hours')
export class HappyHoursController {
  constructor(private readonly service: HappyHoursService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertHappyHourDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('active') active?: string) { return this.service.list(user, active === 'true'); }
  @Get('active-now') activeNow(@GetUser() user: AuthenticatedUser) { return this.service.findActiveNow(user); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertHappyHourDto) { return this.service.update(user, id, dto); }
  @Post(':id/toggle') toggle(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.toggle(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}