/**
 * Finding a store and checking who may use it: the merchant side (tenant,
 * role, `website` add-on) and the public side (status, password, preview
 * token, the shop's plan). Every other store service goes through here.
 */
import { ForbiddenException, GoneException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Integration, NafaaStore, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { EntitlementsService } from '../../modules/billing/entitlements/entitlements.service';
import { readWebsiteConfig } from '../online-orders/website-config';
import { StoreSettings, readSettings } from './store-settings';
import { readToken } from './lib/tokens';
import { rootDomain, storefrontUrl, subdomainHost } from './lib/host';

export const WEBSITE_FEATURE = 'integration.website';
export const WEBSITE_ADDON = 'website';

export interface StoreCtx {
  store: NafaaStore;
  integration: Integration;
  settings: StoreSettings;
  tenantId: string;
  /** Branch whose stock and prices the store sells from. */
  shopId: string | null;
  /** Draft theme requested with a valid preview token. */
  preview: boolean;
}

export interface PublicAccess { preview?: string | null; access?: string | null }

const CTX_TTL_MS = 30_000;

@Injectable()
export class StoreAccessService {
  private readonly cache = new Map<string, { at: number; ctx: Omit<StoreCtx, 'preview'> }>();

  constructor(private readonly prisma: PrismaService, private readonly entitlements: EntitlementsService) {}

  // ─── merchant ───

  async requireStore(user: AuthenticatedUser, id: string): Promise<StoreCtx> {
    const store = await this.prisma.nafaaStore.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!store) throw new NotFoundException('Ye website nahi mili');
    return { ...(await this.build(store)), preview: false };
  }

  /** Any change needs the `website` add-on (reads stay open so the screens can show the offer). */
  async assertWrite(user: AuthenticatedUser) {
    await this.entitlements.assertAddOn(user.tenantId, WEBSITE_FEATURE, WEBSITE_ADDON, 'Website');
  }

  assertManager(user: AuthenticatedUser) {
    const ok: UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN];
    if (!ok.includes(user.role)) throw new ForbiddenException('Ye kaam sirf malik ya manager kar sakta hai');
  }

  async entitled(tenantId: string) {
    const ent = await this.entitlements.get(tenantId);
    return ent.state !== 'expired' && !ent.paused && ent.features.includes(WEBSITE_FEATURE);
  }

  // ─── public ───

  /**
   * The store for a public request. Throws 404 (unknown), 410 STORE_CLOSED
   * (draft/closed or the plan stopped) or 423 STORE_LOCKED (password) unless a
   * preview or access token opens it. `allowLocked` serves the password page.
   */
  async publicStore(storeId: string, access: PublicAccess = {}, allowLocked = false): Promise<StoreCtx & { locked: boolean }> {
    if (!/^[\w-]{8,64}$/.test(String(storeId ?? ''))) throw new NotFoundException('Store not found');
    const hit = this.cache.get(storeId);
    let base = hit && Date.now() - hit.at < CTX_TTL_MS ? hit.ctx : null;
    if (!base) {
      const store = await this.prisma.nafaaStore.findUnique({ where: { id: storeId } });
      if (!store) throw new NotFoundException('Store not found');
      base = await this.build(store);
      this.cache.set(storeId, { at: Date.now(), ctx: base });
      if (this.cache.size > 5000) this.cache.clear();
    }
    if (base.store.suspendedAt) {
      throw new GoneException({ statusCode: 410, code: 'STORE_UNAVAILABLE', message: 'This store is unavailable.' });
    }
    const preview = !!access.preview && readToken<{ s: string }>('preview', access.preview)?.s === storeId;
    if (preview) return { ...base, preview: true, locked: false };
    const status = base.store.status;
    if (status === 'DRAFT' || status === 'CLOSED' || !(await this.entitled(base.tenantId)) || !base.integration.isActive) {
      if (allowLocked && status !== 'CLOSED') return { ...base, preview: false, locked: true };
      throw new GoneException({ statusCode: 410, code: 'STORE_CLOSED', message: 'This store is not open right now.' });
    }
    if (status === 'PASSWORD') {
      const ok = !!access.access && readToken<{ s: string }>('access', access.access)?.s === storeId;
      if (!ok) {
        if (allowLocked) return { ...base, preview: false, locked: true };
        throw new HttpException({ statusCode: 423, code: 'STORE_LOCKED', message: 'This store is password protected.' }, HttpStatus.LOCKED);
      }
    }
    return { ...base, preview: false, locked: false };
  }

  invalidate(storeId: string) {
    this.cache.delete(storeId);
  }

  // ─── urls ───

  async primaryHost(store: Pick<NafaaStore, 'id' | 'slug'>): Promise<string> {
    const d = await this.prisma.storeDomain.findFirst({ where: { storeId: store.id, isPrimary: true, status: 'ACTIVE', redirectTo: null }, select: { hostname: true } });
    return d?.hostname ?? subdomainHost(store.slug);
  }

  /** Public URL of the store (https on the primary host; the dev storefront with ?store= locally). */
  async storeUrl(store: Pick<NafaaStore, 'id' | 'slug'>): Promise<string> {
    if (process.env.NODE_ENV !== 'production' && !process.env.STORE_ROOT_DOMAIN) return `${storefrontUrl()}/?store=${store.slug}`;
    return `https://${await this.primaryHost(store)}`;
  }

  /** Absolute base for links inside the store (no trailing slash, no query). */
  async storeBase(store: Pick<NafaaStore, 'id' | 'slug'>): Promise<string> {
    if (process.env.NODE_ENV !== 'production' && !process.env.STORE_ROOT_DOMAIN) return storefrontUrl();
    return `https://${await this.primaryHost(store)}`;
  }

  rootDomain() {
    return rootDomain();
  }

  private async build(store: NafaaStore): Promise<Omit<StoreCtx, 'preview'>> {
    const integration = await this.prisma.integration.findUnique({ where: { id: store.integrationId } });
    if (!integration) throw new NotFoundException('Store channel not found');
    const cfg = readWebsiteConfig(integration.config);
    return {
      store,
      integration,
      settings: readSettings(store.settings),
      tenantId: store.tenantId,
      shopId: store.shopId ?? cfg.shopId ?? integration.shopId ?? null,
    };
  }
}
