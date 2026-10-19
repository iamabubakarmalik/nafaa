/**
 * Clinic panels: a company that pays for its staff's visits. A panel fee bill
 * goes on the panel's own khata customer (made on first use, with the panel's
 * credit limit), so the statement, payments and receipts are the shared khata.
 */

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { FEE_LINK } from '../appointments/fee-billing';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

function readPanel(dto: any, partial: boolean) {
  const out: { name?: string; creditLimit?: number; isActive?: boolean } = {};
  if (dto?.name !== undefined || !partial) {
    const name = String(dto?.name ?? '').trim();
    if (name.length < 2) throw new BadRequestException('Panel / company ka naam likhein');
    out.name = name.slice(0, 120);
  }
  if (dto?.creditLimit !== undefined && dto.creditLimit !== '') {
    const limit = Number(dto.creditLimit);
    if (!Number.isFinite(limit) || limit < 0) throw new BadRequestException('Credit limit sahi likhein');
    out.creditLimit = r2(limit);
  }
  if (dto?.isActive !== undefined) out.isActive = !!dto.isActive;
  return out;
}

@Injectable()
export class PanelsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Panels with what each owes on its khata and how many patients it covers. */
  async list(user: AuthenticatedUser, params: { search?: string; status?: string }) {
    const q = params.search?.trim();
    const panels = await this.prisma.clinicPanel.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status === 'inactive' ? { isActive: false } : params.status === 'all' ? {} : { isActive: true }),
        ...(q && { name: { contains: q, mode: 'insensitive' as const } }),
      },
      orderBy: { name: 'asc' },
      include: { _count: { select: { patients: true } } },
    });
    const customers = await this.prisma.customer.findMany({
      where: { tenantId: user.tenantId, id: { in: panels.map((p) => p.customerId).filter((x): x is string => !!x) } },
      select: { id: true, balance: true },
    });
    const bal = new Map(customers.map((c) => [c.id, c.balance]));
    const items = panels.map(({ _count, ...p }) => ({ ...p, patients: _count.patients, balance: r2(p.customerId ? bal.get(p.customerId) ?? 0 : 0) }));
    return { items, summary: { panels: items.length, due: r2(items.reduce((s, p) => s + Math.max(p.balance, 0), 0)), overLimit: items.filter((p) => p.creditLimit > 0 && p.balance > p.creditLimit).length } };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.clinicPanel.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Panel nahi mila');
    return p;
  }

  async create(user: AuthenticatedUser, dto: any) {
    const data = readPanel(dto, false);
    try {
      return await this.prisma.clinicPanel.create({ data: { tenantId: user.tenantId, name: data.name!, creditLimit: data.creditLimit ?? 0 } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException(`"${data.name}" naam ka panel pehle se hai`);
      throw e;
    }
  }

  /** Name and credit limit follow onto the panel's khata customer. */
  async update(user: AuthenticatedUser, id: string, dto: any) {
    const panel = await this.getOne(user, id);
    const data = readPanel(dto, true);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.clinicPanel.update({ where: { id: panel.id }, data });
        if (panel.customerId && (data.name !== undefined || data.creditLimit !== undefined)) {
          await tx.customer.updateMany({
            where: { id: panel.customerId, tenantId: user.tenantId },
            data: { ...(data.name !== undefined && { name: data.name }), ...(data.creditLimit !== undefined && { creditLimit: data.creditLimit }) },
          });
        }
        return row;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException(`"${data.name}" naam ka panel pehle se hai`);
      throw e;
    }
  }

  /** A panel id from a form: null clears it; otherwise it must be an active panel of this clinic. */
  async usable(tenantId: string, panelId: unknown): Promise<string | null> {
    if (panelId === null || panelId === '') return null;
    const p = await this.prisma.clinicPanel.findFirst({ where: { id: String(panelId), tenantId }, select: { id: true, isActive: true, name: true } });
    if (!p) throw new NotFoundException('Panel nahi mila');
    if (!p.isActive) throw new BadRequestException(`Panel "${p.name}" band hai`);
    return p.id;
  }

  /**
   * The panel's khata customer, made on first use with the panel's name and
   * credit limit. The panel row is locked so two desks never make two.
   */
  async khataCustomer(user: AuthenticatedUser, panelId: string, shopId?: string | null) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ClinicPanel" WHERE id = ${panelId} FOR UPDATE`;
      const panel = await tx.clinicPanel.findFirst({ where: { id: panelId, tenantId: user.tenantId } });
      if (!panel) throw new NotFoundException('Panel nahi mila');
      if (!panel.isActive) throw new BadRequestException(`Panel "${panel.name}" band hai — visit se panel hatayein ya panel chalu karein`);
      if (panel.customerId) {
        const c = await tx.customer.findFirst({ where: { id: panel.customerId, tenantId: user.tenantId }, select: { id: true, isActive: true } });
        if (c?.isActive) return { customerId: c.id, name: panel.name };
        if (c) throw new BadRequestException(`Panel "${panel.name}" ka khata customer band hai — Customers me chalu karein`);
      }
      const c = await tx.customer.create({
        data: { tenantId: user.tenantId, shopId: shopId ?? null, name: panel.name, creditLimit: panel.creditLimit, notes: 'Clinic panel (company khata)' },
        select: { id: true },
      });
      await tx.clinicPanel.update({ where: { id: panel.id }, data: { customerId: c.id } });
      return { customerId: c.id, name: panel.name };
    });
  }

  /**
   * Panel statement for a period: every fee bill on its khata (with the
   * patient and visit) and every payment received, plus the balance now.
   */
  async statement(user: AuthenticatedUser, id: string, from?: string, to?: string) {
    const panel = await this.getOne(user, id);
    const range = {
      ...(from && !Number.isNaN(new Date(from).getTime()) && { gte: new Date(from) }),
      ...(to && !Number.isNaN(new Date(to).getTime()) && { lte: new Date(to) }),
    };
    if (!panel.customerId) return { panel, customer: null, bills: [], payments: [], totals: { billed: 0, onKhata: 0, received: 0 } };
    const [customer, sales, payments] = await Promise.all([
      this.prisma.customer.findFirst({ where: { id: panel.customerId, tenantId: user.tenantId }, select: { id: true, name: true, balance: true, creditLimit: true } }),
      this.prisma.sale.findMany({
        where: { tenantId: user.tenantId, customerId: panel.customerId, ...(Object.keys(range).length && { createdAt: range }) },
        select: {
          id: true, saleNumber: true, status: true, total: true, paidAmount: true, creditAmount: true, createdAt: true,
          items: { select: { internalNote: true, note: true, total: true, returnItems: { select: { total: true } } } },
        },
        orderBy: { createdAt: 'asc' },
        take: 2000,
      }),
      this.prisma.customerLedger.findMany({
        where: { tenantId: user.tenantId, customerId: panel.customerId, type: 'PAYMENT_RECEIVED', ...(Object.keys(range).length && { createdAt: range }) },
        select: { id: true, amount: true, balanceAfter: true, reference: true, note: true, paymentMethod: true, createdAt: true, createdBy: { select: { fullName: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    const aptIds = sales.flatMap((s) => s.items.map((i) => i.internalNote ?? '').filter((t) => t.startsWith(FEE_LINK.appointment)).map((t) => t.slice(FEE_LINK.appointment.length)));
    const appts = await this.prisma.clinicAppointment.findMany({
      where: { tenantId: user.tenantId, id: { in: aptIds } },
      select: { id: true, appointmentNumber: true, tokenNumber: true, patientId: true, doctorId: true, scheduledStart: true },
    });
    const [patients, doctors] = await Promise.all([
      this.prisma.clinicPatientProfile.findMany({ where: { tenantId: user.tenantId, id: { in: appts.map((a) => a.patientId) } }, select: { id: true, fullName: true, mrn: true, insuranceNumber: true } }),
      this.prisma.clinicDoctorProfile.findMany({ where: { tenantId: user.tenantId, id: { in: appts.map((a) => a.doctorId) } }, select: { id: true, fullName: true, title: true } }),
    ]);
    const aptById = new Map(appts.map((a) => [a.id, a]));
    const bills = sales.map((s) => {
      const tag = s.items.find((i) => i.internalNote?.startsWith(FEE_LINK.appointment))?.internalNote;
      const apt = tag ? aptById.get(tag.slice(FEE_LINK.appointment.length)) ?? null : null;
      const returned = r2(s.items.reduce((n, i) => n + i.returnItems.reduce((m, x) => m + x.total, 0), 0));
      return {
        id: s.id, saleNumber: s.saleNumber, status: s.status, createdAt: s.createdAt, total: s.total, paidAmount: s.paidAmount, creditAmount: s.creditAmount, returned,
        line: s.items[0]?.note ?? null,
        appointment: apt && { id: apt.id, appointmentNumber: apt.appointmentNumber, tokenNumber: apt.tokenNumber, scheduledStart: apt.scheduledStart },
        patient: apt ? patients.find((p) => p.id === apt.patientId) ?? null : null,
        doctor: apt ? doctors.find((d) => d.id === apt.doctorId) ?? null : null,
      };
    });
    const live = bills.filter((b) => b.status !== 'VOIDED');
    return {
      panel, customer, bills, payments: payments.map((p) => ({ ...p, amount: Math.abs(p.amount) })),
      totals: {
        billed: r2(live.reduce((n, b) => n + b.total - b.returned, 0)),
        onKhata: r2(live.reduce((n, b) => n + b.creditAmount, 0)),
        received: r2(payments.reduce((n, p) => n + Math.abs(p.amount), 0)),
      },
    };
  }
}
