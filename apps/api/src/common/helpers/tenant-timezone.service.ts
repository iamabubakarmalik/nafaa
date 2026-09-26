import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_TZ } from './business-time.helper';

/* ═════════════════════════════════════════════════════════════
   HAR DUKAAN KA APNA WAQT
   ─────────────────────────────────────────────────────────────
   Pehle hisaab server ke waqt par hota tha (Railway par UTC), phir
   maine usay `Asia/Karachi` par bandh diya. Dono ghalat thay, bas
   alag alag jagah par:

     • Server UTC par  → Pakistan me din subah 5 baje shuru hota tha
     • Karachi par     → Tehran me raat 10:30 baje shuru ho jata,
                         aur Stockholm me poori 3 ghante ka farq

   Nafaa sirf Pakistan me nahi chalta. Is liye waqt ab dukaan ka
   apna hai — `TenantSettings.timezone`, jo DB me pehle se mojood
   hai (default `Asia/Karachi`).

   Timezone har request par badalta nahi, is liye yaad rakh lete
   hain: warna dashboard ki har chhoti query se pehle ek aur query
   chalti, sirf ye poochne ke liye ke "ye dukaan kis mulk me hai".
   ═════════════════════════════════════════════════════════════ */

/** Kitni der yaad rakhein — settings me timezone kabhi kabhaar hi badalta hai. */
const CACHE_TTL_MS = 10 * 60_000;

interface CacheEntry {
  tz: string;
  at: number;
}

@Injectable()
export class TenantTimezoneService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Is tenant ki dukaan kis waqt par chalti hai.
   *
   * Settings na mile, timezone khali ho, ya koi ghalat naam para ho
   * to default par chale jate hain — dashboard ka khali ho jana is
   * se kahin bura hota.
   */
  async resolve(tenantId: string): Promise<string> {
    const hit = this.cache.get(tenantId);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.tz;

    let tz = DEFAULT_TZ;
    try {
      const settings = await this.prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { timezone: true },
      });
      if (settings?.timezone && isValidTimeZone(settings.timezone)) {
        tz = settings.timezone;
      }
    } catch {
      // DB tak na pohnch sakein to bhi report banni chahiye
    }

    this.cache.set(tenantId, { tz, at: Date.now() });
    return tz;
  }

  /** Settings me timezone badle to yaad kiya hua fauran bhool jayein. */
  forget(tenantId: string) {
    this.cache.delete(tenantId);
  }
}

/**
 * Naam asli hai ya nahi.
 *
 * Settings ka khana koi bhi string qubool kar leta hai. "PKT" ya
 * "GMT+5" jaisi cheez `Intl` ko di jaye to wo phenk deti hai, aur
 * poora dashboard 500 de kar khatam ho jata hai. Ek dafa yahan
 * parakh lete hain.
 */
function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
