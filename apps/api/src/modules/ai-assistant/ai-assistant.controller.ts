/**
 * Nafaa AI endpoints. Every route needs ai.use (route rule and decorator);
 * each tool then checks the permission of the data it reads. See ai.types.ts
 * for the request and response shapes.
 */

import {
  Body, Controller, Delete, ForbiddenException, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../common/shop-scope';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS, hasPermission } from '../../common/constants/permissions.constants';
import { AiChatService, AiRefusal } from './ai-chat.service';
import { AiToolsService } from './ai-tools.service';
import { MorningSummaryService } from './morning-summary.service';
import { AiActionConfirmDto, AiChatDto, AiFeedbackDto, AiListDto, AiReorderDto, AiUpdateChatDto } from './dto/ai.dto';
import { AiActionsService } from './ai-actions.service';

@ApiTags('Nafaa AI')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.AI_USE)
@Controller('ai')
export class AiAssistantController {
  constructor(
    private readonly chat: AiChatService,
    private readonly tools: AiToolsService,
    private readonly morning: MorningSummaryService,
    private readonly actions: AiActionsService,
  ) {}

  @Get('status')
  status(@GetUser() user: AuthenticatedUser) {
    return this.chat.status(user);
  }

  /** Streams one answer as server-sent events (text/event-stream). */
  @Post('chat')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async ask(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() body: AiChatDto, @Res() res: Response) {
    let run: Awaited<ReturnType<AiChatService['prepare']>>;
    try {
      run = await this.chat.prepare(user, shop, body);
    } catch (e) {
      if (e instanceof AiRefusal) {
        res.status(e.status).json({ success: false, code: e.code, message: e.message, statusCode: e.status });
        return;
      }
      throw e;
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('X-Nafaa-AI-Route', this.chat.engineTag(run));
    res.flushHeaders?.();

    const abort = new AbortController();
    // The client closed the stream (Stop button, page closed): stop the model call.
    res.on('close', () => { if (!res.writableEnded) abort.abort(); });
    const emit = (event: string, data: unknown) => {
      if (res.writableEnded || res.destroyed) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    const ping = setInterval(() => { if (!res.writableEnded) res.write(': ping\n\n'); }, 15_000);
    try {
      await this.chat.stream(run, emit, abort.signal);
    } catch {
      emit('error', { code: 'PROVIDER', message: 'Jawab banane me masla hua. Dobara koshish karein.' });
    } finally {
      clearInterval(ping);
      if (!res.writableEnded) res.end();
    }
  }

  @Get('conversations')
  list(@GetUser() user: AuthenticatedUser, @Query() q: AiListDto) {
    return this.chat.listChats(user, q.q, q.limit);
  }

  @Get('conversations/:id')
  async get(@GetUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const c = await this.chat.getChat(user, id);
    if (!c) throw new NotFoundException('Ye baat-cheet nahi mili');
    return c;
  }

  @Patch('conversations/:id')
  async update(@GetUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: AiUpdateChatDto) {
    const c = await this.chat.updateChat(user, id, body);
    if (!c) throw new NotFoundException('Ye baat-cheet nahi mili');
    return c;
  }

  @Delete('conversations/:id')
  async remove(@GetUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    if (!(await this.chat.deleteChat(user, id))) throw new NotFoundException('Ye baat-cheet nahi mili');
    return { ok: true };
  }

  @Post('messages/:id/feedback')
  @HttpCode(200)
  async feedback(@GetUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: AiFeedbackDto) {
    if (!(await this.chat.feedback(user, id, body.value))) throw new NotFoundException('Ye jawab nahi mila');
    return { ok: true };
  }

  @Get('usage')
  usage(@GetUser() user: AuthenticatedUser) {
    return this.chat.usage(user);
  }

  @Get('morning-summary')
  morningSummary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.morning.forUser(user, shop);
  }

  /** Reorder suggestions grouped by branch and supplier, for the "Purchase banayein" panel. */
  @Get('reorder')
  async reorder(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: AiReorderDto) {
    if (!hasPermission(user.role, user.permissions, PERMISSIONS.LOW_STOCK_VIEW)) {
      throw new ForbiddenException('Low stock dekhne ki permission aap ke paas nahi');
    }
    const ctx = await this.tools.context(user, shop);
    const r = await this.tools.reorder(ctx, { leadDays: q.leadDays, coverDays: q.coverDays, historyDays: q.historyDays, mode: 'reorder' });
    return this.tools.toReorderPayload(ctx, r, 200);
  }

  /**
   * Runs a proposed action after the user pressed Confirm. Single use, same
   * user, tenant and branch view, within 10 minutes; the permission is checked
   * again and the app's own service does the write.
   */
  @Post('actions/:id/confirm')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  confirmAction(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id', ParseUUIDPipe) id: string, @Body() body: AiActionConfirmDto) {
    return this.actions.confirm(user, shop, id, body.fields ?? {});
  }

  @Post('actions/:id/cancel')
  @HttpCode(200)
  cancelAction(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id', ParseUUIDPipe) id: string) {
    return this.actions.cancel(user, shop, id);
  }

  /** Platform totals for the super admin: tenants, messages, tokens and cost. */
  @Get('admin/usage')
  adminUsage(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) {
    if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Sirf Nafaa admin ke liye');
    return this.chat.platformUsage(Number(days) || 30);
  }
}
