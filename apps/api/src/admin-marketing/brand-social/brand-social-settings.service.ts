/**
 * Nafaa Social settings (SystemSetting "brand_social_settings"), automation
 * keys (SystemSetting "brand_social_keys", hashes only) and the Meta user
 * connection behind the Facebook / Instagram accounts (SystemSetting
 * "brand_social_meta_user", tokens encrypted).
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_SETTINGS, normalizeSettings } from './brand-social.logic';
import {
  AUTOMATION_SCOPES, type AutomationKeyCreated, type AutomationKeyView, type AutomationScope, type BrandSocialSettings,
} from './brand-social.types';

export const SETTINGS_KEY = 'brand_social_settings';
export const KEYS_KEY = 'brand_social_keys';
export const META_USER_KEY = 'brand_social_meta_user';

/** The Meta user token and the page list from the last OAuth (all tokens encrypted). */
export interface StoredMetaUser {
  metaUserId: string;
  metaUserName: string;
  tokenEnc: string | null;
  expiresAt: string | null;
  scopes: string[];
  connectedById: string | null;
  connectedAt: string;
  pages: Array<{
    id: string; name: string; picture: string | null; link: string | null; tokenEnc: string | null;
    igId: string | null; igUsername: string | null; igPicture: string | null; igName: string | null;
  }>;
}

interface StoredKey {
  id: string;
  name: string;
  hash: string;
  prefix: string;
  scopes: AutomationScope[];
  createdAt: string;
  createdById: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface AutomationActor { keyId: string; name: string; scopes: AutomationScope[] }

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

@Injectable()
export class BrandSocialSettingsService {
  private cache: { at: number; value: BrandSocialSettings } | null = null;
  private keyCache: { at: number; keys: StoredKey[] } | null = null;
  private readonly lastUseWrite = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  /* ───────────────────────── raw storage ───────────────────────── */

  private async readJson<T>(key: string): Promise<T | null> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!row?.value) return null;
    try { return JSON.parse(row.value) as T; } catch { return null; }
  }

  private async writeJson(key: string, value: unknown, userId: string | null, description: string) {
    const json = JSON.stringify(value);
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: json, category: 'brand_social', description, isPublic: false, updatedById: userId ?? undefined },
      update: { value: json, ...(userId ? { updatedById: userId } : {}) },
    });
  }

  /* ───────────────────────── settings ───────────────────────── */

  async get(fresh = false): Promise<BrandSocialSettings> {
    if (!fresh && this.cache && Date.now() - this.cache.at < 5_000) return this.cache.value;
    const value = normalizeSettings(await this.readJson(SETTINGS_KEY), DEFAULT_SETTINGS);
    this.cache = { at: Date.now(), value };
    return value;
  }

  async save(body: unknown, userId: string | null): Promise<BrandSocialSettings> {
    const current = await this.get(true);
    const next = normalizeSettings(body, current);
    if (next.paused && !current.paused) next.pausedAt = new Date().toISOString();
    await this.writeJson(SETTINGS_KEY, next, userId, 'Nafaa Social settings');
    this.cache = { at: Date.now(), value: next };
    return next;
  }

  async paused(): Promise<boolean> {
    return (await this.get()).paused;
  }

  /* ───────────────────────── Meta user ───────────────────────── */

  metaUser(): Promise<StoredMetaUser | null> {
    return this.readJson<StoredMetaUser>(META_USER_KEY);
  }

  saveMetaUser(v: StoredMetaUser, userId: string | null) {
    return this.writeJson(META_USER_KEY, v, userId, 'Nafaa Social: Meta user connection (encrypted tokens)');
  }

  /* ───────────────────────── automation keys ───────────────────────── */

  private async keys(fresh = false): Promise<StoredKey[]> {
    if (!fresh && this.keyCache && Date.now() - this.keyCache.at < 10_000) return this.keyCache.keys;
    const keys = (await this.readJson<StoredKey[]>(KEYS_KEY)) ?? [];
    this.keyCache = { at: Date.now(), keys: Array.isArray(keys) ? keys : [] };
    return this.keyCache.keys;
  }

  private async saveKeys(keys: StoredKey[], userId: string | null) {
    await this.writeJson(KEYS_KEY, keys, userId, 'Nafaa Social automation keys (hashes only)');
    this.keyCache = { at: Date.now(), keys };
  }

  private viewKey(k: StoredKey): AutomationKeyView {
    return { id: k.id, name: k.name, prefix: k.prefix, scopes: k.scopes, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt, revokedAt: k.revokedAt };
  }

  async listKeys(): Promise<AutomationKeyView[]> {
    return (await this.keys(true)).map((k) => this.viewKey(k)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Creates a key. The plain key is in the answer once and is never stored. */
  async createKey(body: { name?: string; scopes?: string[] }, userId: string | null): Promise<AutomationKeyCreated> {
    const name = String(body?.name ?? '').trim().slice(0, 80);
    if (!name) throw new BadRequestException('Give the key a name.');
    const asked = Array.isArray(body?.scopes) ? body.scopes.filter((s): s is AutomationScope => (AUTOMATION_SCOPES as readonly string[]).includes(s)) : [];
    const scopes = asked.length ? [...new Set(asked)] : [...AUTOMATION_SCOPES];
    const keys = await this.keys(true);
    if (keys.filter((k) => !k.revokedAt).length >= 20) throw new BadRequestException('At most 20 active keys. Revoke one first.');
    const plain = `nsk_${crypto.randomBytes(32).toString('base64url')}`;
    const row: StoredKey = {
      id: crypto.randomUUID(), name, hash: sha256(plain), prefix: plain.slice(0, 12), scopes,
      createdAt: new Date().toISOString(), createdById: userId, lastUsedAt: null, revokedAt: null,
    };
    await this.saveKeys([...keys, row], userId);
    return { ...this.viewKey(row), key: plain };
  }

  async revokeKey(id: string, userId: string | null): Promise<AutomationKeyView> {
    const keys = await this.keys(true);
    const k = keys.find((x) => x.id === id);
    if (!k) throw new NotFoundException('Key not found.');
    if (!k.revokedAt) k.revokedAt = new Date().toISOString();
    await this.saveKeys(keys, userId);
    return this.viewKey(k);
  }

  /** The key behind a Bearer value, or null. Compares SHA-256 hashes in constant time. */
  async verifyKey(plain: string): Promise<AutomationActor | null> {
    if (!/^nsk_[A-Za-z0-9_-]{20,}$/.test(plain)) return null;
    const given = Buffer.from(sha256(plain), 'hex');
    let hit: StoredKey | null = null;
    for (const k of await this.keys()) {
      const stored = Buffer.from(k.hash, 'hex');
      if (stored.length === given.length && crypto.timingSafeEqual(stored, given) && !k.revokedAt) hit = k;
    }
    if (!hit) return null;
    const last = this.lastUseWrite.get(hit.id) ?? 0;
    if (Date.now() - last > 60_000) {
      this.lastUseWrite.set(hit.id, Date.now());
      const keys = await this.keys(true);
      const k = keys.find((x) => x.id === hit!.id);
      if (k) { k.lastUsedAt = new Date().toISOString(); await this.saveKeys(keys, null).catch(() => null); }
    }
    return { keyId: hit.id, name: hit.name, scopes: hit.scopes };
  }

  /** Names for "key:<id>" actors on posts. */
  async keyNames(): Promise<Map<string, string>> {
    return new Map((await this.keys()).map((k) => [k.id, k.name]));
  }
}
