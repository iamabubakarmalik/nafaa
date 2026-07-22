import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagingService } from './messaging.service';
import { CreateTemplateDto } from './dto/template.dto';
import { CreateCampaignDto } from './dto/campaign.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Messaging Hub')
@Controller('messaging')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagingController {
  constructor(private readonly svc: MessagingService) {}
  private tid(r: Request) { return (r as any).user?.tenantId as string; }
  private uid(r: Request) { return (r as any).user?.id as string; }

  // TEMPLATES
  @Post('templates') createTpl(@Req() r: Request, @Body() dto: CreateTemplateDto) { return this.svc.createTemplate(this.tid(r), dto); }
  @Get('templates') listTpl(@Req() r: Request, @Query('channel') channel?: any) { return this.svc.listTemplates(this.tid(r), channel); }
  @Patch('templates/:id') updateTpl(@Req() r: Request, @Param('id') id: string, @Body() dto: Partial<CreateTemplateDto>) { return this.svc.updateTemplate(this.tid(r), id, dto); }
  @Delete('templates/:id') deleteTpl(@Req() r: Request, @Param('id') id: string) { return this.svc.deleteTemplate(this.tid(r), id); }

  // CAMPAIGNS
  @Post('campaigns') createCamp(@Req() r: Request, @Body() dto: CreateCampaignDto) { return this.svc.createCampaign(this.tid(r), dto); }
  @Get('campaigns') listCamp(@Req() r: Request, @Query('status') status?: any) { return this.svc.listCampaigns(this.tid(r), status); }
  @Post('campaigns/:id/launch') launch(@Req() r: Request, @Param('id') id: string) { return this.svc.launchCampaign(this.tid(r), id); }

  // DIRECT SEND
  @Post('send') send(@Req() r: Request, @Body() dto: SendMessageDto) { return this.svc.sendDirect(this.tid(r), dto); }

  // LOGS
  @Get('logs') logs(@Req() r: Request, @Query() q: any) {
    return this.svc.listLogs(this.tid(r), { channel: q.channel, limit: +(q.limit ?? 50), offset: +(q.offset ?? 0) });
  }

  // CONVERSATIONS
  @Get('conversations') convs(@Req() r: Request) { return this.svc.listConversations(this.tid(r)); }
  @Get('conversations/:id') conv(@Req() r: Request, @Param('id') id: string) { return this.svc.getConversation(this.tid(r), id); }
  @Post('conversations/:id/reply')
  reply(@Req() r: Request, @Param('id') id: string, @Body() body: { message: string }) {
    return this.svc.replyConversation(this.tid(r), id, body.message, this.uid(r));
  }
}
