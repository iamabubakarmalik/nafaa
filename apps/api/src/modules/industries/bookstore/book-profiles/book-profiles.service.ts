import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { UpsertBookDto } from './dto/upsert-book.dto';

@Injectable()
export class BookProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertBookDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const { authors, ...bookData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.bookProfile.findUnique({ where: { productId: dto.productId } });

      let book;
      if (existing) {
        book = await tx.bookProfile.update({
          where: { productId: dto.productId },
          data: { ...bookData, tenantId: user.tenantId },
        });
      } else {
        book = await tx.bookProfile.create({
          data: { ...bookData, tenantId: user.tenantId },
        });
      }

      // Handle authors
      if (authors) {
        await tx.bookAuthor.deleteMany({ where: { bookId: book.id } });
        if (authors.length > 0) {
          await tx.bookAuthor.createMany({
            data: authors.map((a, i) => ({
              bookId: book.id,
              authorId: a.authorId,
              role: a.role || 'AUTHOR',
              displayOrder: a.displayOrder ?? i,
            })),
          });
        }
      }

      return tx.bookProfile.findUnique({
        where: { id: book.id },
        include: { publisher: true, bookAuthors: { include: { author: true } } },
      });
    });
  }

  async list(user: AuthenticatedUser, params: any) {
    const books = await this.prisma.bookProfile.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.category && { category: params.category }),
        ...(params.publisherId && { publisherId: params.publisherId }),
        ...(params.language && { language: params.language }),
        ...(params.board && { board: params.board }),
        ...(params.grade && { grade: params.grade }),
        ...(params.subject && { subject: params.subject }),
        ...(params.condition && { condition: params.condition }),
        ...(params.binding && { binding: params.binding }),
        ...(params.isTextbook !== undefined && { isTextbook: params.isTextbook }),
        ...(params.isBestSeller !== undefined && { isBestSeller: params.isBestSeller }),
        ...(params.isNewArrival !== undefined && { isNewArrival: params.isNewArrival }),
        ...(params.isFeatured !== undefined && { isFeatured: params.isFeatured }),
        ...(params.isAwardWinner !== undefined && { isAwardWinner: params.isAwardWinner }),
        ...(params.isRentable !== undefined && { isRentable: params.isRentable }),
        ...(params.search && {
          OR: [
            { title: { contains: params.search, mode: 'insensitive' } },
            { subtitle: { contains: params.search, mode: 'insensitive' } },
            { isbn10: { contains: params.search } },
            { isbn13: { contains: params.search } },
            { publisherBookCode: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        publisher: true,
        bookAuthors: { include: { author: true }, orderBy: { displayOrder: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 300,
    });

    const productIds = books.map((b) => b.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    return books.map((b) => ({ ...b, product: productMap.get(b.productId) }));
  }

  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.bookProfile.findFirst({
      where: { productId, tenantId: user.tenantId },
      include: { publisher: true, bookAuthors: { include: { author: true } } },
    });
  }

  async byIsbn(user: AuthenticatedUser, isbn: string) {
    return this.prisma.bookProfile.findFirst({
      where: {
        tenantId: user.tenantId,
        OR: [{ isbn10: isbn }, { isbn13: isbn }],
      },
      include: { publisher: true, bookAuthors: { include: { author: true } } },
    });
  }

  async findByAcademic(user: AuthenticatedUser, params: { board?: string; grade?: string; subject?: string }) {
    return this.prisma.bookProfile.findMany({
      where: {
        tenantId: user.tenantId,
        isTextbook: true,
        ...(params.board && { board: params.board }),
        ...(params.grade && { grade: params.grade }),
        ...(params.subject && { subject: params.subject }),
      },
      include: { publisher: true, bookAuthors: { include: { author: true } } },
      orderBy: [{ grade: 'asc' }, { subject: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.bookProfile.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { publisher: true, bookAuthors: { include: { author: true } } },
    });
    if (!b) throw new NotFoundException('Book not found');
    const product = await this.prisma.product.findUnique({
      where: { id: b.productId },
      include: { images: true, category: true },
    });
    return { ...b, product };
  }

  async remove(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.bookProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Book not found');
    return this.prisma.bookProfile.delete({ where: { id } });
  }
}
