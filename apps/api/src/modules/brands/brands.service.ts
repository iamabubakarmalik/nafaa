import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UpsertBrandDto } from './dto/upsert-brand.dto';

function toSlug(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, search?: string) {
    return this.prisma.brand.findMany({
      where: {
        tenantId: user.tenantId,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { _count: { select: { products: true } } },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async create(user: AuthenticatedUser, dto: UpsertBrandDto) {
    const slug = toSlug(dto.name);
    const existing = await this.prisma.brand.findFirst({
      where: { tenantId: user.tenantId, slug },
    });
    if (existing) throw new ConflictException('Brand already exists');

    return this.prisma.brand.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        slug,
        description: dto.description,
        logoUrl: dto.logoUrl,
        website: dto.website,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertBrandDto) {
    await this.getOne(user, id);
    const slug = toSlug(dto.name);
    return this.prisma.brand.update({
      where: { id },
      data: { ...dto, slug },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.getOne(user, id);
    await this.prisma.brand.delete({ where: { id } });
    return { message: 'Brand deleted' };
  }
}
