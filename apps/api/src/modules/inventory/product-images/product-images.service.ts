import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { AddImageDto, ReorderImagesDto } from './dto/add-image.dto';

@Injectable()
export class ProductImagesService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureProduct(user: AuthenticatedUser, productId: string) {
    const p = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: user.tenantId },
    });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  /** Image changes do not touch the product row; bump it so phones pull the new picture on their next sync. */
  private touch(productId: string) {
    return this.prisma.product.update({ where: { id: productId }, data: { updatedAt: new Date() } }).catch(() => null);
  }

  async list(user: AuthenticatedUser, productId: string) {
    await this.ensureProduct(user, productId);
    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async add(user: AuthenticatedUser, productId: string, dto: AddImageDto) {
    await this.ensureProduct(user, productId);

    const count = await this.prisma.productImage.count({ where: { productId } });
    const isFirst = count === 0;

    if (dto.isPrimary || isFirst) {
      await this.prisma.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const created = await this.prisma.productImage.create({
      data: {
        productId,
        url: dto.url,
        thumbnail: dto.thumbnail,
        alt: dto.alt,
        isPrimary: dto.isPrimary ?? isFirst,
        sortOrder: dto.sortOrder ?? count,
        uploadId: dto.uploadId,
      },
    });
    await this.touch(productId);
    return created;
  }

  async setPrimary(user: AuthenticatedUser, productId: string, imageId: string) {
    await this.ensureProduct(user, productId);

    await this.prisma.productImage.updateMany({
      where: { productId },
      data: { isPrimary: false },
    });

    const updated = await this.prisma.productImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });
    await this.touch(productId);

    return updated;
  }

  async reorder(user: AuthenticatedUser, productId: string, dto: ReorderImagesDto) {
    await this.ensureProduct(user, productId);

    await this.prisma.$transaction(
      dto.imageIds.map((id, index) =>
        this.prisma.productImage.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    await this.touch(productId);
    return { message: 'Reordered', count: dto.imageIds.length };
  }

  async remove(user: AuthenticatedUser, productId: string, imageId: string) {
    await this.ensureProduct(user, productId);
    const img = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!img) throw new NotFoundException('Image not found');

    await this.prisma.productImage.delete({ where: { id: imageId } });

    if (img.isPrimary) {
      const next = await this.prisma.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });
      if (next) {
        await this.prisma.productImage.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
      }
    }

    await this.touch(productId);
    return { message: 'Image deleted' };
  }
}
