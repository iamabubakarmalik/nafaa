/**
 * Per-doctor money for a period, from the fee bills themselves so it matches
 * the day book: patients booked / seen, consultation and lab fees (voided
 * bills left out, returned amounts taken off), cash vs khata, and the
 * doctor's share (% of consultation fees, or a fixed amount per patient seen).
 */

import { PrismaService } from '../../../prisma/prisma.service';
import { FEE_LINK } from './fee-billing';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

export const DOCTOR_SELECT = { id: true, fullName: true, title: true, photoUrl: true, specialties: true, consultationFee: true, followUpFee: true, followUpDays: true, commissionPct: true, commissionType: true } as const;

export async function doctorShares(prisma: PrismaService, tenantId: string, from: Date, to: Date, doctorId?: string) {
  const [doctors, appts, lines] = await Promise.all([
    prisma.clinicDoctorProfile.findMany({ where: { tenantId, ...(doctorId && { id: doctorId }) }, select: DOCTOR_SELECT }),
    prisma.clinicAppointment.findMany({ where: { tenantId, scheduledStart: { gte: from, lte: to }, ...(doctorId && { doctorId }) }, select: { doctorId: true, status: true } }),
    prisma.saleItem.findMany({
      where: { internalNote: { startsWith: 'clinic-' }, sale: { tenantId, createdAt: { gte: from, lte: to }, status: { notIn: ['VOIDED', 'FULLY_RETURNED'] } } },
      select: { internalNote: true, total: true, returnItems: { select: { total: true } }, sale: { select: { total: true, paidAmount: true, creditAmount: true } } },
    }),
  ]);
  const aptIds = lines.filter((l) => l.internalNote!.startsWith(FEE_LINK.appointment)).map((l) => l.internalNote!.slice(FEE_LINK.appointment.length));
  const labIds = lines.filter((l) => l.internalNote!.startsWith(FEE_LINK.lab)).map((l) => l.internalNote!.slice(FEE_LINK.lab.length));
  const [aptDoc, labDoc] = await Promise.all([
    prisma.clinicAppointment.findMany({ where: { tenantId, id: { in: aptIds } }, select: { id: true, doctorId: true } }),
    prisma.clinicLabOrder.findMany({ where: { tenantId, id: { in: labIds } }, select: { id: true, doctorId: true } }),
  ]);
  const docOf = new Map<string, string>([...aptDoc.map((a) => [`${FEE_LINK.appointment}${a.id}`, a.doctorId] as const), ...labDoc.map((l) => [`${FEE_LINK.lab}${l.id}`, l.doctorId] as const)]);

  const rows = new Map<string, { booked: number; seen: number; waiting: number; cancelled: number; fees: number; labFees: number; collected: number; khata: number; bills: number }>();
  const row = (id: string) => {
    if (!rows.has(id)) rows.set(id, { booked: 0, seen: 0, waiting: 0, cancelled: 0, fees: 0, labFees: 0, collected: 0, khata: 0, bills: 0 });
    return rows.get(id)!;
  };
  for (const a of appts) {
    const r = row(a.doctorId);
    r.booked += 1;
    if (a.status === 'COMPLETED') r.seen += 1;
    else if (a.status === 'CANCELLED' || a.status === 'NO_SHOW') r.cancelled += 1;
    else r.waiting += 1;
  }
  for (const l of lines) {
    const doc = docOf.get(l.internalNote!);
    if (!doc || (doctorId && doc !== doctorId)) continue;
    const r = row(doc);
    const gross = Number(l.total) || 0;
    const amount = Math.max(gross - l.returnItems.reduce((s, x) => s + (Number(x.total) || 0), 0), 0);
    // Fee bills carry one line, so the bill's paid / khata split is the line's.
    const share = l.sale.total > 0 ? gross / l.sale.total : 0;
    if (l.internalNote!.startsWith(FEE_LINK.lab)) r.labFees += amount; else r.fees += amount;
    r.khata += (Number(l.sale.creditAmount) || 0) * share;
    r.collected += Math.min(Number(l.sale.paidAmount) || 0, l.sale.total) * share;
    r.bills += 1;
  }
  const out = [...rows.entries()].map(([id, r]) => {
    const d = doctors.find((x) => x.id === id);
    const pct = d?.commissionPct ?? 0;
    const fixed = d?.commissionType === 'FIXED';
    const share = r2(fixed ? pct * r.seen : (r.fees * pct) / 100);
    return {
      doctorId: id, doctor: d ?? null,
      ...r, fees: r2(r.fees), labFees: r2(r.labFees), collected: r2(r.collected), khata: r2(r.khata),
      commissionType: fixed ? 'FIXED' : 'PERCENTAGE', commissionPct: pct, share, clinicKeeps: r2(r.fees + r.labFees - share),
    };
  }).sort((a, b) => b.fees - a.fees);
  const sum = (k: 'booked' | 'seen' | 'fees' | 'labFees' | 'collected' | 'khata' | 'share') => r2(out.reduce((s, x) => s + x[k], 0));
  return {
    rows: out,
    totals: { booked: sum('booked'), seen: sum('seen'), fees: sum('fees'), labFees: sum('labFees'), collected: sum('collected'), khata: sum('khata'), share: sum('share') },
  };
}
