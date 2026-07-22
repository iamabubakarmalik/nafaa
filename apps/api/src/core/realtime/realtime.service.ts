import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

/**
 * RealtimeService — inject this ANYWHERE in the app to emit socket events.
 * Every method is fire-and-forget.
 */
@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  private get server() {
    return this.gateway.server;
  }

  // ─── CUSTOMER ─────────────────────────────────────────────
  emitToCustomer(customerId: string, event: string, data: any) {
    this.server.to(`customer:${customerId}`).emit(event, data);
  }

  // ─── TENANT / SHOP ────────────────────────────────────────
  emitToTenant(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }
  emitToShop(shopId: string, event: string, data: any) {
    this.server.to(`shop:${shopId}`).emit(event, data);
  }

  // ─── ORDER (both parties) ─────────────────────────────────
  emitOrderUpdate(orderId: string, data: any) {
    this.server.to(`order:${orderId}`).emit('order:update', data);
  }

  // ─── BARGAIN ──────────────────────────────────────────────
  emitBargainUpdate(bargainId: string, data: any) {
    this.server.to(`bargain:${bargainId}`).emit('bargain:update', data);
  }
  emitBargainMessage(bargainId: string, msg: any) {
    this.server.to(`bargain:${bargainId}`).emit('bargain:message', msg);
  }

  // ─── AUCTION ──────────────────────────────────────────────
  emitAuctionNewBid(auctionId: string, bid: any) {
    this.server.to(`auction:${auctionId}`).emit('auction:new-bid', bid);
  }
  emitAuctionExtended(auctionId: string, data: any) {
    this.server.to(`auction:${auctionId}`).emit('auction:extended', data);
  }
  emitAuctionEnded(auctionId: string, data: any) {
    this.server.to(`auction:${auctionId}`).emit('auction:ended', data);
  }

  // ─── LIVE SHOP ────────────────────────────────────────────
  emitLiveShopMessage(liveShopId: string, msg: any) {
    this.server.to(`live-shop:${liveShopId}`).emit('live-shop:message', msg);
  }
  emitLiveShopViewerCount(liveShopId: string, count: number) {
    this.server.to(`live-shop:${liveShopId}`).emit('live-shop:viewer-count', { count });
  }
  emitLiveShopStarted(liveShopId: string, data: any) {
    this.server.to(`live-shop:${liveShopId}`).emit('live-shop:started', data);
  }
  emitLiveShopEnded(liveShopId: string, data: any) {
    this.server.to(`live-shop:${liveShopId}`).emit('live-shop:ended', data);
  }

  // ─── GROUP BUY ────────────────────────────────────────────
  emitGroupBuyProgress(groupBuyId: string, data: any) {
    this.server.emit('group-buy:progress', { groupBuyId, ...data });
  }

  // ─── NOTIFICATION PUSH ────────────────────────────────────
  emitNotification(customerId: string, notification: any) {
    this.server.to(`customer:${customerId}`).emit('notification:new', notification);
  }

  // ─── DELIVERY TRACKING ────────────────────────────────────
  emitRiderLocation(orderId: string, location: { lat: number; lng: number }) {
    this.server.to(`order:${orderId}`).emit('rider:location', location);
  }

  // ─── UTIL: broadcast (rare) ───────────────────────────────
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}
