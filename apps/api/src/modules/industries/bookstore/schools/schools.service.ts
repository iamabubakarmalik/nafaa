import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const dup = await this.prisma.school.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException(`School "${dto.name}" exists`);
    return this.prisma.school.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: any) {
    return this.prisma.school.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.type && { type: params.type }),
        ...(params.board && { board: params.board }),
        ...(params.city && { city: params.city }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { code: { contains: params.search, mode: 'insensitive' } },
            { city: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { _count: { select: { bookLists: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.school.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        bookLists: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!s) throw new NotFoundException('School not found');
    return s;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const s = await this.prisma.school.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('School not found');
    return this.prisma.school.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.school.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('School not found');
    return this.prisma.school.update({ where: { id }, data: { isActive: false } });
  }
}
