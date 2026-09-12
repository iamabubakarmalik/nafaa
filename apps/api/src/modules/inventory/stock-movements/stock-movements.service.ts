import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: AuthenticatedUser, scope: ShopScope) {
    return this.prisma.stockMovement.findMany({
      where: {
        tenantId: user.tenantId,
        // Untagged history from before branches existed stays visible, so the
        // ledger doesn't appear to lose entries when a shop is selected.
        ...scope.whereLoose,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
          },
        },
        shop: { select: { id: true, name: true, isMain: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
