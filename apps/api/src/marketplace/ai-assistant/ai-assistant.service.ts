import { Injectable } from '@nestjs/common';
import { AiConversationType, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

interface ParsedIntent {
  occasion?: string;
  gender?: string;
  ageGroup?: string;
  budget?: { min?: number; max?: number };
  categories: string[];
  keywords: string[];
  urgency?: 'immediate' | 'this_week' | 'this_month';
}

@Injectable()
export class AiAssistantService {
  constructor(private readonly prisma: PrismaService) {}

  parseIntent(text: string): ParsedIntent {
    const t = text.toLowerCase();
    const intent: ParsedIntent = { categories: [], keywords: [] };

    // Occasion detection (Urdu + English)
    const occasions: Record<string, string> = {
      shaadi: 'wedding', 'wedding': 'wedding', shadi: 'wedding',
      mangni: 'engagement', engagement: 'engagement',
      birthday: 'birthday', 'saal girah': 'birthday',
      eid: 'eid', 'eid ul fitr': 'eid', 'eid ul adha': 'eid',
      ramzan: 'ramzan', ramadan: 'ramzan',
      party: 'party',
      valima: 'wedding', mehndi: 'wedding',
      graduation: 'graduation',
      'baby shower': 'baby_shower',
      gift: 'gift', tohfa: 'gift',
    };
    for (const [key, val] of Object.entries(occasions)) {
      if (t.includes(key)) { intent.occasion = val; break; }
    }

    // Gender
    if (/\b(bhai|mard|husband|shohar|father|baba|boy|men|male)\b/.test(t)) intent.gender = 'male';
    if (/\b(behn|behan|larki|biwi|wife|mother|ammi|girl|women|female)\b/.test(t)) intent.gender = 'female';
    if (/\b(baby|bacha|bachi|kid|child)\b/.test(t)) intent.gender = 'kids';

    // Budget
    const budgetMatch = t.match(/(?:budget|price|price\s*range|paisa|rupees|pkr|rs\.?)\s*(?:tak|under|below)?\s*(\d+)/i);
    if (budgetMatch) intent.budget = { max: parseInt(budgetMatch[1]) };
    const rangeMatch = t.match(/(\d+)\s*(?:to|se|-)\s*(\d+)/);
    if (rangeMatch) intent.budget = { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) };

    // Categories
    const catMap: Record<string, string[]> = {
      clothes: ['kapre', 'suit', 'shirt', 'dress', 'lehenga', 'kurta'],
      jewelry: ['jewelry', 'zewer', 'gold', 'sona', 'ring', 'earring'],
      shoes: ['shoes', 'jutey', 'sandal', 'khussa'],
      makeup: ['makeup', 'lipstick', 'foundation', 'cosmetic'],
      electronics: ['mobile', 'laptop', 'tv', 'ac', 'phone', 'fridge'],
      food: ['khana', 'food', 'sweet', 'mithai', 'cake'],
      home: ['furniture', 'sofa', 'bed', 'ghar'],
      grocery: ['grocery', 'atta', 'chawal', 'rashan'],
    };
    for (const [cat, kws] of Object.entries(catMap)) {
      if (kws.some((k) => t.includes(k))) intent.categories.push(cat);
    }

    // Urgency
    if (/\b(aaj|today|urgent|abhi|asap)\b/.test(t)) intent.urgency = 'immediate';
    else if (/\b(hafta|week|kal)\b/.test(t)) intent.urgency = 'this_week';
    else if (/\b(mahina|month)\b/.test(t)) intent.urgency = 'this_month';

    // Keywords (strip fillers)
    const fillers = ['ka', 'ki', 'ke', 'ko', 'main', 'mera', 'meri', 'is', 'hai', 'gift', 'chahiye', 'suggest', 'karo', 'tell', 'me'];
    intent.keywords = t.split(/\s+/).filter((w) => w.length > 2 && !fillers.includes(w));

    return intent;
  }

  async startConversation(customerId: string | undefined, initialQuery: string, language = 'ur') {
    const sessionId = randomBytes(16).toString('hex');
    const intent = this.parseIntent(initialQuery);

    const type: AiConversationType = intent.occasion
      ? 'OCCASION_SHOPPING'
      : intent.categories.length > 0
        ? 'PRODUCT_SEARCH'
        : 'GENERAL_QUERY';

    const conversation = await this.prisma.aiConversation.create({
      data: {
        customerId,
        sessionId,
        type,
        language,
        occasion: intent.occasion,
        budget: intent.budget?.max,
        intent: intent as unknown as Prisma.InputJsonValue,
        totalMessages: 1,
      },
    });

    // Store user's first message
    await this.prisma.aiConversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: initialQuery,
      },
    });

    // Generate suggestions + AI response
    const { products, response } = await this.generateResponse(intent, language);

    await this.prisma.aiConversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: response,
        productIds: products.map((p) => p.productId),
      },
    });

    await this.prisma.aiConversation.update({
      where: { id: conversation.id },
      data: {
        suggestedProducts: products.map((p) => p.productId),
        totalMessages: 2,
      },
    });

    return { conversation, response, products };
  }

  private async generateResponse(intent: ParsedIntent, language: string) {
    // Build product search based on intent
    const where: Prisma.ProductMarketplaceProfileWhereInput = {
      isListedOnMarketplace: true,
      isAvailable: true,
    };

    if (intent.budget?.max) {
      where.publicPrice = { lte: intent.budget.max };
    }
    if (intent.budget?.min) {
      where.publicPrice = { ...(where.publicPrice as object), gte: intent.budget.min };
    }

    if (intent.categories.length > 0) {
      where.OR = intent.categories.map((c) => ({
        marketplaceCategory: { contains: c, mode: 'insensitive' as const },
      }));
    } else if (intent.keywords.length > 0) {
      where.OR = intent.keywords.slice(0, 3).map((k) => ({
        publicName: { contains: k, mode: 'insensitive' as const },
      }));
    }

    const products = await this.prisma.productMarketplaceProfile.findMany({
      where,
      orderBy: [{ ratingAverage: 'desc' }, { totalSold: 'desc' }],
      take: 8,
      select: {
        productId: true, publicName: true, publicPrice: true,
        publicImages: true, ratingAverage: true, ratingCount: true, shopId: true,
      },
    });

    // Generate response text
    let response = '';
    if (language === 'ur' || language === 'roman_ur') {
      if (intent.occasion) {
        const occasionMap: Record<string, string> = {
          wedding: 'shaadi', engagement: 'mangni', birthday: 'saal girah',
          eid: 'Eid', gift: 'tohfa', party: 'party',
        };
        response = `Aap ki ${occasionMap[intent.occasion] ?? intent.occasion} ke liye ye best options hain:\n\n`;
      } else if (intent.categories.length > 0) {
        response = `${intent.categories.join(', ')} category mein ye best products hain:\n\n`;
      } else {
        response = `Ye products aap ki search ke matchi hain:\n\n`;
      }

      products.forEach((p, i) => {
        response += `${i + 1}. ${p.publicName} — PKR ${Number(p.publicPrice).toFixed(0)}`;
        if (p.ratingCount > 0) response += ` (⭐ ${p.ratingAverage.toFixed(1)}/${p.ratingCount})`;
        response += '\n';
      });

      if (intent.budget?.max) {
        response += `\n💰 Aap ka budget: PKR ${intent.budget.max}\n`;
      }
      response += `\nKisi bhi product pe click karain to detail dekhen. Aur zyada options chahiye?`;
    } else {
      response = `Here are the best options for your search:\n\n`;
      products.forEach((p, i) => {
        response += `${i + 1}. ${p.publicName} — PKR ${Number(p.publicPrice).toFixed(0)}\n`;
      });
    }

    return { products, response };
  }

  async continueConversation(sessionId: string, message: string) {
    const conversation = await this.prisma.aiConversation.findUnique({
      where: { sessionId },
    });
    if (!conversation) return null;

    // Merge intent with previous
    const newIntent = this.parseIntent(message);
    const oldIntent = (conversation.intent as unknown as ParsedIntent) ?? { categories: [], keywords: [] };
    const merged: ParsedIntent = {
      ...oldIntent,
      ...newIntent,
      categories: [...new Set([...oldIntent.categories, ...newIntent.categories])],
      keywords: [...new Set([...oldIntent.keywords, ...newIntent.keywords])],
    };

    await this.prisma.aiConversationMessage.create({
      data: { conversationId: conversation.id, role: 'USER', content: message },
    });

    const { products, response } = await this.generateResponse(merged, conversation.language);

    await this.prisma.aiConversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: response,
        productIds: products.map((p) => p.productId),
      },
    });

    await this.prisma.aiConversation.update({
      where: { id: conversation.id },
      data: {
        intent: merged as unknown as Prisma.InputJsonValue,
        suggestedProducts: { push: products.map((p) => p.productId) },
        totalMessages: { increment: 2 },
      },
    });

    return { response, products };
  }

  async getConversation(sessionId: string) {
    return this.prisma.aiConversation.findUnique({
      where: { sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async generateRecommendations(customerId: string) {
    // Based on order history, viewed products, and wishlist
    const [orders, views, wishlist] = await Promise.all([
      this.prisma.marketplaceOrder.findMany({
        where: { customerId, status: 'DELIVERED' },
        include: { items: { select: { productId: true } } },
        take: 20,
      }),
      this.prisma.productView.findMany({
        where: { customerId },
        select: { productId: true },
        take: 50,
      }),
      this.prisma.wishlistItem.findMany({
        where: { customerId },
        select: { productId: true },
      }),
    ]);

    const purchasedIds = new Set(orders.flatMap((o) => o.items.map((i) => i.productId)));
    const viewedIds = new Set(views.map((v) => v.productId));
    const wishlistIds = new Set(wishlist.map((w) => w.productId));
    const seenIds = new Set([...purchasedIds, ...viewedIds, ...wishlistIds]);

    // Find similar products (by category)
    const purchasedProducts = purchasedIds.size > 0
      ? await this.prisma.productMarketplaceProfile.findMany({
          where: { productId: { in: [...purchasedIds] } },
          select: { marketplaceCategory: true },
        })
      : [];
    const categories = [...new Set(purchasedProducts.map((p) => p.marketplaceCategory).filter(Boolean))];

    const recommendations = await this.prisma.productMarketplaceProfile.findMany({
      where: {
        isListedOnMarketplace: true, isAvailable: true,
        productId: { notIn: [...seenIds] },
        marketplaceCategory: { in: categories as string[] },
      },
      orderBy: [{ ratingAverage: 'desc' }, { totalSold: 'desc' }],
      take: 20,
    });

    // Store recommendations
    const expiresAt = new Date(Date.now() + 7 * 86400000);
    for (const rec of recommendations) {
      await this.prisma.aiRecommendation.upsert({
        where: {
          customerId_productId: { customerId, productId: rec.productId },
        },
        create: {
          customerId,
          productId: rec.productId,
          score: rec.ratingAverage * (rec.ratingCount + 1),
          reason: `Similar to what you've bought before in ${rec.marketplaceCategory}`,
          category: rec.marketplaceCategory,
          expiresAt,
        },
        update: {
          score: rec.ratingAverage * (rec.ratingCount + 1),
          expiresAt,
        },
      });
    }
    return recommendations;
  }

  async getRecommendations(customerId: string, limit = 20) {
    return this.prisma.aiRecommendation.findMany({
      where: {
        customerId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { score: 'desc' },
      take: limit,
    });
  }

  async trackAction(customerId: string, productId: string, action: 'viewed' | 'clicked' | 'purchased') {
    return this.prisma.aiRecommendation.updateMany({
      where: { customerId, productId },
      data: {
        isViewed: action === 'viewed' ? true : undefined,
        isClicked: action === 'clicked' ? true : undefined,
        isPurchased: action === 'purchased' ? true : undefined,
      },
    });
  }
}
