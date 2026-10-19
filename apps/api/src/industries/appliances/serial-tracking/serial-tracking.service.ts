import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { addMonths } from 'date-fns';
import { AssignSaleSerialsDto, BulkSerialDto, UpdateApplianceSerialDto, UpsertApplianceSerialDto } from './dto/upsert-serial.dto';
import { UNSOLD } from '../common/appliance-bill-void.service';
import { optDate, stamp } from '../common/appliance-common';

const DAY = 86_400_000;

@Injectable()
export class ApplianceSerialService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * A cancelled (voided) bill puts the goods back in stock, but the shared
   * void does not touch this register. Units sold on a voided bill go back
   * on the shelf before any list is read, so the POS and stock agree.
   */
  private async releaseVoided(tenantId: string) {
    const sold = await this.prisma.applianceSerialTracking.findMany({
      where: { tenantId, status: 'SOLD', saleId: { not: null } },
      select: { id: true, saleId: true },
    });
    if (!sold.length) return;
    const dead = new Set((await this.prisma.sale.findMany({
      where: { tenantId, status: 'VOIDED', id: { in: [...new Set(sold.map((x) => x.saleId!))] } },
      select: { id: true },
    })).map((x) => x.id));
    const ids = sold.filter((x) => dead.has(x.saleId!)).map((x) => x.id);
    if (!ids.length) return;
    await this.prisma.applianceSerialTracking.updateMany({ where: { id: { in: ids }, status: 'SOLD' }, data: UNSOLD });
  }

  /** Serial ke sath uske product ka naam/brand/warranty — sirf id se page khali lagta hai. */
  private async attachProducts<T extends { productId: string }>(tenantId: string, rows: T[]) {
    if (!rows.length) return rows as (T & { product: any })[];

    const ids = [...new Set(rows.map((r) => r.productId))];
    const [products, profiles, brands] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId, id: { in: ids } },
        select: { id: true, name: true, sku: true, price: true, costPrice: true, images: true, unit: true },
      }),
      this.prisma.applianceProductProfile.findMany({
        where: { tenantId, productId: { in: ids } },
        select: {
          productId: true, categoryType: true, brandId: true, modelNumber: true,
          capacity: true, energyRating: true, isInverter: true,
          warrantyMonths: true, compressorWarrantyMonths: true, motorWarrantyMonths: true,
          requiresInstallation: true, installationCharge: true,
        },
      }),
      this.prisma.brand.findMany({ where: { tenantId }, select: { id: true, name: true } }),
    ]);

    const byId = new Map(products.map((p) => [p.id, p]));
    const profById = new Map(profiles.map((p) => [p.productId, p]));
    const brandName = new Map(brands.map((b) => [b.id, b.name]));

    return rows.map((r) => {
      const p = byId.get(r.productId);
      const prof = profById.get(r.productId);
      return {
        ...r,
        product: p
          ? {
              ...p,
              image: Array.isArray(p.images) ? p.images[0] ?? null : null,
              categoryType: prof?.categoryType ?? null,
              brand: prof?.brandId ? brandName.get(prof.brandId) ?? null : null,
              modelNumber: prof?.modelNumber ?? null,
              capacity: prof?.capacity ?? null,
              energyRating: prof?.isInverter ? 'INVERTER' : (prof?.energyRating ?? null),
              warrantyMonths: prof?.warrantyMonths ?? null,
              compressorWarrantyMonths: prof?.compressorWarrantyMonths ?? null,
              motorWarrantyMonths: prof?.motorWarrantyMonths ?? null,
              requiresInstallation: prof?.requiresInstallation ?? false,
              installationCharge: Number(prof?.installationCharge) || 0,
            }
          : null,
      };
    });
  }

  /** Warranty ki teen tareekhein — jo pehle khatam ho rahi ho wahi asal hai. */
  private warrantyInfo(s: {
    warrantyEndDate: Date | null;
    compressorWarrantyEndDate: Date | null;
    motorWarrantyEndDate: Date | null;
  }) {
    const now = Date.now();
    const left = (d: Date | null) => (d ? Math.floor((new Date(d).getTime() - now) / DAY) : null);
    const main = left(s.warrantyEndDate);
    const compressor = left(s.compressorWarrantyEndDate);
    const motor = left(s.motorWarrantyEndDate);
    const live = [
      main !== null ? { kind: 'MAIN', days: main } : null,
      compressor !== null ? { kind: 'COMPRESSOR', days: compressor } : null,
      motor !== null ? { kind: 'MOTOR', days: motor } : null,
    ].filter((x): x is { kind: string; days: number } => x !== null);
    const soonest = live.filter((x) => x.days >= 0).sort((a, b) => a.days - b.days)[0] ?? null;
    return {
      mainDaysLeft: main,
      compressorDaysLeft: compressor,
      motorDaysLeft: motor,
      isUnderWarranty: live.some((x) => x.days >= 0),
      soonestKind: soonest?.kind ?? null,
      soonestDays: soonest?.days ?? null,
    };
  }

  async create(user: AuthenticatedUser, dto: UpsertApplianceSerialDto) {
    const dup = await this.prisma.applianceSerialTracking.findFirst({
      where: { tenantId: user.tenantId, serialNumber: dto.serialNumber },
    });
    if (dup && dup.status !== 'REMOVED') throw new BadRequestException(`Serial "${dto.serialNumber}" pehle se mojood hai`);

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: user.tenantId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product nahi mila');
    if (dup) {
      // A unit taken off the register by mistake comes back instead of a duplicate.
      return this.prisma.applianceSerialTracking.update({
        where: { id: dup.id },
        data: { productId: dto.productId, status: dto.status && dto.status !== 'SOLD' ? dto.status : 'IN_STOCK', modelNumber: dto.modelNumber, purchasePrice: dto.purchasePrice, purchaseDate: optDate(dto.purchaseDate), notes: stamp(dup.notes, 'Register me wapas') },
      });
    }
    if (dto.status === 'SOLD') throw new BadRequestException('Naya unit "bika hua" darj nahi hota — bill se bechein');

    return this.prisma.applianceSerialTracking.create({
      data: {
        ...dto,
        tenantId: user.tenantId,
        manufactureDate: dto.manufactureDate ? new Date(dto.manufactureDate) : null,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        installationScheduledFor: dto.installationScheduledFor ? new Date(dto.installationScheduledFor) : null,
        warrantyStartDate: dto.warrantyStartDate ? new Date(dto.warrantyStartDate) : null,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : null,
        compressorWarrantyEndDate: dto.compressorWarrantyEndDate ? new Date(dto.compressorWarrantyEndDate) : null,
        motorWarrantyEndDate: dto.motorWarrantyEndDate ? new Date(dto.motorWarrantyEndDate) : null,
      },
    });
  }

  /**
   * Aik shipment ke saare serial ek sath.
   *
   * Appliance wale ke paas 20 AC ek truck me aate hain — ek ek kar ke
   * daalna aadha ghanta le leta hai. Warranty ke mahine product profile
   * se khud lag jate hain.
   */
  async bulkCreate(user: AuthenticatedUser, dto: BulkSerialDto) {
    const numbers = [...new Set(
      dto.serialNumbers.map((s) => String(s).trim()).filter(Boolean),
    )];
    if (!numbers.length) throw new BadRequestException('Koi serial number nahi diya');

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: user.tenantId },
      select: { id: true, costPrice: true },
    });
    if (!product) throw new NotFoundException('Product nahi mila');

    const existing = await this.prisma.applianceSerialTracking.findMany({
      where: { tenantId: user.tenantId, serialNumber: { in: numbers } },
      select: { serialNumber: true },
    });
    const taken = new Set(existing.map((e) => e.serialNumber));
    const fresh = numbers.filter((n) => !taken.has(n));
    if (!fresh.length) {
      throw new BadRequestException('Ye saare serial pehle se register hain');
    }

    const profile = await this.prisma.applianceProductProfile.findFirst({
      where: { tenantId: user.tenantId, productId: dto.productId },
      select: {
        modelNumber: true, warrantyMonths: true,
        compressorWarrantyMonths: true, motorWarrantyMonths: true,
        requiresInstallation: true,
      },
    });

    const purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : new Date();

    await this.prisma.applianceSerialTracking.createMany({
      data: fresh.map((serialNumber) => ({
        tenantId: user.tenantId,
        productId: dto.productId,
        serialNumber,
        modelNumber: dto.modelNumber ?? profile?.modelNumber ?? null,
        batchNumber: dto.batchNumber ?? null,
        status: 'IN_STOCK',
        purchasePrice: dto.purchasePrice ?? (Number(product.costPrice) || 0),
        purchaseDate,
        supplierRef: dto.supplierRef ?? null,
        installationRequired: profile?.requiresInstallation ?? true,
        // Customer warranty starts when the unit is sold, so no dates yet.
        warrantyStartDate: null,
        warrantyEndDate: null,
        compressorWarrantyEndDate: null,
        motorWarrantyEndDate: null,
      })),
    });

    return {
      created: fresh.length,
      skipped: taken.size,
      skippedSerials: [...taken],
      message: `${fresh.length} serial register ho gaye${taken.size ? `, ${taken.size} pehle se thay` : ''}`,
    };
  }

  async list(user: AuthenticatedUser, params: {
    productId?: string;
    status?: string;
    installationStatus?: string;
    warranty?: 'active' | 'expiring' | 'expired';
    search?: string;
    page?: number;
    limit?: number;
  }) {
    await this.releaseVoided(user.tenantId);
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(params.limit) || 100));

    const where: any = {
      tenantId: user.tenantId,
      ...(params.productId && { productId: params.productId }),
      status: params.status || { not: 'REMOVED' },
      ...(params.installationStatus && { installationStatus: params.installationStatus as any }),
      ...(params.search && {
        OR: [
          { serialNumber: { contains: params.search, mode: 'insensitive' } },
          { modelNumber: { contains: params.search, mode: 'insensitive' } },
          { batchNumber: { contains: params.search, mode: 'insensitive' } },
          { customerName: { contains: params.search, mode: 'insensitive' } },
          { customerPhone: { contains: params.search } },
          { invoiceNumber: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.applianceSerialTracking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.applianceSerialTracking.count({ where }),
    ]);

    const withProducts = await this.attachProducts(user.tenantId, rows);
    let items = withProducts.map((r) => ({ ...r, warranty: this.warrantyInfo(r) }));

    if (params.warranty === 'active') items = items.filter((r) => r.warranty.isUnderWarranty);
    if (params.warranty === 'expired') items = items.filter((r) => !r.warranty.isUnderWarranty);
    if (params.warranty === 'expiring') {
      items = items.filter((r) => r.warranty.soonestDays !== null && r.warranty.soonestDays <= 30);
    }

    return { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.applianceSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial nahi mila');

    const [withProduct] = await this.attachProducts(user.tenantId, [s]);

    // Is unit par jo bhi kaam hua — installation aur har repair
    const [installations, services] = await Promise.all([
      this.prisma.applianceInstallation.findMany({
        where: {
          tenantId: user.tenantId,
          OR: [{ serialTrackingId: s.id }, { serialNumber: s.serialNumber }],
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, installationNumber: true, serviceType: true, status: true,
          scheduledDate: true, completedAt: true, technicianName: true, totalCharge: true,
        },
      }),
      this.prisma.applianceServiceRequest.findMany({
        where: {
          tenantId: user.tenantId,
          OR: [{ serialTrackingId: s.id }, { serialNumber: s.serialNumber }],
        },
        orderBy: { requestedAt: 'desc' },
        select: {
          id: true, requestNumber: true, serviceType: true, status: true,
          reportedIssue: true, issueCategory: true, workDone: true,
          requestedAt: true, completedAt: true, technicianName: true,
          totalCharge: true, coveredUnderWarranty: true,
        },
      }),
    ]);

    return {
      ...withProduct,
      warranty: this.warrantyInfo(s),
      installations,
      services,
      /** Is unit par ab tak kitna kharcha aaya — warranty ka asli bojh */
      serviceCost: services.reduce((sum, r) => sum + Number(r.totalCharge), 0),
    };
  }

  async lookupBySerial(user: AuthenticatedUser, code: string) {
    await this.releaseVoided(user.tenantId);
    const s = await this.prisma.applianceSerialTracking.findFirst({
      where: { tenantId: user.tenantId, serialNumber: code.trim() },
    });
    if (!s) return null;
    const [withProduct] = await this.attachProducts(user.tenantId, [s]);
    return { ...withProduct, warranty: this.warrantyInfo(s) };
  }

  async warrantyCheck(user: AuthenticatedUser, code: string) {
    await this.releaseVoided(user.tenantId);
    const s = await this.prisma.applianceSerialTracking.findFirst({
      where: { tenantId: user.tenantId, serialNumber: code.trim() },
    });
    if (!s) return { found: false };

    const [withProduct] = await this.attachProducts(user.tenantId, [s]);
    const w = this.warrantyInfo(s);
    const now = new Date();

    // Agar is unit par koi AMC chal raha ho to wo warranty se bhi
    // zyada kaam ka hota hai — customer ko yahi batana hota hai
    const amc = await this.prisma.applianceAmcContract.findFirst({
      where: {
        tenantId: user.tenantId,
        status: 'ACTIVE',
        expiryDate: { gte: now },
        OR: [{ serialTrackingId: s.id }, { serialNumber: s.serialNumber }],
      },
      select: {
        id: true, contractNumber: true, amcType: true, expiryDate: true,
        freeVisitsAllowed: true, freeVisitsUsed: true, laborCovered: true,
        freePartsAllowed: true, gasRefillCovered: true,
      },
    });

    return {
      found: true,
      serial: withProduct,
      warranty: {
        isValid: w.isUnderWarranty,
        endDate: s.warrantyEndDate,
        daysRemaining: Math.max(w.mainDaysLeft ?? 0, 0),
        compressorValid: (w.compressorDaysLeft ?? -1) >= 0,
        compressorEndDate: s.compressorWarrantyEndDate,
        compressorDaysRemaining: w.compressorDaysLeft,
        motorValid: (w.motorDaysLeft ?? -1) >= 0,
        motorEndDate: s.motorWarrantyEndDate,
        motorDaysRemaining: w.motorDaysLeft,
        soonestKind: w.soonestKind,
        soonestDays: w.soonestDays,
      },
      amc: amc
        ? { ...amc, visitsLeft: Math.max(amc.freeVisitsAllowed - amc.freeVisitsUsed, 0) }
        : null,
    };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateApplianceSerialDto) {
    const s = await this.prisma.applianceSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial nahi mila');
    if (s.status === 'REMOVED') throw new BadRequestException('Ye serial register se hata diya gaya hai');
    if (dto.saleId && !(await this.prisma.sale.findFirst({ where: { id: dto.saleId, tenantId: user.tenantId, status: { not: 'VOIDED' } }, select: { id: true } }))) {
      throw new NotFoundException('Bill nahi mila');
    }
    if (dto.soldToCustomerId && !(await this.prisma.customer.findFirst({ where: { id: dto.soldToCustomerId, tenantId: user.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('Customer nahi mila');
    }
    if (dto.productId && dto.productId !== s.productId && !(await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('Product nahi mila');
    }
    if (s.status === 'SOLD' && dto.status && dto.status !== 'SOLD') {
      throw new BadRequestException('Bika hua unit wapas lene ke liye bill ka Return ya Void karein — register khud theek ho jata hai');
    }

    if (dto.serialNumber && dto.serialNumber !== s.serialNumber) {
      const dup = await this.prisma.applianceSerialTracking.findFirst({
        where: { tenantId: user.tenantId, serialNumber: dto.serialNumber, id: { not: id } },
      });
      if (dup) throw new BadRequestException(`Serial "${dto.serialNumber}" pehle se mojood hai`);
    }

    // A unit sold on one bill cannot be sold again on another.
    const selling = dto.status === 'SOLD' && s.status !== 'SOLD';
    if (dto.status === 'SOLD' && s.status === 'SOLD' && dto.saleId && s.saleId && dto.saleId !== s.saleId) {
      throw new BadRequestException(`Serial ${s.serialNumber} pehle hi bik chuka hai (${s.invoiceNumber ?? 'doosra bill'})`);
    }

    // Customer warranty runs from the day of sale unless the shop set its own dates.
    const warranty: Record<string, Date> = {};
    if (selling && !dto.warrantyStartDate && !dto.warrantyEndDate) {
      const soldAt = dto.soldAt ? new Date(dto.soldAt) : new Date();
      const profile = await this.prisma.applianceProductProfile.findFirst({
        where: { tenantId: user.tenantId, productId: s.productId },
        select: { warrantyMonths: true, compressorWarrantyMonths: true, motorWarrantyMonths: true },
      });
      const plus = (months?: number | null) => (months ? addMonths(soldAt, months) : undefined);
      warranty.warrantyStartDate = soldAt;
      const end = plus(profile?.warrantyMonths);
      const comp = plus(profile?.compressorWarrantyMonths);
      const motor = plus(profile?.motorWarrantyMonths);
      if (end) warranty.warrantyEndDate = end;
      if (comp) warranty.compressorWarrantyEndDate = comp;
      if (motor) warranty.motorWarrantyEndDate = motor;
    }

    return this.prisma.applianceSerialTracking.update({
      where: { id },
      data: {
        ...dto,
        soldToCustomerId: dto.soldToCustomerId || undefined,
        soldAt: dto.soldAt ? new Date(dto.soldAt) : selling ? new Date() : undefined,
        manufactureDate: dto.manufactureDate ? new Date(dto.manufactureDate) : undefined,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        installationScheduledFor: dto.installationScheduledFor ? new Date(dto.installationScheduledFor) : undefined,
        warrantyStartDate: dto.warrantyStartDate ? new Date(dto.warrantyStartDate) : undefined,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : undefined,
        compressorWarrantyEndDate: dto.compressorWarrantyEndDate ? new Date(dto.compressorWarrantyEndDate) : undefined,
        motorWarrantyEndDate: dto.motorWarrantyEndDate ? new Date(dto.motorWarrantyEndDate) : undefined,
        ...warranty,
      },
    });
  }


  /** Takes a unit off the register (wrong entry); the record is kept with status REMOVED. */
  async remove(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.applianceSerialTracking.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Serial nahi mila');
    if (s.status === 'SOLD') {
      throw new BadRequestException('Bika hua unit nahi hatta — warranty aur service record isi par chalte hain');
    }
    await this.prisma.applianceSerialTracking.update({ where: { id }, data: { status: 'REMOVED', notes: stamp(s.notes, `Register se hataya (pehle ${s.status})`) } });
    return { message: 'Serial register se hat gaya' };
  }

  /**
   * Marks the units that left on a counter bill as sold: each must be in
   * stock, of a product on the bill, and no more units per product than the
   * bill sold. Customer warranty starts on the bill date.
   */
  async assignSale(user: AuthenticatedUser, dto: AssignSaleSerialsDto) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: dto.saleId, tenantId: user.tenantId },
      select: { id: true, saleNumber: true, status: true, customerId: true, createdAt: true, customer: { select: { name: true, phone: true, address: true } }, items: { select: { productId: true, quantity: true, returnedQty: true, price: true } } },
    });
    if (!sale) throw new NotFoundException('Bill nahi mila');
    if (sale.status === 'VOIDED') throw new BadRequestException('Void bill par serial nahi lagta');
    const ids = [...new Set(dto.units.map((u) => u.serialId))];
    if (ids.length !== dto.units.length) throw new BadRequestException('Ek hi serial do dafa chuna gaya hai');
    const units = await this.prisma.applianceSerialTracking.findMany({ where: { tenantId: user.tenantId, id: { in: ids } } });
    if (units.length !== ids.length) throw new NotFoundException('Ek ya zyada serial nahi mile');

    const onBill = new Map<string, { qty: number; price: number }>();
    for (const it of sale.items) {
      if (!it.productId) continue;
      const cur = onBill.get(it.productId) ?? { qty: 0, price: Number(it.price) || 0 };
      cur.qty += Math.max(Number(it.quantity) - Number(it.returnedQty), 0);
      onBill.set(it.productId, cur);
    }
    const already = await this.prisma.applianceSerialTracking.groupBy({ by: ['productId'], where: { tenantId: user.tenantId, saleId: sale.id, status: 'SOLD' }, _count: { _all: true } });
    const used = new Map(already.map((a) => [a.productId, a._count._all]));
    for (const u of units) {
      if (u.status === 'SOLD' && u.saleId === sale.id) continue;
      if (u.status !== 'IN_STOCK') throw new BadRequestException(`Serial ${u.serialNumber} ${u.status === 'SOLD' ? `pehle hi bill ${u.invoiceNumber ?? ''} par bik chuka` : `ki halat ${u.status} hai`}`);
      const line = onBill.get(u.productId);
      if (!line) throw new BadRequestException(`Serial ${u.serialNumber} ka product is bill par nahi`);
      const n = (used.get(u.productId) ?? 0) + 1;
      if (n > Math.floor(line.qty)) throw new BadRequestException(`Bill par is product ke sirf ${line.qty} unit hain`);
      used.set(u.productId, n);
    }

    const profiles = await this.prisma.applianceProductProfile.findMany({
      where: { tenantId: user.tenantId, productId: { in: [...new Set(units.map((u) => u.productId))] } },
      select: { productId: true, warrantyMonths: true, compressorWarrantyMonths: true, motorWarrantyMonths: true },
    });
    const prof = new Map(profiles.map((p) => [p.productId, p]));
    const soldAt = sale.createdAt;
    const plus = (m?: number | null) => (m ? addMonths(soldAt, m) : null);
    return this.prisma.$transaction(units.filter((u) => u.saleId !== sale.id).map((u) => {
      const p = prof.get(u.productId);
      return this.prisma.applianceSerialTracking.update({
        where: { id: u.id },
        data: {
          status: 'SOLD', saleId: sale.id, invoiceNumber: sale.saleNumber, soldAt, soldPrice: onBill.get(u.productId)?.price ?? null,
          soldToCustomerId: sale.customerId, customerName: sale.customer?.name ?? null, customerPhone: sale.customer?.phone ?? null,
          deliveryAddress: u.deliveryAddress ?? sale.customer?.address ?? null,
          // Dates set by hand on the unit (a start date) are kept; otherwise the warranty runs from the bill.
          ...(u.warrantyStartDate
            ? {}
            : { warrantyStartDate: soldAt, warrantyEndDate: plus(p?.warrantyMonths), compressorWarrantyEndDate: plus(p?.compressorWarrantyMonths), motorWarrantyEndDate: plus(p?.motorWarrantyMonths) }),
        },
      });
    }));
  }

  /** Units sold on one bill, for the bill page and the warranty card. */
  forSale(user: AuthenticatedUser, saleId: string) {
    return this.prisma.applianceSerialTracking.findMany({
      where: { tenantId: user.tenantId, saleId, status: 'SOLD' },
      select: { id: true, productId: true, serialNumber: true, modelNumber: true, warrantyStartDate: true, warrantyEndDate: true, compressorWarrantyEndDate: true, motorWarrantyEndDate: true },
    });
  }

  /** Units sold on any of the given bills. */
  forSales(user: AuthenticatedUser, saleIds: string[]) {
    if (!saleIds.length) return [];
    return this.prisma.applianceSerialTracking.findMany({
      where: { tenantId: user.tenantId, saleId: { in: saleIds }, status: 'SOLD' },
      select: { id: true, saleId: true, productId: true, serialNumber: true, warrantyEndDate: true, installationStatus: true },
    });
  }

  /** Serial register ki ek nazar me haalat. */
  async summary(user: AuthenticatedUser) {
    await this.releaseVoided(user.tenantId);
    const tenantId = user.tenantId;
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * DAY);

    const [byStatus, byInstall, inStock, sold, expiring] = await Promise.all([
      this.prisma.applianceSerialTracking.groupBy({
        by: ['status'], where: { tenantId }, _count: { _all: true },
      }),
      this.prisma.applianceSerialTracking.groupBy({
        by: ['installationStatus'], where: { tenantId, status: 'SOLD' }, _count: { _all: true },
      }),
      this.prisma.applianceSerialTracking.aggregate({
        where: { tenantId, status: 'IN_STOCK' },
        _sum: { purchasePrice: true }, _count: { _all: true },
      }),
      this.prisma.applianceSerialTracking.aggregate({
        where: { tenantId, status: 'SOLD' },
        _sum: { soldPrice: true, purchasePrice: true }, _count: { _all: true },
      }),
      this.prisma.applianceSerialTracking.count({
        where: {
          tenantId,
          status: 'SOLD',
          OR: [
            { warrantyEndDate: { gte: now, lte: in30 } },
            { compressorWarrantyEndDate: { gte: now, lte: in30 } },
            { motorWarrantyEndDate: { gte: now, lte: in30 } },
          ],
        },
      }),
    ]);

    const statusMap = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all]));
    const installMap = Object.fromEntries(byInstall.map((r) => [r.installationStatus, r._count._all]));

    const soldRevenue = Number(sold._sum.soldPrice) || 0;
    const soldCost = Number(sold._sum.purchasePrice) || 0;

    return {
      total: byStatus.reduce((s, r) => s + r._count._all, 0),
      byStatus: statusMap,
      inStock: {
        units: inStock._count._all,
        value: Number(inStock._sum.purchasePrice) || 0,
      },
      sold: {
        units: sold._count._all,
        revenue: soldRevenue,
        cost: soldCost,
        profit: soldRevenue - soldCost,
      },
      installation: {
        ...installMap,
        /** Bik gaya lekin abhi laga nahi — dukaan ka adhoora kaam */
        pending: (installMap['PENDING'] ?? 0) + (installMap['SCHEDULED'] ?? 0) + (installMap['ASSIGNED'] ?? 0),
        completed: installMap['COMPLETED'] ?? 0,
      },
      warrantyExpiringSoon: expiring,
    };
  }
}
