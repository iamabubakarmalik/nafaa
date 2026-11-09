import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { WhatsappService } from './whatsapp.service';

/**
 * WhatsApp Cloud API for online orders. Reading needs `online_orders.view`,
 * writes `online_orders.manage` (permission-routes); connecting, settings
 * and templates are also limited to owners and managers in the service.
 */
@ApiTags('Integrations / WhatsApp Business')
@ApiBearerAuth()
@Controller('integrations/whatsapp')
export class WhatsappController {
  constructor(private readonly svc: WhatsappService) {}

  @Get('status')
  status(@GetUser() user: AuthenticatedUser) { return this.svc.status(user); }

  @Get('numbers')
  numbers(@GetUser() user: AuthenticatedUser) { return this.svc.numbers(user); }

  @Post('connect')
  connect(@GetUser() user: AuthenticatedUser, @Body() body: { wabaId?: string; phoneNumberId?: string }) { return this.svc.connect(user, body ?? {}); }

  @Post('disconnect')
  disconnect(@GetUser() user: AuthenticatedUser) { return this.svc.disconnect(user); }

  @Put('settings')
  settings(@GetUser() user: AuthenticatedUser, @Body() body: Parameters<WhatsappService['saveSettings']>[1]) { return this.svc.saveSettings(user, body ?? {}); }

  @Post('templates/submit')
  submit(@GetUser() user: AuthenticatedUser, @Body() body: { keys?: string[] }) { return this.svc.submitTemplates(user, body ?? {}); }

  @Post('templates/sync')
  sync(@GetUser() user: AuthenticatedUser) { return this.svc.syncNow(user); }

  @Post('test')
  test(@GetUser() user: AuthenticatedUser, @Body() body: { phone?: string }) { return this.svc.test(user, body ?? {}); }

  @Post('orders/:id/send')
  send(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { key?: string }) { return this.svc.sendNow(user, id, body ?? {}); }

  @Get('messages')
  messages(@GetUser() user: AuthenticatedUser, @Query() q: { direction?: string; orderId?: string; limit?: string }) { return this.svc.messages(user, q); }
}

