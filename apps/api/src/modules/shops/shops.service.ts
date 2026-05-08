import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateShopDto } from './dto/create-shop.dto';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateShopDto) {
    const exists = await this.prisma.shop.findFirst({
      where: { tenantId: user.tenantId, name: dto.name },
    });
    if (exists) throw new ConflictException('Shop with this name already exists');

    if (dto.isMain) {
      await this.prisma.shop.updateMany({
        where: { tenantId: user.tenantId, isMain: true },
        data: { isMain: false },
      });
    }

    return this.prisma.shop.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        address: dto.address,
        phone: dto.phone,
        isMain: dto.isMain ?? false,
      },
    });
  }

  list(user: AuthenticatedUser) {
    return this.prisma.shop.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [{ isMain: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    await this.prisma.shop.delete({ where: { id } });
    return { message: 'Shop deleted' };
  }
}
