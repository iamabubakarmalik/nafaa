import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { decrypt, encrypt } from '../../core/lib/crypto';
import { OnlineOrdersService } from './online-orders.service';
import { WebsiteSetupService } from './website-setup.service';
import { PAY_GATEWAYS, payGateway } from './pay-api/registry';
import { Checkout, PayApiError, PayCreds, PayEnv } from './pay-api/types';

const CLOSED = ['CANCELLED', 'REJECTED', 'RETURNED'];
const LINK_TTL_MS = 3 * 86_400_000;
const acctKey = (tenantId: string, code: string) => `payment_account:${tenantId}:${code}`;

interface StoredAccount { creds: string; env: PayEnv; active: boolean; connectedAt: string; testedAt?: string }

export interface PaymentLink {
  ref: string;
  provider: string;
  amount: number;
  kind: 'FULL' | 'ADVANCE';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  providerRef?: string | null;
  createdAt: string;
  paidAt?: string | null;
  by?: string | null;
}

/** Order par jo advance mil chuka (Rupay) — courier COD isi se kam hota hai */
export const advancePaid = (metadata: unknown) =>
  ((((metadata as any)?.payments ?? []) as PaymentLink[]).filter((p) => p.status === 'PAID').reduce((s, p) => s + Number(p.amount || 0), 0));

/**
 * Payment links — dukaan apna gateway (Safepay, JazzCash…) jorti hai, order
 * par poori raqam ya advance ka link banta hai, customer pay karta hai,
 * Nafaa gateway se PAKKI tasdeeq karke order par paisa lagata hai.
 */
@Injectable()
export class PaymentLinksService {
  private readonly logger = new Logger(PaymentLinksService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OnlineOrdersService,
    private readonly setup: WebsiteSetupService,
  ) {}

  private web() {
    return (process.env.WEB_APP_URL || 'https://app.nafaa.pk').replace(/\/+$/, '');
  }

  // ═══════════════════════════════════════════════════════════
  // ACCOUNTS
  // ═══════════════════════════════════════════════════════════

  private async readAccount(tenantId: string, code: string): Promise<StoredAccount | null> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key: acctKey(tenantId, code) } });
    try { return row?.value ? JSON.parse(row.value) : null; } catch { return null; }
  }

  private credsOf(a: StoredAccount): PayCreds {
    try { return JSON.parse(decrypt(a.creds) ?? '{}'); } catch { return {}; }
  }

  async accounts(user: AuthenticatedUser) {
    const out = [];
    for (const [code, g] of Object.entries(PAY_GATEWAYS)) {
      const a = await this.readAccount(user.tenantId, code);
      const c = a ? this.credsOf(a) : {};
      const firstKey = g.credentials[0]?.key;
      out.push({
        code, name: g.name, color: g.color, methods: g.methods, fees: g.fees, portalUrl: g.portalUrl, sandboxUrl: g.sandboxUrl ?? null,
        steps: g.steps, credentials: g.credentials,
        connected: !!a, active: !!a?.active, env: a?.env ?? null, connectedAt: a?.connectedAt ?? null, testedAt: a?.testedAt ?? null,
        maskedKey: firstKey && c[firstKey] ? `${String(c[firstKey]).slice(0, 6)}•••${String(c[firstKey]).slice(-4)}` : null,
      });
    }
    return out;
  }

  async connect(user: AuthenticatedUser, code: string, body: { credentials?: Record<string, string>; env?: string }) {
    this.setup.assertCanManage(user);
    const g = this.gatewayOrThrow(code);
    const env: PayEnv = body?.env === 'live' ? 'live' : 'sandbox';
    const creds: PayCreds = {};
    for (const f of g.credentials) {
      const v = String(body?.credentials?.[f.key] ?? '').trim();
      if (!v && !f.optional) throw new BadRequestException(`${f.label} daalein`);
      if (v) creds[f.key] = v.slice(0, 500);
    }
    await this.wrap(() => g.adapter.test(creds, env));
    const value: StoredAccount = { creds: encrypt(JSON.stringify(creds))!, env, active: true, connectedAt: new Date().toISOString(), testedAt: new Date().toISOString() };
    await this.prisma.systemSetting.upsert({
      where: { key: acctKey(user.tenantId, code) },
      create: { key: acctKey(user.tenantId, code), value: JSON.stringify(value), category: 'payments', isPublic: false },
      update: { value: JSON.stringify(value) },
    });
    return { ok: true, env };
  }

  async setActive(user: AuthenticatedUser, code: string, active: boolean) {
    this.setup.assertCanManage(user);
    const a = await this.readAccount(user.tenantId, code);
    if (!a) throw new NotFoundException('Ye gateway jura nahi');
    await this.prisma.systemSetting.update({ where: { key: acctKey(user.tenantId, code) }, data: { value: JSON.stringify({ ...a, active }) } });
    return { ok: true };
  }

  async disconnect(user: AuthenticatedUser, code: string) {
    this.setup.assertCanManage(user);
    await this.prisma.systemSetting.deleteMany({ where: { key: acctKey(user.tenantId, code) } });
    return { ok: true };
  }

  // ═══════════════════════════════════════════════════════════
  // LINKS
  // ═══════════════════════════════════════════════════════════

  /** Order par link — poori baqi raqam, ya advance (jaise sirf delivery charges) */
  async createLink(user: AuthenticatedUser, scope: ShopScope, orderId: string, body: { provider?: string; amount?: number; kind?: 'FULL' | 'ADVANCE' }) {
    const order = await this.prisma.channelOrder.findFirst({ where: { id: orderId, tenantId: user.tenantId, ...(scope.whereLoose as any) } });
    if (!order) throw new NotFoundException('Order nahi mila');
    if (CLOSED.includes(order.orderStatus) || order.paymentStatus === 'PAID') throw new BadRequestException('Is order ka paisa pehle se mil chuka ya order band hai');
    const code = String(body?.provider ?? '').toUpperCase();
    const g = this.gatewayOrThrow(code);
    const a = await this.readAccount(user.tenantId, code);
    if (!a?.active) throw new BadRequestException(`${g.name} jura nahi — Payments safhe se jorein`);

    const due = Math.max(0, Math.round(Number(order.total) - advancePaid(order.metadata)));
    const amount = Math.round(Number(body?.amount ?? due));
    if (!(amount >= 1)) throw new BadRequestException('Raqam kam az kam Rs 1');
    if (amount > due) throw new BadRequestException(`Baqi sirf Rs ${due.toLocaleString('en-PK')} hai`);

    const ref = `NP${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const meta = (order.metadata ?? {}) as any;
    const link: PaymentLink = { ref, provider: code, amount, kind: amount >= due ? 'FULL' : 'ADVANCE', status: 'PENDING', createdAt: new Date().toISOString(), by: user.id };
    await this.prisma.channelOrder.update({ where: { id: order.id }, data: { metadata: { ...meta, payments: [...(meta.payments ?? []), link].slice(-20) } } });
    return { ...link, url: `${this.web()}/pay/${this.token(order.id, ref)}` };
  }

  /** Customer ka pay safha — sirf zaroori maloomat */
  async publicInfo(token: string) {
    const { order, link } = await this.byToken(token);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: order.tenantId }, select: { name: true } as any });
    const expired = link.status === 'PENDING' && Date.now() - Date.parse(link.createdAt) > LINK_TTL_MS;
    return {
      shop: (tenant as any)?.name ?? 'Dukaan',
      orderNumber: String(order.externalOrderNumber ?? order.externalOrderId).replace(/^#+/, ''),
      customer: order.customerName.split(' ')[0],
      amount: link.amount,
      kind: link.kind,
      orderTotal: Number(order.total),
      provider: PAY_GATEWAYS[link.provider]?.name ?? link.provider,
      methods: PAY_GATEWAYS[link.provider]?.methods ?? [],
      collect: PAY_GATEWAYS[link.provider]?.adapter.collect ?? [],
      status: expired ? 'EXPIRED' : link.status,
    };
  }

  /** "Pay karein" — gateway ka checkout (redirect URL, auto-submit form, ya wallet ka natija) */
  async start(token: string, wallet?: { mobile?: string; cnic?: string }): Promise<Checkout | { kind: 'wallet'; status: 'PAID' | 'PENDING' | 'FAILED'; message: string | null }> {
    const { order, link } = await this.byToken(token);
    if (link.status !== 'PENDING') throw new BadRequestException(link.status === 'PAID' ? 'Ye payment ho chuki hai ✓' : 'Ye link band ho chuka — dukaan se naya link maangein');
    if (Date.now() - Date.parse(link.createdAt) > LINK_TTL_MS) throw new BadRequestException('Link ki muddat khatam — dukaan se naya link maangein');
    if (CLOSED.includes(order.orderStatus)) throw new BadRequestException('Ye order band ho chuka');
    const g = this.gatewayOrThrow(link.provider);
    const a = await this.readAccount(order.tenantId, link.provider);
    if (!a?.active) throw new BadRequestException('Dukaan ka payment account abhi band hai');
    const api = this.setup.apiBase();
    const checkout = await this.wrap(() => g.adapter.create(this.credsOf(a), a.env, {
      ref: link.ref,
      amount: link.amount,
      description: `Order ${String(order.externalOrderNumber ?? order.externalOrderId).replace(/^#+/, '')}`,
      customer: { name: order.customerName, phone: order.customerPhone, email: order.customerEmail },
      returnUrl: `${api}/integrations/payments/v2/return/${token}`,
      cancelUrl: `${this.web()}/pay/${token}?cancelled=1`,
      wallet,
    }));
    await this.patchLink(order.id, link.ref, { providerRef: checkout.providerRef });
    if (checkout.kind !== 'wallet') return checkout;

    // Wallet: gateway ka jawab + pakki inquiry
    const fresh = { ...link, providerRef: checkout.providerRef };
    if (checkout.status.failed) {
      return { kind: 'wallet', status: 'FAILED', message: checkout.status.message ?? 'Payment nahi hui' };
    }
    const st = await this.verify(order, fresh).catch(() => 'PENDING' as const);
    return { kind: 'wallet', status: st === 'PAID' ? 'PAID' : st === 'FAILED' ? 'FAILED' : 'PENDING', message: checkout.status.message ?? null };
  }

  /** Gateway se wapas (GET ya POST) — pakki tasdeeq, phir customer ko pay safhe par */
  async handleReturn(token: string, data: Record<string, string>) {
    let target = `${this.web()}/pay/${token}`;
    try {
      const { order, link } = await this.byToken(token);
      await this.verify(order, link, data);
    } catch (e: any) {
      this.logger.warn(`Payment return: ${e?.message}`);
      target += '?check=1';
    }
    return target;
  }

  /** Gateway se status — paid ho to order par lagao */
  private async verify(order: any, link: PaymentLink, returnData?: Record<string, string>) {
    if (link.status !== 'PENDING') return link.status;
    const g = this.gatewayOrThrow(link.provider);
    const a = await this.readAccount(order.tenantId, link.provider);
    if (!a) return 'PENDING';
    const st = await g.adapter.status(this.credsOf(a), a.env, link.providerRef ?? link.ref, link.ref, returnData);
    if (st.paid) {
      // Raqam mile to kam se kam utni hi ho — kam paisa aaya to "paid" nahi
      if (st.amount !== null && st.amount !== undefined && st.amount + 0.5 < link.amount) {
        this.logger.warn(`Payment ${link.ref}: raqam kam (${st.amount} < ${link.amount})`);
        return 'PENDING';
      }
      await this.applyPaid(order.id, link.ref);
      return 'PAID';
    }
    if (st.failed) await this.patchLink(order.id, link.ref, { status: 'FAILED' });
    return st.failed ? 'FAILED' : 'PENDING';
  }

  private async applyPaid(orderId: string, ref: string) {
    const order = await this.prisma.channelOrder.findUnique({ where: { id: orderId } });
    if (!order) return;
    await this.patchLink(orderId, ref, { status: 'PAID', paidAt: new Date().toISOString() });
    const fresh = await this.prisma.channelOrder.findUnique({ where: { id: orderId } });
    const paid = advancePaid(fresh?.metadata);
    if (paid + 0.5 >= Number(order.total) && order.paymentStatus !== 'PAID' && !CLOSED.includes(order.orderStatus)) {
      const actor = await this.orders.systemActor(order.tenantId);
      await this.orders.markPaid(actor, new ShopScope(null, true), orderId).catch((e) => this.logger.warn(`markPaid ${orderId}: ${e?.message}`));
    }
  }

  /** Har 10 minute: pending links (customer ne pay kiya magar wapas nahi aaya) */
  @Cron('0 */10 * * * *')
  async sweep() {
    if (this.running || process.env.DISABLE_PAYMENT_SWEEP === '1') return;
    this.running = true;
    try {
      const since = new Date(Date.now() - LINK_TTL_MS);
      // Link 3 din chalta hai — 7 din ke unpaid orders me dhoondo
      const rows = (await this.prisma.channelOrder.findMany({
        where: { receivedAt: { gte: new Date(Date.now() - 7 * 86_400_000) }, paymentStatus: { not: 'PAID' }, orderStatus: { notIn: CLOSED } },
        select: { id: true, tenantId: true, total: true, metadata: true, orderStatus: true, paymentStatus: true },
        take: 3000,
      })).filter((o) => (((o.metadata as any)?.payments ?? []) as PaymentLink[]).some((p) => p.status === 'PENDING' && p.providerRef));
      for (const o of rows) {
        for (const l of (((o.metadata as any)?.payments ?? []) as PaymentLink[])) {
          if (l.status !== 'PENDING' || !l.providerRef || Date.parse(l.createdAt) < since.getTime()) continue;
          await this.verify(o, l).catch(() => null);
        }
      }
    } finally {
      this.running = false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  private gatewayOrThrow(code: string) {
    const g = payGateway(code);
    if (!g) throw new BadRequestException('Ye payment gateway Nafaa me nahi');
    return g;
  }

  private async patchLink(orderId: string, ref: string, patch: Partial<PaymentLink>) {
    const row = await this.prisma.channelOrder.findUnique({ where: { id: orderId }, select: { metadata: true } });
    const meta = (row?.metadata ?? {}) as any;
    const payments = ((meta.payments ?? []) as PaymentLink[]).map((p) => (p.ref === ref ? { ...p, ...patch } : p));
    await this.prisma.channelOrder.update({ where: { id: orderId }, data: { metadata: { ...meta, payments } } });
  }

  private secret() {
    return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'nafaa-dev-pay';
  }

  private token(orderId: string, ref: string) {
    const payload = `${orderId}.${ref}`;
    const sig = crypto.createHmac('sha256', this.secret()).update(`pay:${payload}`).digest('base64url').slice(0, 24);
    return `${Buffer.from(payload).toString('base64url')}.${sig}`;
  }

  private async byToken(token: string) {
    const [b64, sig] = String(token ?? '').split('.');
    if (!b64 || !sig) throw new UnauthorizedException('Link ghalat hai');
    const payload = Buffer.from(b64, 'base64url').toString();
    const expected = crypto.createHmac('sha256', this.secret()).update(`pay:${payload}`).digest('base64url').slice(0, 24);
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new UnauthorizedException('Link ghalat hai');
    const [orderId, ref] = payload.split('.');
    const order = await this.prisma.channelOrder.findUnique({ where: { id: orderId } });
    const link = ((order?.metadata as any)?.payments ?? []).find((p: PaymentLink) => p.ref === ref) as PaymentLink | undefined;
    if (!order || !link) throw new NotFoundException('Ye payment link nahi mila');
    return { order, link };
  }

  private async wrap<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof PayApiError) throw new BadRequestException(e.message);
      throw e;
    }
  }
}
