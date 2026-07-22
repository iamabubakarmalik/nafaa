import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { QueueService } from '../queue.service';
import { QUEUE_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.AUCTION)
export class AuctionProcessor extends WorkerHost {
  private readonly logger = new Logger(AuctionProcessor.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeService,
    private readonly queue: QueueService,
  ) { super(); }

  async process(job: Job) {
    const { auctionId } = job.data;

    if (job.name === 'start') {
      const a = await this.prisma.auction.findUnique({ where: { id: auctionId } });
      if (!a || a.status !== 'SCHEDULED') return;
      await this.prisma.auction.update({
        where: { id: auctionId },
        data: { status: 'LIVE' },
      });
      this.rt.broadcast('auction:started', { auctionId });
      this.logger.log(`🎬 Auction ${auctionId} started`);

      // Schedule end
      const updated = await this.prisma.auction.findUnique({ where: { id: auctionId } });
      if (updated) await this.queue.scheduleAuctionEnd(auctionId, updated.endsAt);
      return;
    }

    if (job.name === 'end') {
      const a = await this.prisma.auction.findUnique({
        where: { id: auctionId },
        include: {
          bids: { orderBy: { amount: 'desc' }, take: 1, where: { isRetracted: false } },
        },
      });
      if (!a) return;
      if (a.status !== 'LIVE') return;

      // Anti-snipe: if endsAt was extended past now, reschedule
      if (a.endsAt > new Date()) {
        await this.queue.scheduleAuctionEnd(auctionId, a.endsAt);
        return;
      }

      const winningBid = a.bids[0];
      const reserveMet =
        !a.reservePrice || (winningBid && Number(winningBid.amount) >= Number(a.reservePrice));

      await this.prisma.auction.update({
        where: { id: auctionId },
        data: {
          status: 'ENDED',
          winnerId: reserveMet && winningBid ? winningBid.customerId : null,
          winningBidId: reserveMet && winningBid ? winningBid.id : null,
        },
      });

      this.rt.emitAuctionEnded(auctionId, {
        winnerId: reserveMet && winningBid ? winningBid.customerId : null,
        winningAmount: winningBid?.amount,
        reserveMet,
      });

      // Notify winner
      if (reserveMet && winningBid) {
        await this.queue.createNotification({
          customerId: winningBid.customerId,
          type: 'AUCTION_WON',
          title: '🎉 Aap ne auction jeeti!',
          body: `${a.title} — final price PKR ${winningBid.amount}`,
          actionUrl: `/market/auctions/${auctionId}`,
          data: { auctionId, amount: winningBid.amount },
          channels: ['PUSH', 'SMS', 'IN_APP'],
        });
      }
      this.logger.log(`🏁 Auction ${auctionId} ended — winner: ${winningBid?.customerId ?? 'none'}`);
    }
  }
}
