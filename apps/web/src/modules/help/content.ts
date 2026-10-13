/** Help centre content: common questions and short step-by-step guides. */

import {
  BarChart3, BookOpen, CreditCard, Database, Download, Package, RotateCcw, Shield, ShoppingCart, Tag, Truck, Users, Wallet,
  type LucideIcon,
} from 'lucide-react';

export type HelpTopic = 'sales' | 'stock' | 'customers' | 'money' | 'reports' | 'account';

export const TOPICS: Array<{ id: HelpTopic; label: string; icon: LucideIcon; color: string }> = [
  { id: 'sales', label: 'Sale aur POS', icon: ShoppingCart, color: '#16a34a' },
  { id: 'stock', label: 'Maal aur stock', icon: Package, color: '#d97706' },
  { id: 'customers', label: 'Customers aur khata', icon: Users, color: '#7c3aed' },
  { id: 'money', label: 'Paisa aur expenses', icon: Wallet, color: '#e11d48' },
  { id: 'reports', label: 'Reports', icon: BarChart3, color: '#2563eb' },
  { id: 'account', label: 'Account aur plan', icon: Shield, color: '#0891b2' },
];

export interface Faq { id: string; topic: HelpTopic; q: string; a: string }

export const FAQS: Faq[] = [
  { id: 'pos-sale', topic: 'sales', q: 'POS par sale kaise karein?', a: 'POS kholein, maal scan karein ya naam se search, phir "Checkout" dabayein. Customer chunein (zaroori nahi), payment ka tareeqa chunein aur bill pura karein. Bill khud save ho jata hai aur print bhi ho sakta hai.' },
  { id: 'discount', topic: 'sales', q: 'Discount kaise lagayein?', a: 'POS par kisi cheez ke saamne ya poore bill par discount lagayein — % ya amount. Pehle se bane discount codes Discounts page se banate aur band karte hain.' },
  { id: 'return', topic: 'sales', q: 'Maal wapas (return) kaise lein?', a: 'Sale ka record kholein, bill par click karein aur "Maal wapas" dabayein. Wapas aane wali cheezein chunein aur paise wapas dene ka tareeqa (cash ya khata) chunein. Stock khud wapas jur jata hai.' },
  { id: 'offline', topic: 'sales', q: 'Internet band ho to kya hoga?', a: 'POS internet ke baghair bhi bill banata hai. Bill isi device par save rehte hain aur internet aate hi server par chale jate hain. Sale ke record me "computer par save" likha nazar aata hai.' },
  { id: 'product-add', topic: 'stock', q: 'Naya maal (product) kaise daalein?', a: 'Products page par "Naya product" dabayein. Naam, qeemat, cost aur stock likhein, barcode ho to scan karein, phir save. Tasveer aur variants baad me bhi daal sakte hain.' },
  { id: 'stock-update', topic: 'stock', q: 'Stock kaise update hota hai?', a: 'Purchase (purchase) darj karne se stock barhta hai, sale se ghat-ta hai. Kami-beshi, kharab ya gum maal ke liye Stock adjustments use karein. Har tabdeeli Stock ka aana jana me likhi jati hai.' },
  { id: 'low-stock', topic: 'stock', q: 'Kam stock ki khabar kaise milti hai?', a: 'Har product par "kam stock alert" ki had lagayein. Is se neeche aate hi wo Low stock page aur dashboard par nazar aata hai.' },
  { id: 'customer-add', topic: 'customers', q: 'Customer kaise banayein?', a: 'Customers page par "Naya customer" dabayein. Naam zaroori hai, phone ho to behtar. Udhaar dena ho to credit limit lagayein. Customer usi waqt POS aur khata me aa jata hai.' },
  { id: 'khata', topic: 'customers', q: 'Udhaar (khata) kaise chalta hai?', a: 'Bill par customer chun kar poora ya kuch hissa udhaar karein. Khata page par har customer ka hisaab hai. Paise milne par us ke khate me "Payment" darj karein.' },
  { id: 'drawer', topic: 'money', q: 'Cash drawer kya hai?', a: 'Din shuru karte waqt drawer me rakha cash likhein, din ke aakhir me gin kar band karein. Nafaa batata hai kitna hona chahiye tha aur farq kitna hai.' },
  { id: 'expense', topic: 'money', q: 'Expense kaise likhein?', a: 'Expenses page par "Naya expense" dabayein: amount, type (bijli, kiraya…) aur tareeqa. Ye profit aur din ke hisaab me khud shamil ho jata hai.' },
  { id: 'reports', topic: 'reports', q: 'Reports kahan hain?', a: 'Sidebar me Reports. Sale, profit, stock, staff aur customers ki reports wahan hain. Din ka hisaab item war Day report me milta hai. Har report print aur PDF ho sakti hai.' },
  { id: 'exports', topic: 'reports', q: 'Excel file kaise nikaalein?', a: 'Exports page par period chunein aur jo file chahiye (sale, maal, customers…) us par Excel dabayein. Accountant ko bhejne ke liye behtareen.' },
  { id: 'team', topic: 'account', q: 'Team member kaise jorein?', a: 'Staff page par naya banda jorein aur "Login dein" se us ka login banayein. Role (manager, cashier) aur permissions wahin se tay hoti hain. Sirf malik ye kar sakta hai.' },
  { id: 'backup', topic: 'account', q: 'Backup kaise lein?', a: 'Backup page par "Backup download" dabayein. Saara data ek file me aa jata hai. Is file ko Google Drive ya email me mehfooz rakhein. Ye sirf malik kar sakta hai.' },
  { id: 'plan', topic: 'account', q: 'Plan kaise lein ya renew karein?', a: 'Billing → Plans me plan aur muddat chunein. Bill banega; bank ya wallet se payment karke screenshot upload karein. Manzoor hote hi plan chalu. Istemaal tab me had dekh sakte hain.' },
  { id: 'password', topic: 'account', q: 'Password bhool gaya?', a: 'Login page par "Password bhool gaye" dabayein aur email par aaya link kholein. Login ho to Profile → Hifazat se password badal sakte hain.' },
];

export interface Guide { id: string; topic: HelpTopic; title: string; text: string; icon: LucideIcon; to: string; steps: string[] }

export const GUIDES: Guide[] = [
  { id: 'first-sale', topic: 'sales', title: 'Pehli sale', text: 'Counter par pehla bill 1 minute me', icon: ShoppingCart, to: '/pos', steps: ['POS kholein', 'Maal scan karein ya search', 'Checkout dabayein', 'Payment chunein aur bill print karein'] },
  { id: 'add-stock', topic: 'stock', title: 'Maal aur stock daalna', text: 'Products banayein aur purchase darj karein', icon: Package, to: '/products', steps: ['Products → Naya product', 'Qeemat, cost aur barcode likhein', 'Purchase se stock barhayein', 'Kam stock ki had lagayein'] },
  { id: 'suppliers', topic: 'stock', title: 'Supplier se purchase', text: 'Bill, payment aur baqi', icon: Truck, to: '/purchases', steps: ['Suppliers me supplier banayein', 'Purchase me naya bill', 'Maal aur qeemat likhein', 'Payment ya baqi darj karein'] },
  { id: 'khata', topic: 'customers', title: 'Udhaar ka hisaab', text: 'Customer khata aur wasooli', icon: BookOpen, to: '/khata', steps: ['Bill par customer chunein', 'Udhaar ya aadha udhaar', 'Khata me hisaab dekhein', 'Paise milne par Payment darj'] },
  { id: 'returns', topic: 'sales', title: 'Maal return', text: 'Bill se return, stock khud wapas', icon: RotateCcw, to: '/sales', steps: ['Sale ka record kholein', 'Bill par click', '"Maal wapas" dabayein', 'Cash ya khata me return'] },
  { id: 'discounts', topic: 'sales', title: 'Discount aur offers', text: 'Codes aur loyalty points', icon: Tag, to: '/discounts', steps: ['Discounts me naya code', 'Had aur period lagayein', 'POS par code daalein', 'Loyalty se points ka inaam'] },
  { id: 'day-close', topic: 'money', title: 'Din band karna', text: 'Drawer ginna aur din ka hisaab', icon: Wallet, to: '/cash-register', steps: ['Subah drawer kholein', 'Shaam ko cash ginein', 'Farq dekhein aur band karein', 'Day report print karein'] },
  { id: 'reports', topic: 'reports', title: 'Profit dekhna', text: 'Sale, cost aur expenses ek jagah', icon: BarChart3, to: '/reports', steps: ['Reports kholein', 'Period chunein', 'Profit aur expenses dekhein', 'PDF ya print nikaalein'] },
  { id: 'exports', topic: 'reports', title: 'Accountant ke liye files', text: 'Excel aur PDF files', icon: Download, to: '/exports', steps: ['Exports kholein', 'Period chunein', 'File par Excel dabayein', 'Accountant ko bhej dein'] },
  { id: 'backup', topic: 'account', title: 'Data mehfooz rakhna', text: 'Backup file aur us ka record', icon: Database, to: '/backup', steps: ['Backup kholein', '"Backup download" dabayein', 'File Drive/email me rakhein', 'Har hafte dohrayein'] },
  { id: 'billing', topic: 'account', title: 'Plan aur payment', text: 'Renew, upgrade aur bill', icon: CreditCard, to: '/billing', steps: ['Billing → Plans', 'Plan aur period chunein', 'Bank/wallet se payment', 'Screenshot upload karein'] },
];
