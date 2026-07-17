import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { RatePlansService } from './rate-plans.service';

@ApiTags('Hotel - Rate Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel/rate-plans')
export class RatePlansController {
  constructor(private readonly service: RatePlansService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('active') active?: string, @Query('planType') planType?: string) {
    return this.service.list(user, {
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      planType,
    });
  }
  @Get('applicable') applicable(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.applicableFor(user, { date: q.date, roomTypeId: q.roomTypeId, source: q.source });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
