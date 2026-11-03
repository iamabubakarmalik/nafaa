/** Help centre content: common questions and short step-by-step guides. */

import {
  BarChart3, BookOpen, CreditCard, Database, Download, Package, RotateCcw, Shield, ShoppingCart, Tag, Truck, Users, Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { t } from '@/core/i18n';
// iOS: no "how to buy a plan" help (App Store rule).
import { canPurchaseInApp } from '@/core/platform/purchases';

export type HelpTopic = 'sales' | 'stock' | 'customers' | 'money' | 'reports' | 'account';

export const TOPICS: Array<{ id: HelpTopic; label: string; icon: LucideIcon; color: string }> = [
  { id: 'sales', label: t('Sale aur POS'), icon: ShoppingCart, color: '#16a34a' },
  { id: 'stock', label: t('Maal aur stock'), icon: Package, color: '#d97706' },
  { id: 'customers', label: t('Customers aur khata'), icon: Users, color: '#7c3aed' },
  { id: 'money', label: t('Paisa aur expenses'), icon: Wallet, color: '#e11d48' },
  { id: 'reports', label: t('Reports'), icon: BarChart3, color: '#2563eb' },
  { id: 'account', label: t('Account aur plan'), icon: Shield, color: '#0891b2' },
];

export interface Faq { id: string; topic: HelpTopic; q: string; a: string }

const ALL_FAQS: Faq[] = [
  { id: 'pos-sale', topic: 'sales', q: t('POS par sale kaise karein?'), a: t('POS kholein, maal scan karein ya naam se search, phir "Checkout" dabayein. Customer chunein (zaroori nahi), payment ka tareeqa chunein aur bill pura karein. Bill khud save ho jata hai aur print bhi ho sakta hai.') },
  { id: 'discount', topic: 'sales', q: t('Discount kaise lagayein?'), a: t('POS par kisi cheez ke saamne ya poore bill par discount lagayein — % ya amount. Pehle se bane discount codes Discounts page se banate aur band karte hain.') },
  { id: 'return', topic: 'sales', q: t('Maal wapas (return) kaise lein?'), a: t('Sale ka record kholein, bill par click karein aur "Maal wapas" dabayein. Wapas aane wali cheezein chunein aur paise wapas dene ka tareeqa (cash ya khata) chunein. Stock khud wapas jur jata hai.') },
  { id: 'offline', topic: 'sales', q: t('Internet band ho to kya hoga?'), a: t('POS internet ke baghair bhi bill banata hai. Bill isi device par save rehte hain aur internet aate hi server par chale jate hain. Sale ke record me "computer par save" likha nazar aata hai.') },
  { id: 'product-add', topic: 'stock', q: t('Naya maal (product) kaise daalein?'), a: t('Products page par "Naya product" dabayein. Naam, qeemat, cost aur stock likhein, barcode ho to scan karein, phir save. Tasveer aur variants baad me bhi daal sakte hain.') },
  { id: 'stock-update', topic: 'stock', q: t('Stock kaise update hota hai?'), a: t('Purchase (purchase) darj karne se stock barhta hai, sale se ghat-ta hai. Kami-beshi, kharab ya gum maal ke liye Stock adjustments use karein. Har tabdeeli Stock ka aana jana me likhi jati hai.') },
  { id: 'low-stock', topic: 'stock', q: t('Kam stock ki khabar kaise milti hai?'), a: t('Har product par "kam stock alert" ki had lagayein. Is se neeche aate hi wo Low stock page aur dashboard par nazar aata hai.') },
  { id: 'customer-add', topic: 'customers', q: t('Customer kaise banayein?'), a: t('Customers page par "Naya customer" dabayein. Naam zaroori hai, phone ho to behtar. Udhaar dena ho to credit limit lagayein. Customer usi waqt POS aur khata me aa jata hai.') },
  { id: 'khata', topic: 'customers', q: t('Udhaar (khata) kaise chalta hai?'), a: t('Bill par customer chun kar poora ya kuch hissa udhaar karein. Khata page par har customer ka hisaab hai. Paise milne par us ke khate me "Payment" darj karein.') },
  { id: 'drawer', topic: 'money', q: t('Cash drawer kya hai?'), a: t('Din shuru karte waqt drawer me rakha cash likhein, din ke aakhir me gin kar band karein. Nafaa batata hai kitna hona chahiye tha aur farq kitna hai.') },
  { id: 'expense', topic: 'money', q: t('Expense kaise likhein?'), a: t('Expenses page par "Naya expense" dabayein: amount, type (bijli, kiraya…) aur tareeqa. Ye profit aur din ke hisaab me khud shamil ho jata hai.') },
  { id: 'reports', topic: 'reports', q: t('Reports kahan hain?'), a: t('Sidebar me Reports. Sale, profit, stock, staff aur customers ki reports wahan hain. Din ka hisaab item war Day report me milta hai. Har report print aur PDF ho sakti hai.') },
  { id: 'exports', topic: 'reports', q: t('Excel file kaise nikaalein?'), a: t('Exports page par period chunein aur jo file chahiye (sale, maal, customers…) us par Excel dabayein. Accountant ko bhejne ke liye behtareen.') },
  { id: 'team', topic: 'account', q: t('Team member kaise jorein?'), a: t('Staff page par naya banda jorein aur "Login dein" se us ka login banayein. Role (manager, cashier) aur permissions wahin se tay hoti hain. Sirf malik ye kar sakta hai.') },
  { id: 'backup', topic: 'account', q: t('Backup kaise lein?'), a: t('Backup page par "Backup download" dabayein. Saara data ek file me aa jata hai. Is file ko Google Drive ya email me mehfooz rakhein. Ye sirf malik kar sakta hai.') },
  { id: 'plan', topic: 'account', q: t('Plan kaise lein ya renew karein?'), a: t('Billing → Plans me plan aur muddat chunein. Bill banega; bank ya wallet se payment karke screenshot upload karein. Manzoor hote hi plan chalu. Istemaal tab me had dekh sakte hain.') },
  { id: 'password', topic: 'account', q: t('Password bhool gaya?'), a: t('Login page par "Password bhool gaye" dabayein aur email par aaya link kholein. Login ho to Profile → Hifazat se password badal sakte hain.') },
];
export const FAQS = ALL_FAQS.filter((f) => canPurchaseInApp() || f.id !== 'plan');

export interface Guide { id: string; topic: HelpTopic; title: string; text: string; icon: LucideIcon; to: string; steps: string[] }

const ALL_GUIDES: Guide[] = [
  { id: 'first-sale', topic: 'sales', title: t('Pehli sale'), text: t('Counter par pehla bill 1 minute me'), icon: ShoppingCart, to: '/pos', steps: [t('POS kholein'), t('Maal scan karein ya search'), t('Checkout dabayein'), t('Payment chunein aur bill print karein')] },
  { id: 'add-stock', topic: 'stock', title: t('Maal aur stock daalna'), text: t('Products banayein aur purchase darj karein'), icon: Package, to: '/products', steps: [t('Products → Naya product'), t('Qeemat, cost aur barcode likhein'), t('Purchase se stock barhayein'), t('Kam stock ki had lagayein')] },
  { id: 'suppliers', topic: 'stock', title: t('Supplier se purchase'), text: t('Bill, payment aur baqi'), icon: Truck, to: '/purchases', steps: [t('Suppliers me supplier banayein'), t('Purchase me naya bill'), t('Maal aur qeemat likhein'), t('Payment ya baqi darj karein')] },
  { id: 'khata', topic: 'customers', title: t('Udhaar ka hisaab'), text: t('Customer khata aur wasooli'), icon: BookOpen, to: '/khata', steps: [t('Bill par customer chunein'), t('Udhaar ya aadha udhaar'), t('Khata me hisaab dekhein'), t('Paise milne par Payment darj')] },
  { id: 'returns', topic: 'sales', title: t('Maal return'), text: t('Bill se return, stock khud wapas'), icon: RotateCcw, to: '/sales', steps: [t('Sale ka record kholein'), t('Bill par click'), t('"Maal wapas" dabayein'), t('Cash ya khata me return')] },
  { id: 'discounts', topic: 'sales', title: t('Discount aur offers'), text: t('Codes aur loyalty points'), icon: Tag, to: '/discounts', steps: [t('Discounts me naya code'), t('Had aur period lagayein'), t('POS par code daalein'), t('Loyalty se points ka inaam')] },
  { id: 'day-close', topic: 'money', title: t('Din band karna'), text: t('Drawer ginna aur din ka hisaab'), icon: Wallet, to: '/cash-register', steps: [t('Subah drawer kholein'), t('Shaam ko cash ginein'), t('Farq dekhein aur band karein'), t('Day report print karein')] },
  { id: 'reports', topic: 'reports', title: t('Profit dekhna'), text: t('Sale, cost aur expenses ek jagah'), icon: BarChart3, to: '/reports', steps: [t('Reports kholein'), t('Period chunein'), t('Profit aur expenses dekhein'), t('PDF ya print nikaalein')] },
  { id: 'exports', topic: 'reports', title: t('Accountant ke liye files'), text: t('Excel aur PDF files'), icon: Download, to: '/exports', steps: [t('Exports kholein'), t('Period chunein'), t('File par Excel dabayein'), t('Accountant ko bhej dein')] },
  { id: 'backup', topic: 'account', title: t('Data mehfooz rakhna'), text: t('Backup file aur us ka record'), icon: Database, to: '/backup', steps: [t('Backup kholein'), t('"Backup download" dabayein'), t('File Drive/email me rakhein'), t('Har hafte dohrayein')] },
  { id: 'billing', topic: 'account', title: t('Plan aur payment'), text: t('Renew, upgrade aur bill'), icon: CreditCard, to: '/billing', steps: [t('Billing → Plans'), t('Plan aur period chunein'), t('Bank/wallet se payment'), t('Screenshot upload karein')] },
];
export const GUIDES = ALL_GUIDES.filter((g) => canPurchaseInApp() || g.id !== 'billing');
