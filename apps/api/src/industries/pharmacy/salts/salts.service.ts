import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AssignSaltItemDto, UpsertSaltDto } from './dto/upsert-salt.dto';

@Injectable()
export class SaltsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertFreeName(tenantId: string, name: string, exceptId?: string) {
    const dup = await this.prisma.salt.findFirst({
      where: { tenantId, name: { equals: name, mode: 'insensitive' }, ...(exceptId && { id: { not: exceptId } }) },
      select: { id: true },
    });
    if (dup) throw new BadRequestException(`Salt "${name}" pehle se mojood hai`);
  }

  async create(user: AuthenticatedUser, dto: UpsertSaltDto) {
    const name = dto.name.trim();
    await this.assertFreeName(user.tenantId, name);
    return this.prisma.salt.create({ data: { ...dto, name, ...(dto.isNarcotic && { requiresPrescription: true }), tenantId: user.tenantId } });
  }

  async list(user: AuthenticatedUser, params: { search?: string; scheduleClass?: string; isActive?: boolean; requiresPrescription?: boolean }) {
    return this.prisma.salt.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { genericName: { contains: params.search, mode: 'insensitive' } },
            { code: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
        ...(params.scheduleClass && { scheduleClass: params.scheduleClass as any }),
        ...(params.isActive !== undefined && { isActive: params.isActive }),
        ...(params.requiresPrescription !== undefined && { requiresPrescription: params.requiresPrescription }),
      },
      include: {
        _count: { select: { productSalts: true, drugInteractionsA: true, drugInteractionsB: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const salt = await this.prisma.salt.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        productSalts: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } } },
        drugInteractionsA: { include: { saltB: true } },
        drugInteractionsB: { include: { saltA: true } },
      },
    });
    if (!salt) throw new NotFoundException('Salt nahi mila');
    return salt;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertSaltDto) {
    const salt = await this.prisma.salt.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!salt) throw new NotFoundException('Salt nahi mila');
    const name = dto.name.trim();
    await this.assertFreeName(user.tenantId, name, id);
    return this.prisma.salt.update({ where: { id }, data: { ...dto, name, ...(dto.isNarcotic && { requiresPrescription: true }) } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const salt = await this.prisma.salt.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!salt) throw new NotFoundException('Salt nahi mila');
    return this.prisma.salt.update({ where: { id }, data: { isActive: false } });
  }

  /** Replaces the product's formula; every salt must belong to this shop and appear once. */
  async assignToProduct(user: AuthenticatedUser, productId: string, salts: AssignSaltItemDto[]) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product nahi mila');
    const ids = salts.map((s) => s.saltId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Ek salt do dafa likha hai');
    const found = ids.length ? await this.prisma.salt.count({ where: { id: { in: ids }, tenantId: user.tenantId } }) : 0;
    if (found !== ids.length) throw new NotFoundException('Salt nahi mila');
    const main = salts.findIndex((s) => s.isMainSalt);

    await this.prisma.$transaction([
      this.prisma.productSalt.deleteMany({ where: { productId } }),
      this.prisma.productSalt.createMany({
        data: salts.map((s, i) => ({
          productId,
          saltId: s.saltId,
          strength: s.strength.trim(),
          strengthValue: s.strengthValue,
          strengthUnit: s.strengthUnit,
          isMainSalt: main >= 0 ? i === main : i === 0,
        })),
      }),
    ]);
    return this.prisma.productSalt.findMany({ where: { productId }, include: { salt: true } });
  }

  async findByProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.productSalt.findMany({
      where: { productId, product: { tenantId: user.tenantId } },
      include: { salt: true },
      orderBy: { isMainSalt: 'desc' },
    });
  }

  async findProductsBySalt(user: AuthenticatedUser, saltId: string) {
    return this.prisma.productSalt.findMany({
      where: { saltId, salt: { tenantId: user.tenantId } },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            category: true,
            brand: true,
          },
        },
        salt: true,
      },
    });
  }
}
