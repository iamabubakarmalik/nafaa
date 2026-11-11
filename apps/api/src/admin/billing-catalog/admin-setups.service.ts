/**
 * Setup requests: one-time services shops paid for (Assisted setup, Full
 * activation) that the Nafaa team has to deliver. A request is open until an
 * admin marks it done with a short note.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SETUP_DONE, SETUP_PENDING } from '../../modules/billing/pricing/pricing-core';

@Injectable()
export class AdminSetupsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: { status?: string; page?: string; limit?: string }) {
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 25));
    const page = Math.max(1, Number(q.page) || 1);
    const done = q.status === 'done';
    const where = { addOn: { kind: 'ONE_TIME' as const }, note: { startsWith: done ? SETUP_DONE : SETUP_PENDING } };
    const [rows, total, open] = await Promise.all([
      this.prisma.tenantAddOn.findMany({
        where, orderBy: { updatedAt: done ? 'desc' : 'asc' }, skip: (page - 1) * limit, take: limit,
        include: {
          addOn: { select: { key: true, name: true, priceMonthly: true } },
          tenant: { select: { id: true, name: true, phone: true, businessType: true, users: { where: { role: 'OWNER' }, select: { fullName: true, email: true, phone: true }, take: 1 } } },
        },
      }),
      this.prisma.tenantAddOn.count({ where }),
      this.prisma.tenantAddOn.count({ where: { addOn: { kind: 'ONE_TIME' }, note: { startsWith: SETUP_PENDING } } }),
    ]);
    const invoiceIds = rows.map((r) => r.note?.split(' ').pop()).filter((x): x is string => !!x && x.length > 20);
    const invoices = invoiceIds.length ? await this.prisma.invoice.findMany({ where: { id: { in: invoiceIds } }, select: { id: true, invoiceNumber: true, total: true, paidAt: true } }) : [];
    const byId = new Map(invoices.map((i) => [i.id, i]));
    return {
      items: rows.map((r) => {
        const invoiceId = r.note?.startsWith(SETUP_PENDING) ? r.note.split(' ').pop() : null;
        const inv = invoiceId ? byId.get(invoiceId) : null;
        return {
          id: r.id,
          service: r.addOn,
          shop: { id: r.tenant.id, name: r.tenant.name, phone: r.tenant.phone, businessType: r.tenant.businessType, owner: r.tenant.users[0] ?? null },
          paidAmount: inv?.total ?? null,
          invoiceNumber: inv?.invoiceNumber ?? null,
          boughtAt: inv?.paidAt ?? r.updatedAt,
          status: r.note?.startsWith(SETUP_DONE) ? 'done' : 'pending',
          doneNote: r.note?.startsWith(SETUP_DONE) ? r.note.slice(SETUP_DONE.length).trim() : null,
          updatedAt: r.updatedAt,
        };
      }),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      stats: { open },
    };
  }

  async markDone(id: string, adminName: string, note?: string) {
    const row = await this.prisma.tenantAddOn.findUnique({ where: { id }, select: { note: true, addOn: { select: { kind: true } } } });
    if (!row || row.addOn.kind !== 'ONE_TIME') throw new NotFoundException('Setup request not found');
    if (!row.note?.startsWith(SETUP_PENDING)) throw new BadRequestException('Already marked done');
    const text = `${SETUP_DONE} ${new Date().toISOString().slice(0, 10)} by ${adminName}${note?.trim() ? ` — ${note.trim().slice(0, 300)}` : ''}`;
    await this.prisma.tenantAddOn.update({ where: { id }, data: { note: text } });
    return { id, status: 'done' };
  }
}
