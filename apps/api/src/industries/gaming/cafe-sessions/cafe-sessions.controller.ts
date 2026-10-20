import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CafeSessionsService } from './cafe-sessions.service';
import { CloseSaleDto, EndSessionDto, StartSessionDto } from './dto/start-session.dto';

/** Running the stations is counter work: every action needs POS use. */
@ApiTags('Gaming - Cafe Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.POS_USE)
@Controller('gaming/cafe-sessions')
export class CafeSessionsController {
  constructor(private readonly service: CafeSessionsService) {}

  @Post('start') start(@GetUser() user: AuthenticatedUser, @Body() dto: StartSessionDto) { return this.service.start(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('stationId') stationId?: string, @Query('from') from?: string, @Query('to') to?: string,
    @Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.list(user, { status, stationId, from, to, search, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });
  }
  @Get('active') active(@GetUser() user: AuthenticatedUser) { return this.service.activeStations(user); }
  /** Running sessions and the Station time product for the counter. */
  @Get('counter') counter(@GetUser() user: AuthenticatedUser) { return this.service.counter(user); }
  /** Closes the sessions a counter bill paid for. */
  @Post('close-sale') closeSale(@GetUser() user: AuthenticatedUser, @Body() dto: CloseSaleDto) { return this.service.closeSale(user, dto); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/pause') pause(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.pause(user, id); }
  @Post(':id/resume') resume(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.resume(user, id); }
  @Post(':id/end') end(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: EndSessionDto) { return this.service.end(user, id, dto); }
  @Post(':id/cancel') cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string }) { return this.service.cancel(user, id, body?.reason); }
}
