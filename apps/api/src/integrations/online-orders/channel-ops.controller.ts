import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ChannelOpsService } from './channel-ops.service';

/** Channel page: order status mapping, "Sync now" and the activity log. */
@ApiTags('Online Store')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-store/channels')
export class ChannelOpsController {
  constructor(private readonly ops: ChannelOpsService) {}

  @Get(':id/status-map')
  @ApiOperation({ summary: 'Channel status ↔ Nafaa board status mapping' })
  statusMap(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ops.statusMap(user, id);
  }

  @Put(':id/status-map')
  saveStatusMap(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { inbound?: Record<string, string>; outbound?: Record<string, string>; remove?: string[] }) {
    return this.ops.saveStatusMap(user, id, body ?? {});
  }

  @Post(':id/sync-now')
  @ApiOperation({ summary: 'Missed orders from the last 3 days, then stock and prices' })
  syncNow(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ops.syncNow(user, id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Sync + webhook logs, newest first, 30 per page' })
  logs(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('page') page?: string, @Query('filter') filter?: string) {
    return this.ops.logs(user, id, { page, filter });
  }
}
