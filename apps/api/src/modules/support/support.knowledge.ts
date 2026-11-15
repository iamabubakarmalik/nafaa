/**
 * What Nafaa AI knows when it answers support chats: the merchant app's help
 * centre (apps/web/src/modules/help/content.ts, kept in the same words) plus
 * a few support-only answers. Published marketing FAQs are added at runtime
 * by SupportAiService.
 *
 * Quick-reply chips for an empty chat live here too, in all three languages.
 */

import type { SupportLang, SupportLocalized } from './support.types';

export interface KnowledgeItem { id: string; q: string; a: string; keywords: string[] }

export const SUPPORT_KNOWLEDGE: KnowledgeItem[] = [
  { id: 'pos-sale', q: 'POS par sale kaise karein?', a: 'POS kholein, maal scan karein ya naam se search, phir "Checkout" dabayein. Customer chunein (zaroori nahi), payment ka tareeqa chunein aur bill pura karein. Bill khud save ho jata hai aur print bhi ho sakta hai.', keywords: ['sale', 'pos', 'bill', 'checkout', 'bikri'] },
  { id: 'discount', q: 'Discount kaise lagayein?', a: 'POS par kisi cheez ke saamne ya poore bill par discount lagayein — % ya amount. Pehle se bane discount codes Discounts page se banate aur band karte hain.', keywords: ['discount', 'code', 'offer'] },
  { id: 'return', q: 'Maal wapas (return) kaise lein?', a: 'Sale ka record kholein, bill par click karein aur "Maal wapas" dabayein. Wapas aane wali cheezein chunein aur paise wapas dene ka tareeqa (cash ya khata) chunein. Stock khud wapas jur jata hai.', keywords: ['return', 'wapas', 'refund'] },
  { id: 'offline', q: 'Internet band ho to kya hoga?', a: 'POS internet ke baghair bhi bill banata hai. Bill isi device par save rehte hain aur internet aate hi server par chale jate hain. Sale ke record me "computer par save" likha nazar aata hai.', keywords: ['internet', 'offline', 'sync'] },
  { id: 'product-add', q: 'Naya maal (product) kaise daalein?', a: 'Products page par "Naya product" dabayein. Naam, qeemat, cost aur stock likhein, barcode ho to scan karein, phir save. Tasveer aur variants baad me bhi daal sakte hain.', keywords: ['product', 'maal', 'item', 'barcode'] },
  { id: 'stock-update', q: 'Stock kaise update hota hai?', a: 'Purchase darj karne se stock barhta hai, sale se ghat-ta hai. Kami-beshi, kharab ya gum maal ke liye Stock adjustments use karein. Har tabdeeli Stock ka aana jana me likhi jati hai.', keywords: ['stock', 'inventory', 'adjust'] },
  { id: 'low-stock', q: 'Kam stock ki khabar kaise milti hai?', a: 'Har product par "kam stock alert" ki had lagayein. Is se neeche aate hi wo Low stock page aur dashboard par nazar aata hai.', keywords: ['low', 'alert', 'kam'] },
  { id: 'customer-add', q: 'Customer kaise banayein?', a: 'Customers page par "Naya customer" dabayein. Naam zaroori hai, phone ho to behtar. Udhaar dena ho to credit limit lagayein. Customer usi waqt POS aur khata me aa jata hai.', keywords: ['customer', 'grahak'] },
  { id: 'khata', q: 'Udhaar (khata) kaise chalta hai?', a: 'Bill par customer chun kar poora ya kuch hissa udhaar karein. Khata page par har customer ka hisaab hai. Paise milne par us ke khate me "Payment" darj karein.', keywords: ['khata', 'udhaar', 'credit', 'ledger'] },
  { id: 'drawer', q: 'Cash drawer kya hai?', a: 'Din shuru karte waqt drawer me rakha cash likhein, din ke aakhir me gin kar band karein. Nafaa batata hai kitna hona chahiye tha aur farq kitna hai.', keywords: ['drawer', 'cash', 'register'] },
  { id: 'expense', q: 'Expense kaise likhein?', a: 'Expenses page par "Naya expense" dabayein: amount, type (bijli, kiraya…) aur tareeqa. Ye profit aur din ke hisaab me khud shamil ho jata hai.', keywords: ['expense', 'kharcha'] },
  { id: 'reports', q: 'Reports kahan hain?', a: 'Sidebar me Reports. Sale, profit, stock, staff aur customers ki reports wahan hain. Din ka hisaab item war Day report me milta hai. Har report print aur PDF ho sakti hai.', keywords: ['report', 'profit'] },
  { id: 'exports', q: 'Excel file kaise nikaalein?', a: 'Exports page par period chunein aur jo file chahiye (sale, maal, customers…) us par Excel dabayein. Accountant ko bhejne ke liye behtareen.', keywords: ['excel', 'export', 'file'] },
  { id: 'team', q: 'Team member kaise jorein?', a: 'Staff page par naya banda jorein aur "Login dein" se us ka login banayein. Role (manager, cashier) aur permissions wahin se tay hoti hain. Sirf malik ye kar sakta hai.', keywords: ['staff', 'team', 'cashier', 'manager', 'user'] },
  { id: 'backup', q: 'Backup kaise lein?', a: 'Backup page par "Backup download" dabayein. Saara data ek file me aa jata hai. Is file ko Google Drive ya email me mehfooz rakhein. Ye sirf malik kar sakta hai.', keywords: ['backup', 'data'] },
  { id: 'plan', q: 'Plan kaise lein ya renew karein?', a: 'Billing → Plans me plan aur muddat chunein. Bill banega; bank ya wallet se payment karke screenshot upload karein. Manzoor hote hi plan chalu. Istemaal tab me had dekh sakte hain.', keywords: ['plan', 'renew', 'payment', 'subscription', 'billing', 'trial'] },
  { id: 'password', q: 'Password bhool gaya?', a: 'Login page par "Password bhool gaye" dabayein aur email par aaya link kholein. Login ho to Profile → Hifazat se password badal sakte hain.', keywords: ['password', 'login', 'bhool'] },
  { id: 'printer', q: 'Receipt printer kaise lagayein?', a: 'Settings → Receipt / Printer me printer ka size (58mm ya 80mm) chunein. Printer computer se jura ho aur browser ke print me wahi printer chuna ho. Test print se check karein.', keywords: ['printer', 'print', 'receipt'] },
];

/** Chips for an empty chat. Tapping one sends its label. */
export const QUICK_REPLIES: Array<{ id: string; label: SupportLocalized }> = [
  { id: 'pos-sale', label: { en: 'How do I make a sale?', ur: 'سیل کیسے کریں؟', roman: 'Sale kaise karein?' } },
  { id: 'plan', label: { en: 'How do I renew my plan?', ur: 'پلان کیسے رینیو کریں؟', roman: 'Plan renew kaise karein?' } },
  { id: 'printer', label: { en: 'Printer is not printing', ur: 'پرنٹر پرنٹ نہیں کر رہا', roman: 'Printer print nahi kar raha' } },
  { id: 'password', label: { en: 'I forgot my password', ur: 'پاس ورڈ بھول گیا', roman: 'Password bhool gaya' } },
  { id: 'product-add', label: { en: 'How do I add products?', ur: 'پروڈکٹ کیسے ڈالیں؟', roman: 'Products kaise daalein?' } },
];

export const quickRepliesFor = (lang: SupportLang) => QUICK_REPLIES.map((q) => ({ id: q.id, label: q.label[lang] || q.label.en }));

const words = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2);

/** Best keyword match for a question (used when the model is unavailable). Null when nothing fits well. */
export function matchKnowledge(question: string, items: KnowledgeItem[] = SUPPORT_KNOWLEDGE): KnowledgeItem | null {
  const q = new Set(words(question));
  if (!q.size) return null;
  let best: { item: KnowledgeItem; score: number } | null = null;
  for (const item of items) {
    let score = 0;
    for (const k of item.keywords) if (q.has(k)) score += 2;
    for (const w of words(item.q)) if (q.has(w)) score += 1;
    if (!best || score > best.score) best = { item, score };
  }
  return best && best.score >= 3 ? best.item : null;
}
