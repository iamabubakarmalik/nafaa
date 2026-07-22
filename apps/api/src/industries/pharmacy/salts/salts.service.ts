import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertSaltDto } from './dto/upsert-salt.dto';

@Injectable()
export class SaltsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertSaltDto) {
    const dup = await this.prisma.salt.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException(`Salt "${dto.name}" already exists`);
    return this.prisma.salt.create({ data: { tenantId: user.tenantId, ...dto } });
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
    if (!salt) throw new NotFoundException('Salt not found');
    return salt;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertSaltDto) {
    const salt = await this.prisma.salt.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!salt) throw new NotFoundException('Salt not found');
    return this.prisma.salt.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const salt = await this.prisma.salt.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!salt) throw new NotFoundException('Salt not found');
    return this.prisma.salt.update({ where: { id }, data: { isActive: false } });
  }

  async assignToProduct(user: AuthenticatedUser, productId: string, salts: { saltId: string; strength: string; strengthValue?: number; strengthUnit?: string; isMainSalt?: boolean }[]) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    await this.prisma.productSalt.deleteMany({ where: { productId } });
    await this.prisma.productSalt.createMany({
      data: salts.map((s, i) => ({
        productId,
        saltId: s.saltId,
        strength: s.strength,
        strengthValue: s.strengthValue,
        strengthUnit: s.strengthUnit,
        isMainSalt: s.isMainSalt ?? i === 0,
      })),
    });
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
