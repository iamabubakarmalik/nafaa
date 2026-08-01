import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateTryOnDto } from './dto/create-tryon.dto';

@Injectable()
export class ShoeTryOnService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateTryOnDto) {
    const count = await this.prisma.shoeTryOnRequest.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const requestNumber = `TR-${year}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.shoeTryOnRequest.create({
      data: {
        tenantId: user.tenantId,
        requestNumber,
        ...dto,
        requestedSizes: dto.requestedSizes ?? [],
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: 'PENDING',
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; search?: string }) {
    return this.prisma.shoeTryOnRequest.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.search && {
          OR: [
            { requestNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { productName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { scheduledAt: 'asc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.shoeTryOnRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Try-on request not found');
    return r;
  }

  async complete(user: AuthenticatedUser, id: string, purchased: boolean, purchasedSize?: string) {
    const r = await this.prisma.shoeTryOnRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Try-on request not found');
    return this.prisma.shoeTryOnRequest.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        purchased,
        purchasedSize,
      },
    });
  }

  async cancel(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.shoeTryOnRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Try-on request not found');
    return this.prisma.shoeTryOnRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.shoeTryOnRequest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Try-on request not found');
    return this.prisma.shoeTryOnRequest.delete({ where: { id } });
  }

  async summary(user: AuthenticatedUser) {
    const [pending, scheduled, completed, cancelled] = await Promise.all([
      this.prisma.shoeTryOnRequest.count({ where: { tenantId: user.tenantId, status: 'PENDING' } }),
      this.prisma.shoeTryOnRequest.count({ where: { tenantId: user.tenantId, status: 'SCHEDULED' } }),
      this.prisma.shoeTryOnRequest.count({ where: { tenantId: user.tenantId, status: 'COMPLETED' } }),
      this.prisma.shoeTryOnRequest.count({ where: { tenantId: user.tenantId, status: 'CANCELLED' } }),
    ]);
    const conversion = await this.prisma.shoeTryOnRequest.count({
      where: { tenantId: user.tenantId, status: 'COMPLETED', purchased: true },
    });
    return { pending, scheduled, completed, cancelled, conversion };
  }
}
