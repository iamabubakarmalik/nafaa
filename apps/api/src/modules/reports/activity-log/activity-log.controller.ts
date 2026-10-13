/** /activity-log: the plain latest list (mobile) and the filtered feed (web). */

import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ActivityLogService } from './activity-log.service';
import { ActivityFeedDto } from './dto/activity-feed.dto';

@ApiTags('Activity Log')
@ApiBearerAuth()
@Controller('activity-log')
export class ActivityLogController {
  constructor(private readonly service: ActivityLogService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser) {
    return this.service.list(user);
  }

  @Get('feed')
  feed(@GetUser() user: AuthenticatedUser, @Query() q: ActivityFeedDto) {
    return this.service.feed(user, q);
  }
}
