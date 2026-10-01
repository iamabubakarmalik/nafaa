import { EventEmitter } from 'events';

/**
 * Online order ke waqiat — in-process. OnlineOrdersService bhejta hai,
 * doosri services (courier auto-book) sunti hain. Circular dependency se
 * bachne ke liye (courier service khud OnlineOrdersService istemal karti hai).
 */
export interface OrderAccepted {
  tenantId: string;
  orderId: string;
}

export const orderEvents = new EventEmitter();
orderEvents.setMaxListeners(20);

export function emitOrderAccepted(e: OrderAccepted) {
  // Agle tick par — accept ka jawab pehle user tak jaye
  setImmediate(() => {
    try {
      orderEvents.emit('accepted', e);
    } catch {
      // sunne wale ki ghalti accept ko na roke
    }
  });
}

/**
 * Channel ka order status badla (accept / cancel / ready…) — Foodpanda jaise
 * channels apne server ko batate hain. StatusWebhookService bhejta hai.
 */
export interface ChannelStatus { integrationId: string; orderId: string; event: string }
export const channelStatusEvents = new EventEmitter();
channelStatusEvents.setMaxListeners(20);

export function emitChannelStatus(e: ChannelStatus) {
  setImmediate(() => {
    try { channelStatusEvents.emit('status', e); } catch { /* sunne wale ki ghalti */ }
  });
}
