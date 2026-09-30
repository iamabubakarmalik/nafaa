import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { K, readJson, removeKey, writeJson } from './store';

/**
 * Nafaa API keys — "nfk_<keyId>_<secret>". Sirf secret ka SHA-256 rakhte
 * hain; poori key sirf banate waqt ek dafa dikhti hai (GitHub / Stripe jaisa).
 */
export type ApiScope = 'read' | 'write';

interface KeyRecord {
  id: string;
  tenantId: string;
  name: string;
  scope: ApiScope;
  /** Sirf ek branch ka data (khali = poora business) */
  shopId: string | null;
  hash: string;
  last4: string;
  createdAt: string;
  createdBy: string;
  lastUsedAt: string | null;
}

export interface ApiCaller {
  tenantId: string;
  keyId: string;
  scope: ApiScope;
  shopId: string | null;
}

const MANAGERS = ['OWNER', 'MANAGER', 'SUPER_ADMIN'];
const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  assertManager(user: AuthenticatedUser) {
    if (!MANAGERS.includes(String(user.role))) throw new ForbiddenException('API keys sirf malik ya manager bana sakta hai');
  }

  async list(tenantId: string) {
    const ids = (await readJson<string[]>(this.prisma, K.keys(tenantId))) ?? [];
    const rows = await this.prisma.systemSetting.findMany({ where: { key: { in: ids.map(K.keyIndex) } } });
    return rows
      .map((r) => { try { return JSON.parse(r.value) as KeyRecord; } catch { return null; } })
      .filter((k): k is KeyRecord => !!k && k.tenantId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ hash: _h, ...k }) => ({ ...k, preview: `nfk_${k.id}_…${k.last4}` }));
  }

  async create(user: AuthenticatedUser, body: { name?: string; scope?: string; shopId?: string | null }) {
    this.assertManager(user);
    const name = String(body.name ?? '').trim().slice(0, 60);
    if (!name) throw new BadRequestException('Key ka naam likhein (jaise "Zapier" ya "Mera ERP")');
    const scope: ApiScope = body.scope === 'write' ? 'write' : 'read';
    let shopId: string | null = null;
    if (body.shopId) {
      const shop = await this.prisma.shop.findFirst({ where: { id: body.shopId, tenantId: user.tenantId }, select: { id: true } });
      if (!shop) throw new BadRequestException('Branch nahi mili');
      shopId = shop.id;
    }
    const ids = (await readJson<string[]>(this.prisma, K.keys(user.tenantId))) ?? [];
    if (ids.length >= 20) throw new BadRequestException('Zyada se zyada 20 keys — purani hatayein');

    const id = crypto.randomBytes(6).toString('hex');
    const secret = crypto.randomBytes(24).toString('base64url');
    const rec: KeyRecord = {
      id, tenantId: user.tenantId, name, scope, shopId, hash: sha(secret), last4: secret.slice(-4),
      createdAt: new Date().toISOString(), createdBy: user.id, lastUsedAt: null,
    };
    await writeJson(this.prisma, K.keyIndex(id), rec);
    await writeJson(this.prisma, K.keys(user.tenantId), [...ids, id]);
    return { id, name, scope, shopId, key: `nfk_${id}_${secret}`, note: 'Ye key sirf abhi dikhegi — kahin mehfooz likh lein' };
  }

  async revoke(user: AuthenticatedUser, id: string) {
    this.assertManager(user);
    const rec = await readJson<KeyRecord>(this.prisma, K.keyIndex(id));
    if (!rec || rec.tenantId !== user.tenantId) throw new NotFoundException('Key nahi mili');
    await removeKey(this.prisma, K.keyIndex(id));
    const ids = (await readJson<string[]>(this.prisma, K.keys(user.tenantId))) ?? [];
    await writeJson(this.prisma, K.keys(user.tenantId), ids.filter((x) => x !== id));
    return { ok: true };
  }

  /** `Authorization: Bearer nfk_…` (ya `X-Nafaa-Key`) → kaun hai */
  async authenticate(req: Request, need: ApiScope = 'read'): Promise<ApiCaller> {
    const h = String(req.headers.authorization ?? '');
    const raw = (h.toLowerCase().startsWith('bearer ') ? h.slice(7) : String(req.headers['x-nafaa-key'] ?? '')).trim();
    const m = raw.match(/^nfk_([a-f0-9]{12})_([A-Za-z0-9_-]{20,})$/);
    if (!m) throw new UnauthorizedException({ error: 'invalid_key', message: 'API key nahi mili ya ghalat hai (Authorization: Bearer nfk_…)' });
    const rec = await readJson<KeyRecord>(this.prisma, K.keyIndex(m[1]));
    const ok = rec && crypto.timingSafeEqual(Buffer.from(rec.hash), Buffer.from(sha(m[2])));
    if (!rec || !ok) throw new UnauthorizedException({ error: 'invalid_key', message: 'API key ghalat hai ya hata di gayi' });
    if (need === 'write' && rec.scope !== 'write') throw new ForbiddenException({ error: 'read_only_key', message: 'Ye key sirf parhne (read) ki hai' });

    // Aakhri istemal — har request par nahi, 5 minute me ek dafa
    if (!rec.lastUsedAt || Date.now() - Date.parse(rec.lastUsedAt) > 5 * 60_000) {
      writeJson(this.prisma, K.keyIndex(rec.id), { ...rec, lastUsedAt: new Date().toISOString() }).catch(() => null);
    }
    return { tenantId: rec.tenantId, keyId: rec.id, scope: rec.scope, shopId: rec.shopId };
  }
}
