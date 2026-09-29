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
