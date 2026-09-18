/* ═════════════════════════════════════════════════════════════
   WHATSAPP KE TAYYAR PAIGHAAM
   ─────────────────────────────────────────────────────────────
   Pehle WhatsApp ka sirf ek on/off switch tha jo "WhatsApp
   Business API" maangta tha — aam dukaan-daar ke paas wo hoti hi
   nahi, is liye feature kisi kaam ka nahi tha.

   Halanke `wa.me` link ke liye koi API chahiye hi nahi: link par
   click karte hi phone ka WhatsApp khul jata hai aur paighaam
   pehle se likha hua milta hai — bas "Send" dabana hai.

   Paighaam malik apne alfaaz me likhta hai. Andar {{customer}}
   jaise khane bhar diye jate hain.
   ═════════════════════════════════════════════════════════════ */

export type TemplateKey = 'receipt' | 'udhaar' | 'shukriya' | 'yaad_dihani';

export interface TemplateMeta {
  key: TemplateKey;
  label: string;
  hint: string;
  emoji: string;
  /** Is paighaam me kaun se khane kaam ke hain */
  fields: string[];
}

export const TEMPLATE_META: TemplateMeta[] = [
  {
    key: 'receipt',
    label: 'Bill bhejna',
    hint: 'Bikri ke baad customer ko bill ki tafseel',
    emoji: '🧾',
    fields: ['customer', 'shop', 'bill', 'total', 'paid', 'baqi', 'tareekh', 'cheezein'],
  },
  {
    key: 'udhaar',
    label: 'Udhaar ki yaad dihani',
    hint: 'Jis ka paisa baqi hai — narmi se yaad karana',
    emoji: '📖',
    fields: ['customer', 'shop', 'baqi', 'tareekh', 'phone'],
  },
  {
    key: 'shukriya',
    label: 'Shukriya',
    hint: 'Kharidari ke baad chhota sa shukriya',
    emoji: '🙏',
    fields: ['customer', 'shop', 'total'],
  },
  {
    key: 'yaad_dihani',
    label: 'Apna paighaam',
    hint: 'Jo bhi aap kehna chahein — naya maal, chhoot, chhutti',
    emoji: '📣',
    fields: ['customer', 'shop', 'phone'],
  },
];

/** Har khane ka matlab — Settings me dikhane ke liye */
export const FIELD_HELP: Record<string, string> = {
  customer: 'Customer ka naam',
  shop: 'Aap ki dukaan ka naam',
  bill: 'Bill number',
  total: 'Bill ka kul',
  paid: 'Jitna diya',
  baqi: 'Jitna baqi hai',
  tareekh: 'Bikri ki tareekh',
  cheezein: 'Kya kya liya (chhoti list)',
  phone: 'Dukaan ka phone',
};

export const DEFAULT_TEMPLATES: Record<TemplateKey, string> = {
  receipt:
    'Assalam-o-Alaikum {{customer}} 👋\n\n' +
    '{{shop}} se kharidari ka shukriya!\n\n' +
    '🧾 Bill: {{bill}}\n' +
    '📅 {{tareekh}}\n' +
    '{{cheezein}}\n\n' +
    '💰 Kul: {{total}}\n' +
    '✅ Diya: {{paid}}\n' +
    '📖 Baqi: {{baqi}}\n\n' +
    'Dobara tashreef laiye 🙏',

  udhaar:
    'Assalam-o-Alaikum {{customer}} 👋\n\n' +
    '{{shop}} ki taraf se yaad dihani — aap ka *{{baqi}}* baqi hai.\n\n' +
    'Jab suhulat ho, bhijwa dijiye ga. Shukriya 🙏\n' +
    '{{phone}}',

  shukriya:
    'Shukriya {{customer}} 🙏\n\n' +
    '{{shop}} se {{total}} ki kharidari par aap ka bohat shukriya.\n' +
    'Dobara tashreef laiye!',

  yaad_dihani:
    'Assalam-o-Alaikum {{customer}} 👋\n\n' +
    '{{shop}} me naya maal aa gaya hai — zaroor tashreef laiye.\n\n' +
    '{{phone}}',
};

/** Pakistan ke number ko wa.me wali shakl */
export function waNumber(phone?: string | null): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('92')) return d;
  if (d.startsWith('0')) return `92${d.slice(1)}`;
  if (d.length === 10) return `92${d}`;
  return d;
}

/**
 * Khane bhar kar paighaam tayyar karta hai.
 *
 * Jo khana na mile wo khali chhor dete hain — `{{baqi}}` ka
 * likha hua nazar aana customer ke liye be-maani hota.
 */
export function fillTemplate(tpl: string, values: Record<string, string | number | undefined | null>): string {
  return tpl
    .replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
      const v = values[key];
      return v === undefined || v === null ? '' : String(v);
    })
    // Khana khali hone se bani teen-chaar khali lineon ko do par le aayein
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Seedha WhatsApp kholne wala link */
export function waLink(phone: string | null | undefined, message: string): string | null {
  const num = waNumber(phone);
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

/** Settings se aaye templates + jo na hon unki jagah tayyar wale */
export function resolveTemplates(saved?: Record<string, string> | null): Record<TemplateKey, string> {
  const out = { ...DEFAULT_TEMPLATES };
  if (saved) {
    for (const k of Object.keys(DEFAULT_TEMPLATES) as TemplateKey[]) {
      const v = saved[k];
      if (typeof v === 'string' && v.trim()) out[k] = v;
    }
  }
  return out;
}
