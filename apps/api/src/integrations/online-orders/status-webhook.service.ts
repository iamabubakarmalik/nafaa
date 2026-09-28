import { Injectable, Logger } from '@nestjs/common';
import { promises as dns } from 'dns';
import { isIP } from 'net';
import { Integration } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { assertSafeWebhookUrl, readWebsiteConfig, signPayload } from './website-config';
import { WooCommerceService } from './woocommerce.service';

/**
 * Nafaa → Website: order ka status badla to website ko batao, taake
 * customer ko website par "Aap ka order raste me hai" dikhe.
 *
 * Nafaa ka WordPress plugin connect hote hi apna URL khud yahan set kar
 * deta hai. Custom website wala apna URL settings me daal sakta hai.
 * Fire-and-forget: website band ho to bhi Nafaa ka kaam nahi rukta.
 */
@Injectable()
export class StatusWebhookService {
  private readonly logger = new Logger(StatusWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly woo: WooCommerceService,
  ) {}

  send(integration: Integration, order: any, event: string) {
    if ((order.metadata as any)?.test) return;
    // WooCommerce ek click se jura hai → seedha uske order par status/note
    if (this.woo.isConnected(integration)) {
      this.woo.pushStatus(integration, order, event).catch(() => null);
      return;
    }
    const config = readWebsiteConfig(integration.config);
    if (!config.statusWebhookUrl || (order.metadata as any)?.test) return;
    let url: string;
    try {
      url = assertSafeWebhookUrl(config.statusWebhookUrl);
    } catch {
      return;
    }
    this.deliver(integration, url, order, event).catch(() => null);
  }

  async deliver(integration: Integration, url: string, order: any, event: string) {
    const body = JSON.stringify({
      event,
      orderId: order.externalOrderId,
      orderNumber: order.externalOrderNumber,
      status: order.orderStatus,
      paymentStatus: order.paymentStatus,
      trackingNumber: order.trackingNumber ?? null,
      courierName: order.courierName ?? null,
      cancelReason: order.cancelReason ?? null,
      timestamp: new Date().toISOString(),
    });

    // Naam ke peeche andar ka IP to nahi (DNS se 10.x / 169.254.x)?
    if (process.env.NODE_ENV === 'production') {
      const host = new URL(url).hostname;
      const addrs = isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
      if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
        return { ok: false, error: 'Website ka address andar ka (private) hai — allowed nahi' };
      }
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    let ok = false;
    let error: string | undefined;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Nafaa-POS-Webhook/1.0',
          'X-Nafaa-Event': event,
          ...(integration.webhookSecret && { 'X-Nafaa-Signature': signPayload(integration.webhookSecret, body) }),
        },
        body,
        signal: ctrl.signal,
        // Redirect ke zariye andar ke address par jane se roko
        redirect: 'manual',
      });
      ok = res.ok;
      if (!ok) error = `HTTP ${res.status}`;
    } catch (e: any) {
      error = e?.name === 'AbortError' ? 'Website ne 8 second me jawab nahi diya' : e?.message ?? 'Network error';
    } finally {
      clearTimeout(timer);
    }

    await this.prisma.syncLog.create({
      data: {
        integrationId: integration.id,
        tenantId: integration.tenantId,
        operation: `STATUS_PUSH:${event}`,
        direction: 'OUTBOUND',
        status: ok ? 'SUCCESS' : 'FAILED',
        recordsProcessed: 1,
        recordsSuccess: ok ? 1 : 0,
        recordsFailed: ok ? 0 : 1,
        errorMessage: error,
        details: { orderId: order.externalOrderId, status: order.orderStatus },
        completedAt: new Date(),
      },
    }).catch(() => null);

    if (!ok) this.logger.warn(`Status push fail (${integration.displayName}): ${error}`);
    return { ok, error };
  }
}

function isPrivateIp(ip: string): boolean {
  const v = ip.replace(/^::ffff:/, '');
  if (isIP(v) === 4) {
    const [a, b] = v.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const l = v.toLowerCase();
  return l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80');
}
