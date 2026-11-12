/**
 * Shopper accounts on a store (optional): one-time code by email or SMS,
 * a signed session token, saved addresses and order history. Guests can
 * always check out unless the store requires login. Also the newsletter
 * sign-up and the public "report this store" form.
 */
import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../modules/email/email.service';
import { SmsService } from '../../modules/sms/sms.service';
import { pkPhone } from '../online-orders/courier-api/postex.adapter';
import { PublicAccess, StoreAccessService, StoreCtx } from './store-access.service';
import { StoreCheckoutService } from './store-checkout.service';
import { checkSecret, hashSecret, readToken, signToken } from './lib/tokens';

const OTP_TTL_MS = 10 * 60_000;
const SESSION_TTL_MS = 30 * 86_400_000;
const MAX_PER_HOUR = 5;
const REPORT_REASONS = ['SCAM', 'FAKE_PRODUCTS', 'NOT_DELIVERED', 'OFFENSIVE', 'COPYRIGHT', 'OTHER'];
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Order received', ACCEPTING: 'Being confirmed', CONFIRMED: 'Confirmed', PREPARING: 'Being prepared', READY: 'Packed',
  OUT_FOR_DELIVERY: 'On the way', DELIVERED: 'Delivered', CANCELLED: 'Cancelled', REJECTED: 'Cancelled', RETURNED: 'Returned',
};
const s = (v: unknown, max: number) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, max) : '');
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

export interface Address { id: string; name: string; phone: string; address: string; city: string; province: string | null; postalCode: string | null; landmark: string | null; default: boolean }

@Injectable()
export class StoreCustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: StoreAccessService,
    private readonly checkout: StoreCheckoutService,
    private readonly email: EmailService,
    private readonly sms: SmsService,
  ) {}

  private target(channel: string, raw: string) {
    if (channel === 'email') {
      const t = s(raw, 160).toLowerCase();
      if (!isEmail(t)) throw new BadRequestException('Please enter a valid email');
      return t;
    }
    if (channel === 'sms') {
      const t = pkPhone(s(raw, 30));
      if (!/^03\d{9}$/.test(t)) throw new BadRequestException('Enter a mobile number like 03001234567');
      return t;
    }
    throw new BadRequestException('Choose email or SMS');
  }

  async sendOtp(storeId: string, access: PublicAccess, body: { channel?: string; to?: string }) {
    const ctx = await this.access.publicStore(storeId, access);
    const channel = String(body?.channel ?? '');
    const to = this.target(channel, String(body?.to ?? ''));
    const recent = await this.prisma.storeOtp.count({ where: { storeId: ctx.store.id, target: to, createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
    if (recent >= MAX_PER_HOUR) throw new HttpException({ statusCode: 429, message: 'Too many codes. Please try again in an hour.' }, HttpStatus.TOO_MANY_REQUESTS);
    const code = String(crypto.randomInt(100000, 1000000));
    await this.prisma.storeOtp.create({ data: { storeId: ctx.store.id, target: to, channel, codeHash: hashSecret(code), expiresAt: new Date(Date.now() + OTP_TTL_MS) } });
    let sent = false;
    const text = `${code} is your ${ctx.store.name} sign-in code. It expires in 10 minutes.`;
    try {
      if (channel === 'email') {
        const r: any = await this.email.send({ tenantId: ctx.tenantId, toEmail: to, subject: `${code} — your ${ctx.store.name} code`, bodyText: text, bodyHtml: `<p>Your sign-in code for <strong>${escapeHtml(ctx.store.name)}</strong>:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p>It expires in 10 minutes. If you did not ask for it, ignore this email.</p>` });
        sent = !r?.skipped && r?.success !== false;
      } else {
        const r: any = await this.sms.send({ tenantId: ctx.tenantId, toPhone: to, message: text });
        sent = !r?.skipped && r?.success !== false;
      }
    } catch {
      sent = false;
    }
    return { sent, channel, expiresIn: OTP_TTL_MS / 1000, ...(process.env.NODE_ENV !== 'production' && { devCode: code }) };
  }

  async verifyOtp(storeId: string, access: PublicAccess, body: { to?: string; code?: string; name?: string }) {
    const ctx = await this.access.publicStore(storeId, access);
    const raw = String(body?.to ?? '');
    const to = raw.includes('@') ? this.target('email', raw) : this.target('sms', raw);
    const otp = await this.prisma.storeOtp.findFirst({ where: { storeId: ctx.store.id, target: to, consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
    if (!otp || otp.attempts >= 5) throw new UnauthorizedException('The code has expired. Please ask for a new one.');
    if (!checkSecret(s(body?.code, 10), otp.codeHash)) {
      await this.prisma.storeOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException('Wrong code. Please check and try again.');
    }
    await this.prisma.storeOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    const isMail = to.includes('@');
    const id = await this.checkout.rememberCustomer(ctx, { name: s(body?.name, 100) || null, phone: isMail ? null : to, email: isMail ? to : null, acceptsMarketing: false, source: 'SIGNUP' });
    if (!id) throw new BadRequestException('Could not sign in. Please try again.');
    const customer = await this.prisma.storeCustomer.update({ where: { id }, data: { lastLoginAt: new Date() } });
    const t = signToken('customer', { s: ctx.store.id, c: customer.id }, SESSION_TTL_MS);
    return { token: t.token, expiresAt: t.expiresAt.toISOString(), customer: this.publicCustomer(customer) };
  }

  private publicCustomer(c: { id: string; name: string | null; phone: string | null; email: string | null; acceptsMarketing: boolean }) {
    return { id: c.id, name: c.name, phone: c.phone, email: c.email, acceptsMarketing: c.acceptsMarketing };
  }

  private async session(storeId: string, access: PublicAccess, token: string | undefined): Promise<{ ctx: StoreCtx; customer: Awaited<ReturnType<PrismaService['storeCustomer']['findUniqueOrThrow']>> }> {
    const ctx = await this.access.publicStore(storeId, access);
    const t = readToken<{ s: string; c: string }>('customer', token);
    if (!t || t.s !== ctx.store.id) throw new UnauthorizedException('Please sign in');
    const customer = await this.prisma.storeCustomer.findFirst({ where: { id: t.c, storeId: ctx.store.id } });
    if (!customer) throw new UnauthorizedException('Please sign in');
    return { ctx, customer };
  }

  private addresses(raw: unknown): Address[] {
    return (Array.isArray(raw) ? raw : []).slice(0, 10).map((a: any, i: number) => ({
      id: /^[\w-]{1,40}$/.test(String(a?.id ?? '')) ? String(a.id) : `a${Date.now().toString(36)}${i}`,
      name: s(a?.name, 100), phone: pkPhone(s(a?.phone, 30)) || s(a?.phone, 30), address: s(a?.address, 400), city: s(a?.city, 80),
      province: s(a?.province, 40) || null, postalCode: s(a?.postalCode, 12) || null, landmark: s(a?.landmark, 200) || null, default: a?.default === true,
    })).filter((a) => a.address && a.city);
  }

  async account(storeId: string, access: PublicAccess, token?: string) {
    const { customer } = await this.session(storeId, access, token);
    return { customer: this.publicCustomer(customer), addresses: this.addresses(customer.addresses) };
  }

  async updateAccount(storeId: string, access: PublicAccess, token: string | undefined, body: { name?: string; email?: string; acceptsMarketing?: boolean }) {
    const { customer } = await this.session(storeId, access, token);
    const data: Prisma.StoreCustomerUpdateInput = {};
    if (body?.name !== undefined) data.name = s(body.name, 100) || null;
    if (body?.email !== undefined && !customer.email) {
      const e = s(body.email, 160).toLowerCase();
      if (e && !isEmail(e)) throw new BadRequestException('Please check your email');
      data.email = e || null;
    }
    if (body?.acceptsMarketing !== undefined) data.acceptsMarketing = body.acceptsMarketing === true;
    const saved = await this.prisma.storeCustomer.update({ where: { id: customer.id }, data }).catch(() => {
      throw new BadRequestException('This email is already used by another account');
    });
    return { customer: this.publicCustomer(saved) };
  }

  async saveAddresses(storeId: string, access: PublicAccess, token: string | undefined, body: { addresses?: unknown }) {
    const { customer } = await this.session(storeId, access, token);
    const list = this.addresses(body?.addresses);
    if (list.length && !list.some((a) => a.default)) list[0].default = true;
    let seenDefault = false;
    for (const a of list) {
      if (a.default && seenDefault) a.default = false;
      if (a.default) seenDefault = true;
    }
    await this.prisma.storeCustomer.update({ where: { id: customer.id }, data: { addresses: list as unknown as Prisma.InputJsonValue } });
    return { addresses: list };
  }

  async orders(storeId: string, access: PublicAccess, token: string | undefined, pageRaw: unknown) {
    const { ctx, customer } = await this.session(storeId, access, token);
    const page = Math.max(1, Math.floor(Number(pageRaw) || 1));
    const or: Prisma.ChannelOrderWhereInput[] = [];
    if (customer.phone) or.push({ customerPhone: { endsWith: customer.phone.slice(-10) } });
    if (customer.email) or.push({ customerEmail: { equals: customer.email, mode: 'insensitive' } });
    if (!or.length) return { items: [], page, pages: 1 };
    const where: Prisma.ChannelOrderWhereInput = { integrationId: ctx.integration.id, deletedAt: null, OR: or };
    const [rows, total] = await Promise.all([
      this.prisma.channelOrder.findMany({ where, orderBy: { receivedAt: 'desc' }, skip: (page - 1) * 20, take: 20, select: { id: true, externalOrderNumber: true, externalOrderId: true, receivedAt: true, total: true, orderStatus: true, items: true } }),
      this.prisma.channelOrder.count({ where }),
    ]);
    return {
      items: rows.map((o) => ({
        orderNumber: String(o.externalOrderNumber ?? o.externalOrderId).replace(/^#+/, ''),
        orderToken: signToken('order', { s: ctx.store.id, o: o.id }, 365 * 86_400_000).token,
        createdAt: o.receivedAt.toISOString(), total: Number(o.total), status: o.orderStatus, statusLabel: STATUS_LABEL[o.orderStatus] ?? o.orderStatus,
        itemCount: Array.isArray(o.items) ? (o.items as Array<{ quantity?: number }>).reduce((a, i) => a + (Number(i?.quantity) || 1), 0) : 0,
      })),
      page,
      pages: Math.max(1, Math.ceil(total / 20)),
    };
  }

  async orderPortal(storeId: string, access: PublicAccess, token: string | undefined, orderToken: string) {
    const { ctx, customer } = await this.session(storeId, access, token);
    const t = readToken<{ s: string; o: string }>('order', orderToken);
    if (!t || t.s !== ctx.store.id) throw new NotFoundException('Order not found');
    const o = await this.prisma.channelOrder.findFirst({ where: { id: t.o, integrationId: ctx.integration.id }, select: { id: true, customerPhone: true, customerEmail: true } });
    const mine = !!o && ((customer.phone && String(o.customerPhone ?? '').endsWith(customer.phone.slice(-10))) || (customer.email && o.customerEmail?.toLowerCase() === customer.email));
    if (!o || !mine) throw new NotFoundException('Order not found');
    return this.checkout.portalLink(ctx, o.id);
  }

  async subscribe(storeId: string, access: PublicAccess, body: { email?: string; phone?: string }) {
    const ctx = await this.access.publicStore(storeId, access);
    const email = s(body?.email, 160).toLowerCase();
    const phone = body?.phone ? pkPhone(s(body.phone, 30)) : '';
    if (email && !isEmail(email)) throw new BadRequestException('Please enter a valid email');
    if (phone && !/^03\d{9}$/.test(phone)) throw new BadRequestException('Enter a mobile number like 03001234567');
    if (!email && !phone) throw new BadRequestException('Enter your WhatsApp number or email');
    await this.checkout.rememberCustomer(ctx, { name: null, phone: phone || null, email: email || null, acceptsMarketing: true, source: 'NEWSLETTER' });
    return { ok: true };
  }

  /** "Report this store" — open even for suspended or locked stores. */
  async report(storeId: string, body: Record<string, any>, ip: string) {
    if (body?.hp) return { ok: true };
    const store = await this.prisma.nafaaStore.findUnique({ where: { id: String(storeId ?? '') }, select: { id: true, tenantId: true } });
    if (!store) throw new NotFoundException('Store not found');
    const reason = REPORT_REASONS.includes(body?.reason) ? body.reason : 'OTHER';
    const ipHash = crypto.createHash('sha256').update(`${ip}|${store.id}`).digest('hex').slice(0, 32);
    const recent = await this.prisma.storeAbuseReport.count({ where: { ipHash, createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
    if (recent >= 3) return { ok: true };
    const page = s(body?.pageUrl, 500);
    await this.prisma.storeAbuseReport.create({
      data: {
        storeId: store.id, tenantId: store.tenantId, reason, details: s(body?.details, 2000) || null, reporterName: s(body?.name, 100) || null,
        contact: s(body?.contact, 160) || null, pageUrl: /^https?:\/\//.test(page) ? page : null, ipHash,
      },
    });
    return { ok: true };
  }
}

function escapeHtml(v: string) {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
