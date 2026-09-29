import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IntegrationCategory, IntegrationStatus, Prisma, SyncDirection, SyncStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import * as crypto from 'crypto';
import { mappingKey } from '../online-orders/mapping-key';

type OrderReceivedListener = (order: any, integration: any) => Promise<void> | void;

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);
  private readonly orderListeners: OrderReceivedListener[] = [];

  /**
   * Naya channel order aane par chalne wale kaam (ghanti, auto-accept).
   * OnlineOrdersService yahan register karta hai — seedha inject karte to
   * dono services ek doosre par tik jatin (circular dependency).
   */
  onOrderReceived(listener: OrderReceivedListener) {
    this.orderListeners.push(listener);
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // CREATE / CONNECT
  // ═══════════════════════════════════════════════════════════

  async create(tenantId: string, dto: {
    type: any;
    category: IntegrationCategory;
    displayName: string;
    shopId?: string;
    credentials?: Record<string, any>;
    config?: Record<string, any>;
    syncDirection?: SyncDirection;
    autoSyncEnabled?: boolean;
    syncIntervalMin?: number;
  }) {
    // Check if already exists
    // Website/store kai ho sakte hain (Online Store → Website jorein se banti hain);
    // baaqi (Daraz, Foodpanda, courier) har dukaan me ek hi.
    if (['CUSTOM_WEBSITE', 'WOOCOMMERCE', 'SHOPIFY'].includes(dto.type)) {
      throw new BadRequestException('Website "Online store → Website jorein" se jorein');
    }
    const existing = await this.prisma.integration.findFirst({
      where: { tenantId, type: dto.type },
    });
    if (existing) throw new BadRequestException('Ye integration pehle se connected hai');

    const apiKey = crypto.randomBytes(24).toString('hex');
    const apiSecret = crypto.randomBytes(32).toString('hex');
    const webhookSecret = crypto.randomBytes(16).toString('hex');

    const baseUrl = process.env.API_URL ?? 'http://localhost:4000/api';

    return this.prisma.integration.create({
      data: {
        tenantId,
        shopId: dto.shopId,
        type: dto.type,
        category: dto.category,
        displayName: dto.displayName,
        status: IntegrationStatus.CONNECTED,
        credentials: dto.credentials ?? {},
        config: dto.config ?? {},
        apiKey,
        apiSecret,
        webhookSecret,
        webhookUrl: `${baseUrl}/integrations/webhooks/${dto.type.toLowerCase()}/${apiKey}`,
        syncDirection: dto.syncDirection ?? SyncDirection.BIDIRECTIONAL,
        autoSyncEnabled: dto.autoSyncEnabled ?? true,
        syncIntervalMin: dto.syncIntervalMin ?? 15,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // LIST ALL INTEGRATIONS
  // ═══════════════════════════════════════════════════════════

  async list(tenantId: string, category?: IntegrationCategory) {
    const where: Prisma.IntegrationWhereInput = { tenantId };
    if (category) where.category = category;

    const [items, total] = await Promise.all([
      this.prisma.integration.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { channelOrders: true, syncLogs: true },
          },
        },
      }),
      this.prisma.integration.count({ where }),
    ]);

    return { items, total };
  }

  // ═══════════════════════════════════════════════════════════
  // GET ONE
  // ═══════════════════════════════════════════════════════════

  async get(tenantId: string, integrationId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, tenantId },
      include: {
        _count: {
          select: { channelOrders: true, syncLogs: true, productMappings: true },
        },
        syncLogs: { orderBy: { startedAt: 'desc' }, take: 10 },
      },
    });
    if (!integration) throw new NotFoundException('Integration not found');
    return integration;
  }

  // ═══════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════

  async update(tenantId: string, integrationId: string, dto: any) {
    const existing = await this.prisma.integration.findFirst({
      where: { id: integrationId, tenantId },
    });
    if (!existing) throw new NotFoundException();

    return this.prisma.integration.update({
      where: { id: integrationId },
      data: {
        displayName: dto.displayName,
        credentials: dto.credentials,
        config: dto.config,
        syncDirection: dto.syncDirection,
        autoSyncEnabled: dto.autoSyncEnabled,
        syncIntervalMin: dto.syncIntervalMin,
        isActive: dto.isActive,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // DISCONNECT
  // ═══════════════════════════════════════════════════════════

  async disconnect(tenantId: string, integrationId: string) {
    await this.assertOwned(tenantId, integrationId);
    return this.prisma.integration.update({
      where: { id: integrationId },
      data: { status: IntegrationStatus.DISCONNECTED, isActive: false },
    });
  }

  async reconnect(tenantId: string, integrationId: string) {
    await this.assertOwned(tenantId, integrationId);
    return this.prisma.integration.update({
      where: { id: integrationId },
      data: { status: IntegrationStatus.CONNECTED, isActive: true },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // DELETE
  // ═══════════════════════════════════════════════════════════

  async remove(tenantId: string, integrationId: string) {
    const existing = await this.prisma.integration.findFirst({
      where: { id: integrationId, tenantId },
    });
    if (!existing) throw new NotFoundException();
    await this.prisma.integration.delete({ where: { id: integrationId } });
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // VERIFY API KEY (for incoming webhooks)
  // ═══════════════════════════════════════════════════════════

  private async assertOwned(tenantId: string, integrationId: string) {
    const found = await this.prisma.integration.findFirst({
      where: { id: integrationId, tenantId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Integration not found');
  }

  /** Band (disconnected) connection ki key se order nahi aata */
  async verifyApiKey(apiKey: string) {
    if (!apiKey || apiKey.length < 16) return null;
    const integration = await this.prisma.integration.findUnique({
      where: { apiKey },
    });
    if (!integration || !integration.isActive || integration.status !== IntegrationStatus.CONNECTED) return null;
    return integration;
  }

  // ═══════════════════════════════════════════════════════════
  // RECEIVE CHANNEL ORDER (called by connectors)
  // ═══════════════════════════════════════════════════════════

  async receiveChannelOrder(integrationId: string, orderData: {
    externalOrderId: string;
    externalOrderNumber?: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    customerAddress?: string;
    customerCity?: string;
    customerLat?: number;
    customerLng?: number;
    items: any[];
    subtotal: number;
    deliveryFee?: number;
    discount?: number;
    total: number;
    paymentMethod?: string;
    paymentStatus?: string;
    orderStatus?: string;
    notes?: string;
    metadata?: any;
  }) {
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    // Check for duplicate
    const existing = await this.prisma.channelOrder.findUnique({
      where: {
        integrationId_externalOrderId: {
          integrationId,
          externalOrderId: orderData.externalOrderId,
        },
      },
    });
    if (existing) {
      // Wahi order dobara aaya (website retry karti hai, ya "order updated"
      // webhook). Hamara status (accept/dispatch) website ke status se
      // overwrite nahi hota — sirf paisa aana aur bill se pehle cancel.
      const data: Prisma.ChannelOrderUpdateInput = {};
      if (orderData.paymentStatus === 'PAID' && existing.paymentStatus !== 'PAID') {
        data.paymentStatus = 'PAID';
        data.paymentReceivedAt = new Date();
      }
      if (orderData.orderStatus === 'CANCELLED' && existing.orderStatus === 'PENDING' && !existing.nafaaSaleId) {
        data.orderStatus = 'CANCELLED';
        data.cancelledAt = new Date();
        data.cancelReason = 'Website par cancel hua';
      }
      if (Object.keys(data).length === 0) return existing;
      return this.prisma.channelOrder.update({ where: { id: existing.id }, data });
    }

    // Create channel order
    const channelOrder = await this.prisma.$transaction(async (tx) => {
      const co = await tx.channelOrder.create({
        data: {
          integrationId,
          tenantId: integration.tenantId,
          shopId: integration.shopId,
          externalOrderId: orderData.externalOrderId,
          externalOrderNumber: orderData.externalOrderNumber,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          customerEmail: orderData.customerEmail,
          customerAddress: orderData.customerAddress,
          customerCity: orderData.customerCity,
          customerLat: orderData.customerLat,
          customerLng: orderData.customerLng,
          items: orderData.items,
          subtotal: orderData.subtotal,
          deliveryFee: orderData.deliveryFee ?? 0,
          discount: orderData.discount ?? 0,
          total: orderData.total,
          paymentMethod: orderData.paymentMethod,
          paymentStatus: orderData.paymentStatus ?? 'PENDING',
          orderStatus: orderData.orderStatus ?? 'PENDING',
          notes: orderData.notes,
          metadata: orderData.metadata,
        },
      });

      // Update integration stats
      await tx.integration.update({
        where: { id: integrationId },
        data: { totalOrdersSynced: { increment: 1 } },
      });

      return co;
    });

    this.logger.log(`📦 Channel order received: ${orderData.externalOrderId} from ${integration.type}`);

    for (const listener of this.orderListeners) {
      try {
        await listener(channelOrder, integration);
      } catch (e: any) {
        this.logger.warn(`Order listener fail: ${e?.message}`);
      }
    }
    return channelOrder;
  }

  // ═══════════════════════════════════════════════════════════
  // LIST CHANNEL ORDERS
  // ═══════════════════════════════════════════════════════════

  async listChannelOrders(tenantId: string, opts?: {
    integrationId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.ChannelOrderWhereInput = { tenantId };
    if (opts?.integrationId) where.integrationId = opts.integrationId;
    if (opts?.status) where.orderStatus = opts.status;

    const [items, total, counts] = await Promise.all([
      this.prisma.channelOrder.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        take: opts?.limit ?? 20,
        skip: opts?.offset ?? 0,
        include: {
          integration: { select: { type: true, displayName: true } },
        },
      }),
      this.prisma.channelOrder.count({ where }),
      this.prisma.channelOrder.groupBy({
        by: ['orderStatus'],
        where: { tenantId },
        _count: { orderStatus: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    counts.forEach((c) => (statusCounts[c.orderStatus] = c._count.orderStatus));

    return { items, total, counts: statusCounts };
  }

  // ═══════════════════════════════════════════════════════════
  // LOG SYNC
  // ═══════════════════════════════════════════════════════════

  async logSync(log: {
    integrationId: string;
    operation: string;
    direction: SyncDirection;
    status: SyncStatus;
    recordsProcessed?: number;
    recordsSuccess?: number;
    recordsFailed?: number;
    errorMessage?: string;
    details?: any;
    completedAt?: Date;
  }) {
    const integration = await this.prisma.integration.findUnique({
      where: { id: log.integrationId },
    });
    return this.prisma.syncLog.create({
      data: {
        integrationId: log.integrationId,
        tenantId: integration?.tenantId ?? '',
        operation: log.operation,
        direction: log.direction,
        status: log.status,
        recordsProcessed: log.recordsProcessed ?? 0,
        recordsSuccess: log.recordsSuccess ?? 0,
        recordsFailed: log.recordsFailed ?? 0,
        errorMessage: log.errorMessage,
        details: log.details,
        completedAt: log.completedAt ?? (log.status !== 'SYNCING' ? new Date() : null),
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // LOG WEBHOOK
  // ═══════════════════════════════════════════════════════════

  async logWebhook(data: {
    integrationId?: string;
    tenantId?: string;
    source: string;
    event: string;
    method: string;
    url?: string;
    headers?: any;
    body?: any;
    responseStatus?: number;
    processed?: boolean;
    errorMessage?: string;
  }) {
    return this.prisma.webhookLog.create({ data });
  }

  // ═══════════════════════════════════════════════════════════
  // DASHBOARD STATS
  // ═══════════════════════════════════════════════════════════

  async getDashboard(tenantId: string) {
    const [integrations, channelOrders, recentSync] = await Promise.all([
      this.prisma.integration.findMany({
        where: { tenantId },
        select: {
          id: true, type: true, displayName: true, status: true,
          category: true, lastSyncAt: true, totalOrdersSynced: true,
          totalErrors: true, isActive: true,
        },
      }),
      this.prisma.channelOrder.groupBy({
        by: ['orderStatus'],
        where: { tenantId },
        _count: { orderStatus: true },
      }),
      this.prisma.syncLog.findMany({
        where: { tenantId },
        orderBy: { startedAt: 'desc' },
        take: 20,
        include: { integration: { select: { type: true, displayName: true } } },
      }),
    ]);

    const orderCounts: Record<string, number> = {};
    channelOrders.forEach((c) => (orderCounts[c.orderStatus] = c._count.orderStatus));

    const connectedCount = integrations.filter((i) => i.status === 'CONNECTED').length;
    const totalOrders = Object.values(orderCounts).reduce((a, b) => a + b, 0);
    const pendingOrders = orderCounts['PENDING'] ?? 0;

    return {
      integrations,
      orderCounts,
      recentSync,
      summary: {
        connectedIntegrations: connectedCount,
        totalIntegrations: integrations.length,
        totalChannelOrders: totalOrders,
        pendingOrders,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════
  // AVAILABLE INTEGRATIONS (catalog)
  // ═══════════════════════════════════════════════════════════

  getAvailableIntegrations() {
    return [
      {
        type: 'WOOCOMMERCE',
        category: 'SALES_CHANNEL',
        name: 'WooCommerce / WordPress',
        description: 'Ek click me jorein — orders, stock aur products khud sync',
        icon: '🟣',
        color: '#7f54b3',
        docs: 'Site ka URL daalein, WordPress me Approve dabayein',
        popular: true,
        multiple: true,
        connectPath: '/online-store/connect?platform=woocommerce',
        fields: [],
      },
      {
        type: 'CUSTOM_WEBSITE',
        category: 'SALES_CHANNEL',
        name: 'Apni website / API',
        description: 'Apni banayi website se orders directly Nafaa mein aaye',
        icon: '🌐',
        color: '#10b981',
        docs: 'Developer ko tayyar code aur key dein',
        popular: true,
        multiple: true,
        connectPath: '/online-store/connect?platform=custom',
        fields: [],
      },
      {
        type: 'FOODPANDA',
        category: 'SALES_CHANNEL',
        name: 'Foodpanda',
        description: 'Foodpanda orders auto-sync, menu push',
        icon: '🍔',
        color: '#ff6b6b',
        docs: 'Foodpanda Partner Portal se API credentials chahiye',
        popular: true,
        fields: [
          { key: 'clientId', label: 'Client ID', required: true },
          { key: 'clientSecret', label: 'Client Secret', required: true },
          { key: 'vendorId', label: 'Vendor ID', required: true },
        ],
      },
      {
        type: 'DARAZ',
        category: 'SALES_CHANNEL',
        name: 'Daraz',
        description: 'Daraz products + orders + inventory sync',
        icon: '🛒',
        color: '#f97316',
        docs: 'Daraz Open Platform (open.lazada.com) se app create karein',
        popular: true,
        fields: [
          { key: 'appKey', label: 'App Key', required: true },
          { key: 'appSecret', label: 'App Secret', required: true },
          { key: 'country', label: 'Country', required: true, default: 'pk' },
        ],
      },
      {
        type: 'SHOPIFY',
        category: 'SALES_CHANNEL',
        name: 'Shopify',
        description: 'Shopify store products + orders sync',
        icon: '🛍️',
        color: '#95bf47',
        docs: 'Shopify admin me webhook URL paste karein',
        multiple: true,
        connectPath: '/online-store/connect?platform=shopify',
        fields: [
          { key: 'shopDomain', label: 'Shop Domain (e.g. mystore.myshopify.com)', required: true },
          { key: 'accessToken', label: 'Access Token', required: true },
        ],
      },
      {
        type: 'TCS_COURIER',
        category: 'COURIER',
        name: 'TCS Courier',
        description: 'Auto book + track TCS shipments',
        icon: '📦',
        color: '#1e40af',
        docs: 'TCS merchant account se API key lein',
        fields: [
          { key: 'apiKey', label: 'API Key', required: true },
          { key: 'merchantId', label: 'Merchant ID', required: true },
        ],
      },
      {
        type: 'LEOPARDS_COURIER',
        category: 'COURIER',
        name: 'Leopards Courier',
        description: 'Auto book + track Leopards shipments',
        icon: '🚚',
        color: '#7c3aed',
        docs: 'Leopards merchant account se API key lein',
        fields: [
          { key: 'apiKey', label: 'API Key', required: true },
          { key: 'merchantCode', label: 'Merchant Code', required: true },
        ],
      },
      {
        type: 'NAYAPAY',
        category: 'PAYMENT',
        name: 'NayaPay',
        description: 'NayaPay payment gateway',
        icon: '💳',
        color: '#059669',
        docs: 'NayaPay merchant account se credentials lein',
        fields: [
          { key: 'merchantId', label: 'Merchant ID', required: true },
          { key: 'apiKey', label: 'API Key', required: true },
        ],
      },
      {
        type: 'RAAST',
        category: 'PAYMENT',
        name: 'Raast (SBP)',
        description: 'State Bank ki instant payment system',
        icon: '🏦',
        color: '#0d9488',
        docs: 'Apne bank se Raast merchant account lein',
        fields: [
          { key: 'merchantId', label: 'Raast Merchant ID', required: true },
          { key: 'apiKey', label: 'API Key', required: true },
        ],
      },
    ];
  }

  // ═══════════════════════════════════════════════════════════
  // TEST CONNECTION
  // ═══════════════════════════════════════════════════════════

  async testConnection(tenantId: string, integrationId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, tenantId },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    const credentials = (integration.credentials as any) ?? {};

    // Custom Website — sirf API key check
    if (integration.type === 'CUSTOM_WEBSITE') {
      return {
        success: true,
        message: 'Custom Website integration always ready. Apni website mein webhook URL use karein.',
        details: {
          apiKey: integration.apiKey?.slice(0, 8) + '...',
          webhookUrl: integration.webhookUrl,
        },
      };
    }

    // Foodpanda — client ID/secret check
    if (integration.type === 'FOODPANDA') {
      if (!credentials.clientId || !credentials.clientSecret) {
        return {
          success: false,
          message: 'Client ID aur Client Secret zaroori hain. Foodpanda Partner Portal se lo.',
          fixSteps: [
            '1. partner.foodpanda.com pe login karo',
            '2. Support ko email karo: partner-pk@foodpanda.com',
            '3. "API access chahiye for POS" bolo',
            '4. 3-7 din mein credentials milengi',
          ],
        };
      }
      try {
        const res = await fetch('https://partner-api.foodpanda.com/v1/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: credentials.clientId,
            client_secret: credentials.clientSecret,
          }),
        });
        const data: any = await res.json();
        if (data.access_token) {
          await this.prisma.integration.update({
            where: { id: integrationId },
            data: { status: 'CONNECTED', webhookVerified: true },
          });
          return { success: true, message: 'Foodpanda connection working!' };
        }
        return {
          success: false,
          message: 'Foodpanda ne credentials reject kar diya. Portal se dobara check karo.',
          error: data.error_description || 'Invalid credentials',
        };
      } catch (e: any) {
        return {
          success: false,
          message: 'Foodpanda API tak nahi pahuncha. Internet check karo.',
          error: e.message,
        };
      }
    }

    // Daraz — app key check + OAuth status
    if (integration.type === 'DARAZ') {
      if (!credentials.appKey || !credentials.appSecret) {
        return {
          success: false,
          message: 'App Key aur App Secret zaroori hain.',
          fixSteps: [
            '1. open.daraz.com pe developer account banao',
            '2. Create App → App Key + Secret milega',
            '3. Yahan enter karo → phir Authorize button dabao',
          ],
        };
      }
      if (!credentials.accessToken) {
        return {
          success: false,
          message: 'OAuth authorization pending. Detail modal mein "Authorize" button dabao.',
        };
      }
      return { success: true, message: 'Daraz credentials + OAuth ready!' };
    }

    // TCS / Leopards / PostEx — API key check
    if (['TCS_COURIER', 'LEOPARDS_COURIER', 'POSTEX'].includes(integration.type)) {
      if (!credentials.apiKey) {
        return {
          success: false,
          message: `${integration.type.replace('_', ' ')} ke liye API Key zaroori hai.`,
        };
      }
      return { success: true, message: `${integration.displayName} credentials configured. Actual booking pe verify hoga.` };
    }

    return { success: true, message: 'Integration configured. Ready to use.' };
  }

  // ═══════════════════════════════════════════════════════════
  // DEMO ORDER — testing ke liye fake order
  // ═══════════════════════════════════════════════════════════

  async createDemoOrder(tenantId: string, integrationId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, tenantId },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    const demoId = 'DEMO-' + Date.now();
    const demoData = {
      externalOrderId: demoId,
      externalOrderNumber: '#' + demoId.slice(-6),
      customerName: 'Test Customer (Demo)',
      customerPhone: '03001234567',
      customerEmail: 'demo@test.com',
      customerAddress: 'Demo Address, House 1, Street 1',
      customerCity: 'Lahore',
      items: [
        { name: 'Demo Product 1', sku: 'DEMO-001', quantity: 2, price: 500 },
        { name: 'Demo Product 2', sku: 'DEMO-002', quantity: 1, price: 1000 },
      ],
      subtotal: 2000,
      deliveryFee: 200,
      discount: 100,
      total: 2100,
      paymentMethod: 'CASH',
      paymentStatus: 'PENDING',
      orderStatus: 'PENDING',
      notes: 'This is a DEMO order for testing — remove after test',
      metadata: { demo: true, source: 'test-button' },
    };

    const channelOrder = await this.receiveChannelOrder(integrationId, demoData);
    return {
      success: true,
      message: 'Demo order banaya! Channel Orders tab mein dekho.',
      channelOrderId: channelOrder.id,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PRODUCT MAPPINGS
  // ═══════════════════════════════════════════════════════════

  async listProductMappings(tenantId: string, integrationId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, tenantId },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    return this.prisma.productChannelMapping.findMany({
      where: { integrationId },
      include: {
        // @ts-ignore — Prisma relation lookup
        product: { select: { id: true, name: true, sku: true, price: true } } as any,
      },
      orderBy: { lastSyncedAt: 'desc' },
    });
  }

  async upsertProductMapping(
    tenantId: string,
    integrationId: string,
    body: { productId: string; externalSku?: string; externalProductId?: string },
  ) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, tenantId },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    return this.prisma.productChannelMapping.upsert({
      where: { integrationId_linkKey: { integrationId: integrationId, linkKey: mappingKey(body.productId) } },
      create: { linkKey: mappingKey(body.productId),
        integrationId,
        productId: body.productId,
        externalSku: body.externalSku,
        externalProductId: body.externalProductId,
        syncStatus: 'SUCCESS',
        lastSyncedAt: new Date(),
      },
      update: {
        externalSku: body.externalSku,
        externalProductId: body.externalProductId,
        syncStatus: 'SUCCESS',
        lastSyncedAt: new Date(),
      },
    });
  }

  async deleteProductMapping(tenantId: string, integrationId: string, mappingId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, tenantId },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    await this.prisma.productChannelMapping.delete({ where: { id: mappingId } });
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // PRODUCT SYNC — Import from channel / Push to channel
  // ═══════════════════════════════════════════════════════════

  /**
   * IMPORT products FROM external channel (Foodpanda menu, Daraz catalog, etc.)
   * Custom Website: website pushes products via webhook (see receiveProductsFromWebhook)
   */
  async syncProducts(tenantId: string, integrationId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, tenantId },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    if (integration.type === 'CUSTOM_WEBSITE') {
      return {
        success: false,
        message: 'Custom Website ke liye product import nahi — website se products push karo (webhook POST /products)',
      };
    }

    // Log start
    await this.logSync({
      integrationId,
      operation: 'SYNC_PRODUCTS',
      direction: 'INBOUND',
      status: 'SYNCING',
    });

    try {
      let imported = 0;
      let updated = 0;
      let failed = 0;

      if (integration.type === 'FOODPANDA') {
        const result = await this.importFoodpandaProducts(integration);
        imported = result.imported;
        updated = result.updated;
        failed = result.failed;
      } else if (integration.type === 'DARAZ') {
        const result = await this.importDarazProducts(integration);
        imported = result.imported;
        updated = result.updated;
        failed = result.failed;
      }

      await this.prisma.integration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'SUCCESS',
          totalProductsSynced: { increment: imported + updated },
        },
      });

      await this.logSync({
        integrationId,
        operation: 'SYNC_PRODUCTS',
        direction: 'INBOUND',
        status: 'SUCCESS',
        recordsProcessed: imported + updated + failed,
        recordsSuccess: imported + updated,
        recordsFailed: failed,
        completedAt: new Date(),
      });

      return {
        success: true,
        message: `${imported} naye products, ${updated} update hue, ${failed} fail`,
        imported, updated, failed,
      };
    } catch (e: any) {
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: { lastSyncAt: new Date(), lastSyncStatus: 'FAILED' },
      });
      await this.logSync({
        integrationId,
        operation: 'SYNC_PRODUCTS',
        direction: 'INBOUND',
        status: 'FAILED',
        errorMessage: e.message,
        completedAt: new Date(),
      });
      throw e;
    }
  }

  // ─── Foodpanda menu import ───
  private async importFoodpandaProducts(integration: any) {
    const credentials = (integration.credentials as any) ?? {};
    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error('Foodpanda credentials missing');
    }

    // Get access token
    const tokenRes = await fetch('https://partner-api.foodpanda.com/v1/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      }),
    });
    const tokenData: any = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('Foodpanda auth failed');

    // Fetch menu
    const menuRes = await fetch(
      `https://partner-api.foodpanda.com/v1/vendors/${credentials.vendorId}/menu`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    );
    const menuData: any = await menuRes.json();
    const items = menuData.items ?? menuData.products ?? menuData.menu ?? [];

    return this.upsertProductsFromChannel(integration, items, (item: any) => ({
      name: item.name ?? item.product_name ?? 'Unknown',
      sku: item.sku ?? item.id ?? item.product_id,
      price: Number(item.price ?? item.unit_price ?? 0),
      costPrice: Number(item.cost ?? 0),
      description: item.description ?? '',
      images: item.images ?? item.image ? [item.image] : [],
      category: item.category ?? item.category_name,
      stock: Number(item.stock ?? item.quantity ?? 0),
      externalId: String(item.id ?? item.product_id ?? item.sku),
    }));
  }

  // ─── Daraz product import ───
  private async importDarazProducts(integration: any) {
    const credentials = (integration.credentials as any) ?? {};
    if (!credentials.accessToken) throw new Error('Daraz OAuth nahi hua — Authorize button dabao');

    const baseUrl = 'https://api.lazada.com.my/rest';
    const params = new URLSearchParams({
      app_key: credentials.appKey,
      access_token: credentials.accessToken,
      sign_method: 'sha256',
      timestamp: String(Date.now()),
      limit: '100',
      offset: '0',
    });

    const crypto = await import('crypto');
    const concat = `/rest${params.toString().split('&').sort().join('&')}`;
    const sign = crypto.createHmac('sha256', credentials.appSecret).update(concat).digest('hex').toUpperCase();

    const res = await fetch(`${baseUrl}/products/get?${params}&sign=${sign}`);
    const data: any = await res.json();
    const items = data.data?.products ?? data.products ?? [];

    return this.upsertProductsFromChannel(integration, items, (item: any) => ({
      name: item.name ?? item.item_name ?? 'Unknown',
      sku: item.sku ?? item.seller_sku ?? item.item_id,
      price: Number(item.price ?? item.special_price ?? 0),
      costPrice: 0,
      description: item.description ?? '',
      images: item.images ? (Array.isArray(item.images) ? item.images : [item.images]) : [],
      category: item.primary_category ?? '',
      stock: Number(item.quantity ?? 0),
      externalId: String(item.item_id ?? item.sku),
    }));
  }

  // ─── Common upsert logic ───
  private async upsertProductsFromChannel(
    integration: any,
    items: any[],
    mapper: (item: any) => any,
  ) {
    let imported = 0;
    let updated = 0;
    let failed = 0;

    for (const raw of items) {
      try {
        const data = mapper(raw);
        if (!data.name || data.name === 'Unknown') { failed++; continue; }

        // Check existing mapping
        let mapping = await this.prisma.productChannelMapping.findFirst({
          where: {
            integrationId: integration.id,
            OR: [
              { externalSku: data.sku },
              { externalProductId: data.externalId },
            ],
          },
        });

        if (mapping) {
          // Update existing product
          await this.prisma.product.update({
            where: { id: mapping.productId },
            data: {
              name: data.name,
              price: data.price,
              costPrice: data.costPrice || undefined,
              description: data.description || undefined,
            },
          });
          await this.prisma.productChannelMapping.update({
            where: { id: mapping.id },
            data: { syncStatus: 'SUCCESS', lastSyncedAt: new Date() },
          });
          updated++;
        } else {
          // Check by SKU in products table
          let product = data.sku
            ? await this.prisma.product.findFirst({ where: { tenantId: integration.tenantId, sku: data.sku } })
            : null;

          if (!product) {
            // Create new product
            product = await this.prisma.product.create({
              data: {
                tenantId: integration.tenantId,
                name: data.name,
                sku: data.sku || `IMP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                price: data.price,
                costPrice: data.costPrice || data.price * 0.7,
                stock: data.stock,
                description: data.description || `Imported from ${integration.displayName}`,
                isActive: true,
              },
            });

            // Add images if any
            if (data.images?.length > 0) {
              for (let i = 0; i < Math.min(data.images.length, 5); i++) {
                await this.prisma.productImage.create({
                  data: { productId: product.id, url: data.images[i], sortOrder: i },
                }).catch(() => null);
              }
            }
            imported++;
          } else {
            updated++;
          }

          // Create mapping
          await this.prisma.productChannelMapping.create({
            data: {
              integrationId: integration.id,
              productId: product.id,
              linkKey: mappingKey(product.id),
              externalProductId: data.externalId,
              externalSku: data.sku,
              syncStatus: 'SUCCESS',
              lastSyncedAt: new Date(),
            },
          }).catch(() => null);
        }
      } catch (e) {
        failed++;
      }
    }

    return { imported, updated, failed };
  }

  // ═══════════════════════════════════════════════════════════
  // RECEIVE PRODUCTS FROM CUSTOM WEBSITE (webhook)
  // ═══════════════════════════════════════════════════════════

  async receiveProductsFromWebhook(integrationId: string, products: any[]) {
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    let imported = 0;
    let updated = 0;
    let failed = 0;

    for (const p of products) {
      try {
        const name = p.name ?? p.productName ?? p.title;
        if (!name) { failed++; continue; }

        const sku = p.sku ?? p.id ?? p.productId;
        const price = Number(p.price ?? p.amount ?? 0);
        const costPrice = Number(p.cost ?? p.costPrice ?? price * 0.7);
        const stock = Number(p.stock ?? p.quantity ?? p.inventory ?? 0);
        const description = p.description ?? p.desc ?? '';
        const images = p.images ?? p.image ? (Array.isArray(p.image) ? p.image : [p.image]) : [];
        const category = p.category ?? p.categoryName;

        // Check mapping
        let mapping = await this.prisma.productChannelMapping.findFirst({
          where: {
            integrationId,
            OR: [{ externalSku: sku }, { externalProductId: String(p.id ?? sku) }],
          },
        });

        if (mapping) {
          await this.prisma.product.update({
            where: { id: mapping.productId },
            data: { name, price, costPrice, description: description || undefined, stock: stock || undefined },
          });
          await this.prisma.productChannelMapping.update({
            where: { id: mapping.id },
            data: { syncStatus: 'SUCCESS', lastSyncedAt: new Date() },
          });
          updated++;
        } else {
          let product = sku
            ? await this.prisma.product.findFirst({ where: { tenantId: integration.tenantId, sku } })
            : null;

          if (!product) {
            product = await this.prisma.product.create({
              data: {
                tenantId: integration.tenantId,
                name,
                sku: sku || `WEB-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                price,
                costPrice,
                stock,
                description: description || `Imported from ${integration.displayName}`,
                isActive: true,
              },
            });

            if (images.length > 0) {
              for (let i = 0; i < Math.min(images.length, 5); i++) {
                await this.prisma.productImage.create({
                  data: { productId: product.id, url: images[i], sortOrder: i },
                }).catch(() => null);
              }
            }
            imported++;
          } else {
            updated++;
          }

          await this.prisma.productChannelMapping.create({
            data: {
              integrationId,
              productId: product.id,
              linkKey: mappingKey(product.id),
              externalProductId: String(p.id ?? sku),
              externalSku: sku,
              syncStatus: 'SUCCESS',
              lastSyncedAt: new Date(),
            },
          }).catch(() => null);
        }
      } catch (e) {
        failed++;
      }
    }

    await this.prisma.integration.update({
      where: { id: integrationId },
      data: { totalProductsSynced: { increment: imported + updated } },
    });

    this.logger.log(`📥 Products imported: ${imported} new, ${updated} updated, ${failed} failed from ${integration.type}`);
    return { success: true, imported, updated, failed, total: products.length };
  }

  // ═══════════════════════════════════════════════════════════
  // PUSH single product TO channel (Nafaa → Foodpanda/Daraz)
  // ═══════════════════════════════════════════════════════════

  async pushProductToChannel(tenantId: string, integrationId: string, productId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id: integrationId, tenantId },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      include: { images: true, category: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (integration.type === 'DARAZ') {
      return this.pushProductToDaraz(integration, product);
    }
    if (integration.type === 'FOODPANDA') {
      return this.pushProductToFoodpanda(integration, product);
    }

    return { success: false, message: `Push not supported for ${integration.type}` };
  }

  private async pushProductToDaraz(integration: any, product: any) {
    const credentials = (integration.credentials as any) ?? {};
    if (!credentials.accessToken) throw new Error('Daraz OAuth required');

    const baseUrl = 'https://api.lazada.com.my/rest';
    const crypto = await import('crypto');

    const payload = JSON.stringify({
      products: [{
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
        quantity: product.stock ?? 0,
        description: product.description ?? '',
        images: product.images?.map((i: any) => i.url) ?? [],
        category: product.category?.name ?? '',
      }],
    });

    const params = new URLSearchParams({
      app_key: credentials.appKey,
      access_token: credentials.accessToken,
      sign_method: 'sha256',
      timestamp: String(Date.now()),
      payload,
    });

    const concat = `/rest${params.toString().split('&').sort().join('&')}`;
    const sign = crypto.createHmac('sha256', credentials.appSecret).update(concat).digest('hex').toUpperCase();

    const res = await fetch(`${baseUrl}/product/create?${params}&sign=${sign}`, { method: 'POST' });
    const data: any = await res.json();

    if (data.code === '0' || data.success) {
      const externalId = data.data?.product_id ?? String(data.data?.itemId);
      await this.prisma.productChannelMapping.upsert({
        where: { integrationId_linkKey: { integrationId: integration.id, linkKey: mappingKey(product.id) } },
        create: { linkKey: mappingKey(product.id),
          integrationId: integration.id,
          productId: product.id,
          externalProductId: externalId,
          externalSku: product.sku,
          syncStatus: 'SUCCESS',
          lastSyncedAt: new Date(),
        },
        update: { externalProductId: externalId, syncStatus: 'SUCCESS', lastSyncedAt: new Date() },
      });
      return { success: true, message: 'Daraz pe product push ho gaya!', externalId };
    }
    throw new Error('Daraz push failed: ' + JSON.stringify(data));
  }

  private async pushProductToFoodpanda(integration: any, product: any) {
    const credentials = (integration.credentials as any) ?? {};
    if (!credentials.clientId) throw new Error('Foodpanda credentials required');

    const tokenRes = await fetch('https://partner-api.foodpanda.com/v1/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      }),
    });
    const tokenData: any = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('Foodpanda auth failed');

    const payload = {
      name: product.name,
      sku: product.sku,
      price: Number(product.price),
      description: product.description ?? '',
      image: product.images?.[0]?.url ?? '',
      is_active: product.isActive,
    };

    const res = await fetch(
      `https://partner-api.foodpanda.com/v1/vendors/${credentials.vendorId}/menu/items`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenData.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    const data: any = await res.json();

    if (data.id || data.success) {
      const externalId = String(data.id ?? data.item_id);
      await this.prisma.productChannelMapping.upsert({
        where: { integrationId_linkKey: { integrationId: integration.id, linkKey: mappingKey(product.id) } },
        create: { linkKey: mappingKey(product.id),
          integrationId: integration.id,
          productId: product.id,
          externalProductId: externalId,
          externalSku: product.sku,
          syncStatus: 'SUCCESS',
          lastSyncedAt: new Date(),
        },
        update: { externalProductId: externalId, syncStatus: 'SUCCESS', lastSyncedAt: new Date() },
      });
      return { success: true, message: 'Foodpanda pe product push ho gaya!', externalId };
    }
    throw new Error('Foodpanda push failed: ' + JSON.stringify(data));
  }
}
