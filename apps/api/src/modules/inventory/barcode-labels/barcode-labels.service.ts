/**
 * Barcode labels: the shop's saved label design (sheet, size, what shows)
 * and giving products and variants a scanner-safe barcode in one go.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { freshInStoreEan } from './barcode.helper';
import { AssignBarcodesDto, LabelConfigDto } from './dto/label-config.dto';

export const LABEL_DEFAULTS = {
  sheet: 'thermal', widthMm: 50, heightMm: 30, cols: 1, gapMm: 2, marginMm: 0, format: 'CODE128',
  showShop: true, showName: true, showVariant: true, showPrice: true, showOldPrice: false, showSku: false,
  showUnit: false, showCode: true, showExpiry: false, border: false, priceSource: 'retail', align: 'center',
  fontScale: 1, barHeight: 0.7, shopText: '', footerText: '', copies: 'one',
};
const KEYS = new Set(Object.keys(LABEL_DEFAULTS));

@Injectable()
export class BarcodeLabelsService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(user: AuthenticatedUser) {
    const [s, missing] = await Promise.all([
      this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { labelConfig: true } }),
      this.prisma.product.count({ where: { tenantId: user.tenantId, isActive: true, OR: [{ barcode: null }, { barcode: '' }] } }),
    ]);
    const stored = (s?.labelConfig && typeof s.labelConfig === 'object' ? s.labelConfig : {}) as Record<string, unknown>;
    const known = Object.fromEntries(Object.entries(stored).filter(([k, v]) => KEYS.has(k) && v != null));
    return { config: { ...LABEL_DEFAULTS, ...known }, missingBarcodes: missing };
  }

  async saveConfig(user: AuthenticatedUser, dto: LabelConfigDto) {
    const next = JSON.parse(JSON.stringify({ ...(await this.getConfig(user)).config, ...dto }));
    await this.prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: { tenantId: user.tenantId, labelConfig: next },
      update: { labelConfig: next },
    });
    return next;
  }

  /** Gives every chosen product (and optionally its variants) without a code a fresh EAN-13. */
  async assign(user: AuthenticatedUser, dto: AssignBarcodesDto) {
    return this.prisma.$transaction(async (tx) => {
      const taken = new Set<string>();
      const products = await tx.product.findMany({
        where: { id: { in: dto.productIds }, tenantId: user.tenantId },
        select: { id: true, barcode: true, variants: dto.variants ? { where: { OR: [{ barcode: null }, { barcode: '' }] }, select: { id: true } } : false },
      });
      let productsDone = 0; let variantsDone = 0;
      for (const p of products) {
        if (!p.barcode?.trim()) {
          await tx.product.update({ where: { id: p.id }, data: { barcode: await freshInStoreEan(tx, user.tenantId, taken) } });
          productsDone++;
        }
        for (const v of (p as { variants?: Array<{ id: string }> }).variants ?? []) {
          await tx.productVariant.update({ where: { id: v.id }, data: { barcode: await freshInStoreEan(tx, user.tenantId, taken) } });
          variantsDone++;
        }
      }
      return { products: productsDone, variants: variantsDone };
    }, { timeout: 120_000 });
  }
}
