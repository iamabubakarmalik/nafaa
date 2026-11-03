/**
 * Plain-words text for every permission (same wording as the web Staff
 * pages). Permissions without an entry fall back to the core label.
 */

import { msg, t } from '@/core/i18n';
import { permissionLabel } from '@/core/permissions';

const PERM_TEXT: Record<string, [string, string]> = {
  'pos.use': [msg('POS counter'), msg('Sale ka counter khol sakta hai')],
  'pos.discount_override': [msg('Had se zyada discount'), msg('Settings wali discount ki had aur PIN is par nahi lagte — sirf bharose wale banday ko dein')],
  'pos.price_tier': [msg('Price tier badalna'), msg('Counter par Wholesale / Credit price chun sakta hai. Customer ya udhaar se jo price khud lagti hai us ke liye ye zaroori nahi')],
  'sales.view': [msg('Sale dekhna'), msg('Purane bill aur sale ki list')],
  'sales.void': [msg('Bill void karna'), msg('Bana hua bill radd kar sakta hai (PIN setting alag hai)')],
  'returns.view': [msg('Return dekhna'), msg('Wapas aaye maal ki list')],
  'returns.create': [msg('Return lena'), msg('Customer ka maal wapas le kar paise lauta sakta hai')],
  'customers.view': [msg('Customers dekhna'), msg('Customer ki list aur details')],
  'customers.edit': [msg('Customers badalna'), msg('Naya customer banana aur details badalna')],
  'khata.view': [msg('Khata dekhna'), msg('Kis ka kitna udhaar hai')],
  'khata.manage': [msg('Khata chalana'), msg('Udhaar ki receiving aur entry')],
  'loyalty.view': [msg('Loyalty dekhna'), msg('Points aur inaam')],
  'discounts.view': [msg('Discount dekhna'), msg('Discount codes ki list')],
  'discounts.manage': [msg('Discount banana'), msg('Naye discount aur offers')],
  'cash_register.view': [msg('Galla dekhna'), msg('Shift aur galle ka hisaab')],
  'cash_register.open': [msg('Shift kholna'), msg('Galla khol kar sale shuru')],
  'cash_register.close': [msg('Shift band karna'), msg('Galla gin kar band karna')],
  'products.view': [msg('Maal dekhna'), msg('Maal, rate aur stock — counter ke liye zaroori')],
  'products.create': [msg('Maal banana'), msg('Naya maal jorna')],
  'products.edit': [msg('Maal badalna'), msg('Rate, naam aur details badalna')],
  'products.delete': [msg('Maal mitana'), msg('Maal hamesha ke liye hatana')],
  'brands.view': [msg('Brands dekhna'), msg('Brand ki list')],
  'tags.view': [msg('Tags dekhna'), msg('Tag ki list')],
  'categories.view': [msg('Categories dekhna'), msg('Counter par category ke button')],
  'low_stock.view': [msg('Kam stock dekhna'), msg('Khatam hone wala maal')],
  'barcode_labels.view': [msg('Barcode labels'), msg('Label chhapna')],
  'stock_movements.view': [msg('Stock ki aamad-o-raft'), msg('Maal kab aaya, kab gaya')],
  'stock_adjustments.manage': [msg('Stock theek karna'), msg('Ginti ke baad stock kam ya zyada karna')],
  'stock_transfers.manage': [msg('Stock bhejna'), msg('Ek branch se doosri branch maal')],
  'suppliers.view': [msg('Suppliers dekhna'), msg('Supplier aur un ka khata')],
  'suppliers.edit': [msg('Suppliers badalna'), msg('Supplier banana aur payment likhna')],
  'purchases.view': [msg('Purchase dekhna'), msg('Kharide maal ke bill')],
  'purchases.create': [msg('Purchase karna'), msg('Naya purchase bill aur order')],
  'dashboard.view': [msg('Dashboard'), msg('Aaj ki sale aur khulasa')],
  'cost.view': [msg('Cost aur profit'), msg('Maal kitne ka aaya aur kitna profit')],
  'reports.view': [msg('Reports'), msg('Sale, stock aur doosri reports')],
  'profit_report.view': [msg('Profit report'), msg('Profit report aur P&L')],
  'staff.view': [msg('Staff dekhna'), msg('Staff ki list, haazri aur tankhwah')],
  'staff.manage': [msg('Staff sambhalna'), msg('HR record banana, haazri aur tankhwah likhna')],
  'commission.own': [msg('Apni commission'), msg('Sirf apni kamai dekhna')],
  'commission.view': [msg('Sab ki commission'), msg('Har bande ki commission dekhna')],
  'commission.manage': [msg('Commission rules'), msg('Rules banana aur payment likhna')],
  'expenses.view': [msg('Expenses dekhna'), msg('Kharchon ki list')],
  'expenses.create': [msg('Expense likhna'), msg('Naya expense aur payment')],
  'exports.view': [msg('Data export'), msg('Excel/CSV nikalna')],
  'backup.manage': [msg('Backup'), msg('Poora data download karna')],
  'team.view': [msg('Team dekhna'), msg('Login, permission aur login history dekhna')],
  'team.manage': [msg('Team sambhalna'), msg('Login aur permission — abhi sirf malik kar sakta hai')],
  'shops.view': [msg('Branches dekhna'), msg('Branch ki list — counter ke liye zaroori')],
  'shops.manage': [msg('Branches sambhalna'), msg('Nayi branch aur details')],
  'activity.view': [msg('Activity log'), msg('Kis ne kya kiya')],
  'settings.view': [msg('Settings dekhna'), msg('Dukaan ki settings — counter ke liye zaroori')],
  'settings.edit': [msg('Settings badalna'), msg('Aam settings badalna')],
  'settings.manage': [msg('Khaas settings'), msg('PIN, backup aur integrations')],
  'billing.view': [msg('Billing dekhna'), msg('Nafaa ka plan aur bill')],
  'billing.manage': [msg('Billing sambhalna'), msg('Plan badalna aur payment')],
  'plans.view': [msg('Plans dekhna'), msg('Nafaa ke plans')],
  'plan_usage.view': [msg('Plan ka istemal'), msg('Kitna plan istemal hua')],
  'referrals.view': [msg('Referrals'), msg('Doston ko Nafaa')],
  'online_orders.view': [msg('Online order dekhna'), msg('Website aur app se aaye order')],
  'online_orders.manage': [msg('Online order chalana'), msg('Order qubool, pack aur deliver karna')],
  'catalog.view': [msg('Online catalog dekhna'), msg('Online dukaan me kaunsa maal dikhta hai')],
  'catalog.manage': [msg('Online catalog badalna'), msg('Online dukaan ka maal aur rate badalna')],
};

/** [label, hint] translated for display. */
export function permText(key: string): [string, string] {
  const row = PERM_TEXT[key];
  return row ? [t(row[0]), t(row[1])] : [permissionLabel(key), ''];
}
