/**
 * Links new shops to the partner who brought them.
 *
 * - Signup with a partner code: the shop belongs to that partner ("code").
 * - Signup without a code whose phone matches a partner's lead that is still
 *   locked to them: the shop belongs to that partner ("lead"). The commission
 *   job runs the same phone match later for shops that added a phone after
 *   signup (Google/Apple signups).
 * - A partner's own phone or email signing up is never attributed.
 * - Admins can set or clear the partner by hand ("admin").
 *
 * Attribution never blocks or fails a signup.
 */

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PartnerLeadStage } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { LEAD_LOCK_DAYS, addDays, normalizePhone, phoneVariants } from '../shared/partner-utils';

const OPEN_STAGES: PartnerLeadStage[] = [PartnerLeadStage.VISITED, PartnerLeadStage.DEMO];

@Injectable()
export class PartnerAttributionService {
  private readonly logger = new Logger(PartnerAttributionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** True when the code belongs to an active partner. Used by signup to accept the code. */
  async isActiveCode(code: string): Promise<boolean> {
    const p = await this.prisma.partner.findUnique({ where: { code: code.trim().toUpperCase() }, select: { status: true } });
    return p?.status === 'ACTIVE';
  }

  async attachAtSignup(input: { tenantId: string; code?: string | null; phone?: string | null; email?: string | null }): Promise<void> {
    try {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: input.tenantId }, select: { id: true, name: true, partnerId: true } });
      if (!tenant || tenant.partnerId) return;
      const phones = input.phone ? phoneVariants(input.phone) : [];

      if (input.code) {
        const partner = await this.prisma.partner.findUnique({ where: { code: input.code.trim().toUpperCase() } });
        if (!partner || partner.status !== 'ACTIVE') return;
        const self = (input.phone && phones.includes(partner.phone)) || (!!input.email && !!partner.email && partner.email.toLowerCase() === input.email.toLowerCase());
        if (self) {
          this.logger.warn(`Self-referral ignored: partner ${partner.code} signed up shop ${tenant.id}`);
          return;
        }
        await this.link(tenant, partner.id, 'code', phones);
        return;
      }

      if (phones.length) {
        const lead = await this.prisma.partnerLead.findFirst({
          where: { phone: { in: phones }, tenantId: null, stage: { in: OPEN_STAGES }, lockedUntil: { gt: new Date() }, partner: { status: 'ACTIVE' } },
          orderBy: { createdAt: 'asc' },
          select: { partnerId: true },
        });
        if (lead) await this.link(tenant, lead.partnerId, 'lead', phones);
      }
    } catch (e) {
      this.logger.error(`Partner attribution failed for shop ${input.tenantId}: ${e instanceof Error ? e.message : e}`);
    }
  }

  /**
   * Finds shops made in the last lock period that have no partner yet, whose
   * shop or owner phone matches a locked lead. Returns how many were linked.
   */
  async attributeByLeadPhones(): Promise<number> {
    const now = new Date();
    const leads = await this.prisma.partnerLead.findMany({
      where: { tenantId: null, stage: { in: OPEN_STAGES }, lockedUntil: { gt: now }, partner: { status: 'ACTIVE' } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, partnerId: true, phone: true, createdAt: true },
      take: 5000,
    });
    if (!leads.length) return 0;
    const byPhone = new Map<string, (typeof leads)[number]>();
    for (const l of leads) for (const v of phoneVariants(l.phone)) if (!byPhone.has(v)) byPhone.set(v, l);
    const phones = [...byPhone.keys()];
    const since = addDays(now, -LEAD_LOCK_DAYS);

    const tenants = await this.prisma.tenant.findMany({
      where: {
        partnerId: null,
        createdAt: { gte: since },
        OR: [{ phone: { in: phones } }, { users: { some: { role: 'OWNER', phone: { in: phones } } } }],
      },
      select: { id: true, name: true, partnerId: true, phone: true, createdAt: true, users: { where: { role: 'OWNER' }, select: { phone: true }, take: 3 } },
    });
    let linked = 0;
    for (const t of tenants) {
      const candidates = [t.phone, ...t.users.map((u) => u.phone)].filter((p): p is string => !!p);
      const lead = candidates.map((p) => byPhone.get(normalizePhone(p)) ?? byPhone.get(p)).find((l) => l && l.createdAt <= t.createdAt);
      if (!lead) continue;
      await this.link(t, lead.partnerId, 'lead', phoneVariants(lead.phone));
      linked++;
    }
    return linked;
  }

  /** Admin sets or clears a shop's partner. */
  async assignByAdmin(tenantId: string, partnerId: string | null) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true, phone: true, partnerId: true } });
    if (!tenant) throw new NotFoundException('Shop not found');
    if (!partnerId) {
      await this.prisma.$transaction([
        this.prisma.tenant.update({ where: { id: tenantId }, data: { partnerId: null, partnerAttributedAt: null, partnerSource: null } }),
        this.prisma.partnerLead.updateMany({ where: { tenantId }, data: { tenantId: null, stage: PartnerLeadStage.LOST, lostReason: 'Removed by Nafaa' } }),
      ]);
      return { tenantId, partnerId: null };
    }
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId }, select: { id: true, status: true } });
    if (!partner) throw new NotFoundException('Partner not found');
    if (partner.status !== 'ACTIVE') throw new BadRequestException('Only an active partner can be given a shop');
    if (tenant.partnerId && tenant.partnerId !== partnerId) {
      await this.prisma.partnerLead.updateMany({ where: { tenantId, partnerId: tenant.partnerId }, data: { tenantId: null, stage: PartnerLeadStage.LOST, lostReason: 'Moved to another partner by Nafaa' } });
    }
    await this.link({ ...tenant, partnerId: null }, partnerId, 'admin', tenant.phone ? phoneVariants(tenant.phone) : []);
    return { tenantId, partnerId };
  }

  /** Sets the shop's partner and moves (or creates) the partner's lead for it to "signed up". */
  private async link(tenant: { id: string; name: string; partnerId: string | null }, partnerId: string, source: 'code' | 'lead' | 'admin', phones: string[]) {
    const now = new Date();
    const lead = phones.length
      ? await this.prisma.partnerLead.findFirst({ where: { partnerId, phone: { in: phones }, tenantId: null }, orderBy: { createdAt: 'asc' }, select: { id: true } })
      : null;
    const owner = await this.prisma.user.findFirst({ where: { tenantId: tenant.id, role: 'OWNER' }, select: { fullName: true, phone: true } });
    await this.prisma.$transaction([
      this.prisma.tenant.update({ where: { id: tenant.id }, data: { partnerId, partnerAttributedAt: now, partnerSource: source } }),
      lead
        ? this.prisma.partnerLead.update({ where: { id: lead.id }, data: { tenantId: tenant.id, stage: PartnerLeadStage.SIGNED_UP, signedUpAt: now, lostReason: null } })
        : this.prisma.partnerLead.create({
            data: {
              partnerId,
              shopName: tenant.name,
              ownerName: owner?.fullName ?? null,
              phone: normalizePhone(phones[0] ?? owner?.phone ?? ''),
              tenantId: tenant.id,
              stage: PartnerLeadStage.SIGNED_UP,
              signedUpAt: now,
              lockedUntil: now,
              notes: source === 'code' ? 'Signed up with your code' : source === 'admin' ? 'Added by Nafaa' : null,
            },
          }),
    ]);
  }
}
