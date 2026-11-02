/**
 * Suggested questions per page, and the page context sent with a question
 * ("Is page ke baare mein"). Questions mix Roman Urdu and English, the way
 * shop owners actually type.
 */

import { t } from '@core/i18n';
interface PageInfo { match: RegExp; title: string; questions: string[] }

const PAGES: PageInfo[] = [
  { match: /^\/dashboard/, title: t('Dashboard'), questions: [t('Aaj ki sale kitni hui?'), t('Kal ka khulasa dikhayein'), t('Is hafte sab se zyada profit kis cheez par hua?'), t('Compare this week with last week')] },
  { match: /^\/reports\/staff/, title: t('Staff report'), questions: [t('Is mahine kis cashier ne sab se zyada sale ki?'), t('Kis ne sab se zyada discount diya?'), t('Galle me kahan kami aayi?')] },
  { match: /^\/reports\/customers/, title: t('Customers report'), questions: [t('Mere top 10 customers kaun hain?'), t('Naye vs purane customers is mahine'), t('Kis customer ka udhaar sab se purana hai?')] },
  { match: /^\/(reports|profit-loss|profit-report|stock-report|day-report)/, title: t('Reports'), questions: [t('Is mahine ka profit kitna hai?'), t('Kaunsi category sab se zyada bik rahi hai?'), t('Last month vs this month sale'), t('Sab se masroof ghanta kaunsa hai?')] },
  { match: /^\/low-stock/, title: t('Low stock'), questions: [t('Kya mangwana hai?'), t('Kaunsi cheezein 3 din me khatam hongi?'), t('Reorder list by supplier')] },
  { match: /^\/(khata|customers)/, title: t('Khata'), questions: [t('Kis kis ka udhaar baqi hai?'), t('60 din se purana udhaar kitna hai?'), t('Is hafte kitna udhaar wapas aaya?')] },
  { match: /^\/expenses/, title: t('Expenses'), questions: [t('Is mahine expense kahan gaya?'), t('Sab se bara expense kaunsa tha?'), t('Expenses vs last month')] },
  { match: /^\/(purchases|suppliers)/, title: t('Purchases'), questions: [t('Suppliers ka kitna dena baqi hai?'), t('Is mahine kis supplier se sab se zyada maal liya?'), t('Kya mangwana hai?')] },
  { match: /^\/online-orders/, title: t('Online orders'), questions: [t('Aaj kitne online order aaye?'), t('COD kitna courier ke paas pending hai?'), t('Kis courier ka return rate zyada hai?')] },
  { match: /^\/pos/, title: t('POS'), questions: [t('Aaj ab tak ki sale?'), t('Kaunsi cheez khatam hone wali hai?'), t('Is ghante kitne bill bane?')] },
  { match: /^\/products/, title: t('Products'), questions: [t('Kaunsa maal atka hua hai (nahi bik raha)?'), t('Top 10 products by profit this month'), t('Kya mangwana hai?')] },
];

const DEFAULT: string[] = [t('Aaj ki sale kitni hui?'), t('Is hafte sab se zyada profit kis cheez par hua?'), t('Kya mangwana hai?'), t('Kis kis ka udhaar baqi hai?')];

export function pageInfo(path: string): { title: string; questions: string[] } {
  const hit = PAGES.find((p) => p.match.test(path));
  return hit ? { title: hit.title, questions: hit.questions } : { title: '', questions: DEFAULT };
}

/** Page context for the server: path, a readable title and the URL filters. */
export function pageContext(path: string, search: string): { path: string; title?: string; params?: Record<string, string> } {
  const params: Record<string, string> = {};
  new URLSearchParams(search).forEach((v, k) => { if (k.length <= 40 && v.length <= 120) params[k] = v; });
  const title = pageInfo(path).title || document.title.split('·')[0]?.trim() || undefined;
  return { path, title, ...(Object.keys(params).length ? { params } : {}) };
}
