/**
 * Suggested questions per page, and the page context sent with a question
 * ("Is page ke baare mein"). Questions mix Roman Urdu and English, the way
 * shop owners actually type.
 */

interface PageInfo { match: RegExp; title: string; questions: string[] }

const PAGES: PageInfo[] = [
  { match: /^\/dashboard/, title: 'Dashboard', questions: ['Aaj ki sale kitni hui?', 'Kal ka khulasa dikhayein', 'Is hafte sab se zyada profit kis cheez par hua?', 'Compare this week with last week'] },
  { match: /^\/reports\/staff/, title: 'Staff report', questions: ['Is mahine kis cashier ne sab se zyada sale ki?', 'Kis ne sab se zyada discount diya?', 'Galle me kahan kami aayi?'] },
  { match: /^\/reports\/customers/, title: 'Customers report', questions: ['Mere top 10 customers kaun hain?', 'Naye vs purane customers is mahine', 'Kis customer ka udhaar sab se purana hai?'] },
  { match: /^\/(reports|profit-loss|profit-report|stock-report|day-report)/, title: 'Reports', questions: ['Is mahine ka profit kitna hai?', 'Kaunsi category sab se zyada bik rahi hai?', 'Last month vs this month sale', 'Sab se masroof ghanta kaunsa hai?'] },
  { match: /^\/low-stock/, title: 'Low stock', questions: ['Kya mangwana hai?', 'Kaunsi cheezein 3 din me khatam hongi?', 'Reorder list by supplier'] },
  { match: /^\/(khata|customers)/, title: 'Khata', questions: ['Kis kis ka udhaar baqi hai?', '60 din se purana udhaar kitna hai?', 'Is hafte kitna udhaar wapas aaya?'] },
  { match: /^\/expenses/, title: 'Expenses', questions: ['Is mahine expense kahan gaya?', 'Sab se bara expense kaunsa tha?', 'Expenses vs last month'] },
  { match: /^\/(purchases|suppliers)/, title: 'Purchases', questions: ['Suppliers ka kitna dena baqi hai?', 'Is mahine kis supplier se sab se zyada maal liya?', 'Kya mangwana hai?'] },
  { match: /^\/online-orders/, title: 'Online orders', questions: ['Aaj kitne online order aaye?', 'COD kitna courier ke paas pending hai?', 'Kis courier ka return rate zyada hai?'] },
  { match: /^\/pos/, title: 'POS', questions: ['Aaj ab tak ki sale?', 'Kaunsi cheez khatam hone wali hai?', 'Is ghante kitne bill bane?'] },
  { match: /^\/products/, title: 'Products', questions: ['Kaunsa maal atka hua hai (nahi bik raha)?', 'Top 10 products by profit this month', 'Kya mangwana hai?'] },
];

const DEFAULT: string[] = ['Aaj ki sale kitni hui?', 'Is hafte sab se zyada profit kis cheez par hua?', 'Kya mangwana hai?', 'Kis kis ka udhaar baqi hai?'];

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
