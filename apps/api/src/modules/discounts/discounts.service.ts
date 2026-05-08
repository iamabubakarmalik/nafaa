import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateDiscountDto } from './dto/create-discount.dto';

@Injectable()
export class DiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateDiscountDto) {
    const code = dto.code.toUpperCase().trim();

    const existing = await this.prisma.discountCode.findFirst({
      where: { tenantId: user.tenantId, code },
    });
    if (existing) throw new ConflictException('Discount code already exists');

    if (dto.type === 'PERCENTAGE' && dto.value > 100) {
      throw new BadRequestException('Percentage cannot exceed 100');
    }

    return this.prisma.discountCode.create({
      data: {
        tenantId: user.tenantId,
        createdById: user.id,
        code,
        description: dto.description,
        type: dto.type,
        value: dto.value,
        minPurchase: dto.minPurchase ?? 0,
        maxDiscount: dto.maxDiscount,
        usageLimit: dto.usageLimit,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  list(user: AuthenticatedUser) {
    return this.prisma.discountCode.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggle(user: AuthenticatedUser, id: string) {
    const dc = await this.prisma.discountCode.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!dc) throw new NotFoundException('Discount not found');

    return this.prisma.discountCode.update({
      where: { id },
      data: { isActive: !dc.isActive },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const dc = await this.prisma.discountCode.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!dc) throw new NotFoundException('Discount not found');

    await this.prisma.discountCode.delete({ where: { id } });
    return { message: 'Discount deleted' };
  }

  async validate(user: AuthenticatedUser, code: string, amount: number) {
    const upper = code.toUpperCase().trim();
    const dc = await this.prisma.discountCode.findFirst({
      where: {
        tenantId: user.tenantId,
        code: upper,
        isActive: true,
      },
    });

    if (!dc) {
      throw new BadRequestException('Invalid or inactive discount code');
    }

    const now = new Date();
    if (dc.validFrom && now < dc.validFrom) {
      throw new BadRequestException('Discount not yet active');
    }
    if (dc.validUntil && now > dc.validUntil) {
      throw new BadRequestException('Discount expired');
    }
    if (dc.usageLimit && dc.usageCount >= dc.usageLimit) {
      throw new BadRequestException('Discount usage limit reached');
    }
    if (amount < dc.minPurchase) {
      throw new BadRequestException(
        `Minimum purchase Rs ${dc.minPurchase} required`,
      );
    }

    let discount = 0;
    if (dc.type === 'PERCENTAGE') {
      discount = (amount * dc.value) / 100;
      if (dc.maxDiscount && discount > dc.maxDiscount) {
        discount = dc.maxDiscount;
      }
    } else {
      discount = dc.value;
    }

    discount = Math.min(discount, amount);

    return {
      id: dc.id,
      code: dc.code,
      type: dc.type,
      value: dc.value,
      discount,
      finalAmount: Math.max(amount - discount, 0),
    };
  }
}
