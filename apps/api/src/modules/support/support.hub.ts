/**
 * The live-support side of the app socket: room names, emits and presence.
 * SupportGateway hands it the socket.io namespace on start; services inject
 * the hub to push events without depending on the gateway.
 */

import { Injectable } from '@nestjs/common';
import type { Namespace, Server } from 'socket.io';
import { SupportPresence } from './support.presence';
import { SUPPORT_EVENTS } from './support.types';

export const supportRooms = {
  tenant: (tenantId: string) => `support:tenant:${tenantId}`,
  agents: 'support:agents',
  /** Every merchant socket (team presence goes here). */
  merchants: 'support:merchants',
  conversation: (id: string) => `support:conv:${id}`,
  agent: (userId: string) => `support:admin:${userId}`,
};

@Injectable()
export class SupportHub {
  readonly presence = new SupportPresence();
  private server: Server | Namespace | null = null;

  attach(server: Server | Namespace) {
    this.server = server;
  }

  private to(room: string) {
    return this.server?.to(room) ?? null;
  }

  toMerchants(tenantId: string, event: string, data: unknown) {
    this.to(supportRooms.tenant(tenantId))?.emit(event, data);
  }

  toAgents(event: string, data: unknown) {
    this.to(supportRooms.agents)?.emit(event, data);
  }

  toAgent(userId: string, event: string, data: unknown) {
    this.to(supportRooms.agent(userId))?.emit(event, data);
  }

  toConversation(conversationId: string, event: string, data: unknown, exceptSocketId?: string) {
    if (!this.server) return;
    const room = this.server.to(supportRooms.conversation(conversationId));
    (exceptSocketId ? room.except(exceptSocketId) : room).emit(event, data);
  }

  /** Team presence to every merchant, full agent list to every agent. */
  broadcastPresence(agents: unknown[]) {
    const t = this.presence.team();
    const team = { ...t, lastSeenAt: t.lastSeenAt ? t.lastSeenAt.toISOString() : null };
    this.to(supportRooms.merchants)?.emit(SUPPORT_EVENTS.presence, { team });
    this.toAgents(SUPPORT_EVENTS.presence, { team, agents });
  }
}
