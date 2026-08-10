import {
  Body, Controller, Get, Param, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { MarketingAdminGuard } from '../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../_shared/guards/marketing-permissions.guard';
import { RequireMarketingPermissions } from '../_shared/decorators/marketing-permissions.decorator';
import { MARKETING_PERMISSIONS } from '../_shared/constants/marketing-permissions.constants';
import { ChatbotService } from './chatbot.service';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { TakeoverDto } from './dto/takeover.dto';

@Controller('admin/marketing/chatbot')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
export class ChatbotController {
  constructor(private readonly svc: ChatbotService) {}

  @Get('stats')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CHATBOT_VIEW)
  stats() { return this.svc.getStats(); }

  @Get('conversations')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CHATBOT_VIEW)
  list(@Query() dto: ListConversationsDto) { return this.svc.listConversations(dto); }

  @Get('conversations/:id')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CHATBOT_VIEW)
  get(@Param('id') id: string) { return this.svc.getConversation(id); }

  @Post('conversations/:id/takeover')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CHATBOT_HANDLE)
  takeover(@Param('id') id: string, @Body() dto: TakeoverDto, @Req() req: any) {
    return this.svc.takeOver(id, dto, req.user.id);
  }

  @Post('conversations/:id/messages')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CHATBOT_HANDLE)
  send(@Param('id') id: string, @Body() dto: SendMessageDto, @Req() req: any) {
    return this.svc.sendMessage(id, dto, req.user.id);
  }

  @Post('conversations/:id/resolve')
  @RequireMarketingPermissions(MARKETING_PERMISSIONS.CHATBOT_HANDLE)
  resolve(
    @Param('id') id: string,
    @Body() body: { summary?: string },
    @Req() req: any,
  ) {
    return this.svc.resolve(id, req.user.id, body.summary);
  }
}
