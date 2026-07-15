import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { MechanicsService } from './mechanics.service';

@ApiTags('Auto Parts - Mechanics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('autoparts/mechanics')
export class MechanicsController {
  constructor(private readonly service: MechanicsService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('available') available?: string, @Query('search') search?: string) {
    return this.service.list(user, { available: available === 'true' ? true : available === 'false' ? false : undefined, search });
  }
  @Get('by-staff/:staffId') byStaff(@GetUser() user: AuthenticatedUser, @Param('staffId') staffId: string) { return this.service.byStaff(user, staffId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/toggle-availability') toggle(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.toggleAvailability(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
