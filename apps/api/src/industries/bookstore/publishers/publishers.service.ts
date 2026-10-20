import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    return this.prisma.publisher.create({ data: { tenantId: user.tenantId, ...dto, name } });
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
    const suppliers = await this.suppliersFor(user.tenantId, rows.map((r) => r.name));
    return rows.map((r) => ({ ...r, supplier: suppliers.get(r.name.toLowerCase()) ?? null }));
  }

  /**
   * Opens (or finds) the publisher as a supplier of the same name, so
   * purchases, returns to the publisher and its payable run through the
   * shared purchases and supplier khata.
   */
  async openSupplier(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.publisher.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Publisher nahi mila');
    const found = await this.prisma.supplier.findFirst({
      where: { tenantId: user.tenantId, name: { equals: p.name, mode: 'insensitive' } },
      select: { id: true, name: true, outstandingDue: true, isActive: true },
    });
    if (found) {
      if (!found.isActive) await this.prisma.supplier.update({ where: { id: found.id }, data: { isActive: true } });
      return { id: found.id, name: found.name, outstandingDue: found.outstandingDue };
    }
    return this.prisma.supplier.create({
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
      select: { id: true, name: true, outstandingDue: true },
    });
  }

  /** Supplier of each publisher, matched by name (case does not matter). */
  private async suppliersFor(tenantId: string, names: string[]) {
    const map = new Map<string, { id: string; outstandingDue: number; totalPurchased: number }>();
    if (!names.length) return map;
    const rows = await this.prisma.supplier.findMany({
      where: { tenantId, isActive: true, OR: names.map((n) => ({ name: { equals: n, mode: 'insensitive' as const } })) },
      select: { id: true, name: true, outstandingDue: true, totalPurchased: true },
    });
    for (const r of rows) map.set(r.name.toLowerCase(), { id: r.id, outstandingDue: r.outstandingDue, totalPurchased: r.totalPurchased });
    return map;
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.publisher.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { books: { take: 50, orderBy: { updatedAt: 'desc' } } },
    });
    if (!p) throw new NotFoundException('Publisher nahi mila');
    return p;
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
