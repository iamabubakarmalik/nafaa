import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ClinicService } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

type LinkedProduct = { id: string; name: string; price: number; unit: string; isActive: boolean; categoryId: string | null };

const PRODUCT_SELECT = { id: true, name: true, price: true, unit: true, isActive: true, categoryId: true } as const;

/**
 * Clinic services (consultation, procedures, tests). The bill is made from a
 * normal product so stock, sales and reports see it; the clinical details
 * live here. ClinicService has no productId column, so a service is tied to
 * its product by name (unique per tenant on both sides).
 */
@Injectable()
export class ClinicServicesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Maps the web form (wizard) fields onto the stored columns. */
  private toData(dto: any, product?: LinkedProduct | null) {
    const num = (v: unknown) => (v === undefined || v === null || v === '' ? undefined : Number(v));
    const prep = dto.prepInstructions ?? dto.requiresPrepInstructions;
    return {
      ...(product ? { name: product.name } : dto.name !== undefined && { name: String(dto.name).trim() }),
      ...((dto.serviceCode ?? dto.code) !== undefined && { code: dto.serviceCode ?? dto.code }),
      ...(dto.category !== undefined && { category: String(dto.category) }),
      ...((dto.descriptionLong ?? dto.description) !== undefined && { description: dto.descriptionLong ?? dto.description }),
      ...((num(dto.basePrice) ?? num(dto.price)) !== undefined && { price: num(dto.basePrice) ?? num(dto.price) }),
      ...(num(dto.durationMin) !== undefined && { durationMin: Math.round(num(dto.durationMin)!) }),
      ...(dto.requiresDoctor !== undefined && { requiresDoctor: !!dto.requiresDoctor }),
      ...(dto.requiresRoom !== undefined && { requiresRoom: !!dto.requiresRoom }),
      ...((dto.requiresFasting !== undefined || dto.requiresPrep !== undefined || prep !== undefined) && {
        requiresPrep: !!(dto.requiresFasting || dto.requiresPrep || prep),
      }),
      ...(prep !== undefined && { prepInstructions: prep }),
      ...(dto.isActive !== undefined && { isActive: !!dto.isActive }),
    };
  }

  /** Shape the web pages read (basePrice, serviceCode, product...). */
  private toView(s: ClinicService, product?: LinkedProduct | null) {
    return {
      ...s,
      productId: product?.id ?? null,
      product: product ?? null,
      serviceCode: s.code,
      basePrice: s.price,
      requiresAppointment: true,
      requiresFasting: s.requiresPrep,
      packageIncludes: [] as string[],
      imageUrls: [] as string[],
    };
  }

  private async productsByName(tenantId: string, names: string[]) {
    if (!names.length) return new Map<string, LinkedProduct>();
    const rows = await this.prisma.product.findMany({ where: { tenantId, name: { in: names } }, select: PRODUCT_SELECT });
    return new Map(rows.map((p) => [p.name, p]));
  }

  private async findProduct(tenantId: string, productId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId }, select: PRODUCT_SELECT });
    if (!product) throw new NotFoundException('Product nahi mila');
    return product;
  }

  /** Create, or update the service already tied to this product. */
  async create(user: AuthenticatedUser, dto: any) {
    const product = dto.productId ? await this.findProduct(user.tenantId, dto.productId) : null;
    const data = this.toData(dto, product);
    if (!data.name) throw new BadRequestException('Service ka naam zaroori hai');
    const existing = await this.prisma.clinicService.findFirst({ where: { tenantId: user.tenantId, name: data.name } });
    if (existing) {
      if (!product) throw new BadRequestException(`"${data.name}" pehle se mojood hai`);
      const row = await this.prisma.clinicService.update({ where: { id: existing.id }, data });
      return this.toView(row, product);
    }
    const row = await this.prisma.clinicService.create({
      data: { ...data, name: data.name, category: data.category ?? 'OTHER', tenantId: user.tenantId },
    });
    return this.toView(row, product);
  }

  async list(user: AuthenticatedUser, params: { category?: string; active?: boolean; search?: string }) {
    const rows = await this.prisma.clinicService.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.category && { category: params.category }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { code: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
    });
    const products = await this.productsByName(user.tenantId, rows.map((r) => r.name));
    return rows.map((r) => {
      const p = products.get(r.name);
      // An archived product cannot be billed, so the counter should not offer it.
      return this.toView(r, p && p.isActive ? p : null);
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.clinicService.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!row) throw new NotFoundException('Service nahi mili');
    const products = await this.productsByName(user.tenantId, [row.name]);
    return this.toView(row, products.get(row.name));
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    const product = await this.findProduct(user.tenantId, productId);
    const row = await this.prisma.clinicService.findFirst({ where: { tenantId: user.tenantId, name: product.name } });
    return row ? this.toView(row, product) : null;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const own = await this.prisma.clinicService.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!own) throw new NotFoundException('Service nahi mili');
    const product = dto.productId ? await this.findProduct(user.tenantId, dto.productId) : null;
    const row = await this.prisma.clinicService.update({ where: { id }, data: this.toData(dto, product) });
    return this.toView(row, product);
  }

  async remove(user: AuthenticatedUser, id: string) {
    const own = await this.prisma.clinicService.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!own) throw new NotFoundException('Service nahi mili');
    return this.prisma.clinicService.update({ where: { id }, data: { isActive: false } });
  }
}
