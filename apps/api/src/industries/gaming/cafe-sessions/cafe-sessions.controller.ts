import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CafeSessionsService } from './cafe-sessions.service';
import { EndSessionDto, StartSessionDto } from './dto/start-session.dto';

@ApiTags('Gaming - Cafe Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gaming/cafe-sessions')
export class CafeSessionsController {
  constructor(private readonly service: CafeSessionsService) {}

  @Post('start') start(@GetUser() user: AuthenticatedUser, @Body() dto: StartSessionDto) { return this.service.start(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('stationId') stationId?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.list(user, { status, stationId, from, to });
  }
  @Get('active') active(@GetUser() user: AuthenticatedUser) { return this.service.activeStations(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/pause') pause(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.pause(user, id); }
  @Post(':id/resume') resume(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.resume(user, id); }
  @Post(':id/end') end(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: EndSessionDto) { return this.service.end(user, id, dto); }
  @Post(':id/cancel') cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string }) { return this.service.cancel(user, id, body.reason); }
}
