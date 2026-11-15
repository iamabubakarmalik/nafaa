/**
 * Live support on the app socket (namespace /realtime, next to
 * RealtimeGateway, which keeps its own rooms and events).
 *
 * Identity: the same access token as the REST API, checked here against
 * JWT_ACCESS_SECRET. Merchant and admin tokens are signed the same way; the
 * role tells them apart. Admins also need support.view (support.reply to
 * call). Tokens of other kinds (marketplace customers, partners) get no
 * support rooms and every support event answers { ok: false }.
 *
 * Calls (WebRTC): an invite rings the other side (every agent, or every open
 * merchant app of the shop). The first socket to accept is paired with the
 * caller; offers, answers, ICE candidates and media changes then go only
 * between those two sockets. When the call ends, is declined, times out or a
 * side disconnects, one CALL_EVENT line is written to the conversation.
 *
 * Recording: the admin app records the call (and, when switched on, a shared
 * screen) and says so with support:call:recording; the shop side is told so
 * it can show the notice. The files come in over REST (calls/:callId/recordings).
 */

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveAdminAccess } from '../../admin/access/admin-access';
import { SupportHub, supportRooms } from './support.hub';
import { SupportService, type SupportViewer } from './support.service';
import { SupportAdminService } from './support-admin.service';
import { SUPPORT_PERMS, adminCan, supportSideForRole } from './support.logic';
import { SUPPORT_EVENTS, type SupportCallInvite, type SupportCallMedia, type SupportCallOutcome, type SupportCallRecording, type SupportCallSignal } from './support.types';

interface SocketIdentity extends SupportViewer {
  name: string;
  canReply: boolean;
}

interface CallState {
  callId: string;
  conversationId: string;
  tenantId: string;
  media: SupportCallMedia;
  startedBy: 'MERCHANT' | 'ADMIN';
  callerUserId: string;
  callerSocket: string;
  calleeSocket: string | null;
  startedAt: Date;
  acceptedAt: Date | null;
  timer: NodeJS.Timeout | null;
  /** Whether the team recorded audio / a screen at any point in this call. */
  recorded: { audio: boolean; screen: boolean };
}

const RING_TIMEOUT_MS = 45_000;
const ok = { ok: true } as const;
const fail = (error: string) => ({ ok: false, error });

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/realtime',
  transports: ['websocket', 'polling'],
})
export class SupportGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Namespace;
  private readonly logger = new Logger(SupportGateway.name);
  private readonly calls = new Map<string, CallState>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly hub: SupportHub,
    private readonly support: SupportService,
    private readonly admin: SupportAdminService,
  ) {}

  afterInit(server: Namespace) {
    this.hub.attach(this.server ?? server);
  }

  /* ───────────────────────── connection ───────────────────────── */

  handleConnection(client: Socket) {
    // Handlers wait for this, so an event sent right after connecting is not lost.
    (client.data as Record<string, unknown>).supportReady = this.identify(client).catch(() => null);
  }

  private async identify(client: Socket): Promise<SocketIdentity | null> {
    const token =
      (client.handshake.auth?.token as string) ||
      (client.handshake.headers?.authorization as string)?.replace('Bearer ', '') ||
      (client.handshake.query?.token as string);
    if (!token) return null;
    let payload: { sub: string; tenantId?: string; role?: string; impersonatedBy?: string };
    try {
      payload = await this.jwt.verifyAsync(token, { secret: this.config.get<string>('JWT_ACCESS_SECRET')! });
    } catch {
      return null;
    }
    const side = supportSideForRole(payload.role, payload.tenantId);
    if (!side || !payload.sub) return null;
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { fullName: true, avatarUrl: true, isActive: true } });
    if (!user?.isActive) return null;

    if (side === 'ADMIN') {
      const access = await resolveAdminAccess(this.prisma, payload.sub, payload.role);
      if (!adminCan(access, SUPPORT_PERMS.view)) return null;
      const id: SocketIdentity = {
        id: payload.sub, side, tenantId: null, name: user.fullName,
        canReply: adminCan(access, SUPPORT_PERMS.reply), manage: adminCan(access, SUPPORT_PERMS.manage),
      };
      client.join([supportRooms.agents, supportRooms.agent(payload.sub)]);
      this.hub.presence.agentConnected(payload.sub, client.id, { name: user.fullName, avatarUrl: user.avatarUrl, canReply: id.canReply });
      (client.data as Record<string, unknown>).support = id;
      await this.broadcastPresence();
      return id;
    }

    const id: SocketIdentity = { id: payload.sub, side, tenantId: payload.tenantId ?? null, name: user.fullName, canReply: true, impersonatedBy: payload.impersonatedBy ?? null };
    client.join([supportRooms.tenant(id.tenantId!), supportRooms.merchants]);
    // Someone from the Nafaa team signed in as the shop is not the shop being online.
    if (!id.impersonatedBy) this.hub.presence.merchantConnected(id.tenantId!, client.id);
    (client.data as Record<string, unknown>).support = id;
    const team = this.hub.presence.team();
    client.emit(SUPPORT_EVENTS.presence, { team: { ...team, lastSeenAt: team.lastSeenAt?.toISOString() ?? null } });
    return id;
  }

  async handleDisconnect(client: Socket) {
    const id = (await this.who(client)) as SocketIdentity | null;
    if (!id) return;
    if (id.side === 'ADMIN') {
      this.hub.presence.agentDisconnected(id.id, client.id);
      void this.broadcastPresence();
    } else if (id.tenantId) {
      this.hub.presence.merchantDisconnected(id.tenantId, client.id);
    }
    for (const call of [...this.calls.values()]) {
      if (call.callerSocket === client.id || call.calleeSocket === client.id) {
        const otherSocket = call.callerSocket === client.id ? call.calleeSocket : call.callerSocket;
        if (otherSocket) this.server.to(otherSocket).emit(SUPPORT_EVENTS.callEnd, { conversationId: call.conversationId, callId: call.callId, reason: 'disconnected', from: { side: id.side, name: null } });
        else this.ringAudience(call).emit(SUPPORT_EVENTS.callCancel, { conversationId: call.conversationId, callId: call.callId, from: { side: id.side, name: null } });
        this.finishCall(call, call.acceptedAt ? 'completed' : 'missed');
      }
    }
  }

  private async who(client: Socket): Promise<SocketIdentity | null> {
    const data = client.data as Record<string, unknown>;
    if (data.support) return data.support as SocketIdentity;
    const ready = data.supportReady as Promise<SocketIdentity | null> | undefined;
    return ready ? ready : null;
  }

  private async broadcastPresence() {
    this.hub.broadcastPresence(await this.admin.agents());
  }

  private inRoom(client: Socket, conversationId: string) {
    return client.rooms.has(supportRooms.conversation(conversationId));
  }

  /* ───────────────────────── rooms, typing, receipts ───────────────────────── */

  @SubscribeMessage(SUPPORT_EVENTS.join)
  async onJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId?: string }) {
    const id = await this.who(client);
    if (!id || !data?.conversationId) return fail('unauthorized');
    if (!(await this.support.canJoin(id, data.conversationId))) return fail('not_found');
    client.join(supportRooms.conversation(data.conversationId));
    const c = await this.prisma.liveSupportConversation.findUnique({ where: { id: data.conversationId }, select: { assignedAdminId: true } });
    const team = this.hub.presence.team();
    const agentPerson = c?.assignedAdminId ? await this.support.person(c.assignedAdminId) : null;
    return { ...ok, presence: { team: { ...team, lastSeenAt: team.lastSeenAt?.toISOString() ?? null }, agent: this.support.agentRef(c?.assignedAdminId ?? null, agentPerson) } };
  }

  @SubscribeMessage(SUPPORT_EVENTS.leave)
  async onLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId?: string }) {
    if (data?.conversationId) client.leave(supportRooms.conversation(data.conversationId));
    return ok;
  }

  @SubscribeMessage(SUPPORT_EVENTS.typing)
  async onTyping(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId?: string; typing?: boolean }) {
    const id = await this.who(client);
    if (!id || !data?.conversationId || !this.inRoom(client, data.conversationId)) return fail('join_first');
    const name = id.side === 'ADMIN' ? id.name.split(/\s+/)[0] : id.name;
    this.hub.toConversation(data.conversationId, SUPPORT_EVENTS.typingEvent, { conversationId: data.conversationId, side: id.side, name, typing: !!data.typing }, client.id);
    // Merchant typing also shows in the inbox list.
    if (id.side === 'MERCHANT') this.hub.toAgents(SUPPORT_EVENTS.typingEvent, { conversationId: data.conversationId, side: id.side, name, typing: !!data.typing });
    return ok;
  }

  @SubscribeMessage(SUPPORT_EVENTS.read)
  async onRead(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId?: string }) {
    const id = await this.who(client);
    if (!id || !data?.conversationId) return fail('unauthorized');
    try {
      return await this.support.markRead(id, data.conversationId);
    } catch {
      return fail('not_found');
    }
  }

  @SubscribeMessage(SUPPORT_EVENTS.delivered)
  async onDelivered(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId?: string }) {
    const id = await this.who(client);
    if (!id || !data?.conversationId) return fail('unauthorized');
    try {
      return await this.support.markDelivered(id, data.conversationId);
    } catch {
      return fail('not_found');
    }
  }

  @SubscribeMessage(SUPPORT_EVENTS.setPresence)
  async onSetPresence(@ConnectedSocket() client: Socket, @MessageBody() data: { state?: string }) {
    const id = await this.who(client);
    if (!id || id.side !== 'ADMIN') return fail('unauthorized');
    if (data?.state !== 'online' && data?.state !== 'away') return fail('bad_state');
    this.hub.presence.setAgentState(id.id, data.state);
    await this.broadcastPresence();
    return ok;
  }

  /* ───────────────────────── calls ───────────────────────── */

  /** Who rings for an invite: every agent for a merchant call, every app of the shop for a team call. */
  private ringAudience(call: Pick<CallState, 'startedBy' | 'tenantId' | 'callerSocket'>) {
    const room = call.startedBy === 'MERCHANT' ? supportRooms.agents : supportRooms.tenant(call.tenantId);
    return this.server.to(room).except(call.callerSocket);
  }

  private finishCall(call: CallState, outcome: SupportCallOutcome) {
    if (!this.calls.has(call.callId)) return;
    this.calls.delete(call.callId);
    if (call.timer) clearTimeout(call.timer);
    const endedAt = new Date();
    const durationSec = call.acceptedAt ? Math.max(0, Math.round((endedAt.getTime() - call.acceptedAt.getTime()) / 1000)) : 0;
    void this.support.logCall(call.conversationId, {
      callId: call.callId, media: call.media, outcome, startedBy: call.startedBy, durationSec,
      startedAt: call.startedAt.toISOString(), endedAt: endedAt.toISOString(),
      ...((call.recorded.audio || call.recorded.screen) && { recorded: call.recorded }),
    }, call.callerUserId).catch((e) => this.logger.warn(`Call log failed: ${e instanceof Error ? e.message : e}`));
  }

  private async callFor(client: Socket, data: { conversationId?: string; callId?: string }) {
    const id = await this.who(client);
    if (!id || !data?.callId) return null;
    const call = this.calls.get(data.callId);
    if (!call || call.conversationId !== data.conversationId) return null;
    return { id, call };
  }

  @SubscribeMessage(SUPPORT_EVENTS.callInvite)
  async onCallInvite(@ConnectedSocket() client: Socket, @MessageBody() data: SupportCallInvite) {
    const id = await this.who(client);
    if (!id || !data?.conversationId || !data.callId) return fail('unauthorized');
    if (id.side === 'ADMIN' && !id.canReply) return fail('forbidden');
    if (data.media !== 'voice' && data.media !== 'screen') return fail('bad_media');
    if (this.calls.has(data.callId)) return fail('duplicate');
    if ([...this.calls.values()].some((c) => c.conversationId === data.conversationId)) return fail('busy');
    const c = await this.prisma.liveSupportConversation.findUnique({ where: { id: data.conversationId }, select: { tenantId: true } });
    if (!c || !(await this.support.canJoin(id, data.conversationId))) return fail('not_found');
    client.join(supportRooms.conversation(data.conversationId));
    const call: CallState = {
      callId: String(data.callId).slice(0, 64), conversationId: data.conversationId, tenantId: c.tenantId, media: data.media,
      startedBy: id.side, callerUserId: id.id, callerSocket: client.id, calleeSocket: null, startedAt: new Date(), acceptedAt: null, timer: null,
      recorded: { audio: false, screen: false },
    };
    call.timer = setTimeout(() => {
      if (call.acceptedAt) return;
      const evt = { conversationId: call.conversationId, callId: call.callId, reason: 'missed', from: { side: id.side, name: null } };
      this.ringAudience(call).emit(SUPPORT_EVENTS.callCancel, evt);
      this.server.to(call.callerSocket).emit(SUPPORT_EVENTS.callEnd, evt);
      this.finishCall(call, 'missed');
    }, RING_TIMEOUT_MS);
    this.calls.set(call.callId, call);
    this.ringAudience(call).emit(SUPPORT_EVENTS.callInvite, { conversationId: call.conversationId, callId: call.callId, media: call.media, from: { side: id.side, name: id.side === 'ADMIN' ? id.name.split(/\s+/)[0] : id.name } });
    return ok;
  }

  @SubscribeMessage(SUPPORT_EVENTS.callAccept)
  async onCallAccept(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId?: string; callId?: string }) {
    const r = await this.callFor(client, data);
    if (!r) return fail('no_call');
    const { id, call } = r;
    if (id.side === call.startedBy || call.calleeSocket) return fail('taken');
    if (id.side === 'ADMIN' && !id.canReply) return fail('forbidden');
    if (!(await this.support.canJoin(id, call.conversationId))) return fail('not_found');
    call.calleeSocket = client.id;
    call.acceptedAt = new Date();
    if (call.timer) clearTimeout(call.timer);
    client.join(supportRooms.conversation(call.conversationId));
    const evt = { conversationId: call.conversationId, callId: call.callId, by: client.id, from: { side: id.side, name: id.side === 'ADMIN' ? id.name.split(/\s+/)[0] : id.name } };
    // The caller starts the offer; everyone else who was ringing stops.
    this.server.to(call.callerSocket).emit(SUPPORT_EVENTS.callAccept, evt);
    this.ringAudience(call).except(client.id).emit(SUPPORT_EVENTS.callCancel, { ...evt, reason: 'answered_elsewhere' });
    return ok;
  }

  @SubscribeMessage(SUPPORT_EVENTS.callDecline)
  async onCallDecline(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId?: string; callId?: string }) {
    const r = await this.callFor(client, data);
    if (!r || r.call.calleeSocket) return fail('no_call');
    const { id, call } = r;
    if (id.side === call.startedBy) return fail('no_call');
    const evt = { conversationId: call.conversationId, callId: call.callId, from: { side: id.side, name: null } };
    this.server.to(call.callerSocket).emit(SUPPORT_EVENTS.callDecline, evt);
    this.ringAudience(call).emit(SUPPORT_EVENTS.callCancel, { ...evt, reason: 'declined' });
    this.finishCall(call, 'declined');
    return ok;
  }

  @SubscribeMessage(SUPPORT_EVENTS.callCancel)
  async onCallCancel(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId?: string; callId?: string }) {
    const r = await this.callFor(client, data);
    if (!r || r.call.callerSocket !== client.id || r.call.acceptedAt) return fail('no_call');
    this.ringAudience(r.call).emit(SUPPORT_EVENTS.callCancel, { conversationId: r.call.conversationId, callId: r.call.callId, reason: 'cancelled', from: { side: r.id.side, name: null } });
    this.finishCall(r.call, 'missed');
    return ok;
  }

  /** Offer / answer / ICE between the two paired sockets only. */
  @SubscribeMessage(SUPPORT_EVENTS.callSignal)
  async onCallSignal(@ConnectedSocket() client: Socket, @MessageBody() data: SupportCallSignal) {
    const r = await this.callFor(client, data);
    if (!r || !r.call.calleeSocket) return fail('no_call');
    if (data.type !== 'offer' && data.type !== 'answer' && data.type !== 'ice') return fail('bad_signal');
    const other = r.call.callerSocket === client.id ? r.call.calleeSocket : r.call.calleeSocket === client.id ? r.call.callerSocket : null;
    if (!other) return fail('not_in_call');
    this.server.to(other).emit(SUPPORT_EVENTS.callSignal, {
      conversationId: data.conversationId, callId: data.callId, type: data.type, sdp: data.sdp ?? undefined, candidate: data.candidate ?? undefined,
      from: { side: r.id.side, name: null },
    });
    return ok;
  }

  @SubscribeMessage(SUPPORT_EVENTS.callMedia)
  async onCallMedia(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId?: string; callId?: string; screen?: boolean; muted?: boolean }) {
    const r = await this.callFor(client, data);
    if (!r || !r.call.calleeSocket) return fail('no_call');
    const other = r.call.callerSocket === client.id ? r.call.calleeSocket : r.call.calleeSocket === client.id ? r.call.callerSocket : null;
    if (!other) return fail('not_in_call');
    if (data.screen) r.call.media = 'screen';
    this.server.to(other).emit(SUPPORT_EVENTS.callMedia, { conversationId: data.conversationId, callId: data.callId, screen: !!data.screen, muted: !!data.muted, from: { side: r.id.side, name: null } });
    return ok;
  }

  /** Admin in the call says what it is recording; the shop side shows the notice. A failure is only logged. */
  @SubscribeMessage(SUPPORT_EVENTS.callRecording)
  async onCallRecording(@ConnectedSocket() client: Socket, @MessageBody() data: SupportCallRecording) {
    const r = await this.callFor(client, data);
    if (!r || !r.call.calleeSocket) return fail('no_call');
    if (r.id.side !== 'ADMIN') return fail('forbidden');
    const other = r.call.callerSocket === client.id ? r.call.calleeSocket : r.call.calleeSocket === client.id ? r.call.callerSocket : null;
    if (!other) return fail('not_in_call');
    if (typeof data.error === 'string' && data.error) {
      this.logger.warn(`Call ${r.call.callId} (conversation ${r.call.conversationId}): recording failed on the admin app: ${data.error.slice(0, 300)}`);
    }
    if (data.audio) r.call.recorded.audio = true;
    if (data.screen) r.call.recorded.screen = true;
    this.server.to(other).emit(SUPPORT_EVENTS.callRecording, {
      conversationId: r.call.conversationId, callId: r.call.callId, audio: !!data.audio, screen: !!data.screen, from: { side: 'ADMIN', name: null },
    });
    return ok;
  }

  @SubscribeMessage(SUPPORT_EVENTS.callEnd)
  async onCallEnd(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId?: string; callId?: string }) {
    const r = await this.callFor(client, data);
    if (!r) return fail('no_call');
    const { call, id } = r;
    if (client.id !== call.callerSocket && client.id !== call.calleeSocket) return fail('not_in_call');
    const evt = { conversationId: call.conversationId, callId: call.callId, reason: 'ended', from: { side: id.side, name: null } };
    const other = call.callerSocket === client.id ? call.calleeSocket : call.callerSocket;
    if (other) this.server.to(other).emit(SUPPORT_EVENTS.callEnd, evt);
    else this.ringAudience(call).emit(SUPPORT_EVENTS.callCancel, evt);
    this.finishCall(call, call.acceptedAt ? 'completed' : 'missed');
    return ok;
  }
}
