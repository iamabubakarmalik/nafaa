import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Online orders ke customer ka shakhsi data (naam, phone, email, address)
 * hamesha nahi rakhte. Band ho chuke orders (deliver / cancel) ka data
 * `ONLINE_ORDER_PII_RETENTION_DAYS` (default 365) din baad mita dete hain.
 * Order, bill aur hisaab rehta hai — sirf pehchan mitti hai.
 *
 * Shopify / GDPR ki "retention period" shart isi se poori hoti hai.
 */
@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 20 3 * * *') // roz raat 3:20
  async purgeOldCustomerData() {
    if (process.env.DISABLE_PII_RETENTION === '1') return;
    const days = Math.max(30, Number(process.env.ONLINE_ORDER_PII_RETENTION_DAYS ?? 365) || 365);
    const cutoff = new Date(Date.now() - days * 86_400_000);
    const res = await this.prisma.channelOrder.updateMany({
      where: {
        receivedAt: { lt: cutoff },
        orderStatus: { in: ['DELIVERED', 'CANCELLED', 'REJECTED'] },
        NOT: { customerName: 'Redacted' },
      },
      data: {
        customerName: 'Redacted',
        customerPhone: null,
        customerEmail: null,
        customerAddress: null,
        customerLat: null,
        customerLng: null,
      },
    });
    if (res.count) this.logger.log(`🧹 ${res.count} purane online orders ka customer data mita diya (${days} din)`);
  }
}
