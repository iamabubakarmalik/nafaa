import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { WhatsappService } from './whatsapp.service';

@ApiTags('Integrations / WhatsApp Business')
@Controller('integrations/whatsapp')
export class WhatsappController {
  constructor(private readonly svc: WhatsappService) {}
  private tid(r: Request) { return (r as any).user?.tenantId as string; }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Post('configure')
  configure(@Req() r: Request, @Body() dto: any) { return this.svc.configure(this.tid(r), dto); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Post('activate')
  activate(@Req() r: Request) { return this.svc.activate(this.tid(r)); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Post('send')
  send(@Req() r: Request, @Body() dto: any) { return this.svc.sendMessage(this.tid(r), dto); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Post('templates')
  createTpl(@Req() r: Request, @Body() dto: any) { return this.svc.createTemplate(this.tid(r), dto); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Post('templates/:id/approve')
  approve(@Req() r: Request, @Param('id') id: string, @Body() body: { metaTemplateId: string }) {
    return this.svc.approveTemplate(this.tid(r), id, body.metaTemplateId);
  }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Get('templates')
  tpls(@Req() r: Request) { return this.svc.listTemplates(this.tid(r)); }

  @UseGuards(JwtAuthGuard) @ApiBearerAuth() @Get('messages')
  msgs(@Req() r: Request, @Query('limit') l?: string) { return this.svc.listMessages(this.tid(r), +(l ?? 50)); }

  @Public() @Post('webhook')
  webhook(@Body() body: any) { return this.svc.handleWebhook(body); }

  @Public() @Get('webhook')
  verify(@Query() q: any) {
    if (q['hub.mode'] === 'subscribe' && q['hub.verify_token']) {
      return q['hub.challenge'];
    }
    return { ok: false };
  }
}
