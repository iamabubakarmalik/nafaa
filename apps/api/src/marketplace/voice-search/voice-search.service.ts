import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface Intent { action: string; keywords: string[]; quantity?: number; unit?: string; }

@Injectable()
export class VoiceSearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Simple NLU: extract search keywords + quantity from Urdu/English/Roman-Urdu voice transcript.
   * For production, plug in Google Speech-to-Text + custom NER.
   */
  parseIntent(transcript: string, language = 'ur'): Intent {
    const t = transcript.toLowerCase().trim();

    // Detect quantity + unit (Urdu/English)
    const qtyMatch = t.match(/(\d+)\s*(kilo|kg|litre|liter|dozen|piece|pcs|adad|pav|sair)/i);
    const quantity = qtyMatch ? parseInt(qtyMatch[1]) : undefined;
    const unit = qtyMatch ? qtyMatch[2] : undefined;

    // Strip filler words
    const fillers = ['mujhe', 'chahiye', 'chahye', 'lena', 'lena hai', 'hai', 'wala', 'wali', 'ka', 'ki', 'ke', 'do', 'de', 'give', 'i want', 'looking for', 'need'];
    let clean = t;
    fillers.forEach((f) => { clean = clean.replace(new RegExp(`\\b${f}\\b`, 'gi'), ''); });
    clean = clean.replace(qtyMatch?.[0] ?? '', '').trim();

    const keywords = clean.split(/\s+/).filter((w) => w.length > 1);
    return { action: 'SEARCH', keywords, quantity, unit };
  }

  async search(dto: {
    transcript: string;
    language?: string;
    customerId?: string;
    audioUrl?: string;
    durationMs?: number;
  }) {
    const intent = this.parseIntent(dto.transcript, dto.language ?? 'ur');
    const query = intent.keywords.join(' ');

    // Search products by name across marketplace
    const products = await this.prisma.productMarketplaceProfile.findMany({
      where: {
        isListedOnMarketplace: true,
        isAvailable: true,
        OR: intent.keywords.map((k) => ({
          publicName: { contains: k, mode: 'insensitive' as const },
        })),
      },
      take: 20,
      orderBy: [{ totalSold: 'desc' }, { ratingAverage: 'desc' }],
      select: {
        productId: true, publicName: true, publicPrice: true, publicImages: true,
        ratingAverage: true, ratingCount: true, totalSold: true, shopId: true,
      },
    });

    // Log
    await this.prisma.voiceSearchLog.create({
      data: {
        customerId: dto.customerId,
        audioUrl: dto.audioUrl,
        transcript: dto.transcript,
        language: dto.language ?? 'ur',
        detectedIntent: JSON.stringify(intent),
        resultCount: products.length,
        durationMs: dto.durationMs,
      },
    });

    return {
      transcript: dto.transcript,
      parsedQuery: query,
      quantity: intent.quantity,
      unit: intent.unit,
      products,
      count: products.length,
    };
  }

  async logClick(customerId: string | undefined, productId: string, logId?: string) {
    if (!logId) return;
    return this.prisma.voiceSearchLog.updateMany({
      where: { id: logId, customerId },
      data: { clickedResult: productId },
    });
  }
}
