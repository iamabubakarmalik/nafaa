import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertAuthorDto } from './dto/upsert-author.dto';

@Injectable()
export class AuthorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertAuthorDto) {
    const dup = await this.prisma.author.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException(`Author "${dto.name}" exists`);
    return this.prisma.author.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: { search?: string; nationality?: string; genre?: string; language?: string; featured?: boolean; active?: boolean }) {
    return this.prisma.author.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.nationality && { nationality: params.nationality }),
        ...(params.genre && { genres: { has: params.genre } }),
        ...(params.language && { languages: { has: params.language } }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { penName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { _count: { select: { bookAuthors: true } } },
      orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.author.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        bookAuthors: {
          include: { book: true },
          take: 50,
        },
      },
    });
    if (!a) throw new NotFoundException('Author not found');
    return a;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertAuthorDto) {
    const a = await this.prisma.author.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Author not found');
    return this.prisma.author.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.author.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Author not found');
    return this.prisma.author.update({ where: { id }, data: { isActive: false } });
  }

  async toggleFeatured(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.author.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Author not found');
    return this.prisma.author.update({ where: { id }, data: { isFeatured: !a.isFeatured } });
  }
}
