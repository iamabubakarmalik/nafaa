import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

/**
 * RealtimeGateway — single WebSocket entry point for the whole app.
 * Uses room-based broadcasting for scale.
 *
 * Rooms:
 *   customer:{customerId}       → private customer channel (order updates, notifications)
 *   tenant:{tenantId}           → business owner channel
 *   shop:{shopId}               → shop staff channel
 *   bargain:{bargainId}         → both parties of a bargain
 *   auction:{auctionId}         → all watchers of an auction
 *   live-shop:{liveShopId}      → all viewers of a live show
 *   order:{orderId}             → both customer + shop for that order
 */
@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/realtime',
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // CONNECTION HANDLING
  // ═══════════════════════════════════════════════════════════

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string)?.replace('Bearer ', '') ||
        (client.handshake.query?.token as string);

      if (!token) {
        this.logger.warn(`Socket ${client.id} disconnected: no token`);
        client.disconnect();
        return;
      }

      // Try customer token first, fall back to tenant token
      const customerSecret =
        this.config.get<string>('MARKETPLACE_JWT_SECRET') ||
        this.config.get<string>('JWT_ACCESS_SECRET')!;
      const tenantSecret = this.config.get<string>('JWT_ACCESS_SECRET')!;

      let payload: any;
      let userType: 'customer' | 'tenant' = 'customer';

      try {
        payload = await this.jwt.verifyAsync(token, { secret: customerSecret });
        if (payload.tenantId) {
          userType = 'tenant';
        }
      } catch {
        try {
          payload = await this.jwt.verifyAsync(token, { secret: tenantSecret });
          userType = 'tenant';
        } catch {
          throw new UnauthorizedException('Invalid token');
        }
      }

      // Attach identity to socket
      (client.data as any).userId = payload.sub;
      (client.data as any).userType = userType;
      (client.data as any).payload = payload;

      // Auto-join appropriate rooms
      if (userType === 'customer') {
        client.join(`customer:${payload.sub}`);
        this.logger.log(`👤 Customer ${payload.sub} connected via ${client.id}`);
      } else {
        client.join(`tenant:${payload.tenantId}`);
        if (payload.shopId) client.join(`shop:${payload.shopId}`);
        this.logger.log(`🏪 Tenant ${payload.tenantId} connected via ${client.id}`);
      }

      client.emit('connected', {
        socketId: client.id,
        userType,
        userId: payload.sub,
      });
    } catch (e: any) {
      this.logger.warn(`Auth failed for socket ${client.id}: ${e.message}`);
      client.emit('unauthorized', { message: e.message });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const uid = (client.data as any).userId;
    if (uid) this.logger.log(`❌ ${uid} disconnected (${client.id})`);
  }

  // ═══════════════════════════════════════════════════════════
  // CLIENT-SIDE SUBSCRIPTIONS (join per-entity rooms)
  // ═══════════════════════════════════════════════════════════

  @SubscribeMessage('join:bargain')
  onJoinBargain(@ConnectedSocket() client: Socket, @MessageBody() data: { bargainId: string }) {
    if (!data?.bargainId) return { ok: false };
    client.join(`bargain:${data.bargainId}`);
    return { ok: true, room: `bargain:${data.bargainId}` };
  }

  @SubscribeMessage('leave:bargain')
  onLeaveBargain(@ConnectedSocket() client: Socket, @MessageBody() data: { bargainId: string }) {
    if (!data?.bargainId) return { ok: false };
    client.leave(`bargain:${data.bargainId}`);
    return { ok: true };
  }

  @SubscribeMessage('join:auction')
  onJoinAuction(@ConnectedSocket() client: Socket, @MessageBody() data: { auctionId: string }) {
    if (!data?.auctionId) return { ok: false };
    client.join(`auction:${data.auctionId}`);
    return { ok: true, room: `auction:${data.auctionId}` };
  }

  @SubscribeMessage('leave:auction')
  onLeaveAuction(@ConnectedSocket() client: Socket, @MessageBody() data: { auctionId: string }) {
    if (!data?.auctionId) return { ok: false };
    client.leave(`auction:${data.auctionId}`);
    return { ok: true };
  }

  @SubscribeMessage('join:live-shop')
  onJoinLiveShop(@ConnectedSocket() client: Socket, @MessageBody() data: { liveShopId: string }) {
    if (!data?.liveShopId) return { ok: false };
    client.join(`live-shop:${data.liveShopId}`);
    return { ok: true, room: `live-shop:${data.liveShopId}` };
  }

  @SubscribeMessage('leave:live-shop')
  onLeaveLiveShop(@ConnectedSocket() client: Socket, @MessageBody() data: { liveShopId: string }) {
    if (!data?.liveShopId) return { ok: false };
    client.leave(`live-shop:${data.liveShopId}`);
    return { ok: true };
  }

  @SubscribeMessage('join:order')
  onJoinOrder(@ConnectedSocket() client: Socket, @MessageBody() data: { orderId: string }) {
    if (!data?.orderId) return { ok: false };
    client.join(`order:${data.orderId}`);
    return { ok: true, room: `order:${data.orderId}` };
  }

  @SubscribeMessage('ping')
  onPing(@ConnectedSocket() client: Socket) {
    return { pong: Date.now() };
  }
}
