import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PushService } from './push.service';
import { SendPushDto } from './dto/send-push.dto';

@ApiTags('Push (Business)')
@Controller('push')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PushController {
  constructor(private readonly svc: PushService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send push to specific customers or raw tokens' })
  send(@Body() dto: SendPushDto) {
    return this.svc.send(dto);
  }

  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast to a segment (all / active-last-30d / new-users)' })
  broadcast(
    @Body() body: {
      segment: 'all' | 'active-last-30d' | 'new-users';
      title: string; body: string;
      imageUrl?: string; actionUrl?: string; data?: any;
    },
  ) {
    return this.svc.broadcast(body.segment, {
      title: body.title, body: body.body,
      imageUrl: body.imageUrl, actionUrl: body.actionUrl, data: body.data,
    });
  }
}
