import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { SeasonalPlansService } from './seasonal-plans.service';

@ApiTags('Agri - Seasonal Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agri/seasonal-plans')
export class SeasonalPlansController {
  constructor(private readonly service: SeasonalPlansService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('season') season?: string, @Query('year') year?: string, @Query('active') active?: string) {
    return this.service.list(user, {
      season, year: year ? Number(year) : undefined,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
    });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
