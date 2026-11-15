/**
 * Who is connected to live support right now, kept in memory (not written per
 * heartbeat). Agents: their sockets and chosen state (online / away).
 * Merchants: connected sockets per shop, so the team sees "online now" and
 * the offline-reply email goes out only when nobody from the shop is in the app.
 *
 * "Last seen" for an agent who is not connected comes from User.lastSeenAt
 * (written by the presence interceptor on every API call).
 */

import type { SupportAgentState } from './support.types';

interface AgentEntry {
  name: string;
  avatarUrl: string | null;
  sockets: Set<string>;
  chosen: 'online' | 'away';
  lastSeenAt: Date;
  canReply: boolean;
}

export interface AgentSnapshot {
  id: string;
  name: string;
  avatarUrl: string | null;
  state: SupportAgentState;
  lastSeenAt: Date;
  canReply: boolean;
}

export class SupportPresence {
  private readonly agents = new Map<string, AgentEntry>();
  private readonly merchants = new Map<string, Set<string>>();

  agentConnected(userId: string, socketId: string, info: { name: string; avatarUrl: string | null; canReply: boolean }, now = new Date()) {
    const e = this.agents.get(userId) ?? { name: info.name, avatarUrl: info.avatarUrl, sockets: new Set<string>(), chosen: 'online' as const, lastSeenAt: now, canReply: info.canReply };
    e.name = info.name;
    e.avatarUrl = info.avatarUrl;
    e.canReply = info.canReply;
    e.sockets.add(socketId);
    e.lastSeenAt = now;
    this.agents.set(userId, e);
  }

  agentDisconnected(userId: string, socketId: string, now = new Date()) {
    const e = this.agents.get(userId);
    if (!e) return;
    e.sockets.delete(socketId);
    e.lastSeenAt = now;
  }

  setAgentState(userId: string, state: 'online' | 'away', now = new Date()): boolean {
    const e = this.agents.get(userId);
    if (!e) return false;
    e.chosen = state;
    e.lastSeenAt = now;
    return true;
  }

  agentState(userId: string): SupportAgentState {
    const e = this.agents.get(userId);
    if (!e || !e.sockets.size) return 'offline';
    return e.chosen;
  }

  agent(userId: string): AgentSnapshot | null {
    const e = this.agents.get(userId);
    return e ? { id: userId, name: e.name, avatarUrl: e.avatarUrl, state: this.agentState(userId), lastSeenAt: e.lastSeenAt, canReply: e.canReply } : null;
  }

  allAgents(): AgentSnapshot[] {
    return [...this.agents.keys()].map((id) => this.agent(id)!).filter(Boolean);
  }

  /** Agents online (not away) who may reply: the round-robin pool. */
  onlineRepliers(): string[] {
    return this.allAgents().filter((a) => a.state === 'online' && a.canReply).map((a) => a.id);
  }

  /** The team as the merchant sees it. */
  team(): { state: SupportAgentState; online: number; away: number; lastSeenAt: Date | null } {
    let online = 0;
    let away = 0;
    let last: Date | null = null;
    for (const a of this.allAgents()) {
      if (!a.canReply) continue;
      if (a.state === 'online') online++;
      else if (a.state === 'away') away++;
      if (!last || a.lastSeenAt > last) last = a.lastSeenAt;
    }
    return { state: online ? 'online' : away ? 'away' : 'offline', online, away, lastSeenAt: last };
  }

  merchantConnected(tenantId: string, socketId: string) {
    const s = this.merchants.get(tenantId) ?? new Set<string>();
    s.add(socketId);
    this.merchants.set(tenantId, s);
  }

  merchantDisconnected(tenantId: string, socketId: string) {
    const s = this.merchants.get(tenantId);
    if (!s) return;
    s.delete(socketId);
    if (!s.size) this.merchants.delete(tenantId);
  }

  merchantOnline(tenantId: string): boolean {
    return (this.merchants.get(tenantId)?.size ?? 0) > 0;
  }
}
