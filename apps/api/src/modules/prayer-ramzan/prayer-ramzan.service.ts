import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const NISAB_GOLD_GRAMS = 87.48;
const ZAKAT_RATE = 0.025;

@Injectable()
export class PrayerRamzanService {
  constructor(private readonly prisma: PrismaService) {}

  async getPrayerTimes(city: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    let schedule = await this.prisma.prayerSchedule.findFirst({
      where: { city: city.toLowerCase(), date: targetDate },
    });

    if (!schedule) {
      // Fetch from Aladhan API if not cached
      const dateStr = `${String(targetDate.getDate()).padStart(2, '0')}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${targetDate.getFullYear()}`;
      try {
        const res = await fetch(`https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${city}&country=Pakistan&method=1`);
        const data: any = await res.json();
        if (data.code === 200 && data.data) {
          const t = data.data.timings;
          const hijri = data.data.date.hijri;
          const monthNumber = parseInt(hijri.month.number);
          schedule = await this.prisma.prayerSchedule.create({
            data: {
              city: city.toLowerCase(),
              date: targetDate,
              fajr: t.Fajr, sunrise: t.Sunrise, dhuhr: t.Dhuhr,
              asr: t.Asr, maghrib: t.Maghrib, isha: t.Isha,
              hijriDate: `${hijri.day} ${hijri.month.en} ${hijri.year}`,
              isRamzan: monthNumber === 9,
            },
          });
        }
      } catch (e) {
        return null;
      }
    }
    return schedule;
  }

  async configureShop(shopId: string, dto: {
    enablePrayerMode?: boolean;
    pauseDuringPrayer?: boolean;
    pauseMinutesBefore?: number;
    pauseMinutesAfter?: number;
    enabledPrayers?: string[];
    ramzanModeActive?: boolean;
    sehriDeliveryEnabled?: boolean;
    sehriDeliverySlots?: any;
    iftarBoostEnabled?: boolean;
    jummahMode?: boolean;
  }) {
    return this.prisma.shopPrayerConfig.upsert({
      where: { shopId },
      create: { shopId, ...dto },
      update: dto,
    });
  }

  async getShopConfig(shopId: string) {
    return this.prisma.shopPrayerConfig.findUnique({ where: { shopId } });
  }

  async isShopPausedNow(shopId: string, city: string): Promise<{ paused: boolean; reason?: string; resumesAt?: Date }> {
    const config = await this.getShopConfig(shopId);
    if (!config || !config.enablePrayerMode) return { paused: false };

    const schedule = await this.getPrayerTimes(city);
    if (!schedule) return { paused: false };

    const now = new Date();
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const prayerTimes: Array<[string, string]> = [
      ['FAJR', schedule.fajr],
      ['DHUHR', schedule.dhuhr],
      ['ASR', schedule.asr],
      ['MAGHRIB', schedule.maghrib],
      ['ISHA', schedule.isha],
    ];

    for (const [name, timeStr] of prayerTimes) {
      if (!config.enabledPrayers.includes(name)) continue;
      const [h, m] = timeStr.split(':').map(Number);
      const prayerTime = new Date(today);
      prayerTime.setHours(h, m, 0, 0);
      const pauseFrom = new Date(prayerTime.getTime() - config.pauseMinutesBefore * 60000);
      const pauseTo = new Date(prayerTime.getTime() + config.pauseMinutesAfter * 60000);

      if (now >= pauseFrom && now <= pauseTo) {
        return { paused: true, reason: `${name} time`, resumesAt: pauseTo };
      }
    }

    // Jummah check
    if (config.jummahMode && now.getDay() === 5 && config.jummahPauseFrom && config.jummahPauseTo) {
      const [h1, m1] = config.jummahPauseFrom.split(':').map(Number);
      const [h2, m2] = config.jummahPauseTo.split(':').map(Number);
      const from = new Date(today); from.setHours(h1, m1);
      const to = new Date(today); to.setHours(h2, m2);
      if (now >= from && now <= to) {
        return { paused: true, reason: 'Jummah', resumesAt: to };
      }
    }

    return { paused: false };
  }

  async calculateZakat(customerId: string, dto: {
    cashAmount?: number;
    goldGrams?: number;
    silverGrams?: number;
    investments?: number;
    business?: number;
    otherAssets?: number;
    liabilities?: number;
    goldRatePerGram: number;
  }) {
    const cash = dto.cashAmount ?? 0;
    const goldValue = (dto.goldGrams ?? 0) * dto.goldRatePerGram;
    const silverValue = (dto.silverGrams ?? 0) * (dto.goldRatePerGram * 0.014);
    const totalAssets = cash + goldValue + silverValue
      + (dto.investments ?? 0) + (dto.business ?? 0) + (dto.otherAssets ?? 0);
    const netWealth = totalAssets - (dto.liabilities ?? 0);

    const nisabThreshold = NISAB_GOLD_GRAMS * dto.goldRatePerGram;
    const isNisabMet = netWealth >= nisabThreshold;
    const zakatDue = isNisabMet ? netWealth * ZAKAT_RATE : 0;

    return this.prisma.zakatCalculation.create({
      data: {
        customerId,
        cashAmount: cash,
        goldGrams: dto.goldGrams ?? 0,
        silverGrams: dto.silverGrams ?? 0,
        investments: dto.investments ?? 0,
        business: dto.business ?? 0,
        otherAssets: dto.otherAssets ?? 0,
        liabilities: dto.liabilities ?? 0,
        nisabThreshold,
        zakatDue,
        goldRatePerGram: dto.goldRatePerGram,
        isNisabMet,
      },
    });
  }

  async myZakatHistory(customerId: string) {
    return this.prisma.zakatCalculation.findMany({
      where: { customerId },
      orderBy: { calculatedAt: 'desc' },
      take: 12,
    });
  }
}
