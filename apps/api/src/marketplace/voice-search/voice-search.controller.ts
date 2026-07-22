import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { VoiceSearchService } from './voice-search.service';

@ApiTags('Marketplace / Voice Search')
@Controller('marketplace/voice-search')
export class VoiceSearchController {
  constructor(private readonly svc: VoiceSearchService) {}

  @Public() @Post('search')
  search(@Body() body: { transcript: string; language?: string; audioUrl?: string; durationMs?: number }, @Req() req: Request) {
    const cid = (req as any).customer?.id;
    return this.svc.search({ ...body, customerId: cid });
  }

  @UseGuards(CustomerAuthGuard) @ApiBearerAuth()
  @Post('click')
  click(@Body() body: { logId: string; productId: string }, @Req() req: Request) {
    const cid = (req as any).customer?.id;
    return this.svc.logClick(cid, body.productId, body.logId);
  }
}
