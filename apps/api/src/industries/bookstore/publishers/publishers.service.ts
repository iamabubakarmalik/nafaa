import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PERMISSIONS, hasPermission } from '../../../common/constants/permissions.constants';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertPublisherDto } from './dto/upsert-publisher.dto';

@Injectable()
export class PublishersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertPublisherDto) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Publisher ka naam likhein');
    const dup = await this.prisma.publisher.findFirst({ where: { tenantId: user.tenantId, name: { equals: name, mode: 'insensitive' } } });
    if (dup) throw new BadRequestException(`Publisher "${name}" pehle se hai`);
    if (dto.supplierId) await this.checkSupplier(user, dto.supplierId);
    return this.prisma.publisher.create({ data: { tenantId: user.tenantId, ...dto, name } });
  }

  /** Linking a supplier changes purchase costs, so it needs supplier rights as well. */
  private async checkSupplier(user: AuthenticatedUser, supplierId: string) {
    if (!hasPermission(user.role, user.permissions, PERMISSIONS.SUPPLIERS_EDIT)) {
      throw new ForbiddenException('Supplier jorne ke liye "Suppliers edit" ki ijazat chahiye');
    }
    const ok = await this.prisma.supplier.count({ where: { id: supplierId, tenantId: user.tenantId } });
    if (!ok) throw new BadRequestException('Supplier nahi mila');
  }

  async list(user: AuthenticatedUser, params: { search?: string; active?: boolean; country?: string }) {
    const rows = await this.prisma.publisher.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.country && { country: params.country }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { code: { contains: params.search, mode: 'insensitive' } },
            { city: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { _count: { select: { books: true } } },
      orderBy: { name: 'asc' },
    });
    const suppliers = await this.suppliersFor(user.tenantId, rows);
    return rows.map((r) => ({ ...r, supplier: (r.supplierId ? suppliers.byId.get(r.supplierId) : suppliers.byName.get(r.name.toLowerCase())) ?? null }));
  }

  /**
   * Links the publisher to its supplier record (the linked one, else one of
   * the same name, else a new one), so purchases, returns to the publisher
   * and its payable run through the shared purchases and supplier khata, and
   * its discount is applied to its books on a purchase.
   */
  async openSupplier(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.publisher.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Publisher nahi mila');
    const select = { id: true, name: true, outstandingDue: true, isActive: true } as const;
    const found = (p.supplierId ? await this.prisma.supplier.findFirst({ where: { id: p.supplierId, tenantId: user.tenantId }, select }) : null)
      ?? await this.prisma.supplier.findFirst({ where: { tenantId: user.tenantId, name: { equals: p.name, mode: 'insensitive' } }, select });
    const supplier = found ?? await this.prisma.supplier.create({
      data: {
        tenantId: user.tenantId,
        name: p.name,
        contactPerson: p.contactPerson,
        phone: p.phone,
        email: p.email,
        city: p.city,
        paymentTerms: p.paymentTerms ?? (p.creditDays ? `${p.creditDays} din` : null),
        notes: p.defaultDiscountPct ? `Publisher · discount ${p.defaultDiscountPct}%` : 'Publisher',
      },
      select,
    });
    if (!supplier.isActive) await this.prisma.supplier.update({ where: { id: supplier.id }, data: { isActive: true } });
    if (p.supplierId !== supplier.id) await this.prisma.publisher.update({ where: { id: p.id }, data: { supplierId: supplier.id } });
    return { id: supplier.id, name: supplier.name, outstandingDue: supplier.outstandingDue };
  }

  /**
   * Supplier of each publisher: the linked one, or for publishers not yet
   * linked an active supplier of the same name (case does not matter).
   */
  private async suppliersFor(tenantId: string, publishers: Array<{ name: string; supplierId: string | null }>) {
    type Row = { id: string; name: string; outstandingDue: number; totalPurchased: number };
    const byId = new Map<string, Row>();
    const byName = new Map<string, Row>();
    if (!publishers.length) return { byId, byName };
    const ids = publishers.map((p) => p.supplierId).filter((v): v is string => !!v);
    const names = publishers.filter((p) => !p.supplierId).map((p) => p.name);
    const rows = await this.prisma.supplier.findMany({
      where: {
        tenantId,
        OR: [
          ...(ids.length ? [{ id: { in: ids } }] : []),
          ...names.map((n) => ({ isActive: true, name: { equals: n, mode: 'insensitive' as const } })),
        ],
      },
      select: { id: true, name: true, outstandingDue: true, totalPurchased: true },
    });
    for (const r of rows) { byId.set(r.id, r); byName.set(r.name.toLowerCase(), r); }
    return { byId, byName };
  }

  /**
   * Cost of each book bought from a supplier: the list price (MRP, else the
   * selling price) less the discount of the publisher linked to that
   * supplier. Used by the purchase screen to fill book lines.
   */
  async purchaseCosts(user: AuthenticatedUser, supplierId?: string) {
    if (!supplierId) throw new BadRequestException('Supplier chunein');
    const supplier = await this.prisma.supplier.findFirst({ where: { id: supplierId, tenantId: user.tenantId }, select: { name: true } });
    if (!supplier) return { supplierId, publishers: [], lines: [] };
    // Linked publishers, plus not-yet-linked ones of the supplier's name.
    const publishers = await this.prisma.publisher.findMany({
      where: {
        tenantId: user.tenantId, isActive: true, defaultDiscountPct: { gt: 0 },
        OR: [{ supplierId }, { supplierId: null, name: { equals: supplier.name, mode: 'insensitive' } }],
      },
      select: { id: true, name: true, defaultDiscountPct: true },
    });
    if (!publishers.length) return { supplierId, publishers: [], lines: [] };
    const pct = new Map(publishers.map((p) => [p.id, Math.min(Math.max(Number(p.defaultDiscountPct) || 0, 0), 100)]));
    const books = await this.prisma.bookProfile.findMany({
      where: { tenantId: user.tenantId, publisherId: { in: [...pct.keys()] } },
      select: { productId: true, publisherId: true, mrp: true },
    });
    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: books.map((b) => b.productId) }, isActive: true },
      select: { id: true, price: true },
    });
    const priceOf = new Map(products.map((p) => [p.id, Number(p.price) || 0]));
    const name = new Map(publishers.map((p) => [p.id, p.name]));
    return {
      supplierId,
      publishers: publishers.map((p) => ({ id: p.id, name: p.name, discountPct: pct.get(p.id)! })),
      lines: books.flatMap((b) => {
        if (!priceOf.has(b.productId)) return [];
        const listPrice = Number(b.mrp) > 0 ? Number(b.mrp) : priceOf.get(b.productId)!;
        const discountPct = pct.get(b.publisherId!)!;
        if (!(listPrice > 0)) return [];
        return [{
          productId: b.productId, publisherId: b.publisherId, publisherName: name.get(b.publisherId!), discountPct, listPrice,
          cost: Math.round(listPrice * (100 - discountPct)) / 100,
        }];
      }),
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.publisher.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { books: { take: 50, orderBy: { updatedAt: 'desc' } } },
    });
    if (!p) throw new NotFoundException('Publisher nahi mila');
    const supplier = p.supplierId
      ? await this.prisma.supplier.findFirst({ where: { id: p.supplierId, tenantId: user.tenantId }, select: { id: true, name: true, outstandingDue: true, totalPurchased: true } })
      : null;
    return { ...p, supplier };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertPublisherDto) {
    const p = await this.prisma.publisher.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Publisher nahi mila');
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Publisher ka naam likhein');
      const dup = await this.prisma.publisher.findFirst({ where: { tenantId: user.tenantId, name: { equals: name, mode: 'insensitive' }, NOT: { id } } });
      if (dup) throw new BadRequestException(`Publisher "${name}" pehle se hai`);
      dto = { ...dto, name };
    }
    if (dto.supplierId !== undefined && dto.supplierId !== p.supplierId) {
      if (dto.supplierId) await this.checkSupplier(user, dto.supplierId);
      else if (!hasPermission(user.role, user.permissions, PERMISSIONS.SUPPLIERS_EDIT)) delete dto.supplierId;
    }
    return this.prisma.publisher.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.publisher.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Publisher nahi mila');
    return this.prisma.publisher.update({ where: { id }, data: { isActive: false } });
  }

  async seedPakistaniPublishers(user: AuthenticatedUser) {
    const publishers = [
      { name: 'Oxford University Press Pakistan', country: 'Pakistan', city: 'Karachi' },
      { name: 'Ferozsons', country: 'Pakistan', city: 'Lahore' },
      { name: 'Sang-e-Meel Publications', country: 'Pakistan', city: 'Lahore' },
      { name: 'Ilmi Kutab Khana', country: 'Pakistan', city: 'Lahore' },
      { name: 'Maktaba-tul-Madina', country: 'Pakistan', city: 'Karachi' },
      { name: 'Dar-us-Salam', country: 'Pakistan', city: 'Lahore' },
      { name: 'Idara Islamiat', country: 'Pakistan', city: 'Lahore' },
      { name: 'Punjab Textbook Board', country: 'Pakistan', city: 'Lahore' },
      { name: 'Sindh Textbook Board', country: 'Pakistan', city: 'Jamshoro' },
      { name: 'KPK Textbook Board', country: 'Pakistan', city: 'Peshawar' },
      { name: 'Federal Board', country: 'Pakistan', city: 'Islamabad' },
      { name: 'Paramount Books', country: 'Pakistan', city: 'Karachi' },
      { name: 'Mavra Publishers', country: 'Pakistan', city: 'Karachi' },
      { name: 'Readings', country: 'Pakistan', city: 'Lahore' },
      { name: 'National Book Foundation', country: 'Pakistan', city: 'Islamabad' },
      { name: 'Cambridge University Press', country: 'UK', city: 'Cambridge' },
      { name: 'Pearson Education', country: 'UK', city: 'London' },
      { name: 'McGraw-Hill', country: 'USA', city: 'New York' },
      { name: 'Penguin Random House', country: 'USA', city: 'New York' },
      { name: 'HarperCollins', country: 'USA', city: 'New York' },
      { name: 'Scholastic', country: 'USA', city: 'New York' },
      { name: 'Wiley', country: 'USA', city: 'New Jersey' },
      { name: 'Springer', country: 'Germany', city: 'Berlin' },
    ];
    let count = 0;
    for (const p of publishers) {
      const exists = await this.prisma.publisher.findFirst({ where: { tenantId: user.tenantId, name: p.name } });
      if (!exists) {
        await this.prisma.publisher.create({ data: { tenantId: user.tenantId, ...p } });
        count++;
      }
    }
    return { created: count, total: publishers.length };
  }
}
