import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PERMISSIONS, hasPermission } from '../constants/permissions.constants';

/* ═════════════════════════════════════════════════════════════
   LAGAT AUR MUNAFA — JAWAB SE HI NIKAAL DO
   ─────────────────────────────────────────────────────────────
   Pehle ye sirf screen par chhupta tha. Us ka matlab ye tha ke
   number phir bhi browser tak pohnchta — koi bhi F12 dabaye ya
   seedha API khole to kharid ka bhao saamne. Dukaan-daar ke liye
   yehi sab se hassas cheez hai.

   Ab jis ke paas `cost.view` nahi, us ke jawab me ye khane aate hi
   nahi. Malik aur manager (jinhe malik ijazat de) ko sab jyun ka
   tyun milta hai.

   EHTIYAT: sirf naam se pehchante hain, is liye list soch samajh
   kar chhoti rakhi hai. `price`, `total`, `unitPrice` jaise khane
   kabhi nahi chhuते — wo bikri ka bhao hain aur counter wale ko
   chahiye hi.
   ═════════════════════════════════════════════════════════════ */

/** Jo khane lagat ya munafa batate hain */
const MASKED_KEYS = new Set([
  'costprice', 'costofgoods', 'cogs', 'cost',
  'purchaseprice', 'buyingprice', 'lastpurchaseprice', 'avgcost',
  'profit', 'grossprofit', 'netprofit', 'profitmargin', 'margin',
  'potentialprofit', 'estimatedprofit',
  'grossprofittoday', 'netprofittoday', 'grossprofitmonth', 'netprofitmonth',
  'monthcogs', 'todaygross', 'todaynet', 'monthgross', 'monthnet',
  'monthmarginpct', 'valueatcost', 'stockcost', 'totalstockvalue',
  'totalpotentialprofit', 'inventoryvalueatcost', 'stockvalue',
]);

/**
 * Kitna gehra jayein.
 *
 * Jawab pehle `{ data: ... }` me lipat jata hai, aur bill → items →
 * product → category jaisi zanjeer bhi lambi hoti hai. Hadd kam
 * rakhein to gehre khane bach jate hain — isi liye 12.
 */
const MAX_DEPTH = 12;

function strip(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((v) => strip(v, depth + 1));
  }

  /* Date, Buffer waghera ko haath nahi lagate */
  if (value instanceof Date || Buffer.isBuffer(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (MASKED_KEYS.has(k.toLowerCase())) continue;
    out[k] = strip(v, depth + 1);
  }
  return out;
}

@Injectable()
export class CostMaskingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const user = context.switchToHttp().getRequest()?.user;

    /* Login se pehle, ya ijazat wale bande — kuch nahi badalta */
    if (!user) return next.handle();
    if (hasPermission(user.role, user.permissions, PERMISSIONS.COST_VIEW)) {
      return next.handle();
    }

    return next.handle().pipe(map((body) => strip(body)));
  }
}
