import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { TemperatureLogService } from './temperature-log.service';

@ApiTags('Pharmacy - Temperature Log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pharmacy/temperature-log')
export class TemperatureLogController {
  constructor(private readonly service: TemperatureLogService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('location') location?: string, @Query('withinRange') withinRange?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.list(user, { location, withinRange: withinRange === 'true' ? true : withinRange === 'false' ? false : undefined, from, to });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.service.summary(user, days ? parseInt(days) : 7);
  }
}
