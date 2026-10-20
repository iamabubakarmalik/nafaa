import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertBookDto } from './dto/upsert-book.dto';

@Injectable()
export class BookProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertBookDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId } });
    if (!product) throw new NotFoundException('Item nahi mila');

    const { authors, ...bookData } = dto;
    // Publisher and authors must be this shop's own.
    if (bookData.publisherId) {
      const pub = await this.prisma.publisher.findFirst({ where: { id: bookData.publisherId, tenantId: user.tenantId }, select: { id: true } });
      if (!pub) throw new BadRequestException('Publisher nahi mila');
    }
    if (authors?.length) {
      const ids = [...new Set(authors.map((a) => a.authorId))];
      const found = await this.prisma.author.count({ where: { id: { in: ids }, tenantId: user.tenantId } });
      if (found !== ids.length) throw new BadRequestException('Author nahi mila');
    }
    for (const isbn of [bookData.isbn10, bookData.isbn13]) {
      if (!isbn) continue;
      const taken = await this.prisma.bookProfile.findFirst({
        where: { tenantId: user.tenantId, OR: [{ isbn10: isbn }, { isbn13: isbn }], NOT: { productId: dto.productId } },
        select: { title: true },
      });
      if (taken) throw new BadRequestException(`ISBN ${isbn} pehle se "${taken.title}" par laga hai`);
    }

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
      where: { tenantId: user.tenantId, id: { in: productIds } },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    return books.map((b) => ({ ...b, product: productMap.get(b.productId) }));
  }

  /**
   * One slim row per catalog item with bookstore details (book, stationery
   * or art), for product cards, the counter's ISBN search and filters.
   */
  async facts(user: AuthenticatedUser) {
    const where = { tenantId: user.tenantId };
    const [books, stationery, art] = await Promise.all([
      this.prisma.bookProfile.findMany({
        where,
        select: {
          productId: true, isbn10: true, isbn13: true, category: true, edition: true, publishYear: true, language: true,
          isTextbook: true, grade: true, subject: true, board: true, isRentable: true, rentalPricePerWeek: true, rentalDeposit: true,
          condition: true, publisher: { select: { name: true } },
          bookAuthors: { select: { author: { select: { name: true } } }, orderBy: { displayOrder: 'asc' } },
        },
      }),
      this.prisma.stationeryProfile.findMany({ where, select: { productId: true, category: true, brand: true, color: true, size: true, isSchoolItem: true } }),
      this.prisma.artSupplyProfile.findMany({ where, select: { productId: true, category: true, brand: true, color: true, size: true, grade: true } }),
    ]);
    return [
      ...books.map(({ publisher, bookAuthors, ...b }) => ({
        kind: 'BOOK' as const, ...b, publisher: publisher?.name ?? null, authors: bookAuthors.map((a) => a.author.name),
      })),
      ...stationery.map((x) => ({ kind: 'STATIONERY' as const, ...x })),
      ...art.map((x) => ({ kind: 'ART' as const, ...x })),
    ];
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

  /** Textbooks for a class (and board/subject), with each book's current selling price. */
  async findByAcademic(user: AuthenticatedUser, params: { board?: string; grade?: string; subject?: string }) {
    const books = await this.prisma.bookProfile.findMany({
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
    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: books.map((b) => b.productId) }, isActive: true },
      select: { id: true, name: true, price: true, stock: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    return books.filter((b) => byId.has(b.productId)).map((b) => ({ ...b, product: byId.get(b.productId) }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.bookProfile.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { publisher: true, bookAuthors: { include: { author: true } } },
    });
    if (!b) throw new NotFoundException('Kitab nahi mili');
    const product = await this.prisma.product.findUnique({
      where: { id: b.productId },
      include: { images: true, category: true },
    });
    return { ...b, product };
  }

  /** Hides the product (nothing is erased; it can be switched back on). */
  async remove(user: AuthenticatedUser, id: string) {
    const b = await this.prisma.bookProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!b) throw new NotFoundException('Kitab nahi mili');
    // The profile is kept with its product; removing it hides the product instead.
    await this.prisma.product.updateMany({ where: { id: b.productId, tenantId: user.tenantId }, data: { isActive: false } });
    return b;
  }
}
