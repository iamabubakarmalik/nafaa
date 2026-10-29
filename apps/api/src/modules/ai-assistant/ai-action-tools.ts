/**
 * Tool definitions and page list for Nafaa AI actions. Kept apart from the
 * services so both the read tools and the action service can import them
 * without a circular import.
 */

/** Pages the assistant may open for the user. */
export const PAGES: Record<string, { to: string; label: string }> = {
  pos: { to: '/pos', label: 'POS counter' },
  dashboard: { to: '/dashboard', label: 'Dashboard' },
  day_report: { to: '/day-report', label: 'Din ka hisaab' },
  reports: { to: '/reports', label: 'Reports' },
  sales_report: { to: '/reports?tab=sales', label: 'Sales report' },
  items_report: { to: '/reports?tab=items', label: 'Items report' },
  expenses_report: { to: '/reports?tab=expenses', label: 'Expenses report' },
  purchases_report: { to: '/reports?tab=purchases', label: 'Purchases report' },
  returns_report: { to: '/reports?tab=returns', label: 'Returns report' },
  tax_report: { to: '/reports?tab=tax', label: 'Tax report' },
  profit_loss: { to: '/profit-loss', label: 'Profit-loss' },
  profit_by_product: { to: '/profit-report', label: 'Profit by product' },
  stock_report: { to: '/stock-report', label: 'Stock report' },
  staff_report: { to: '/reports/staff', label: 'Staff report' },
  customers_report: { to: '/reports/customers', label: 'Customers report' },
  sales: { to: '/sales', label: 'Sales history' },
  returns: { to: '/returns', label: 'Returns' },
  products: { to: '/products', label: 'Products' },
  new_product: { to: '/products/new', label: 'Naya product' },
  low_stock: { to: '/low-stock', label: 'Low stock' },
  stock_adjustments: { to: '/stock-adjustments', label: 'Stock adjustment' },
  customers: { to: '/customers', label: 'Customers' },
  khata: { to: '/khata', label: 'Khata' },
  expenses: { to: '/expenses', label: 'Expenses' },
  income: { to: '/income', label: 'Doosri aamdani' },
  purchases: { to: '/purchases', label: 'Purchases' },
  new_purchase: { to: '/purchases/new', label: 'Nayi purchase' },
  suppliers: { to: '/suppliers', label: 'Suppliers' },
  cash_register: { to: '/cash-register', label: 'Cash register' },
  online_orders: { to: '/online-orders', label: 'Online orders' },
  settings: { to: '/settings', label: 'Settings' },
  team: { to: '/staff?tab=roles', label: 'Roles aur permissions' },
  manufacturing: { to: '/manufacturing', label: 'Banayein (production)' },
  staff: { to: '/staff', label: 'Staff' },
  plan: { to: '/plans', label: 'Plan' },
  billing: { to: '/billing', label: 'Billing' },
};

const itemsSchema = {
  type: 'array',
  items: { type: 'object', properties: { product: { type: 'string', description: 'Product name or barcode as the user said it.' }, qty: { type: 'number' }, cost: { type: 'number', description: 'Purchase only: cost per unit, if the user gave one.' } }, required: ['product'] },
};
const methodSchema = { type: 'string', enum: ['cash', 'card', 'bank', 'jazzcash', 'easypaisa'] };

/** Action tools, appended after the read tools in a fixed order (part of the cached prefix). */
export const ACTION_TOOLS = [
  {
    name: 'propose_create_product', status: 'Product ka card bana raha hoon…',
    description: 'Propose adding a new product. Shows a confirmation card; nothing is saved until the user confirms.',
    input_schema: { type: 'object' as const, properties: { name: { type: 'string' }, price: { type: 'number', description: 'Sale price' }, cost_price: { type: 'number' }, stock: { type: 'number', description: 'Opening stock' }, barcode: { type: 'string' }, category: { type: 'string' }, unit: { type: 'string', description: 'pcs, kg, liter, …' } }, required: ['name', 'price'] },
  },
  {
    name: 'propose_update_price', status: 'Price ka card bana raha hoon…',
    description: 'Propose changing a product\'s sale price. Confirmation card; nothing changes until confirmed.',
    input_schema: { type: 'object' as const, properties: { product: { type: 'string' }, new_price: { type: 'number' } }, required: ['product', 'new_price'] },
  },
  {
    name: 'propose_adjust_stock', status: 'Stock ka card bana raha hoon…',
    description: 'Propose a stock adjustment with a reason (counted extra, counted short, damaged, lost). Confirmation card.',
    input_schema: { type: 'object' as const, properties: { product: { type: 'string' }, direction: { type: 'string', enum: ['in', 'out', 'damage', 'loss'] }, quantity: { type: 'number' }, reason: { type: 'string' } }, required: ['product', 'direction', 'quantity'] },
  },
  {
    name: 'propose_sale', status: 'Bill ka card bana raha hoon…',
    description: 'Propose a sale (bill) at the counter: items with quantities, payment method, optional customer; on_khata=true puts the unpaid amount on the customer\'s khata. Uses the POS rules (stock, khata, loyalty, receipt). Confirmation card; the user can also open it in the POS instead.',
    input_schema: { type: 'object' as const, properties: { items: itemsSchema, payment_method: methodSchema, customer: { type: 'string' }, on_khata: { type: 'boolean' }, paid_amount: { type: 'number', description: 'Only if the customer paid part of the total.' } }, required: ['items'] },
  },
  {
    name: 'propose_create_customer', status: 'Customer ka card bana raha hoon…',
    description: 'Propose adding a customer. Confirmation card.',
    input_schema: { type: 'object' as const, properties: { name: { type: 'string' }, phone: { type: 'string' }, credit_limit: { type: 'number' } }, required: ['name'] },
  },
  {
    name: 'propose_khata_payment', status: 'Khata payment ka card bana raha hoon…',
    description: 'Propose recording money received from a customer against their khata (udhaar). Confirmation card.',
    input_schema: { type: 'object' as const, properties: { customer: { type: 'string' }, amount: { type: 'number' }, payment_method: methodSchema }, required: ['customer', 'amount'] },
  },
  {
    name: 'propose_expense', status: 'Expense ka card bana raha hoon…',
    description: 'Propose recording a paid expense. Confirmation card.',
    input_schema: { type: 'object' as const, properties: { title: { type: 'string' }, amount: { type: 'number' }, category: { type: 'string' }, payment_method: methodSchema }, required: ['title', 'amount'] },
  },
  {
    name: 'propose_income', status: 'Aamdani ka card bana raha hoon…',
    description: 'Propose recording other income besides sales (company incentive, scheme claim, commission, rent received, bank interest). It adds to net profit. Confirmation card.',
    input_schema: { type: 'object' as const, properties: { title: { type: 'string' }, amount: { type: 'number' }, category: { type: 'string', enum: ['incentive', 'scheme_claim', 'commission', 'rent', 'interest', 'other'] }, company: { type: 'string', description: 'Company or supplier that paid, if said.' }, received_via: { type: 'string', enum: ['cash', 'supplier_khata'], description: 'cash = into the drawer (default); supplier_khata = set off against what we owe that supplier.' } }, required: ['title', 'amount'] },
  },
  {
    name: 'propose_purchase_draft', status: 'Purchase order ka card bana raha hoon…',
    description: 'Propose a purchase ORDER (draft, goods not received, no stock change) to a supplier. For "reorder se order banao" pass from_reorder=true (optionally with the supplier) instead of items.',
    input_schema: { type: 'object' as const, properties: { supplier: { type: 'string' }, items: itemsSchema, from_reorder: { type: 'boolean', description: 'true = take the items from the current reorder suggestions (no items needed).' } } },
  },
  {
    name: 'open_page', status: 'Page ka link bana raha hoon…',
    description: 'Give the user a button to open an app page ("POS kholo", "profit report kholo"). Also use it to point to the right page for things you cannot do (delete, void, refund, settings, roles, plan, billing).',
    input_schema: { type: 'object' as const, properties: { page: { type: 'string', enum: Object.keys(PAGES) } }, required: ['page'] },
  },
  {
    name: 'propose_produce', status: 'Production ka card bana raha hoon…',
    description: 'Propose making a product from its recipe (manufacturing): raw materials leave stock, the made goods are added at the worked-out cost. Give quantity (units) or batches. Confirmation card; nothing changes until confirmed.',
    input_schema: { type: 'object' as const, properties: { product: { type: 'string' }, quantity: { type: 'number', description: 'Units to make, in the product\'s unit.' }, batches: { type: 'number', description: 'Recipe batches, when the user says batch.' } }, required: ['product'] },
  },
];

export const ACTION_TOOL_NAMES = new Set(ACTION_TOOLS.map((t) => t.name));
