/**
 * Language detection, intent routing and templated answers for Nafaa AI.
 *
 * Three common questions are answered without a model call (morning summary,
 * today's sale, low stock / what to order): their numbers come from the same
 * tools and the text is filled into a template, so they cost nothing. The
 * same templates power the mock provider used for local testing.
 */

export type Lang = 'roman' | 'en' | 'ur';

const URDU_SCRIPT = /[؀-ۿ]/;
const ROMAN_MARKERS = /\b(kya|kia|kitn[aie]|kis|kaun|kon|kab|kahan|kyun|kyon|hai|hain|hua|hui|huwa|tha|thi|ka|ki|ke|ko|se|mein|me|par|aaj|kal|hafte|mahine|sab|zyada|kam|batao|bataen|bataiye|dikhao|chahiye|wala|wali|udhaar|bikri|maal|kharcha|dukaan|subah|banao|bana|karo|kholo|wasool|mangwa\w*|batao)\b/gi;
const ENGLISH_MARKERS = /\b(what|which|how|show|tell|give|my|the|is|are|was|were|this|last|week|month|today|yesterday|top|best|most|sales?|profit|stock|items?|products?|customers?|did|do|does|me|list|compare|why)\b/gi;

/** Picks the reply language from the question: Urdu script, English or Roman Urdu. */
export function detectLang(text: string): Lang {
  if (URDU_SCRIPT.test(text)) return 'ur';
  const roman = (text.match(ROMAN_MARKERS) ?? []).length;
  const english = (text.match(ENGLISH_MARKERS) ?? []).length;
  return english > roman ? 'en' : 'roman';
}

/**
 * An hour of the day as shop people say it: "8–9 baje shaam", "12–1 baje raat"
 * (Roman Urdu) or "8–9 PM", "11 AM–12 PM" (English).
 */
export function hourRange(hour: number, lang: Lang): string {
  const h = ((Math.trunc(hour) % 24) + 24) % 24;
  const e = (h + 1) % 24;
  const twelve = (x: number) => (x % 12 === 0 ? 12 : x % 12);
  if (lang === 'en') {
    const ap = (x: number) => (x < 12 ? 'AM' : 'PM');
    return ap(h) === ap(e) ? `${twelve(h)}–${twelve(e)} ${ap(e)}` : `${twelve(h)} ${ap(h)}–${twelve(e)} ${ap(e)}`;
  }
  const part = h >= 4 && h <= 11 ? 'subah' : h >= 12 && h <= 15 ? 'dopahar' : h >= 16 && h <= 20 ? 'shaam' : 'raat';
  return `${twelve(h)}–${twelve(e)} baje ${part}`;
}

export const money = (v: unknown, symbol = 'Rs') => `${symbol} ${Math.round(Number(v ?? 0) || 0).toLocaleString('en-PK')}`;
export const num = (v: unknown) => (Math.round((Number(v ?? 0) || 0) * 100) / 100).toLocaleString('en-PK');

/* ───────────────────────── routing ───────────────────────── */

export type TemplateIntent = 'morning' | 'today_sale' | 'low_stock';

const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
const OPEN_QUESTION = /\b(kyun|kyon|why|kaise|how come|compare|muqabla|vs|versus|analy|plan|strategy|barha|improve|suggest|mashwara|predict|forecast|agle|next)\b/i;

/** A short, plain question that a template answers as well as a model would. */
export function templateIntent(text: string): TemplateIntent | null {
  const t = text.toLowerCase();
  if (words(t) > 9 || OPEN_QUESTION.test(t)) return null;
  // Requests to do something go to the model (or the mock), which proposes an action card.
  if (/\b(banao|bana do|banado|karo|kar do|kholo|kholein|open|create|add|delete|hatao|void|refund|wasool)\b/.test(t)) return null;
  if (/(subah ka khulasa|morning summary|kal ka (hisaab|hisab|khulasa)|yesterday'?s summary|summary of yesterday|کل کا (حساب|خلاصہ)|صبح کا خلاصہ)/i.test(t)) return 'morning';
  if (/(low stock|kam stock|stock kam|stock khatam|khatam ho|kya (mangwana|mangwaun|mangwaon|khareedna)|reorder|what (should i|to) (buy|order)|کیا منگوانا|اسٹاک کم)/i.test(t)) return 'low_stock';
  if (/\b(aaj|aj|today'?s?)\b/.test(t) && /\b(sale|sales|bikri|bechi|bika)\b/.test(t) && !/\b(profit|kharcha|expense|item|product|cheez|kis|which|top)\b/.test(t)) return 'today_sale';
  if (/آج کی (سیل|بکری)/.test(t)) return 'today_sale';
  return null;
}

/** Looks like a multi-step analysis question (escalates Fast mode to the analysis model). */
export function isAnalysisQuestion(text: string): boolean {
  return words(text) >= 10 && OPEN_QUESTION.test(text);
}

const NUM = '(\\d+(?:\\.\\d+)?)';
const PAGE_WORDS: Array<[RegExp, string]> = [
  [/\bpos\b|counter/, 'pos'], [/profit.?loss|p&l/, 'profit_loss'], [/profit/, 'profit_by_product'], [/low stock|kam stock/, 'low_stock'],
  [/stock report/, 'stock_report'], [/sales? history|bills/, 'sales'], [/sale report|sales report/, 'sales_report'], [/khata|udhaar/, 'khata'],
  [/expense|kharch/, 'expenses'], [/purchase/, 'purchases'], [/customer/, 'customers'], [/product/, 'products'], [/report/, 'reports'], [/dashboard/, 'dashboard'],
];

type Plan = Array<{ name: string; input: Record<string, unknown> }>;

/** Payment words as shop people say them. */
const PAY_WORDS: Array<[RegExp, string]> = [
  [/\b(?:cash|naqd|naqad|nakad)\b/, 'cash'], [/\bcard\b/, 'card'], [/\bbank(?: transfer)?\b/, 'bank'],
  [/\bjazz ?cash\b/, 'jazzcash'], [/\beasy ?paisa\b/, 'easypaisa'],
];
const KHATA_WORD = /\b(?:khata|khate|khaate|khaata|udhaar|udhar|udhaari|credit)\b/;

/** Filler words around item lists ("ka bill banao", "make a bill for"). */
const BILL_FILLER = new Set([
  'bill', 'bills', 'sale', 'banao', 'banado', 'bana', 'do', 'karo', 'kar', 'make', 'create', 'new', 'naya', 'a', 'an', 'the', 'for', 'of', 'with',
  'ka', 'ki', 'ke', 'ko', 'se', 'me', 'mein', 'par', 'pe', 'on', 'please', 'plz', 'nikalo', 'likho', 'wala', 'wali', 'payment', 'paid', 'by', 'in', 'and', 'aur', 'or',
]);

const title = (x: string) => x.replace(/\s+/g, ' ').trim().replace(/(^|\s)(\p{L})/gu, (_m, s1: string, c: string) => s1 + c.toUpperCase());
const cleanName = (x: string) => x.replace(/^[\s,:;.\-–]+|[\s,:;.\-–]+$/g, '').replace(/\s+/g, ' ').trim();

/** "price 220", "price: Rs 220", "rate=220" → 220. */
function labeled(t: string, labels: string): number | undefined {
  const m = new RegExp(`\\b(?:${labels})\\b\\s*[:=]?\\s*(?:rs\\.?\\s*)?${NUM}`).exec(t);
  return m ? Number(m[1]) : undefined;
}

/** One "2 chakki atta" / "chakki atta 2" / "2x yogurt" / "atta x2" piece → item, or null when no product words remain. */
function parseItem(piece: string): { product: string; qty: number } | null {
  const words = piece.replace(/[,:;]+/g, ' ').split(/\s+/).filter(Boolean);
  while (words.length && BILL_FILLER.has(words[0])) words.shift();
  while (words.length && BILL_FILLER.has(words[words.length - 1])) words.pop();
  let text = words.join(' ');
  let qty = 1;
  const front = /^(\d+(?:\.\d+)?)\s*(?:x|×|pcs|piece|pieces|adad)?\s+(.+)$/.exec(text) ?? /^(\d+(?:\.\d+)?)(?:x|×)(.+)$/.exec(text);
  const back = /^(.+?)\s+(?:x|×)?\s*(\d+(?:\.\d+)?)(?:\s*(?:pcs|piece|pieces|adad))?$/.exec(text);
  if (front) { qty = Number(front[1]); text = front[2]; }
  else if (back && !/\d(?:\.\d+)?\s*(?:kg|g|gm|l|ltr|liter|ml)$/.test(text)) { qty = Number(back[2]); text = back[1]; }
  const name = text.split(/\s+/).filter((w) => !BILL_FILLER.has(w)).join(' ').trim();
  return name && /\p{L}/u.test(name) ? { product: name, qty: qty > 0 ? qty : 1 } : null;
}

/** "2 chakki atta aur 1 black tea ka cash bill banao", "Hamza ke khate me 3 basmati rice ka bill banao", … */
function parseBill(t: string): Plan {
  let body = t;
  let customer: string | undefined;
  // Customer: "<name> ke khate me/par", "<name> ke naam", "khata <name>", "for <name> on khata".
  const own = /^(.+?)\s+ke\s+(?:khate|khata|khaate|khaata|naam|name)\s*(?:me|mein|par|pe|pr)?\b/.exec(body);
  if (own) { customer = own[1]; body = body.slice(own[0].length); }
  else {
    const after = /\b(?:khata|khate|udhaar|udhar|credit)\s+(?:par\s+|pe\s+|me\s+|for\s+|on\s+)?([a-z][a-z .]+?)(?=\s*(?:,|$|\bka\b|\bke\b|\bse\b|\bbill\b))/.exec(body);
    const forName = /\bfor\s+([a-z][a-z .]+?)\s+on\s+(?:khata|credit|udhaar)\b/.exec(body);
    const hit = forName ?? after;
    if (hit) { customer = hit[1]; body = body.replace(hit[0], ' '); }
  }
  const onKhata = KHATA_WORD.test(t);
  const method = PAY_WORDS.find(([re]) => re.test(body))?.[1];
  for (const [re] of PAY_WORDS) body = body.replace(new RegExp(re.source, 'g'), ' ');
  body = body.replace(new RegExp(KHATA_WORD.source, 'g'), ' ')
    .replace(/\b(?:make|create)\s+(?:a\s+)?(?:new\s+)?(?:bill|sale)\b(?:\s+for)?/g, ' ')
    .replace(/\b(?:bill|sale)\s+(?:banao|bana do|banado|karo|kar do|nikalo)\b/g, ' ')
    .replace(/\b(?:ka|ki|ke)\s+(?:bill|sale)\b/g, ' ');
  const items = body.split(/,|\+|;|&|\band\b|\baur\b|\n/).map((p) => parseItem(p.trim())).filter((x): x is { product: string; qty: number } => !!x);
  return [{
    name: 'propose_sale',
    input: {
      items,
      ...(method && !onKhata && { payment_method: method }),
      ...(customer && { customer: customer.trim() }),
      ...(onKhata && { on_khata: true }),
    },
  }];
}

/** "Pepsi 1.5L product banao price 220 …", "naya product Lays 50g, price 60", "add product Surf Excel 1kg price 450". */
function parseProduct(text: string, t: string): Plan {
  const FIELD = /\b(?:price|rate|qeemat|sale price|cost|lagat|stock|qty|barcode|category|unit)\b/;
  let name = '';
  const before = /^(.*?)\s*\b(?:naya |new )?(?:product|item|cheez)\s+(?:banao|bana do|banado|add karo|add|create|likho)\b/.exec(t);
  if (before && cleanName(before[1]) && !/^(?:naya|new|add|create)$/.test(cleanName(before[1]))) {
    name = text.slice(0, before[1].length);
  } else {
    const after = /\b(?:naya product|new product|add product|create product|product (?:banao|bana do|banado|add karo|add|create))\b\s*:?\s*/.exec(t);
    if (after) {
      const start = after.index + after[0].length;
      const rest = t.slice(start);
      const stop = rest.search(new RegExp(`,|${FIELD.source}`));
      name = text.slice(start, start + (stop < 0 ? rest.length : stop));
    }
  }
  name = cleanName(name.replace(/\b(?:naya|new|add)\b/gi, ' '));
  return [{
    name: 'propose_create_product',
    input: {
      ...(name && { name: /[A-Z]/.test(name) ? name : title(name) }),
      ...(labeled(t, 'price|rate|qeemat|sale price') != null && { price: labeled(t, 'price|rate|qeemat|sale price') }),
      ...(labeled(t, 'cost|cost price|lagat') != null && { cost_price: labeled(t, 'cost|cost price|lagat') }),
      ...(labeled(t, 'stock|qty|quantity') != null && { stock: labeled(t, 'stock|qty|quantity') }),
      ...(/\bbarcode\s*[:=]?\s*([\w-]+)/i.exec(text) && { barcode: /\bbarcode\s*[:=]?\s*([\w-]+)/i.exec(text)![1] }),
      ...(/\bcategory\s*[:=]?\s*([^,]+?)(?=,|$|\s+(?:price|cost|stock|barcode)\b)/i.exec(text) && { category: cleanName(/\bcategory\s*[:=]?\s*([^,]+?)(?=,|$|\s+(?:price|cost|stock|barcode)\b)/i.exec(text)![1]) }),
    },
  }];
}

/** Write intents the rules provider understands ("product banao …", "bill banao …"). Null when the text is a question. */
export function ruleActionPlan(text: string): Plan | null {
  const raw = text.replace(/\s+/g, ' ').trim();
  const t = raw.toLowerCase();
  if (/\b(delete|hatao|hata do|mitao|mita do|remove|void|refund|wapas kar)\b/.test(t) && !/\b(se|from)\b.*\b(wapas aaye|wapas mile)\b/.test(t)) {
    const page = /bill|sale/.test(t) ? 'sales' : /customer/.test(t) ? 'customers' : /product|item|cheez/.test(t) ? 'products' : /expense|kharch/.test(t) ? 'expenses' : 'dashboard';
    return [{ name: 'open_page', input: { page, _refuse: true } }];
  }
  if (/\b(user|permission|plan|billing|setting)/.test(t) && /\b(badlo|change|banao|add|update|do)\b/.test(t)) {
    return [{ name: 'open_page', input: { page: /plan/.test(t) ? 'plan' : /billing/.test(t) ? 'billing' : /setting/.test(t) ? 'settings' : 'team', _refuse: true } }];
  }
  if (/\b(kholo|kholein|open|le chalo)\b/.test(t)) {
    const hit = PAGE_WORDS.find(([re]) => re.test(t));
    if (hit) return [{ name: 'open_page', input: { page: hit[1] } }];
  }
  const asking = /\b(kitn[aie]|kya|kaun|kon|kab|show|dikhao|list|how many|what|which)\b/.test(t);

  // Product
  if (/\b(?:product|item|cheez)\s+(?:banao|bana do|banado|add karo|add|create|likho)\b|\b(?:naya|new|add|create) product\b/.test(t)) return parseProduct(raw, t);

  // Customer
  const custVerb = /\bcustomer\s+(?:banao|bana do|banado|add karo|add|create|likho)\b|\b(?:naya|new|add|create) customer\b/;
  if (custVerb.test(t)) {
    const phone = /(\+?\d[\d -]{8,}\d)/.exec(raw)?.[1];
    const noPhone = phone ? raw.replace(phone, ' ') : raw;
    const lower = noPhone.toLowerCase();
    const m = custVerb.exec(lower)!;
    let name = cleanName(noPhone.slice(0, m.index));
    if (!name || /^(?:naya|new|add)$/i.test(name)) name = cleanName(noPhone.slice(m.index + m[0].length));
    name = cleanName(name.replace(/\b(?:naya|new|add|ka|ki|phone|number|no)\b/gi, ' '));
    return [{ name: 'propose_create_customer', input: { ...(name && { name: /[A-Z]/.test(name) ? name : title(name) }), ...(phone && { phone: phone.replace(/[ -]/g, '') }) } }];
  }

  // Khata payment received
  const pay = new RegExp(`^(.+?)\\s+(?:se|ne)\\s+(?:rs\\.?\\s*)?${NUM}\\s*(?:rs|rupay|rupaye|rupees)?\\s*(?:wasool|mil gaye|mile|wapas aaye|wapas mile|wapas diye|aaye|aa gaye|diye|jama|payment)`).exec(t)
    ?? new RegExp(`\\b(?:received|got)\\s+(?:rs\\.?\\s*)?${NUM}\\s+from\\s+([a-z][a-z .]+)`).exec(t);
  if (pay) {
    const [who, amount] = /^\d/.test(pay[1]) ? [pay[2], pay[1]] : [pay[1], pay[2]];
    return [{ name: 'propose_khata_payment', input: { customer: cleanName(who), amount: Number(amount), ...(PAY_WORDS.find(([re]) => re.test(t)) && { payment_method: PAY_WORDS.find(([re]) => re.test(t))![1] }) } }];
  }

  // Other income (incentive, scheme claim, commission, rent received)
  if (/\b(?:income|aamdani|incentive|scheme claim|claim mila|commission mili|kiraya mila)\b/.test(t) && /\b(likho|likh do|add|daalo|dalo|karo|record|mila|mili)\b/.test(t) && !asking) {
    const amt = new RegExp(`(?:rs\\.?\\s*)?${NUM}`).exec(t);
    const titleText = t.replace(amt?.[0] ?? '§', ' ')
      .split(/\s+/).filter((w) => w && !['income', 'aamdani', 'ka', 'ki', 'ke', 'likho', 'likh', 'do', 'add', 'karo', 'daalo', 'dalo', 'record', 'mila', 'mili', 'rs', 'rupay', 'rupees', 'a', 'an'].includes(w)).join(' ');
    return [{ name: 'propose_income', input: { ...(titleText && { title: title(titleText) }), ...(amt && { amount: Number(amt[1]) }) } }];
  }

  // Expense
  if (/\b(?:expense|kharcha|kharch|kharche)\b/.test(t) && (/^(?:expense|kharcha|kharch)\b/.test(t) || /\b(likho|likh do|add|daalo|dalo|karo|banao|record)\b/.test(t)) && !asking) {
    const amt = new RegExp(`(?:rs\\.?\\s*)?${NUM}`).exec(t);
    const titleText = t.replace(amt?.[0] ?? '§', ' ')
      .split(/\s+/).filter((w) => w && !['expense', 'kharcha', 'kharch', 'kharche', 'ka', 'ki', 'ke', 'likho', 'likh', 'do', 'add', 'karo', 'daalo', 'dalo', 'banao', 'record', 'rs', 'rupay', 'rupees', 'ke', 'liye', 'for', 'of', 'an', 'a'].includes(w)).join(' ');
    return [{ name: 'propose_expense', input: { ...(titleText && { title: title(titleText) }), ...(amt && { amount: Number(amt[1]) }) } }];
  }

  // Purchase order from reorder suggestions
  if (/(purchase order|order) (banao|bana do)|reorder se order/.test(t)) return [{ name: 'propose_purchase_draft', input: { from_reorder: true } }];

  // Price change and stock adjustment
  const price = new RegExp(`^(.+?) (?:ki|ka) (?:price|rate|qeemat) (?:rs\\.?\\s*)?${NUM}`).exec(t);
  if (price) return [{ name: 'propose_update_price', input: { product: price[1].trim(), new_price: Number(price[2]) } }];
  const adj = new RegExp(`^(.+?) (?:ka )?stock ${NUM} (barhao|kam karo|kharab|gum)`).exec(t);
  if (adj) return [{ name: 'propose_adjust_stock', input: { product: adj[1].trim(), quantity: Number(adj[2]), direction: adj[3] === 'barhao' ? 'in' : adj[3] === 'kharab' ? 'damage' : adj[3] === 'gum' ? 'loss' : 'out', reason: 'Ginti me farq (Nafaa AI)' } }];

  // Production: "10 mix daal banao", "2 batch cake banao"
  const make = new RegExp(`^${NUM}\\s*(batch(?:es)?\\s+)?(.+?)\\s+(?:banao|bana do|banado|tayyar karo)$`).exec(t);
  if (make && !/\b(bill|sale|order|product|customer|khata)\b/.test(make[3])) return [{ name: 'propose_produce', input: { product: make[3].trim(), ...(make[2] ? { batches: Number(make[1]) } : { quantity: Number(make[1]) }) } }];

  // Bill: "… bill banao", "make a bill …", "… card se bill"
  if (!asking && (/\b(?:bill|sale)\s+(?:banao|bana do|banado|karo|kar do|nikalo)\b/.test(t) || /\b(?:make|create)\s+(?:a\s+)?(?:new\s+)?(?:bill|sale)\b/.test(t) || /\bse bill$|\bbill$/.test(t))) return parseBill(t);
  return null;
}

/** Tool calls the rules provider makes for a question (keyword based). Empty when nothing matches. */
export function ruleToolPlan(text: string): Array<{ name: string; input: Record<string, unknown> }> {
  const action = ruleActionPlan(text);
  if (action) return action;
  const t = text.toLowerCase();
  // Advice and "why" questions need real reasoning; the rules do not guess an answer to them.
  if (/\b(kyun|kyon|why|kaise|how (can|do|should)|barha\w*|improve|suggest\w*|mashwara|advice|tips?|strategy|predict|forecast|kya karun|kya karoon)\b/.test(t)) return [];
  const period = /\b(kal|yesterday)\b/.test(t) ? 'yesterday'
    : /\b(aaj|aj|today)\b/.test(t) ? 'today'
      : /(pichhle|pichle|last) (hafte|week)/.test(t) ? 'last_week'
        : /\b(hafte|week)\b/.test(t) ? 'this_week'
          : /(pichhle|pichle|last) (mahine|month)/.test(t) ? 'last_month'
            : /\b(saal|year)\b/.test(t) ? 'this_year'
              : 'this_month';
  const plan: Array<{ name: string; input: Record<string, unknown> }> = [];
  const add = (name: string, input: Record<string, unknown> = { period }) => { if (!plan.some((p) => p.name === name)) plan.push({ name, input }); };
  if (/(compare|muqabla|vs)/.test(t)) add('compare_periods', { a: { period: period === 'this_month' ? 'this_month' : period }, b: { period: period === 'this_week' ? 'last_week' : period === 'today' ? 'yesterday' : 'last_month' } });
  if (/(profit|margin|kamai)/.test(t) && /(cheez|item|product|kis|which|category)/.test(t)) add('product_performance', { period, sort_by: 'profit', group_by: /category/.test(t) ? 'category' : 'product' });
  else if (/(profit|margin|kamai)/.test(t)) add('profit_summary');
  if (/(top|best|sab se zyada|zyada bik|most sold|slow|atka|nahi bik|lowest)/.test(t) && /(cheez|item|product|maal|bik|sold|sell)/.test(t)) add('product_performance', { period, sort_by: /(slow|atka|nahi bik)/.test(t) ? 'slow' : /(lowest|kam bik)/.test(t) ? 'lowest' : 'revenue' });
  if (/(reorder|mangwa|khareed|low stock|kam stock|khatam|stock)/.test(t)) add('stock_reorder', { mode: /(low stock|kam stock|khatam)/.test(t) ? 'low_stock' : 'reorder' });
  if (/(udhaar|udhar|khata|owe|debt|baqi)/.test(t)) add('khata_udhaar');
  if (/(kharch|expense)/.test(t)) add('expenses_summary');
  if (/(purchase|supplier)/.test(t)) add('purchases_suppliers');
  if (/(production|banaya|banaye|recipe|manufactur|raw maal|kacha maal)/.test(t)) add('production_summary');
  if (/(customer|gahak|grahak)/.test(t) && !/(udhaar|khata)/.test(t)) add('customer_insights');
  if (/(staff|cashier|salesman|kis ne|who sold|void|discount)/.test(t)) add('staff_performance');
  if (/(galla|drawer|short|shift)/.test(t)) add('cash_drawer');
  if (/(return|wapsi|refund)/.test(t)) add('returns_summary');
  if (/(tax|fbr|pra)/.test(t)) add('tax_summary');
  if (/(branch|shops)/.test(t)) add('branches_compare');
  if (/(courier|cod|rto|shipment)/.test(t)) add('courier_cod');
  else if (/(online|website|shopify|woo|daraz|order)/.test(t) && !/(bazaar|marketplace)/.test(t)) add('online_orders');
  if (/(bazaar|marketplace)/.test(t)) add('marketplace_summary');
  if (/(loyalty|points)/.test(t)) add('loyalty_summary');
  if (!plan.length && /\b(sale|sales|bikri|bika|biki|becha|bechi|kamai|income|revenue|hisaab|hisab|summary|khulasa)\b|سیل|بکری/.test(t)) add('sales_summary');
  return plan.slice(0, 3);
}

/* ───────────────────────── templates ───────────────────────── */

const L = {
  roman: {
    sale: 'Sale', bills: 'bill', avg: 'average bill', vsPrev: 'pichhle period se', up: 'zyada', down: 'kam', cash: 'Cash aaya', credit: 'Udhaar par',
    profit: 'Gross profit', net: 'Net profit', margin: 'margin', exp: 'Expenses', none: 'Is period me koi data nahi mila.', noAccess: 'Is maloomat ki permission aap ke paas nahi. Dukaan ke malik se permission le lein.',
    reorderHead: 'Ye cheezein jaldi mangwa lein', daysLeft: 'din ka stock', order: 'mangwayein', lowHead: 'Kam stock', out: 'khatam',
    owe: 'Logon par kul udhaar', top: 'Sab se zyada', topItems: 'Sab se zyada bikne wali', khataOld: '60 din se purana', details: 'Tafseel',
    allOk: 'Abhi kuch mangwane ki zaroorat nahi — stock theek hai.', hourBusy: 'Sab se masroof waqt', note: 'Note',
  },
  en: {
    sale: 'Sale', bills: 'bills', avg: 'average bill', vsPrev: 'vs previous period', up: 'up', down: 'down', cash: 'Cash received', credit: 'On credit',
    profit: 'Gross profit', net: 'Net profit', margin: 'margin', exp: 'Expenses', none: 'No data found for this period.', noAccess: 'You do not have permission to see this. Please ask the shop owner.',
    reorderHead: 'Order these soon', daysLeft: 'days of stock', order: 'order', lowHead: 'Low stock', out: 'out of stock',
    owe: 'Total udhaar receivable', top: 'Top', topItems: 'Best sellers', khataOld: 'older than 60 days', details: 'Details',
    allOk: 'Nothing needs ordering right now — stock looks fine.', hourBusy: 'Busiest time', note: 'Note',
  },
  ur: {
    sale: 'سیل', bills: 'بل', avg: 'اوسط بل', vsPrev: 'پچھلے دور سے', up: 'زیادہ', down: 'کم', cash: 'کیش آیا', credit: 'ادھار پر',
    profit: 'Gross profit', net: 'Net profit', margin: 'margin', exp: 'Expenses', none: 'اس دور میں کوئی ڈیٹا نہیں ملا۔', noAccess: 'اس معلومات کی اجازت آپ کے پاس نہیں۔ دکان کے مالک سے اجازت لے لیں۔',
    reorderHead: 'یہ چیزیں جلد منگوا لیں', daysLeft: 'دن کا اسٹاک', order: 'منگوائیں', lowHead: 'کم اسٹاک', out: 'ختم',
    owe: 'لوگوں پر کل ادھار', top: 'سب سے زیادہ', topItems: 'سب سے زیادہ بکنے والی', khataOld: '60 دن سے پرانا', details: 'تفصیل',
    allOk: 'ابھی کچھ منگوانے کی ضرورت نہیں — اسٹاک ٹھیک ہے۔', hourBusy: 'سب سے مصروف وقت', note: 'نوٹ',
  },
};

type Dict = (typeof L)['roman'];
const change = (d: Dict, p: unknown) => {
  const v = Number(p);
  if (p == null || !Number.isFinite(v)) return '';
  return ` (${Math.abs(Math.round(v))}% ${v >= 0 ? d.up : d.down} ${d.vsPrev})`;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const NEED_WORDS: Record<string, [string, string]> = {
  items: ['kaunsi cheezein aur kitni', 'which items and how many'], name: ['naam', 'the name'], price: ['sale price', 'the sale price'],
  new_price: ['nayi price', 'the new price'], quantity: ['quantity', 'the quantity'], amount: ['raqam', 'the amount'],
  customer: ['customer ka naam', 'the customer name'], title: ['kis cheez ka kharcha', 'what the expense was for'],
};
function needText(need: unknown, lang: Lang): string {
  const list = Array.isArray(need) ? need : [];
  return list.map((k) => NEED_WORDS[k]?.[lang === 'en' ? 1 : 0] ?? k).join(lang === 'en' ? ' and ' : ' aur ');
}

/** Shop-facing text for a tool error (tool notes are written for the model and never shown). */
function errorText(data: any, lang: Lang): string {
  const en = lang === 'en';
  switch (data?.error) {
    case 'NOT_SUPPORTED': return en ? 'This item has variants or IMEI — please do it from the POS or the product page.' : 'Is cheez ke variant ya IMEI hain — ye kaam POS ya product page se karein.';
    case 'NOTHING_TO_ORDER': return en ? 'Nothing needs ordering right now.' : 'Abhi kuch mangwane ki zaroorat nahi.';
    case 'NO_SHOP': return en ? 'No active branch found.' : 'Koi active branch nahi mili.';
    case 'UNKNOWN_PAGE': case 'UNKNOWN_ACTION': case 'UNKNOWN_TOOL': return en ? 'I cannot do that one yet.' : 'Ye kaam abhi main nahi kar sakta.';
    default: return en ? 'The data could not be read right now. Please try again.' : 'Abhi data nahi parh saka. Thori der baad dobara poochein.';
  }
}

/** One tool's result as a few short lines. Unknown tools get their headline numbers. */
export function renderTool(name: string, data: any, lang: Lang): string {
  const d = L[lang];
  if (!data) return d.none;
  if (data.error === 'NO_PERMISSION') {
    if (name.startsWith('propose_')) return lang === 'en' ? 'You do not have permission for this action. Please ask the shop owner.' : 'Is kaam ki permission aap ke paas nahi. Dukaan ke malik se permission le lein.';
    return d.noAccess;
  }
  if (data.error && !name.startsWith('propose_')) return errorText(data, lang);
  switch (name) {
    case 'sales_summary': {
      const t = data.totals ?? {};
      if (!t.bills) return `${data.period}: ${d.none}`;
      const lines = [`**${d.sale}: ${money(t.netSale)}** — ${t.bills} ${d.bills}, ${d.avg} ${money(t.averageBill)}${change(d, data.changePercent?.netSale)}`];
      lines.push(`- ${d.cash}: ${money(t.cashReceived)} · ${d.credit}: ${money(t.udhaarGiven)}`);
      if (t.profit != null) lines.push(`- ${d.profit}: ${money(t.profit)} (${num(t.margin)}% ${d.margin})`);
      if (data.busiestHours?.[0]) lines.push(`- ${d.hourBusy}: ${hourRange(Number(data.busiestHours[0].hour), lang)}`);
      return lines.join('\n');
    }
    case 'profit_summary': {
      const t = data.totals ?? {};
      const lines = [`**${d.profit}: ${money(t.grossProfit)}** (${num(t.marginPercent)}% ${d.margin})${change(d, data.changePercent?.grossProfit)}`,
        `- ${d.sale}: ${money(t.sale)} · Cost: ${money(t.costOfGoods)}`,
        `- ${d.exp}: ${money(t.expensesPaid)} · Damage/loss: ${money(t.stockWrittenOff)}`,
        `- **${d.net}: ${money(t.netProfit)}**`];
      if (data.dataQuality) lines.push(`- ${d.note}: ${data.dataQuality.linesWithoutCost} lines without cost.`);
      return lines.join('\n');
    }
    case 'product_performance': {
      const rows: any[] = data.rows ?? [];
      if (!rows.length) return d.none;
      const key = data.sortBy === 'qty' ? 'qty' : data.sortBy === 'profit' ? 'profit' : data.sortBy === 'slow' ? 'stock' : 'revenue';
      return [`**${d.top} (${data.sortBy}):**`, ...rows.slice(0, 8).map((r, i) => `${i + 1}. ${r.name} — ${key === 'qty' || key === 'stock' ? `${num(r[key])} ${r.unit ?? ''}` : money(r[key])}`)].join('\n');
    }
    case 'stock_reorder': {
      const rows: any[] = data.rows ?? [];
      if (!rows.length) return d.allOk;
      const head = data.mode === 'low_stock' ? d.lowHead : d.reorderHead;
      return [`**${head}** (${data.counts?.lines ?? rows.length}):`, ...rows.slice(0, 8).map((r) =>
        `- ${r.name}: ${num(r.stock)} ${r.unit}${r.daysLeft != null ? `, ~${num(r.daysLeft)} ${d.daysLeft}` : ''}${r.status === 'out' ? ` (${d.out})` : ''} → ${num(r.suggestOrderQty)} ${d.order}${r.supplier ? ` (${r.supplier})` : ''}`)].join('\n');
    }
    case 'khata_udhaar': {
      const t = data.totals ?? {};
      return [`**${d.owe}: ${money(t.receivable)}** — ${t.customersOwing} customers`, `- ${d.khataOld}: ${money(t.olderThan60Days)}`,
        ...(data.topDebtors ?? []).slice(0, 5).map((x: any) => `- ${x.name}: ${money(x.balance)}${x.daysSinceLastPayment != null ? ` (${x.daysSinceLastPayment} din)` : ''}`)].join('\n');
    }
    case 'production_summary': {
      const t = data.totals ?? {};
      if (!t.runs) return lang === 'en' ? `Nothing was made in ${data.period ?? 'this period'}.` : `${data.period ?? 'Is period'} me koi production nahi hui.`;
      return [
        `**Production (${data.period ?? ''}): ${num(t.runs)} ${lang === 'en' ? 'runs' : 'dafa'}, ${num(t.quantity)} units${t.totalCost != null ? ` · Cost ${money(t.totalCost)}` : ''}**`,
        ...(data.made ?? []).slice(0, 5).map((m: any) => `- ${m.name}: ${num(m.quantity)} ${m.unit ?? ''}${m.unitCostAvg != null ? ` · ${money(m.unitCostAvg)} / ${m.unit ?? 'unit'}` : ''}`),
        ...((data.rawMaterialsUsed ?? []).length ? [lang === 'en' ? 'Raw material used:' : 'Raw maal laga:'] : []),
        ...(data.rawMaterialsUsed ?? []).slice(0, 5).map((m: any) => `- ${m.name}: ${num(m.quantity)} ${m.unit ?? ''}`),
      ].join('\n');
    }
    case 'expenses_summary': {
      const t = data.totals ?? {};
      return [`**${d.exp}: ${money(t.paid)}** — ${t.entries} entries${change(d, data.changePercent)}`,
        ...(data.byCategory ?? []).slice(0, 5).map((c: any) => `- ${c.name}: ${money(c.amount)}`)].join('\n');
    }
    case 'open_page':
      return data.refusal
        ? (lang === 'en' ? 'I cannot do this from chat (delete, void, refund, settings, roles and billing stay with you). Open the page below to do it yourself.' : 'Ye kaam main chat se nahi kar sakta — delete, void, refund, settings, roles aur billing aap khud karein. Neeche button se page kholein.')
        : (lang === 'en' ? `Here you go — ${data.opened}.` : `Ye lijiye — ${data.opened} ka button neeche hai.`);
    case 'propose_create_product': case 'propose_update_price': case 'propose_adjust_stock': case 'propose_sale':
    case 'propose_create_customer': case 'propose_khata_payment': case 'propose_expense': case 'propose_income': case 'propose_purchase_draft': case 'propose_produce': {
      if (data.error === 'AMBIGUOUS') return `${lang === 'en' ? 'Which one do you mean' : 'Kaunsa'} "${data.query}"? ${(data.choices ?? []).map((c: any) => c.name).join(' · ')}`;
      if (data.error === 'NOT_FOUND') return lang === 'en' ? `"${data.query}" was not found.` : `"${data.query}" nahi mila. Naam check karein.`;
      if (data.error === 'MISSING') return lang === 'en' ? `Please tell me ${needText(data.need, 'en')}.` : `Ye bhi batayein: ${needText(data.need, 'roman')}.`;
      if (data.error) return errorText(data, lang);
      const warn = (data.warnings ?? []).length ? `\n${(data.warnings as string[]).map((w) => `- ${w}`).join('\n')}` : '';
      return `**${data.title}** — ${data.summary}${warn}\n\n${lang === 'en' ? 'Check the card below and press Confirm. Nothing is saved before that.' : 'Neeche card check karein aur Confirm dabayein — us se pehle kuch save nahi hota.'}`;
    }
    case 'compare_periods': {
      const a = data.a ?? {};
      const b = data.b ?? {};
      const c = data.changePercentAvsB ?? {};
      const line = (label: string, k: string) => (a[k] == null ? null : `- ${label}: ${money(a[k])} vs ${money(b[k])}${c[k] != null ? ` (${c[k] >= 0 ? '+' : ''}${Math.round(c[k])}%)` : ''}`);
      return [`**${a.period} vs ${b.period}**`, line(d.sale, 'netSale'), line(d.profit, 'grossProfit'), line(d.net, 'netProfit'), line(d.exp, 'expensesPaid')].filter(Boolean).join('\n');
    }
    default: {
      const t = data.totals ?? data;
      const pairs = Object.entries(t).filter(([, v]) => typeof v === 'number').slice(0, 6);
      if (!pairs.length) return data.note && /branch/i.test(data.note) ? (lang === 'en' ? 'Branch comparison works on the "All shops" view (top bar).' : 'Branches ka muqabla "All shops" view par hota hai (upar se chunein).') : d.none;
      return [`**${d.details}** (${data.period ?? ''}):`, ...pairs.map(([k, v]) => `- ${k}: ${/value|sale|amount|due|paid|profit|cost|receivable|money|total/i.test(k) ? money(v) : num(v)}`)].join('\n');
    }
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */


/* ───────────────────────── follow-up suggestions ───────────────────────── */

const FOLLOW: Record<string, { roman: string[]; en: string[] }> = {
  sales_summary: { roman: ['Pichhle hafte se compare karo', 'Kis cheez ki sale sab se zyada thi?', 'Is mahine ka profit kitna hai?'], en: ['Compare with last week', 'Which items sold the most?', 'What is the profit this month?'] },
  profit_summary: { roman: ['Pichhle mahine se compare karo', 'Kam profit wali cheezein?', 'Kis cheez par sab se zyada profit?'], en: ['Compare with last month', 'Which items have low profit?', 'Which item made the most profit?'] },
  product_performance: { roman: ['Atka hua maal kaunsa hai?', 'Kya mangwana hai?', 'Category ke hisaab se dikhao'], en: ['Which stock is not selling?', 'What should I reorder?', 'Show it by category'] },
  stock_reorder: { roman: ['Reorder se purchase order bana do', 'Kaunsa maal nahi bik raha?', 'Suppliers ko kitna dena hai?'], en: ['Make a purchase order from this', 'Which stock is not selling?', 'How much do I owe suppliers?'] },
  khata_udhaar: { roman: ['60 din purana udhaar kis par hai?', 'Is mahine kitna udhaar wasool hua?', 'Top customers kaun hain?'], en: ['Who owes for more than 60 days?', 'How much udhaar was recovered this month?', 'Who are my top customers?'] },
  expenses_summary: { roman: ['Pichhle mahine se compare karo', 'Is mahine ka net profit?', 'Sab se bara kharcha kaunsa tha?'], en: ['Compare with last month', 'What is the net profit this month?', 'What was the biggest expense?'] },
  purchases_suppliers: { roman: ['Kya mangwana hai?', 'Is mahine purchase vs sale', 'Kis supplier ko sab se zyada dena hai?'], en: ['What should I reorder?', 'Purchases vs sales this month', 'Which supplier do I owe the most?'] },
  customer_insights: { roman: ['Kis par udhaar sab se zyada hai?', 'Naye customers kitne aaye?', 'Pichhle mahine se compare karo'], en: ['Who owes the most udhaar?', 'How many new customers came?', 'Compare with last month'] },
  staff_performance: { roman: ['Galle me koi short?', 'Kis ne sab se zyada discount diya?', 'Aaj ki sale kitni hai?'], en: ['Any cash drawer shortages?', 'Who gave the most discount?', "What are today's sales?"] },
  compare_periods: { roman: ['Kis cheez ki wajah se farq aaya?', 'Expenses ka muqabla', 'Profit kitna bana?'], en: ['Which items caused the difference?', 'Compare expenses', 'How much profit was made?'] },
  production_summary: { roman: ['Kaunsi Recipe me sab se zyada Profit?', 'Kaunsa raw maal kam hai?', 'Is mahine kitna bika?'], en: ['Which recipe has the best margin?', 'Which raw material is low?', 'How much sold this month?'] },
  morning: { roman: ['Aaj ki sale kitni hai?', 'Kya mangwana hai?', 'Is hafte ka profit?'], en: ["What are today's sales?", 'What should I reorder?', "This week's profit?"] },
  action: { roman: ['Aaj ki sale kitni hai?', 'Kam stock dikhao', 'Is mahine ka profit?'], en: ["What are today's sales?", 'Show low stock', "This month's profit?"] },
  default: { roman: ['Aaj ki sale kitni hai?', 'Is mahine ka profit?', 'Kya mangwana hai?'], en: ["What are today's sales?", "This month's profit?", 'What should I reorder?'] },
};

/** 2–3 follow-up questions for an answer built from these tools (templated, no model call). */
export function suggestionsFor(tools: string[], lang: Lang): string[] {
  const key = tools.find((t) => t.startsWith('propose_') || t === 'open_page') ? 'action' : tools.find((t) => FOLLOW[t]) ?? (tools.includes('morning_summary') ? 'morning' : 'default');
  const set = FOLLOW[key] ?? FOLLOW.default;
  return (lang === 'en' ? set.en : set.roman).slice(0, 3);
}

/* ───────────────────────── follow-up tail of model answers ───────────────────────── */

const TAIL = '<<followups:';

/**
 * Removes the hidden "<<followups: a | b | c>>" line from a streamed answer.
 * `push` returns the part that is safe to show now (it holds back anything
 * that may be the start of the tail); `finish` returns the clean text and the
 * parsed suggestions.
 */
export class FollowupFilter {
  private full = '';
  private shown = 0;

  push(delta: string): string {
    this.full += delta;
    let safe = this.full.length;
    const at = this.full.indexOf('<<', this.shown);
    if (at >= 0) {
      const rest = this.full.slice(at);
      if (rest.startsWith(TAIL) || TAIL.startsWith(rest)) safe = at;
    } else if (this.full.endsWith('<')) {
      safe = this.full.length - 1;
    }
    if (safe <= this.shown) return '';
    const out = this.full.slice(this.shown, safe);
    this.shown = safe;
    return out;
  }

  finish(): { text: string; suggestions: string[]; leftover: string } {
    const m = /<<followups:([\s\S]*?)(?:>>|$)/.exec(this.full);
    const text = (m ? this.full.slice(0, m.index) : this.full).trimEnd();
    const suggestions = m ? m[1].split('|').map((x) => x.replace(/>+$/, '').trim()).filter((x) => x.length > 1 && x.length <= 90).slice(0, 3) : [];
    const leftover = text.length > this.shown ? text.slice(this.shown) : '';
    return { text, suggestions, leftover };
  }
}
