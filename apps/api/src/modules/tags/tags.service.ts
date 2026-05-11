import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UpsertTagDto } from './dto/upsert-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    return this.prisma.tag.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async create(user: AuthenticatedUser, dto: UpsertTagDto) {
    const existing = await this.prisma.tag.findFirst({
      where: { tenantId: user.tenantId, name: dto.name },
    });
    if (existing) throw new ConflictException('Tag already exists');

    return this.prisma.tag.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        color: dto.color ?? '#16a34a',
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertTagDto) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!tag) throw new NotFoundException('Tag not found');
    return this.prisma.tag.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!tag) throw new NotFoundException('Tag not found');
    await this.prisma.tag.delete({ where: { id } });
    return { message: 'Tag deleted' };
  }
}
