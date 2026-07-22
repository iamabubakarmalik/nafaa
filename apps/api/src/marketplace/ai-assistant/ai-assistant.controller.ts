import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { GetCustomer } from '../_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../auth/interfaces/customer-jwt.interface';
import { AiAssistantService } from './ai-assistant.service';

@ApiTags('Marketplace / AI Shopping Assistant')
@Controller('marketplace/ai-assistant')
export class AiAssistantController {
  constructor(private readonly svc: AiAssistantService) {}

  @Public() @Post('start')
  start(@Body() body: { query: string; language?: string }, @Req() r: Request) {
    const cid = (r as any).customer?.id;
    return this.svc.startConversation(cid, body.query, body.language ?? 'ur');
  }

  @Public() @Post('continue')
  continue_(@Body() body: { sessionId: string; message: string }) {
    return this.svc.continueConversation(body.sessionId, body.message);
  }

  @Public() @Get('conversation/:sessionId')
  get(@Param('sessionId') sessionId: string) { return this.svc.getConversation(sessionId); }

  @UseGuards(CustomerAuthGuard) @ApiBearerAuth() @Post('recommendations/generate')
  generate(@GetCustomer() c: AuthenticatedCustomer) { return this.svc.generateRecommendations(c.id); }

  @UseGuards(CustomerAuthGuard) @ApiBearerAuth() @Get('recommendations')
  recommendations(@GetCustomer() c: AuthenticatedCustomer, @Query('limit') l?: string) {
    return this.svc.getRecommendations(c.id, +(l ?? 20));
  }

  @UseGuards(CustomerAuthGuard) @ApiBearerAuth() @Post('track')
  track(@GetCustomer() c: AuthenticatedCustomer, @Body() body: { productId: string; action: 'viewed' | 'clicked' | 'purchased' }) {
    return this.svc.trackAction(c.id, body.productId, body.action);
  }
}
