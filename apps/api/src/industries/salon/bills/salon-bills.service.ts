/**
 * The salon bill. One bill carries the services done (each with its
 * stylist, the products used up on it and any colour notes), retail
 * products bought, a tip, the membership discount and prepaid package
 * sessions. It is saved through the shared sale engine, so stock, split
 * payments, khata, counter rules (discount limit, PIN, credit), receipts,
 * returns, voids and every report work as for any other bill.
 *
 * Services are bill lines against their service product (no stock).
 * Products used on a service leave stock at cost on a line of Rs 0.
 * Every bill is tied to an appointment: the booked one, or a counter record
 * made here, which keeps the stylist's work, commission and the customer's
 * history in one place. Each service line keeps the id of the bill line
 * that charged it, so a return maps to the exact service.
 *
 * A gift voucher lowers the price of the lines it pays for (see
 * voucher-rules.ts); its balance is taken before the sale is saved.
 */

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, type SalonService, type SalonStaffProfile, type SalonStaffService } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopScope } from '../../../common/shop-scope';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { CreateSaleDto } from '../../../modules/sales/sales/dto/create-sale.dto';
import { paidOnKhata } from '../../_shared/industry-sale.helper';
import { ensureServiceProduct, r2, withNextNumber } from '../common/salon-common';
import { spreadVoucher, usableVoucher, voucherTag } from '../gift-vouchers/voucher-rules';
import { CreateSalonBillDto } from './dto/create-salon-bill.dto';

type StaffWithServices = SalonStaffProfile & { services: SalonStaffService[] };
type SaleItemInput = CreateSaleDto['items'][number];

/** Bills of these sold items are no longer valid proof of a package or membership. */
const DEAD_SALE = ['VOIDED', 'FULLY_RETURNED'];

/**
 * Commission on one service line. The service's own rate wins (a stylist's
 * custom rate for that service first); otherwise the stylist's general
 * rate. `base` is what the line earned; for a package session it is the
 * service's list price, since the stylist did the work.
 */
export function lineCommission(svc: SalonService, sp: StaffWithServices | null, base: number): number {
  if (!sp || base <= 0) return 0;
  const custom = sp.services.find((s) => s.serviceId === svc.id)?.customCommissionPct;
  const pct = custom ?? (svc.commissionPct || 0);
  const fixed = svc.commissionFixed || 0;
  if (pct > 0 || fixed > 0) return r2((base * pct) / 100 + fixed);
  if (sp.commissionType === 'FIXED_PER_SERVICE') return r2(sp.commissionFixed);
  if (sp.commissionType === 'PERCENTAGE') return r2((base * sp.commissionPct) / 100);
  return r2((base * (sp.commissionPct || 0)) / 100 + (sp.commissionFixed || 0));
}

/** Services a package covers; empty means any service. */
export function packageServiceIds(services: Prisma.JsonValue): Set<string> {
  const list = Array.isArray(services) ? services : [];
  return new Set(list.map((s) => (typeof s === 'string' ? s : (s as { serviceId?: string } | null)?.serviceId)).filter((x): x is string => !!x));
}

@Injectable()
export class SalonBillsService {
  private readonly log = new Logger(SalonBillsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateSalonBillDto) {
    const tenantId = user.tenantId;
    const lines = dto.services ?? [];
    const products = dto.products ?? [];
    if (!lines.length && !products.length) throw new BadRequestException('Bill me kam az kam ek service ya cheez daalein');

    // ─── Appointment and customer ───
    const apt = dto.appointmentId
      ? await this.prisma.salonAppointment.findFirst({ where: { id: dto.appointmentId, tenantId }, include: { services: true } })
      : null;
    if (dto.appointmentId && !apt) throw new NotFoundException('Appointment nahi mili');
    if (apt?.saleId) throw new BadRequestException(`${apt.appointmentNumber} ka bill pehle hi ban chuka hai`);
    if (apt && (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW')) throw new BadRequestException('Cancel / no-show appointment ka bill nahi banta');
    if (apt?.customerId && dto.customerId && apt.customerId !== dto.customerId) throw new BadRequestException('Ye appointment kisi aur customer ki hai');
    const customerId = apt?.customerId ?? dto.customerId ?? null;
    const customer = customerId
      ? await this.prisma.customer.findFirst({ where: { id: customerId, tenantId }, select: { id: true, name: true, phone: true } })
      : null;
    if (customerId && !customer) throw new NotFoundException('Customer nahi mila');

    // ─── Services and stylists ───
    const svcIds = [...new Set(lines.map((l) => l.serviceId))];
    const svcRows = svcIds.length ? await this.prisma.salonService.findMany({ where: { tenantId, id: { in: svcIds } } }) : [];
    if (svcRows.length !== svcIds.length) throw new NotFoundException('Koi service nahi mili — page refresh karein');
    const svcMap = new Map(svcRows.map((s) => [s.id, s]));

    const staffIds = [...new Set(lines.map((l) => l.staffProfileId).filter((x): x is string => !!x))];
    const staffRows = staffIds.length
      ? await this.prisma.salonStaffProfile.findMany({ where: { tenantId, id: { in: staffIds } }, include: { services: true } })
      : [];
    if (staffRows.length !== staffIds.length) throw new NotFoundException('Stylist nahi mila — page refresh karein');
    const staffMap = new Map(staffRows.map((s) => [s.id, s]));
    const people = staffRows.length
      ? await this.prisma.staff.findMany({ where: { tenantId, id: { in: staffRows.map((s) => s.staffId) } }, select: { id: true, fullName: true } })
      : [];
    const nameOfStaff = (sp: SalonStaffProfile | null) => (sp ? people.find((p) => p.id === sp.staffId)?.fullName ?? 'Staff' : undefined);

    // ─── Membership ───
    const membership = dto.useMembership ? await this.activeMembership(tenantId, customerId) : null;
    if (dto.useMembership && !membership) throw new BadRequestException('Is customer ki koi chalti membership nahi');
    const memberPct = membership?.plan.discountPct ?? 0;

    // ─── Packages ───
    const purchaseIds = [...new Set(lines.map((l) => l.packagePurchaseId).filter((x): x is string => !!x))];
    const purchases = purchaseIds.length
      ? await this.prisma.salonPackagePurchase.findMany({ where: { tenantId, id: { in: purchaseIds } }, include: { package: true } })
      : [];
    if (purchases.length !== purchaseIds.length) throw new NotFoundException('Package nahi mila');
    const purchaseMap = new Map(purchases.map((p) => [p.id, p]));
    const usesOf = new Map<string, number>();
    for (const l of lines) {
      if (!l.packagePurchaseId) continue;
      const p = purchaseMap.get(l.packagePurchaseId)!;
      if (!customerId || p.customerId !== customerId) throw new BadRequestException(`${p.purchaseNumber} is customer ka package nahi hai`);
      if (p.status !== 'ACTIVE') throw new BadRequestException(`${p.purchaseNumber} active nahi hai`);
      if (p.expiryDate < new Date()) throw new BadRequestException(`${p.purchaseNumber} ki muddat khatam ho chuki`);
      const covered = packageServiceIds(p.package.services);
      if (covered.size && !covered.has(l.serviceId)) throw new BadRequestException(`${svcMap.get(l.serviceId)?.name} ${p.package.name} me shamil nahi`);
      usesOf.set(p.id, (usesOf.get(p.id) ?? 0) + 1);
    }
    for (const [id, n] of usesOf) {
      const p = purchaseMap.get(id)!;
      if (n > p.sessionsRemaining) throw new BadRequestException(`${p.purchaseNumber} me sirf ${p.sessionsRemaining} session baqi hain`);
      await this.assertSaleAlive(tenantId, `SLN-${p.purchaseNumber}`, p.purchaseNumber);
    }

    // ─── Products used on services (names for the history) ───
    const usedIds = [...new Set(lines.flatMap((l) => (l.used ?? []).map((u) => u.productId)))];
    const usedRows = usedIds.length
      ? await this.prisma.product.findMany({ where: { tenantId, id: { in: usedIds } }, select: { id: true, name: true, unit: true } })
      : [];
    if (usedRows.length !== usedIds.length) throw new NotFoundException('Istemal wali cheez nahi mili');
    const usedMap = new Map(usedRows.map((p) => [p.id, p]));

    // ─── Commission already paid on this appointment's lines ───
    // Billing again after a void keeps those lines (and their payout); each must still be on the bill.
    const paidOld = lines.length ? (apt?.services ?? []).filter((s) => s.commissionPaid || s.commissionPaidAt) : [];
    const keepPaid = new Map<number, string>();
    for (const old of paidOld) {
      const idx = lines.findIndex((l, i) => !keepPaid.has(i) && l.serviceId === old.serviceId && (l.staffProfileId ?? null) === old.staffProfileId);
      if (idx < 0) throw new BadRequestException(`${old.serviceName}${old.staffName ? ` (${old.staffName})` : ''} ki commission di ja chuki — ye service isi stylist ke saath bill me rakhein`);
      keepPaid.set(idx, old.id);
    }

    // ─── Bill lines ───
    const serviceProduct = await this.prisma.$transaction(async (tx) => {
      const out = new Map<string, string>();
      for (const s of svcRows) out.set(s.id, await ensureServiceProduct(tx, tenantId, s));
      return out;
    });

    const items: SaleItemInput[] = [];
    const unitCosts: Array<number | undefined> = [];
    /** Index in `items` of each service line's bill line. */
    const serviceItem: number[] = [];
    let memberSaved = 0;
    const planned = lines.map((l, idx) => {
      const svc = svcMap.get(l.serviceId)!;
      const sp = l.staffProfileId ? staffMap.get(l.staffProfileId)! : null;
      const staffName = nameOfStaff(sp);
      const custom = sp?.services.find((s) => s.serviceId === svc.id);
      const listPrice = r2(custom?.customPrice ?? svc.discountPrice ?? svc.price);
      const purchase = l.packagePurchaseId ? purchaseMap.get(l.packagePurchaseId)! : null;

      let priceOverride: number;
      let lineDiscount = 0;
      let total: number;
      if (purchase) {
        priceOverride = 0;
        total = 0;
      } else {
        const memberPrice = memberPct > 0 ? r2(listPrice * (1 - memberPct / 100)) : listPrice;
        memberSaved += listPrice - memberPrice;
        const agreed = l.price != null ? r2(l.price) : memberPrice;
        // A price typed below the list (or member) price is a discount, so the counter rules apply to it.
        if (agreed < memberPrice) {
          priceOverride = memberPrice;
          lineDiscount = r2(memberPrice - agreed);
        } else {
          priceOverride = agreed;
        }
        total = agreed;
      }
      const tags = [staffName && `Stylist: ${staffName}`, purchase && `Package ${purchase.purchaseNumber}`, !purchase && memberPct > 0 && `Membership ${memberPct}%`].filter(Boolean);
      serviceItem.push(items.length);
      items.push({ productId: serviceProduct.get(svc.id)!, quantity: 1, priceOverride, lineDiscount: lineDiscount || undefined, note: tags.join(' · ') || undefined });
      unitCosts.push(r2(svc.costPrice ?? 0));

      const used = (l.used ?? []).map((u) => {
        items.push({ productId: u.productId, variantId: u.variantId, quantity: u.quantity, priceOverride: 0, note: `Istemal: ${svc.name}` });
        unitCosts.push(undefined);
        const p = usedMap.get(u.productId)!;
        return { productId: u.productId, variantId: u.variantId ?? null, name: p.name, unit: p.unit, quantity: u.quantity };
      });

      return {
        serviceId: svc.id,
        serviceName: svc.name,
        staffProfileId: sp?.id ?? null,
        staffName: staffName ?? null,
        price: listPrice,
        discount: r2(Math.max(listPrice - total, 0)),
        total,
        durationMinutes: svc.durationMinutes,
        commissionAmount: lineCommission(svc, sp, purchase ? listPrice : total),
        notes: [l.notes?.trim(), purchase && `Package ${purchase.purchaseNumber}`].filter(Boolean).join(' · ') || null,
        productsUsed: used.length ? used : undefined,
        displayOrder: idx,
        saleItemId: null as string | null,
      };
    });

    for (const p of products) {
      items.push({ productId: p.productId, variantId: p.variantId, batchId: p.batchId, quantity: p.quantity, priceOverride: p.price });
      unitCosts.push(undefined);
    }

    // ─── Gift voucher: lowers the price of the lines it pays for ───
    const voucher = dto.voucherCode?.trim() ? await usableVoucher(this.db, tenantId, dto.voucherCode) : null;
    let voucherUsed = 0;
    if (voucher) {
      const units = await this.unitPrices(tenantId, items);
      const rows = items.map((it, i) => ({ unit: units[i], qty: Number(it.quantity), lineDiscount: r2(it.lineDiscount ?? 0) }));
      const room = r2(rows.reduce((s, l) => s + Math.max(l.unit * l.qty - l.lineDiscount, 0), 0) - r2(dto.discount ?? 0));
      const want = r2(Math.min(voucher.balance, dto.voucherAmount ?? voucher.balance, Math.max(room, 0)));
      const { cuts, placed } = spreadVoucher(rows, want);
      if (placed <= 0) throw new BadRequestException('Is bill par voucher se kuch kam nahi hota');
      cuts.forEach((cut, i) => {
        if (!cut) return;
        items[i] = {
          ...items[i],
          priceOverride: r2(rows[i].unit - cut),
          note: [items[i].note, `Voucher ${voucher.code}`].filter(Boolean).join(' · '),
          internalNote: voucherTag(voucher.code, cut * rows[i].qty),
        };
      });
      voucherUsed = placed;
    }

    const tip = r2(dto.tip ?? 0);
    const charges = [
      ...(apt && apt.serviceCharge > 0 ? [{ type: 'CUSTOM', label: 'Service charge', amount: r2(apt.serviceCharge) }] : []),
      ...(apt && apt.taxAmount > 0 ? [{ type: 'OTHER', label: 'Tax', amount: r2(apt.taxAmount) }] : []),
      // The tip is handed to the staff, so it carries its own cost and adds no profit.
      ...(tip > 0 ? [{ type: 'TIP', label: 'Tip (staff)', amount: tip, cost: tip }] : []),
    ];

    // ─── Claim the appointment so a double click cannot bill it twice ───
    if (apt) {
      const claimed = await this.prisma.salonAppointment.updateMany({
        where: { id: apt.id, tenantId, saleId: null, paymentStatus: { not: 'BILLING' } },
        data: { paymentStatus: 'BILLING' },
      });
      if (!claimed.count) throw new BadRequestException(`${apt.appointmentNumber} ka bill ban raha hai — thora intezar karein`);
    }
    const release = async () => {
      if (apt) await this.prisma.salonAppointment.updateMany({ where: { id: apt.id, paymentStatus: 'BILLING' }, data: { paymentStatus: apt.paymentStatus } });
      if (voucher && voucherUsed > 0) await this.prisma.salonGiftVoucher.update({ where: { id: voucher.id }, data: { balance: { increment: voucherUsed } } });
    };
    // Take the voucher money first, so two bills cannot spend the same balance.
    if (voucher) {
      const took = await this.prisma.salonGiftVoucher.updateMany({
        where: { id: voucher.id, status: 'ACTIVE', balance: { gte: voucherUsed - 0.001 } },
        data: { balance: { decrement: voucherUsed } },
      });
      if (!took.count) {
        voucherUsed = 0;
        await release();
        throw new BadRequestException(`${voucher.code} ka balance abhi badla hai — dobara koshish karein`);
      }
    }

    // Payments taken before advances went to khata count as paid with this bill.
    const advance = apt ? r2(apt.paidAmount) : 0;
    const legacyPaid = apt ? r2(Math.max(advance - (await paidOnKhata(this.prisma as unknown as Prisma.TransactionClient, tenantId, apt.appointmentNumber)), 0)) : 0;
    const payments = dto.payments?.length && legacyPaid > 0
      ? [...dto.payments, { method: 'CASH' as const, amount: legacyPaid, note: 'Pehle li gayi payment' }]
      : dto.payments;

    let sale: Awaited<ReturnType<SalesService['create']>>;
    try {
      sale = await this.sales.create(user, scope, {
        shopId: dto.shopId ?? apt?.shopId ?? undefined,
        customerId: customerId ?? undefined,
        paymentMethod: dto.paymentMethod,
        paidAmount: r2(dto.paidAmount + legacyPaid),
        payments,
        discount: dto.discount ? r2(dto.discount) : undefined,
        allowCredit: customerId ? true : undefined,
        managerPin: dto.managerPin,
        note: dto.note?.trim() || (apt ? `Salon ${apt.appointmentNumber}` : undefined),
        items,
        serviceCharges: charges.length ? charges : undefined,
      } as CreateSaleDto, undefined, { unitCosts });
    } catch (e) {
      await release();
      throw e;
    }
    if (voucher) {
      await this.prisma.salonGiftVoucher.updateMany({ where: { id: voucher.id, status: 'ACTIVE', balance: { lte: 0.009 } }, data: { status: 'USED' } });
    }

    // Each service line keeps the bill line that charged it.
    const taken = new Set<string>();
    planned.forEach((p, i) => {
      const want = items[serviceItem[i]];
      const at = sale.items[serviceItem[i]];
      const hit = at && at.productId === want.productId && !taken.has(at.id)
        ? at
        : sale.items.find((x) => x.productId === want.productId && !taken.has(x.id));
      if (hit) { taken.add(hit.id); p.saleItemId = hit.id; }
    });

    const saleTotal = r2(Number(sale.total));
    const advanceOnKhata = r2(advance - legacyPaid);
    const owed = r2(Math.max(Number(sale.creditAmount) - advanceOnKhata, 0));
    const paidTotal = r2(Math.max(saleTotal - owed, 0));
    const servicesTotal = r2(planned.reduce((s, l) => s + l.total, 0));

    try {
      const record = await this.prisma.$transaction(async (tx) => {
        const now = new Date();
        const common = {
          status: 'COMPLETED' as const,
          saleId: sale.id,
          shopId: sale.shopId,
          customerId,
          actualEnd: now,
          subtotal: servicesTotal,
          discount: r2(dto.discount ?? 0),
          tip,
          total: saleTotal,
          paidAmount: paidTotal,
          paymentStatus: owed <= 0.01 ? 'PAID' : paidTotal > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
          membershipId: membership?.id ?? apt?.membershipId ?? null,
          packageId: purchases[0]?.id ?? apt?.packageId ?? null,
        };
        let appointment: { id: string; appointmentNumber: string } | null = null;
        if (apt) {
          if (lines.length) {
            // Booked lines are the plan; the bill's lines are what was done. Lines whose commission was paid stay.
            const kept = [...keepPaid.values()];
            await tx.salonAppointmentService.deleteMany({ where: { appointmentId: apt.id, ...(kept.length && { id: { notIn: kept } }) } });
            const row = (p: (typeof planned)[number]) => ({ ...p, productsUsed: p.productsUsed as Prisma.InputJsonValue | undefined });
            for (const [i, id] of keepPaid) await tx.salonAppointmentService.update({ where: { id }, data: row(planned[i]) });
            await tx.salonAppointmentService.createMany({ data: planned.filter((_, i) => !keepPaid.has(i)).map((p) => ({ ...row(p), appointmentId: apt.id })) });
          }
          appointment = await tx.salonAppointment.update({
            where: { id: apt.id },
            data: { ...common, actualStart: apt.actualStart ?? apt.arrivedAt ?? now },
            select: { id: true, appointmentNumber: true },
          });
        } else if (planned.length) {
          // A counter bill without a booking gets its own record so the stylist's work and the customer's history are kept.
          const minutes = planned.reduce((s, l) => s + l.durationMinutes, 0) || 30;
          appointment = await withNextNumber(
            (prefix) => tx.salonAppointment.findFirst({ where: { tenantId, appointmentNumber: { startsWith: prefix } }, orderBy: { appointmentNumber: 'desc' }, select: { appointmentNumber: true } }).then((r) => r?.appointmentNumber),
            `APT-${now.getUTCFullYear()}-`,
            (appointmentNumber) => tx.salonAppointment.create({
              data: {
                ...common,
                tenantId,
                appointmentNumber,
                customerName: customer?.name ?? dto.customerName?.trim() ?? 'Walk-in',
                customerPhone: customer?.phone ?? dto.customerPhone?.trim() ?? null,
                scheduledStart: new Date(now.getTime() - minutes * 60_000),
                scheduledEnd: now,
                arrivedAt: now,
                actualStart: new Date(now.getTime() - minutes * 60_000),
                source: 'COUNTER',
                createdById: user.id,
                services: { create: planned.map((p) => ({ ...p, productsUsed: p.productsUsed as Prisma.InputJsonValue | undefined })) },
              },
              select: { id: true, appointmentNumber: true },
            }),
          );
        }

        for (const [id, n] of usesOf) {
          if (!appointment) break;
          const p = purchaseMap.get(id)!;
          const left = p.sessionsRemaining - n;
          const log = Array.isArray(p.usageLog) ? [...(p.usageLog as Prisma.JsonArray)] : [];
          for (const l of planned.filter((x, i) => lines[i].packagePurchaseId === id)) {
            log.push({ appointmentId: appointment.id, appointmentNumber: appointment.appointmentNumber, saleId: sale.id, serviceId: l.serviceId, serviceName: l.serviceName, staffName: l.staffName, usedAt: now.toISOString() });
          }
          await tx.salonPackagePurchase.update({
            where: { id },
            data: { sessionsUsed: { increment: n }, sessionsRemaining: left, status: left <= 0 ? 'USED' : 'ACTIVE', usageLog: log },
          });
        }
        if (membership) {
          await tx.salonMembership.update({
            where: { id: membership.id },
            data: { usedServices: { increment: planned.filter((_, i) => !lines[i].packagePurchaseId).length }, totalSaved: { increment: r2(memberSaved) } },
          });
        }
        await this.bumpTotals(tx, tenantId, planned, 1);
        if (customerId) await this.bumpProfile(tx, tenantId, customerId, saleTotal, 1);
        return appointment;
      }, { timeout: 30_000 });
      return { ...sale, appointment: record, ...(voucher && { voucher: { code: voucher.code, used: voucherUsed, balance: r2(voucher.balance - voucherUsed) } }) };
    } catch (e) {
      // The bill stands; link it so the appointment never shows as unbilled.
      this.log.error(`Salon bill ${sale.saleNumber} saved but its appointment was not updated: ${(e as Error).message}`);
      if (apt) await this.prisma.salonAppointment.updateMany({ where: { id: apt.id }, data: { saleId: sale.id, status: 'COMPLETED', paymentStatus: 'PAID' } }).catch(() => undefined);
      return { ...sale, appointment: apt ? { id: apt.id, appointmentNumber: apt.appointmentNumber } : null };
    }
  }

  private get db() {
    return this.prisma as unknown as Prisma.TransactionClient;
  }

  /** Price per unit each bill line will be charged at: the given price, else the variant's or product's. */
  private async unitPrices(tenantId: string, items: SaleItemInput[]): Promise<number[]> {
    const open = items.filter((i) => i.priceOverride == null);
    const productIds = [...new Set(open.map((i) => i.productId).filter((x): x is string => !!x))];
    const variantIds = [...new Set(open.map((i) => i.variantId).filter((x): x is string => !!x))];
    const [products, variants] = await Promise.all([
      productIds.length ? this.prisma.product.findMany({ where: { tenantId, id: { in: productIds } }, select: { id: true, price: true } }) : [],
      variantIds.length ? this.prisma.productVariant.findMany({ where: { id: { in: variantIds }, product: { tenantId } }, select: { id: true, price: true } }) : [],
    ]);
    return items.map((i) => r2(Number(i.priceOverride ?? variants.find((v) => v.id === i.variantId)?.price ?? products.find((p) => p.id === i.productId)?.price ?? 0)));
  }

  /** A customer's running membership and the packages that still have sessions, for the counter. */
  async perks(user: AuthenticatedUser, customerId: string) {
    if (!customerId) return { membership: null, packages: [] };
    const tenantId = user.tenantId;
    const [membership, purchases] = await Promise.all([
      this.activeMembership(tenantId, customerId),
      this.prisma.salonPackagePurchase.findMany({
        where: { tenantId, customerId, status: 'ACTIVE', sessionsRemaining: { gt: 0 }, expiryDate: { gte: new Date() } },
        include: { package: { select: { name: true, services: true } } },
        orderBy: { expiryDate: 'asc' },
      }),
    ]);
    const dead = purchases.length
      ? new Set((await this.prisma.sale.findMany({
          where: { tenantId, saleNumber: { in: purchases.map((p) => `SLN-${p.purchaseNumber}`) }, status: { in: DEAD_SALE as never } },
          select: { saleNumber: true },
        })).map((s) => s.saleNumber))
      : new Set<string>();
    return {
      membership: membership && {
        id: membership.id, membershipNumber: membership.membershipNumber, planName: membership.plan.name,
        tier: membership.plan.tier, discountPct: membership.plan.discountPct, expiryDate: membership.expiryDate,
      },
      packages: purchases.filter((p) => !dead.has(`SLN-${p.purchaseNumber}`)).map((p) => ({
        id: p.id, purchaseNumber: p.purchaseNumber, packageName: p.package.name, sessionsRemaining: p.sessionsRemaining,
        expiryDate: p.expiryDate, serviceIds: [...packageServiceIds(p.package.services)],
      })),
    };
  }

  /** The customer's best running membership with a discount, if its bill still stands. */
  async activeMembership(tenantId: string, customerId: string | null) {
    if (!customerId) return null;
    const list = await this.prisma.salonMembership.findMany({
      where: { tenantId, customerId, status: 'ACTIVE', expiryDate: { gte: new Date() }, plan: { discountPct: { gt: 0 } } },
      include: { plan: true },
    });
    list.sort((a, b) => b.plan.discountPct - a.plan.discountPct);
    for (const m of list) {
      const sale = await this.prisma.sale.findFirst({ where: { tenantId, saleNumber: `SLN-${m.membershipNumber}` }, select: { status: true } });
      if (!sale || !DEAD_SALE.includes(sale.status)) return m;
    }
    return null;
  }

  /** Refuses a package or membership whose own bill was voided or returned. */
  async assertSaleAlive(tenantId: string, saleNumber: string, label: string) {
    const sale = await this.prisma.sale.findFirst({ where: { tenantId, saleNumber }, select: { status: true } });
    if (sale && DEAD_SALE.includes(sale.status)) throw new BadRequestException(`${label} ka bill cancel / wapas ho chuka — ye istemal nahi ho sakta`);
  }

  /** Running totals on the service and staff screens; `sign` -1 takes a voided bill back out. */
  async bumpTotals(
    tx: Prisma.TransactionClient, tenantId: string,
    lines: Array<{ serviceId: string; staffProfileId: string | null; total: number; commissionAmount: number }>, sign: 1 | -1,
  ) {
    for (const l of lines) {
      await tx.salonService.updateMany({
        where: { id: l.serviceId, tenantId },
        data: { totalBookings: { increment: sign }, totalRevenue: { increment: sign * l.total } },
      });
      if (l.staffProfileId) {
        await tx.salonStaffProfile.updateMany({
          where: { id: l.staffProfileId, tenantId },
          data: { totalAppointments: { increment: sign }, totalRevenue: { increment: sign * l.total }, totalCommission: { increment: sign * l.commissionAmount } },
        });
      }
    }
  }

  /** Visits and spend on the customer's salon profile. */
  async bumpProfile(tx: Prisma.TransactionClient, tenantId: string, customerId: string, spent: number, sign: 1 | -1) {
    const existing = await tx.salonCustomerProfile.findUnique({ where: { customerId }, select: { id: true, tenantId: true } });
    if (existing && existing.tenantId !== tenantId) return;
    if (existing) {
      await tx.salonCustomerProfile.update({
        where: { customerId },
        data: { totalVisits: { increment: sign }, totalSpent: { increment: sign * spent }, ...(sign > 0 && { lastVisitAt: new Date() }) },
      });
    } else if (sign > 0) {
      await tx.salonCustomerProfile.create({ data: { tenantId, customerId, totalVisits: 1, totalSpent: spent, lastVisitAt: new Date() } });
    }
  }
}
