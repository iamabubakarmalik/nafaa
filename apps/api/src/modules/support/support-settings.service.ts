/**
 * Live support settings (SystemSetting "support_settings") and the ICE
 * servers for calls (env SUPPORT_ICE_SERVERS). Cached for 30 seconds.
 *
 * SUPPORT_ICE_SERVERS is a JSON array of RTCIceServer objects. The default is
 * Google's public STUN, which is enough on most home and office networks.
 * Some mobile networks (carrier NAT) need a TURN server for calls to connect;
 * add one here when needed, e.g.
 *   [{"urls":"stun:stun.l.google.com:19302"},
 *    {"urls":"turn:turn.example.com:3478","username":"u","credential":"p"}]
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { iceServersFromEnv, normalizeSupportSettings } from './support.logic';
import type { SupportIceServer, SupportProactiveSettings, SupportSettings } from './support.types';

/** Deep-merges a partial proactive patch, so changing one message keeps the others. */
function mergeProactive(cur: SupportProactiveSettings, patch: unknown): SupportProactiveSettings {
  if (!patch || typeof patch !== 'object') return cur;
  const p = patch as Record<string, any>;
  const messages = { ...cur.messages } as Record<string, any>;
  if (p.messages && typeof p.messages === 'object') {
    for (const [k, v] of Object.entries(p.messages as Record<string, any>)) {
      if (!(k in messages) || !v || typeof v !== 'object') continue;
      messages[k] = {
        ...messages[k],
        ...v,
        template: v.template && typeof v.template === 'object' ? { ...messages[k].template, ...v.template } : messages[k].template,
      };
    }
  }
  return { ...cur, ...p, quietHours: { ...cur.quietHours, ...(p.quietHours ?? {}) }, messages } as SupportProactiveSettings;
}

const KEY = 'support_settings';
const TTL_MS = 30_000;

@Injectable()
export class SupportSettingsService {
  private cache: { at: number; value: SupportSettings } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<SupportSettings> {
    if (this.cache && Date.now() - this.cache.at < TTL_MS) return this.cache.value;
    const row = await this.prisma.systemSetting.findUnique({ where: { key: KEY }, select: { value: true } });
    let parsed: unknown = null;
    try {
      parsed = row ? JSON.parse(row.value) : null;
    } catch {
      parsed = null;
    }
    const value = normalizeSupportSettings(parsed);
    this.cache = { at: Date.now(), value };
    return value;
  }

  async save(patch: unknown, userId: string): Promise<SupportSettings> {
    const current = await this.get();
    const p = patch && typeof patch === 'object' ? (patch as Record<string, any>) : {};
    const value = normalizeSupportSettings({
      ...current,
      ...p,
      workingHours: { ...current.workingHours, ...(p.workingHours ?? {}) },
      welcomeMessage: typeof p.welcomeMessage === 'object' ? { ...current.welcomeMessage, ...p.welcomeMessage } : p.welcomeMessage ?? current.welcomeMessage,
      awayMessage: typeof p.awayMessage === 'object' ? { ...current.awayMessage, ...p.awayMessage } : p.awayMessage ?? current.awayMessage,
      sounds: { ...current.sounds, ...(p.sounds ?? {}) },
      proactive: mergeProactive(current.proactive, p.proactive),
    });
    const json = JSON.stringify(value);
    await this.prisma.systemSetting.upsert({
      where: { key: KEY },
      create: { key: KEY, value: json, category: 'support', description: 'Live support settings', updatedById: userId },
      update: { value: json, updatedById: userId },
    });
    this.cache = { at: Date.now(), value };
    return value;
  }

  iceServers(): SupportIceServer[] {
    return iceServersFromEnv(process.env.SUPPORT_ICE_SERVERS);
  }
}
