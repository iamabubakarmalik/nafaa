import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { TournamentsService } from './tournaments.service';

@ApiTags('Gaming - Tournaments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gaming/tournaments')
export class TournamentsController {
  constructor(private readonly service: TournamentsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('platform') platform?: string, @Query('upcoming') upcoming?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, platform, upcoming: upcoming === 'true', search });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.update(user, id, dto); }
  @Post(':id/register') register(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.registerParticipant(user, id); }
  @Post(':id/complete') complete(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { winnerName: string; runnerUpName?: string }) {
    return this.service.completeTournament(user, id, body.winnerName, body.runnerUpName);
  }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
