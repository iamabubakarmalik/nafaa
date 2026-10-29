/**
 * Nafaa AI actions: the assistant proposes, the user confirms, the app's own
 * services do the work.
 *
 *   1. The model calls a propose_* tool. Here the request is checked: names
 *      are matched to products, customers, categories and suppliers (with a
 *      list of choices when a name is unclear), the user's permission for the
 *      same action in the app is checked, totals and stock are worked out,
 *      and a pending action is stored: single use, bound to the user, tenant
 *      and branch view, valid for 10 minutes.
 *   2. The client shows a card with the editable fields, warnings and
 *      Confirm / Cancel.
 *   3. On confirm the permission and branch are checked again and the action
 *      runs through the same service the app's screen uses (ProductsService,
 *      SalesService with the counter rules, CustomersService,
 *      CustomerLedgerService, ExpensesService, StockAdjustmentsService,
 *      PurchasesService as an order). An activity log row records it as done
 *      through Nafaa AI.
 *
 * Not available through the assistant: deleting anything, voids, refunds,
 * settings, users and permissions, plan and billing.
 *
 * Pending actions live in server memory (one API instance). A restart or a
 * second instance makes an open card expire; nothing is half-written.
 */

import { BadRequestException, HttpException, Injectable, Logger } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../common/shop-scope';
import { PERMISSIONS, hasPermission, type PermissionKey } from '../../common/constants/permissions.constants';
import { ProductsService } from '../inventory/products/products.service';
import type { CreateProductDto } from '../inventory/products/dto/create-product.dto';
import { StockAdjustmentsService } from '../inventory/stock-adjustments/stock-adjustments.service';
import type { CreateAdjustmentDto } from '../inventory/stock-adjustments/dto/create-adjustment.dto';
import { SalesService } from '../sales/sales/sales.service';
import type { CreateSaleDto } from '../sales/sales/dto/create-sale.dto';
import { CustomersService } from '../customers/customers/customers.service';
import type { CreateCustomerDto } from '../customers/customers/dto/create-customer.dto';
import { CustomerLedgerService } from '../customers/customer-ledger/customer-ledger.service';
import type { CreatePaymentDto } from '../customers/customer-ledger/dto/create-payment.dto';
import { ExpensesService } from '../finance/expenses/expenses.service';
import type { CreateExpenseDto } from '../finance/expenses/dto/create-expense.dto';
import { IncomeService } from '../finance/income/income.service';
import type { CreateIncomeDto, IncomeCategory } from '../finance/income/dto/income.dto';
import { PurchasesService } from '../purchasing/purchases/purchases.service';
import type { CreatePurchaseDto } from '../purchasing/purchases/dto/create-purchase.dto';
import { AiToolsService, type AiToolContext, type AiToolResult } from './ai-tools.service';
import { ManufacturingService } from '../manufacturing/manufacturing.service';
import { PAGES } from './ai-action-tools';
import type { AiActionField, AiActionLine, AiActionProposal, AiActionResult, AiLink } from './ai.types';

type Kind = AiActionProposal['kind'];

interface Pending {
  id: string;
  kind: Kind;
  tenantId: string;
  userId: string;
  /** Branch view when proposed (null = all branches); confirm must come from the same view. */
  viewShopId: string | null;
  /** Branch the write lands in. */
  shopId: string | null;
  expiresAt: number;
  state: 'pending' | 'running' | 'done' | 'cancelled';
  payload: Record<string, any>;
  proposal: AiActionProposal;
}

const TTL_MS = 10 * 60_000;
const MONEY: PaymentMethod[] = ['CASH', 'CARD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'];
const METHOD_LABEL: Record<string, string> = { CASH: 'Cash', CARD: 'Card', BANK_TRANSFER: 'Bank', JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa', KHATA: 'Udhaar (khata)' };
const r2 = (v: number) => Math.round(v * 100) / 100;
const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : NaN; };
const rs = (v: number) => `Rs ${Math.round(v).toLocaleString('en-PK')}`;

const NEEDS: Record<Kind, PermissionKey[]> = {
  create_product: [PERMISSIONS.PRODUCTS_CREATE],
  update_price: [PERMISSIONS.PRODUCTS_EDIT],
  adjust_stock: [PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE],
  create_sale: [PERMISSIONS.POS_USE],
  create_customer: [PERMISSIONS.CUSTOMERS_EDIT],
  receive_khata_payment: [PERMISSIONS.KHATA_MANAGE],
  create_expense: [PERMISSIONS.EXPENSES_CREATE],
  create_income: [PERMISSIONS.INCOME_MANAGE],
  create_purchase_draft: [PERMISSIONS.PURCHASES_CREATE],
  produce: [PERMISSIONS.MANUFACTURING_PRODUCE],
};

/* ───────────────────────── matching ───────────────────────── */

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s.]/gu, ' ').replace(/\s+/g, ' ').trim();

/** 0..1 similarity from shared words and characters; good enough to rank a short list. */
function similarity(query: string, name: string): number {
  const a = norm(query);
  const b = norm(name);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const qa = a.split(' ');
  const nb = b.split(' ');
  const words = qa.filter((w) => nb.some((x) => x === w || (w.length > 2 && (x.startsWith(w) || w.startsWith(x))))).length / qa.length;
  const bigrams = (s: string) => new Set(Array.from({ length: Math.max(0, s.length - 1) }, (_, i) => s.slice(i, i + 2)));
  const ba = bigrams(a);
  const bb = bigrams(b);
  const common = [...ba].filter((x) => bb.has(x)).length;
  const dice = ba.size + bb.size ? (2 * common) / (ba.size + bb.size) : 0;
  return Math.max(words * 0.85 + dice * 0.15, dice);
}

/** Fixed income categories offered on the confirmation card. */
const INCOME_OPTIONS = [
  { value: 'COMPANY_INCENTIVE', label: 'Company incentive' },
  { value: 'SCHEME_CLAIM', label: 'Scheme claim' },
  { value: 'COMMISSION', label: 'Commission' },
  { value: 'RENT', label: 'Kiraya mila' },
  { value: 'INTEREST', label: 'Bank profit / interest' },
  { value: 'OTHER', label: 'Doosri' },
];

/** Income category from the words the user used. */
function incomeCategory(text: string): IncomeCategory {
  const t = text.toLowerCase();
  if (/incentive|target|inaam|bonus/.test(t)) return 'COMPANY_INCENTIVE';
  if (/scheme|claim/.test(t)) return 'SCHEME_CLAIM';
  if (/commission|kamishan/.test(t)) return 'COMMISSION';
  if (/rent|kiraya|kiraaya/.test(t)) return 'RENT';
  if (/interest|bank profit|sood/.test(t)) return 'INTEREST';
  return 'OTHER';
}

interface ProductHit { id: string; name: string; unit: string; price: number; cost: number; stock: number | null; hasVariants: boolean; score: number }

@Injectable()
export class AiActionsService {
  private readonly logger = new Logger('NafaaAiActions');
  private readonly pending = new Map<string, Pending>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
    private readonly adjustments: StockAdjustmentsService,
    private readonly sales: SalesService,
    private readonly customers: CustomersService,
    private readonly ledger: CustomerLedgerService,
    private readonly expenses: ExpensesService,
    private readonly purchases: PurchasesService,
    private readonly tools: AiToolsService,
    private readonly manufacturing?: ManufacturingService,
    private readonly income?: IncomeService,
  ) {}

  /* ───────────────────────── lookups ───────────────────────── */

  /** Products by barcode/SKU, then by name words; stock and price at `shopId`. */
  async findProducts(tenantId: string, query: string, shopId: string | null, take = 5): Promise<ProductHit[]> {
    const q = query.trim();
    if (!q) return [];
    const words = norm(q).split(' ').filter((w) => w.length > 1).slice(0, 5);
    const exact = await this.prisma.product.findMany({
      where: { tenantId, isActive: true, OR: [{ barcode: q }, { sku: q }] },
      select: { id: true, name: true, unit: true, price: true, costPrice: true, hasVariants: true, stock: true }, take: 2,
    });
    const rows = exact.length ? exact : await this.prisma.product.findMany({
      where: {
        tenantId, isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          ...(words.length ? [{ AND: words.map((w) => ({ name: { contains: w, mode: 'insensitive' as const } })) }] : []),
          ...words.filter((w) => w.length > 2).map((w) => ({ name: { contains: w, mode: 'insensitive' as const } })),
        ],
      },
      select: { id: true, name: true, unit: true, price: true, costPrice: true, hasVariants: true, stock: true },
      take: 40,
    });
    const stock = shopId && rows.length
      ? await this.prisma.shopStock.findMany({ where: { tenantId, shopId, productId: { in: rows.map((r) => r.id) }, variantId: null }, select: { productId: true, stock: true, reserved: true, shopPrice: true } })
      : [];
    const at = new Map(stock.map((s) => [s.productId, s]));
    return rows
      .map((p) => {
        const s = at.get(p.id);
        return {
          id: p.id, name: p.name, unit: p.unit, price: r2(s?.shopPrice ?? p.price), cost: r2(p.costPrice), hasVariants: p.hasVariants,
          stock: shopId ? (s ? r2(s.stock - (s.reserved ?? 0)) : null) : r2(p.stock),
          score: exact.length ? 1 : similarity(q, p.name),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, take);
  }

  /** One product when the match is clear; otherwise the choices. */
  private async pickProduct(ctx: AiToolContext, query: string, shopId: string | null) {
    const hits = await this.findProducts(ctx.user.tenantId, query, shopId);
    if (!hits.length) return { error: { error: 'NOT_FOUND', what: 'product', query, note: 'No product with this name. Ask the user to check the name, or offer to create it.' } };
    const [a, b] = hits;
    if (a.score >= 0.99 || (a.score >= 0.55 && (!b || a.score - b.score >= 0.15))) return { hit: a };
    return { error: { error: 'AMBIGUOUS', what: 'product', query, choices: hits.map((h) => ({ name: h.name, price: h.price, stock: h.stock })), note: 'Ask the user which one they mean, then call the tool again with the exact name.' } };
  }

  private async pickCustomer(ctx: AiToolContext, query: string) {
    const q = query.trim();
    const digits = q.replace(/\D/g, '');
    const rows = await this.prisma.customer.findMany({
      where: {
        tenantId: ctx.user.tenantId, isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          ...(digits.length >= 6 ? [{ phone: { contains: digits.slice(-10) } }] : []),
          ...norm(q).split(' ').filter((w) => w.length > 2).map((w) => ({ name: { contains: w, mode: 'insensitive' as const } })),
        ],
      },
      select: { id: true, name: true, phone: true, balance: true, creditLimit: true },
      take: 20,
    });
    const hits = rows.map((c) => ({ ...c, score: digits.length >= 6 && c.phone?.includes(digits.slice(-10)) ? 1 : similarity(q, c.name) })).sort((a, b) => b.score - a.score).slice(0, 5);
    if (!hits.length) return { error: { error: 'NOT_FOUND', what: 'customer', query, note: 'No customer with this name. Offer to add the customer first.' } };
    const [a, b] = hits;
    if (a.score >= 0.99 || (a.score >= 0.6 && (!b || a.score - b.score >= 0.15))) return { hit: a };
    return { error: { error: 'AMBIGUOUS', what: 'customer', query, choices: hits.map((h) => ({ name: h.name, phone: h.phone ? `…${h.phone.slice(-4)}` : null })), note: 'Ask the user which customer they mean.' } };
  }

  /** The branch a write lands in: the selected branch, else the main branch. */
  private async writeShop(ctx: AiToolContext): Promise<{ id: string; name: string } | null> {
    if (ctx.scope.shopId) return { id: ctx.scope.shopId, name: ctx.branchName ?? 'Branch' };
    const main = await this.prisma.shop.findFirst({ where: { tenantId: ctx.user.tenantId, isActive: true }, orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }], select: { id: true, name: true } });
    return main;
  }

  private method(v: unknown, fallback: PaymentMethod = 'CASH'): PaymentMethod {
    const s = String(v ?? '').toUpperCase().replace(/[\s-]+/g, '_');
    if (s === 'BANK') return 'BANK_TRANSFER';
    return (MONEY as string[]).includes(s) ? (s as PaymentMethod) : fallback;
  }

  private methodOptions(withKhata = false) {
    return [...MONEY.map((m) => ({ value: m, label: METHOD_LABEL[m] })), ...(withKhata ? [{ value: 'KHATA', label: METHOD_LABEL.KHATA }] : [])];
  }

  /* ───────────────────────── propose ───────────────────────── */

  /** Entry point for the propose_* tools and open_page. Never throws. */
  async propose(name: string, input: Record<string, any>, ctx: AiToolContext): Promise<AiToolResult> {
    if (name === 'open_page') return this.openPage(input);
    const kind = ({ propose_sale: 'create_sale', propose_khata_payment: 'receive_khata_payment', propose_expense: 'create_expense', propose_income: 'create_income', propose_purchase_draft: 'create_purchase_draft', propose_produce: 'produce' } as Record<string, Kind>)[name] ?? (name.replace(/^propose_/, '') as Kind);
    if (!NEEDS[kind]) return { refused: true, data: { error: 'UNKNOWN_ACTION' } };
    const missing = NEEDS[kind].filter((p) => !hasPermission(ctx.user.role, ctx.user.permissions, p));
    if (missing.length) {
      return { refused: true, data: { error: 'NO_PERMISSION', missing, note: 'Tell the user politely they do not have permission for this action and can ask the shop owner.' } };
    }
    try {
      const built = await this.build(kind, input ?? {}, ctx);
      if ('error' in built) return { refused: true, data: built.error };
      const id = randomUUID();
      const proposal: AiActionProposal = { ...built.proposal, id, kind, expiresAt: new Date(Date.now() + TTL_MS).toISOString() };
      this.sweep();
      this.pending.set(id, {
        id, kind, tenantId: ctx.user.tenantId, userId: ctx.user.id, viewShopId: ctx.scope.shopId ?? null, shopId: built.shopId,
        expiresAt: Date.now() + TTL_MS, state: 'pending', payload: built.payload, proposal,
      });
      return {
        data: { proposed: true, kind, title: proposal.title, summary: proposal.summary, warnings: proposal.warnings, note: 'A confirmation card is shown to the user. Nothing is saved until they press Confirm. Tell them briefly to check the card and confirm.' },
        action: proposal,
      };
    } catch (e: any) {
      this.logger.warn(`Propose ${kind} failed: ${e?.message}`);
      return { refused: true, data: { error: 'DATA_ERROR', note: 'Could not prepare this action. Say so briefly.' } };
    }
  }

  private openPage(input: Record<string, any>): AiToolResult {
    const page = PAGES[String(input.page ?? '')];
    if (!page) return { refused: true, data: { error: 'UNKNOWN_PAGE', pages: Object.keys(PAGES) } };
    return {
      data: { opened: page.label, ...(input._refuse && { refusal: true }), note: 'A button to open the page is shown to the user.' },
      link: { label: `${page.label} kholein`, to: page.to, primary: true },
    };
  }

  private async build(kind: Kind, a: Record<string, any>, ctx: AiToolContext): Promise<
    { error: Record<string, unknown> } | { proposal: Omit<AiActionProposal, 'id' | 'kind' | 'expiresAt'>; payload: Record<string, any>; shopId: string | null }
  > {
    const tenantId = ctx.user.tenantId;
    switch (kind) {
      case 'create_product': {
        const name = String(a.name ?? '').trim().slice(0, 200);
        const price = n(a.price);
        if (!name || !(price >= 0)) return { error: { error: 'MISSING', need: [...(!name ? ['name'] : []), ...(!(price >= 0) ? ['price'] : [])], note: 'Ask only for what is missing.' } };
        const cost = a.cost_price == null ? null : n(a.cost_price);
        const stock = a.stock == null ? 0 : n(a.stock);
        const barcode = a.barcode ? String(a.barcode).trim().slice(0, 60) : '';
        const cats = await this.prisma.category.findMany({ where: { tenantId, isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 60 });
        const cat = a.category ? cats.map((c) => ({ ...c, s: similarity(String(a.category), c.name) })).sort((x, y) => y.s - x.s)[0] : null;
        const warnings: string[] = [];
        if (a.category && (!cat || cat.s < 0.5)) warnings.push(`Category "${a.category}" nahi mili — card me chunein.`);
        if (barcode && (await this.prisma.product.count({ where: { tenantId, OR: [{ barcode }, { sku: barcode }] } }))) warnings.push(`Barcode ${barcode} pehle se kisi product par hai.`);
        const twin = (await this.findProducts(tenantId, name, null, 1))[0];
        if (twin && twin.score >= 0.9) warnings.push(`Milta julta product pehle se hai: ${twin.name}.`);
        if (cost != null && cost > price) warnings.push('Cost sale price se zyada hai.');
        const shop = await this.writeShop(ctx);
        if (stock > 0 && shop && !ctx.scope.shopId) warnings.push(`Opening stock ${shop.name} me jayega.`);
        const fields: AiActionField[] = [
          { key: 'name', label: 'Naam', type: 'text', value: name, required: true },
          { key: 'price', label: 'Sale price', type: 'money', value: price, required: true },
          { key: 'costPrice', label: 'Cost', type: 'money', value: cost },
          { key: 'stock', label: 'Opening stock', type: 'number', value: stock },
          { key: 'unit', label: 'Unit', type: 'text', value: String(a.unit ?? 'pcs').slice(0, 20) },
          { key: 'barcode', label: 'Barcode', type: 'text', value: barcode || null },
          { key: 'categoryId', label: 'Category', type: 'select', value: cat && cat.s >= 0.5 ? cat.id : '', options: [{ value: '', label: 'Baghair category' }, ...cats.map((c) => ({ value: c.id, label: c.name }))] },
        ];
        return {
          shopId: shop?.id ?? null, payload: {},
          proposal: { title: 'Naya product', summary: `${name} — ${rs(price)}${stock ? `, stock ${stock}` : ''}`, fields, warnings, confirmLabel: 'Product banayein' },
        };
      }

      case 'update_price': {
        const pick = await this.pickProduct(ctx, String(a.product ?? ''), ctx.scope.shopId);
        if ('error' in pick) return { error: pick.error! };
        const p = pick.hit!;
        const price = n(a.new_price);
        if (!(price >= 0)) return { error: { error: 'MISSING', need: ['new_price'] } };
        const warnings = price < p.cost ? [`Nayi price cost (${rs(p.cost)}) se kam hai.`] : [];
        return {
          shopId: null, payload: { productId: p.id, oldPrice: p.price, name: p.name },
          proposal: {
            title: 'Price badlein', summary: `${p.name}: ${rs(p.price)} → ${rs(price)}`, warnings, confirmLabel: 'Price badlein',
            fields: [{ key: 'price', label: 'Nayi sale price', type: 'money', value: price, required: true }],
          },
        };
      }

      case 'adjust_stock': {
        const shop = await this.writeShop(ctx);
        const pick = await this.pickProduct(ctx, String(a.product ?? ''), shop?.id ?? null);
        if ('error' in pick) return { error: pick.error! };
        const p = pick.hit!;
        if (p.hasVariants) return { error: { error: 'NOT_SUPPORTED', note: 'This product has variants; stock must be adjusted on the Stock adjustment page.' } };
        const qty = Math.abs(n(a.quantity));
        const dir = ['in', 'out', 'damage', 'loss'].includes(String(a.direction)) ? String(a.direction) : 'in';
        if (!(qty > 0)) return { error: { error: 'MISSING', need: ['quantity'] } };
        const reason = String(a.reason ?? '').trim().slice(0, 200);
        const warnings: string[] = [];
        if (!reason) warnings.push('Wajah likhna zaroori hai.');
        if (dir !== 'in' && p.stock != null && p.stock - qty < 0) warnings.push(`Stock sirf ${p.stock} hai — minus me chala jayega.`);
        if (!ctx.scope.shopId && shop) warnings.push(`Ye ${shop.name} ka stock hai.`);
        return {
          shopId: shop?.id ?? null, payload: { productId: p.id, name: p.name },
          proposal: {
            title: 'Stock adjustment', summary: `${p.name}: ${dir === 'in' ? '+' : '−'}${qty} ${p.unit} (abhi ${p.stock ?? '—'})`, warnings, confirmLabel: 'Stock badlein',
            fields: [
              { key: 'direction', label: 'Kis tarah', type: 'select', value: dir, options: [{ value: 'in', label: 'Stock barhayein' }, { value: 'out', label: 'Stock kam karein' }, { value: 'damage', label: 'Kharab maal' }, { value: 'loss', label: 'Gum / chori' }] },
              { key: 'quantity', label: 'Quantity', type: 'number', value: qty, required: true },
              { key: 'reason', label: 'Wajah', type: 'text', value: reason, required: true },
            ],
          },
        };
      }

      case 'create_sale': {
        const shop = await this.writeShop(ctx);
        if (!shop) return { error: { error: 'NO_SHOP', note: 'The shop has no active branch.' } };
        const items = Array.isArray(a.items) ? a.items.slice(0, 30) : [];
        if (!items.length) return { error: { error: 'MISSING', need: ['items'], note: 'Ask which items and how many.' } };
        const lines: AiActionLine[] = [];
        const warnings: string[] = [];
        for (const it of items) {
          const pick = await this.pickProduct(ctx, String(it?.product ?? ''), shop.id);
          if ('error' in pick) return { error: pick.error! };
          const p = pick.hit!;
          if (p.hasVariants || (await this.prisma.productImei.count({ where: { productId: p.id } }))) {
            return { error: { error: 'NOT_SUPPORTED', product: p.name, note: 'Items with variants or IMEI must be sold from the POS. Offer open_page pos.' } };
          }
          const qty = Math.max(0.01, n(it?.qty) || 1);
          const existing = lines.find((l) => l.productId === p.id);
          if (existing) { existing.qty = r2(existing.qty + qty); existing.total = r2(existing.qty * existing.price); continue; }
          lines.push({ productId: p.id, name: p.name, unit: p.unit, qty, price: p.price, total: r2(qty * p.price), stock: p.stock });
        }
        for (const l of lines) if (l.stock == null || l.stock < l.qty) warnings.push(`${l.name}: ${shop.name} me stock ${l.stock ?? 0} hai, bill ${l.qty} ka.`);
        const total = r2(lines.reduce((s, l) => s + l.total, 0));
        const onKhata = a.on_khata === true || String(a.payment_method ?? '').toLowerCase() === 'khata';
        let customer: { id: string; name: string; balance: number; creditLimit: number } | null = null;
        if (a.customer) {
          const pc = await this.pickCustomer(ctx, String(a.customer));
          if ('error' in pc) return { error: pc.error! };
          customer = { id: pc.hit!.id, name: pc.hit!.name, balance: pc.hit!.balance, creditLimit: pc.hit!.creditLimit };
        }
        if (onKhata && !customer) return { error: { error: 'MISSING', need: ['customer'], note: 'A khata (udhaar) bill needs the customer name.' } };
        const method = onKhata ? 'KHATA' : this.method(a.payment_method);
        const paid = a.paid_amount != null ? Math.max(0, n(a.paid_amount)) : method === 'KHATA' ? 0 : total;
        const credit = Math.max(0, r2(total - paid));
        if (credit > 0) {
          if (!customer) warnings.push('Poori raqam nahi mili — baqi udhaar ke liye customer chahiye.');
          else {
            const after = r2(customer.balance + credit);
            warnings.push(`${customer.name} ka khata ${rs(customer.balance)} → ${rs(after)}.`);
            if (customer.creditLimit > 0 && after > customer.creditLimit) warnings.push(`Credit limit (${rs(customer.creditLimit)}) se upar — malik ka PIN lagega, POS se bill banayein.`);
          }
        }
        if (!ctx.scope.shopId) warnings.push(`Bill ${shop.name} ka banega.`);
        return {
          shopId: shop.id, payload: { customerId: customer?.id ?? null },
          proposal: {
            title: 'Naya bill', summary: `${lines.length} cheezein · ${rs(total)}${customer ? ` · ${customer.name}` : ''}`,
            lines, totals: { subtotal: total, total, paid, credit }, warnings, confirmLabel: 'Bill banayein',
            fields: [
              { key: 'paymentMethod', label: 'Payment', type: 'select', value: method, options: this.methodOptions(!!customer) },
              { key: 'paidAmount', label: 'Mili raqam', type: 'money', value: paid },
            ],
            alt: { label: 'POS me kholein', to: '/pos', state: { aiCart: lines.map((l) => ({ productId: l.productId, qty: l.qty })), ...(customer && { aiCustomerId: customer.id }) } },
          },
        };
      }

      case 'create_customer': {
        const name = String(a.name ?? '').trim().slice(0, 100);
        if (!name) return { error: { error: 'MISSING', need: ['name'] } };
        const phone = String(a.phone ?? '').replace(/[^\d+]/g, '').slice(0, 20);
        const warnings: string[] = [];
        if (phone && (await this.prisma.customer.count({ where: { tenantId, phone: { contains: phone.slice(-10) } } }))) warnings.push('Is phone ka customer pehle se hai.');
        return {
          shopId: null, payload: {},
          proposal: {
            title: 'Naya customer', summary: `${name}${phone ? ` · ${phone}` : ''}`, warnings, confirmLabel: 'Customer banayein',
            fields: [
              { key: 'name', label: 'Naam', type: 'text', value: name, required: true },
              { key: 'phone', label: 'Phone', type: 'text', value: phone || null },
              { key: 'creditLimit', label: 'Credit limit', type: 'money', value: a.credit_limit == null ? null : n(a.credit_limit) },
            ],
          },
        };
      }

      case 'receive_khata_payment': {
        const pc = await this.pickCustomer(ctx, String(a.customer ?? ''));
        if ('error' in pc) return { error: pc.error! };
        const c = pc.hit!;
        const amount = n(a.amount);
        if (!(amount > 0)) return { error: { error: 'MISSING', need: ['amount'] } };
        const warnings = amount > c.balance ? [`${c.name} ka baqi sirf ${rs(c.balance)} hai — is se zyada wasool nahi ho sakta.`] : [];
        return {
          shopId: null, payload: { customerId: c.id, name: c.name },
          proposal: {
            title: 'Khata payment', summary: `${c.name} se ${rs(amount)} wasool · baqi ${rs(c.balance)} → ${rs(Math.max(0, c.balance - amount))}`, warnings, confirmLabel: 'Payment likhein',
            fields: [
              { key: 'amount', label: 'Raqam', type: 'money', value: amount, required: true },
              { key: 'paymentMethod', label: 'Kaise mili', type: 'select', value: this.method(a.payment_method), options: this.methodOptions() },
            ],
          },
        };
      }

      case 'create_expense': {
        const title = String(a.title ?? '').trim().slice(0, 120);
        const amount = n(a.amount);
        if (!title || !(amount > 0)) return { error: { error: 'MISSING', need: [...(!title ? ['title'] : []), ...(!(amount > 0) ? ['amount'] : [])] } };
        const cats = await this.prisma.expenseCategory.findMany({ where: { tenantId, isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 60 });
        const cat = a.category ? cats.map((c) => ({ ...c, s: similarity(String(a.category), c.name) })).sort((x, y) => y.s - x.s)[0] : null;
        const shop = await this.writeShop(ctx);
        return {
          shopId: shop?.id ?? null, payload: {},
          proposal: {
            title: 'Naya expense', summary: `${title} — ${rs(amount)}`, warnings: !ctx.scope.shopId && shop ? [`Expense ${shop.name} ka likha jayega.`] : [], confirmLabel: 'Expense likhein',
            fields: [
              { key: 'title', label: 'Kis cheez ka', type: 'text', value: title, required: true },
              { key: 'amount', label: 'Raqam', type: 'money', value: amount, required: true },
              { key: 'paymentMethod', label: 'Payment', type: 'select', value: this.method(a.payment_method), options: this.methodOptions() },
              { key: 'categoryId', label: 'Category', type: 'select', value: cat && cat.s >= 0.5 ? cat.id : '', options: [{ value: '', label: 'Baghair category' }, ...cats.map((c) => ({ value: c.id, label: c.name }))] },
            ],
          },
        };
      }

      case 'create_income': {
        const title = String(a.title ?? '').trim().slice(0, 120);
        const amount = n(a.amount);
        if (!title || !(amount > 0)) return { error: { error: 'MISSING', need: [...(!title ? ['title'] : []), ...(!(amount > 0) ? ['amount'] : [])] } };
        const category = incomeCategory(`${a.category ?? ''} ${title}`);
        const suppliers = await this.prisma.supplier.findMany({ where: { tenantId, isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 200 });
        const hit = a.company ? suppliers.map((s) => ({ ...s, s: similarity(String(a.company), s.name) })).sort((x, y) => y.s - x.s)[0] : null;
        const supplierId = hit && hit.s >= 0.5 ? hit.id : '';
        const via = String(a.received_via ?? '') === 'supplier_khata' && supplierId ? 'SUPPLIER_KHATA' : 'CASH_DRAWER';
        const shop = await this.writeShop(ctx);
        return {
          shopId: shop?.id ?? null, payload: {},
          proposal: {
            title: 'Doosri aamdani', summary: `${title} — ${rs(amount)} (net profit mein judegi)`,
            warnings: [...(!ctx.scope.shopId && shop ? [`Aamdani ${shop.name} ki likhi jayegi.`] : []), ...(a.company && !supplierId ? [`"${a.company}" suppliers mein nahi mila.`] : [])],
            confirmLabel: 'Aamdani likhein',
            fields: [
              { key: 'title', label: 'Kis cheez ki', type: 'text', value: title, required: true },
              { key: 'amount', label: 'Raqam', type: 'money', value: amount, required: true },
              { key: 'category', label: 'Category', type: 'select', value: category, options: INCOME_OPTIONS },
              { key: 'supplierId', label: 'Company / supplier', type: 'select', value: supplierId, options: [{ value: '', label: 'Koi nahi' }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))] },
              { key: 'receivedVia', label: 'Kahan aaya', type: 'select', value: via, options: [{ value: 'CASH_DRAWER', label: 'Galle mein cash' }, { value: 'SUPPLIER_KHATA', label: 'Supplier khate mein adjust' }] },
            ],
          },
        };
      }

      case 'produce': {
        if (!this.manufacturing) return { error: { error: 'NOT_SUPPORTED', note: 'Manufacturing is not available.' } };
        const shop = await this.writeShop(ctx);
        if (!shop) return { error: { error: 'NO_SHOP', note: 'The shop has no active branch.' } };
        const pick = await this.pickProduct(ctx, String(a.product ?? ''), shop.id);
        if ('error' in pick) return { error: pick.error! };
        const p = pick.hit!;
        const qty = Math.abs(n(a.quantity));
        const batches = Math.abs(n(a.batches));
        const amount = qty > 0 ? { quantity: qty } : batches > 0 ? { batches } : { batches: 1 };
        let prev: Awaited<ReturnType<ManufacturingService['preview']>>;
        try {
          prev = await this.manufacturing.preview(ctx.user, ctx.scope, { shopId: shop.id, items: [{ productId: p.id, ...amount }] });
        } catch (e: any) {
          return { error: { error: 'NO_RECIPE', note: `${e?.message ?? 'No recipe'}. Tell the user to make the recipe first on the Banayein (manufacturing) page.` } };
        }
        const it = prev.items[0];
        const warnings = prev.materials.filter((m) => m.short > 0).map((m) => `${m.name}: ${m.need} ${m.unit} chahiye, stock ${m.have} — ${m.short} kam`);
        if (prev.shortCount && !prev.allowNegative) warnings.unshift('Raw maal kam hai — stock poora kiye baghair nahi banega.');
        if (!ctx.scope.shopId) warnings.push(`Ye ${shop.name} me banega.`);
        const uses = prev.materials.map((m) => `${m.name} ${m.need} ${m.unit}`).join(', ');
        return {
          shopId: shop.id, payload: { productId: p.id, name: p.name, unit: it.unit },
          proposal: {
            title: 'Production', summary: `${p.name}: ${it.quantity} ${it.unit} banayein · ${uses}`, warnings, confirmLabel: 'Bana dein',
            fields: [{ key: 'quantity', label: `Kitna banana hai (${it.unit})`, type: 'number', value: it.quantity, required: true }],
          },
        };
      }

      case 'create_purchase_draft': {
        const shop = await this.writeShop(ctx);
        if (!shop) return { error: { error: 'NO_SHOP' } };
        const suppliers = await this.prisma.supplier.findMany({ where: { tenantId, isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 100 });
        let supplier = a.supplier ? suppliers.map((s) => ({ ...s, sc: similarity(String(a.supplier), s.name) })).sort((x, y) => y.sc - x.sc)[0] : null;
        if (supplier && supplier.sc < 0.5) supplier = null;
        const lines: AiActionLine[] = [];
        const items = Array.isArray(a.items) ? a.items.slice(0, 40) : [];
        if (!items.length && a.from_reorder) {
          // Straight from the reorder suggestions: the supplier asked for, else the group with the most to order.
          const r = this.tools.toReorderPayload(ctx, await this.tools.reorder(ctx, { mode: 'reorder' }), 200);
          const groups = r.groups.filter((g) => g.shopId === shop.id);
          const g = (supplier ? groups.find((x) => x.supplier?.id === supplier!.id) : null)
            ?? [...groups].sort((x, y) => Number(!!y.supplier) - Number(!!x.supplier) || y.rows.length - x.rows.length)[0];
          if (!g) return { error: { error: 'NOTHING_TO_ORDER', note: 'Nothing needs ordering right now.' } };
          if (!supplier && g.supplier) supplier = { ...g.supplier, isActive: true, sc: 1 } as any;
          for (const row of g.rows) {
            const cost = row.lastCost ?? 0;
            lines.push({ productId: row.productId, name: row.name, unit: row.unit, qty: row.suggestQty, price: cost, total: r2(row.suggestQty * cost), stock: row.stock });
          }
        }
        for (const it of items) {
          const pick = await this.pickProduct(ctx, String(it?.product ?? ''), shop.id);
          if ('error' in pick) return { error: pick.error! };
          const p = pick.hit!;
          const qty = Math.max(0.01, n(it?.qty) || 1);
          const cost = it?.cost != null && n(it.cost) >= 0 ? n(it.cost) : p.cost;
          lines.push({ productId: p.id, name: p.name, unit: p.unit, qty, price: cost, total: r2(qty * cost), stock: p.stock });
        }
        if (!lines.length) return { error: { error: 'MISSING', need: ['items'], note: 'Use the reorder suggestions (stock_reorder) and pass their items, or ask what to order.' } };
        const total = r2(lines.reduce((s, l) => s + l.total, 0));
        const warnings = supplier ? [] : ['Supplier chunein.'];
        if (!ctx.scope.shopId) warnings.push(`Order ${shop.name} ke liye banega.`);
        return {
          shopId: shop.id, payload: {},
          proposal: {
            title: 'Purchase order (draft)', summary: `${lines.length} cheezein · ${rs(total)}${supplier ? ` · ${supplier.name}` : ''}`, lines, totals: { subtotal: total, total },
            warnings, confirmLabel: 'Order banayein',
            fields: [{ key: 'supplierId', label: 'Supplier', type: 'select', value: supplier?.id ?? '', required: true, options: [{ value: '', label: 'Chunein…' }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))] }],
            alt: { label: 'Purchase screen me kholein', to: '/purchases/new?order=1', state: { prefill: { supplierId: supplier?.id, supplierName: supplier?.name, lines: lines.map((l) => ({ productId: l.productId, qty: l.qty })) } } },
          },
        };
      }
    }
  }

  /* ───────────────────────── confirm / cancel ───────────────────────── */

  private sweep() {
    const now = Date.now();
    for (const [k, p] of this.pending) if (p.expiresAt < now - TTL_MS) this.pending.delete(k);
  }

  private own(user: AuthenticatedUser, scope: ShopScope, id: string): Pending {
    const p = this.pending.get(id);
    if (!p || p.tenantId !== user.tenantId || p.userId !== user.id) throw new HttpException({ code: 'EXPIRED', message: 'Ye action ab mojood nahi — dobara poochein.' }, 410);
    if (p.state === 'done') throw new HttpException({ code: 'EXPIRED', message: 'Ye action pehle hi ho chuka hai.' }, 410);
    if (p.state === 'cancelled') throw new HttpException({ code: 'EXPIRED', message: 'Ye action cancel ho chuka hai.' }, 410);
    if (p.state === 'running') throw new HttpException({ code: 'BAD_REQUEST', message: 'Ye action abhi chal raha hai.' }, 409);
    if (Date.now() > p.expiresAt) throw new HttpException({ code: 'EXPIRED', message: 'Waqt guzar gaya (10 minute) — dobara poochein.' }, 410);
    if ((scope.shopId ?? null) !== p.viewShopId) throw new HttpException({ code: 'FORBIDDEN', message: 'Branch badal gayi hai — is branch me dobara poochein.' }, 403);
    return p;
  }

  cancel(user: AuthenticatedUser, scope: ShopScope, id: string) {
    const p = this.own(user, scope, id);
    p.state = 'cancelled';
    return { ok: true };
  }

  async confirm(user: AuthenticatedUser, scope: ShopScope, id: string, fields: Record<string, unknown> = {}): Promise<AiActionResult> {
    const p = this.own(user, scope, id);
    const missing = NEEDS[p.kind].filter((perm) => !hasPermission(user.role, user.permissions, perm));
    if (missing.length) throw new HttpException({ code: 'FORBIDDEN', message: 'Is kaam ki permission aap ke paas nahi — dukaan ke malik se kehein.' }, 403);
    p.state = 'running';
    try {
      const out = await this.execute(p, user, fields);
      p.state = 'done';
      await this.audit(user, p, out.entityType, out.entityId, out.message);
      return { ok: true, message: out.message, links: out.links };
    } catch (e: any) {
      // A refused write (validation, stock, PIN) leaves the card open to fix and retry.
      p.state = 'pending';
      if (e instanceof HttpException) {
        const r = e.getResponse() as any;
        const msg = typeof r === 'string' ? r : Array.isArray(r?.message) ? r.message.join(', ') : r?.message ?? e.message;
        throw new HttpException({ code: e.getStatus() === 403 ? 'FORBIDDEN' : 'BAD_REQUEST', message: msg }, e.getStatus() >= 500 ? 400 : e.getStatus());
      }
      this.logger.error(`Action ${p.kind} failed: ${e?.message}`);
      throw new HttpException({ code: 'BAD_REQUEST', message: 'Kaam nahi ho saka. Dobara koshish karein ya screen se karein.' }, 400);
    }
  }

  private field(p: Pending, fields: Record<string, unknown>, key: string): unknown {
    if (Object.prototype.hasOwnProperty.call(fields, key)) return fields[key];
    return p.proposal.fields.find((f) => f.key === key)?.value ?? null;
  }

  private str(p: Pending, f: Record<string, unknown>, key: string, max: number): string {
    const v = this.field(p, f, key);
    return v == null ? '' : String(v).trim().slice(0, max);
  }

  private num(p: Pending, f: Record<string, unknown>, key: string): number | null {
    const v = this.field(p, f, key);
    if (v == null || v === '') return null;
    const x = Number(v);
    if (!Number.isFinite(x) || x < 0 || x > 1e9) throw new BadRequestException(`${key}: sahi number likhein`);
    return x;
  }

  private async execute(p: Pending, user: AuthenticatedUser, f: Record<string, unknown>): Promise<{ message: string; links: AiLink[]; entityType: string; entityId: string }> {
    const write = new ShopScope(p.shopId, !p.shopId);
    switch (p.kind) {
      case 'create_product': {
        const name = this.str(p, f, 'name', 200);
        const price = this.num(p, f, 'price');
        if (!name || price == null) throw new BadRequestException('Naam aur price zaroori hain');
        const dto: Partial<CreateProductDto> = {
          name, price,
          ...(this.num(p, f, 'costPrice') != null && { costPrice: this.num(p, f, 'costPrice')! }),
          ...(this.num(p, f, 'stock') && { stock: this.num(p, f, 'stock')! }),
          unit: this.str(p, f, 'unit', 20) || 'pcs',
          ...(this.str(p, f, 'barcode', 60) && { barcode: this.str(p, f, 'barcode', 60) }),
          ...(this.str(p, f, 'categoryId', 60) && { categoryId: this.str(p, f, 'categoryId', 60) }),
          ...(p.shopId && { shopId: p.shopId }),
        };
        const prod: any = await this.products.create(user, dto as CreateProductDto, write);
        return { message: `Product ban gaya: ${name}`, links: [{ label: 'Product kholein', to: `/products/${prod.id}` }], entityType: 'Product', entityId: prod.id };
      }
      case 'update_price': {
        const price = this.num(p, f, 'price');
        if (price == null) throw new BadRequestException('Price likhein');
        await this.products.update(user, p.payload.productId, { price } as any, write);
        return { message: `${p.payload.name} ki price ${rs(p.payload.oldPrice)} se ${rs(price)} ho gayi`, links: [{ label: 'Product kholein', to: `/products/${p.payload.productId}` }], entityType: 'Product', entityId: p.payload.productId };
      }
      case 'adjust_stock': {
        const qty = this.num(p, f, 'quantity');
        const reason = this.str(p, f, 'reason', 200);
        if (!qty || qty < 0.01) throw new BadRequestException('Quantity likhein');
        if (!reason) throw new BadRequestException('Wajah likhna zaroori hai');
        const dir = String(this.field(p, f, 'direction') ?? 'in');
        const type = dir === 'out' ? 'ADJUSTMENT_OUT' : dir === 'damage' ? 'DAMAGE' : dir === 'loss' ? 'LOSS' : 'ADJUSTMENT_IN';
        // A fixed reason gives the line its profit effect (loss or gain).
        const reasonCode = ({ out: 'SHOP_USE', damage: 'DAMAGE', loss: 'THEFT', in: 'AUDIT_FOUND' } as const)[dir as 'in'] ?? 'AUDIT_FOUND';
        const dto: CreateAdjustmentDto = { productId: p.payload.productId, type, reasonCode, quantity: qty, reason, ...(p.shopId && { shopId: p.shopId }), note: 'Nafaa AI se' } as CreateAdjustmentDto;
        const adj: any = await this.adjustments.create(user, write, dto);
        return { message: `${p.payload.name}: stock adjustment ho gaya`, links: [{ label: 'Stock adjustments', to: '/stock-adjustments' }], entityType: 'StockAdjustment', entityId: adj?.id ?? p.payload.productId };
      }
      case 'create_sale': {
        const lines = (p.proposal.lines ?? []).map((l) => {
          const q = f[`qty:${l.productId}`];
          const qty = q == null ? l.qty : Number(q);
          if (!Number.isFinite(qty) || qty < 0) throw new BadRequestException(`${l.name}: quantity sahi likhein`);
          return { ...l, qty };
        }).filter((l) => l.qty >= 0.01);
        if (!lines.length) throw new BadRequestException('Bill me koi cheez nahi');
        const total = r2(lines.reduce((s, l) => s + l.qty * l.price, 0));
        const methodRaw = String(this.field(p, f, 'paymentMethod') ?? 'CASH');
        const khata = methodRaw === 'KHATA';
        const paidField = this.num(p, f, 'paidAmount');
        const paid = khata ? Math.min(paidField ?? 0, total) : Math.min(paidField ?? total, total);
        if (paid < total - 0.005 && !p.payload.customerId) throw new BadRequestException('Udhaar ke liye customer chahiye — POS se bill banayein');
        const dto: CreateSaleDto = {
          paymentMethod: khata ? 'CASH' : this.method(methodRaw),
          paidAmount: r2(paid),
          items: lines.map((l) => ({ productId: l.productId, quantity: l.qty })),
          ...(p.shopId && { shopId: p.shopId }),
          ...(p.payload.customerId && { customerId: p.payload.customerId }),
          note: 'Nafaa AI se',
        } as CreateSaleDto;
        const sale: any = await this.sales.create(user, write, dto, undefined, { counter: true });
        return {
          message: `Bill ${sale.saleNumber} ban gaya — ${rs(Number(sale.total ?? total))}`,
          links: [{ label: 'Bill dekhein / Print', to: `/sales/${sale.id}/receipt` }, { label: 'Sales history', to: '/sales' }],
          entityType: 'Sale', entityId: sale.id,
        };
      }
      case 'create_customer': {
        const name = this.str(p, f, 'name', 100);
        if (!name) throw new BadRequestException('Naam zaroori hai');
        const limit = this.num(p, f, 'creditLimit');
        const dto: CreateCustomerDto = { name, ...(this.str(p, f, 'phone', 20) && { phone: this.str(p, f, 'phone', 20) }), ...(limit != null && { creditLimit: limit }) } as CreateCustomerDto;
        const c: any = await this.customers.create(user, write, dto);
        return { message: `Customer ban gaya: ${name}`, links: [{ label: 'Customer kholein', to: `/customers/${c.id}` }], entityType: 'Customer', entityId: c.id };
      }
      case 'receive_khata_payment': {
        const amount = this.num(p, f, 'amount');
        if (!amount || amount < 0.01) throw new BadRequestException('Raqam likhein');
        const dto: CreatePaymentDto = { amount, paymentMethod: this.method(this.field(p, f, 'paymentMethod')), note: 'Nafaa AI se' } as CreatePaymentDto;
        await this.ledger.receivePayment(user, write, p.payload.customerId, dto);
        return { message: `${p.payload.name} se ${rs(amount)} wasool likh liye`, links: [{ label: 'Khata dekhein', to: `/customers/${p.payload.customerId}` }], entityType: 'Customer', entityId: p.payload.customerId };
      }
      case 'create_expense': {
        const title = this.str(p, f, 'title', 120);
        const amount = this.num(p, f, 'amount');
        if (!title || !amount) throw new BadRequestException('Title aur raqam zaroori hain');
        const cat = this.str(p, f, 'categoryId', 60);
        const dto: CreateExpenseDto = { title, amount, paymentMethod: this.method(this.field(p, f, 'paymentMethod')), ...(cat && { categoryId: cat }), ...(p.shopId && { shopId: p.shopId }), description: 'Nafaa AI se' } as CreateExpenseDto;
        const e: any = await this.expenses.create(user, write, dto);
        return { message: `Expense likh liya: ${title} — ${rs(amount)}`, links: [{ label: 'Expenses', to: '/expenses' }], entityType: 'Expense', entityId: e?.id ?? '' };
      }
      case 'create_income': {
        if (!this.income) throw new BadRequestException('Aamdani abhi nahi likh sakte');
        const title = this.str(p, f, 'title', 120);
        const amount = this.num(p, f, 'amount');
        if (!title || !amount) throw new BadRequestException('Title aur raqam zaroori hain');
        const supplierId = this.str(p, f, 'supplierId', 60);
        const via = this.str(p, f, 'receivedVia', 20) === 'SUPPLIER_KHATA' ? 'SUPPLIER_KHATA' : 'CASH_DRAWER';
        if (via === 'SUPPLIER_KHATA' && !supplierId) throw new BadRequestException('Supplier khate ke liye supplier chunein');
        const cat = this.str(p, f, 'category', 30);
        const dto: CreateIncomeDto = {
          title, amount, category: (INCOME_OPTIONS.some((o) => o.value === cat) ? cat : 'OTHER') as IncomeCategory,
          receivedVia: via, ...(supplierId && { supplierId }), ...(p.shopId && { shopId: p.shopId }), note: 'Nafaa AI se',
        };
        const i = await this.income.create(user, write, dto);
        return { message: `Aamdani likh li: ${title} — ${rs(amount)}`, links: [{ label: 'Doosri aamdani', to: '/income' }], entityType: 'OtherIncome', entityId: i.id };
      }
      case 'produce': {
        if (!this.manufacturing) throw new BadRequestException('Manufacturing abhi nahi chal sakti');
        const qty = this.num(p, f, 'quantity');
        if (!qty || qty <= 0) throw new BadRequestException('Quantity likhein');
        const out = await this.manufacturing.produce(user, write, { shopId: p.shopId ?? undefined, items: [{ productId: p.payload.productId, quantity: qty }], notes: 'Nafaa AI se' }, 'AI');
        const run = out.runs[0];
        return { message: `${p.payload.name}: ${qty} ${p.payload.unit} ban gaya (${run.runNumber})`, links: [{ label: 'Production dekhein', to: `/manufacturing/history?run=${run.id}` }], entityType: 'ProductionRun', entityId: run.id };
      }
      case 'create_purchase_draft': {
        const supplierId = this.str(p, f, 'supplierId', 60);
        if (!supplierId) throw new BadRequestException('Supplier chunein');
        const lines = (p.proposal.lines ?? []).map((l) => {
          const q = f[`qty:${l.productId}`];
          return { ...l, qty: q == null ? l.qty : Number(q) };
        }).filter((l) => Number.isFinite(l.qty) && l.qty > 0);
        if (!lines.length) throw new BadRequestException('Order me koi cheez nahi');
        const dto: CreatePurchaseDto = {
          supplierId, paymentMethod: 'CASH', receive: false, notes: 'Nafaa AI se (reorder)',
          items: lines.map((l) => ({ productId: l.productId, quantity: l.qty, costPrice: l.price })),
          ...(p.shopId && { shopId: p.shopId }),
        } as CreatePurchaseDto;
        const po: any = await this.purchases.create(user, write, dto);
        return { message: `Purchase order ${po.purchaseNumber ?? ''} ban gaya (abhi maal nahi aaya)`.replace('  ', ' '), links: [{ label: 'Order kholein', to: `/purchases/${po.id}` }], entityType: 'Purchase', entityId: po.id };
      }
    }
  }

  private async audit(user: AuthenticatedUser, p: Pending, entityType: string, entityId: string, message: string) {
    try {
      await this.prisma.activityLog.create({
        data: {
          tenantId: user.tenantId, userId: user.id, action: `AI_${p.kind.toUpperCase()}`, entityType, entityId: entityId || null,
          description: `${message} (via Nafaa AI)`,
          metadata: { via: 'NAFAA_AI', actionId: p.id, shopId: p.shopId } as Prisma.InputJsonValue,
        },
      });
    } catch (e: any) {
      this.logger.warn(`Activity log for AI action failed: ${e?.message}`);
    }
  }
}
