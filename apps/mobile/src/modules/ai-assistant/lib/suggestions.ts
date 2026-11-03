/**
 * Suggested questions per screen and the page context sent with a question
 * ("Is page ke baare mein"). Paths are the shared web paths.
 */

import { msg } from '@/core/i18n';

interface PageInfo { match: RegExp; title: string; questions: string[] }

const PAGES: PageInfo[] = [
  { match: /^\/dashboard/, title: msg('Dashboard'), questions: [msg('Aaj ki sale kitni hui?'), msg('Kal ka khulasa dikhayein'), msg('Is hafte sab se zyada profit kis cheez par hua?'), msg('Compare this week with last week')] },
  { match: /^\/reports\/staff/, title: msg('Staff report'), questions: [msg('Is mahine kis cashier ne sab se zyada sale ki?'), msg('Kis ne sab se zyada discount diya?'), msg('Galle me kahan kami aayi?')] },
  { match: /^\/reports\/customers/, title: msg('Customers report'), questions: [msg('Mere top 10 customers kaun hain?'), msg('Naye vs purane customers is mahine'), msg('Kis customer ka udhaar sab se purana hai?')] },
  { match: /^\/(reports|profit-loss|profit-report|stock-report|day-report)/, title: msg('Reports'), questions: [msg('Is mahine ka profit kitna hai?'), msg('Kaunsi category sab se zyada bik rahi hai?'), msg('Last month vs this month sale'), msg('Sab se masroof ghanta kaunsa hai?')] },
  { match: /^\/low-stock/, title: msg('Low stock'), questions: [msg('Kya mangwana hai?'), msg('Kaunsi cheezein 3 din me khatam hongi?'), msg('Reorder list by supplier')] },
  { match: /^\/(khata|customers)/, title: msg('Khata'), questions: [msg('Kis kis ka udhaar baqi hai?'), msg('60 din se purana udhaar kitna hai?'), msg('Is hafte kitna udhaar wapas aaya?')] },
  { match: /^\/expenses/, title: msg('Expenses'), questions: [msg('Is mahine expense kahan gaya?'), msg('Sab se bara expense kaunsa tha?'), msg('Expenses vs last month')] },
  { match: /^\/(purchases|suppliers)/, title: msg('Purchases'), questions: [msg('Suppliers ka kitna dena baqi hai?'), msg('Is mahine kis supplier se sab se zyada maal liya?'), msg('Kya mangwana hai?')] },
  { match: /^\/online-orders/, title: msg('Online orders'), questions: [msg('Aaj kitne online order aaye?'), msg('COD kitna courier ke paas pending hai?'), msg('Kis courier ka return rate zyada hai?')] },
  { match: /^\/pos/, title: msg('POS'), questions: [msg('Aaj ab tak ki sale?'), msg('Kaunsi cheez khatam hone wali hai?'), msg('Is ghante kitne bill bane?')] },
  { match: /^\/products/, title: msg('Products'), questions: [msg('Kaunsa maal atka hua hai (nahi bik raha)?'), msg('Top 10 products by profit this month'), msg('Kya mangwana hai?')] },
];

const DEFAULT: string[] = [msg('Aaj ki sale kitni hui?'), msg('Is hafte sab se zyada profit kis cheez par hua?'), msg('Kya mangwana hai?'), msg('Kis kis ka udhaar baqi hai?')];

export function pageInfo(path: string): { title: string; questions: string[] } {
  const hit = PAGES.find((p) => p.match.test(path));
  return hit ? { title: hit.title, questions: hit.questions } : { title: '', questions: DEFAULT };
}

/** Page context for the server: the web path and a readable title. */
export function pageContext(path: string): { path: string; title?: string } {
  const title = pageInfo(path).title;
  return { path, ...(title ? { title } : {}) };
}
