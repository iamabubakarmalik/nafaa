// apps/web/src/modules/purchasing/purchases/pages/PurchasesPage.tsx
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import {
  Truck, Search, RefreshCw, FileSpreadsheet, Printer, X, Plus, Barcode,
  GraduationCap, Keyboard, CheckCircle2, Sparkles, Wallet, HandCoins,
  Package, ChevronDown, ChevronRight, Loader2, AlertTriangle,
  Building2, CalendarClock, TrendingUp, Layers, ArrowRight,
  Trash2, Banknote, CreditCard, Smartphone, ScanLine, BarChart3, Receipt,
  Crown, Minus, ShoppingCart, MessageCircle, Copy, Check, Share2,
  MapPin, Phone, User, ReceiptText, Maximize2, Minimize2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@/core/security/HiddenValue';
import { PrintStyles } from '@core/components/print/PrintStyles';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { purchasesApi, type Purchase } from '../api/purchases.api';
import { suppliersApi } from '@modules/purchasing/suppliers/api/suppliers.api';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { QuickSupplierModal, QuickProductModal } from '../components/QuickAddModals';
import { SupplierKhataModal } from '@modules/purchasing/suppliers/components/SupplierKhataModal';

/* ═════════════════════════════════════════════════════════════
   NAFAA — KHARIDARI v2 (har industry ke liye ek hi page)
   ─────────────────────────────────────────────────────────────
   🛒 Nayi Kharidari — barcode scanner + SKU search + quick-add
   🔄 Dobara Mangwao — jo khatam ho raha hai, ek click me bill me
   📊 Analytics — supplier, mahina, kis cheez par kitna kharch
   🧾 Record — har bill ki poori tafseel + THERMAL PRINT (58/80mm)
   🖨️ Receipt — save hote hi bill ka print, retail receipt jaisa
   ═════════════════════════════════════════════════════════════ */

type Tab = 'create' | 'reorder' | 'analytics' | 'history';
type PaperWidth = '58' | '80';

export interface PurchasesPageProps {
  gradient?: string;
  emoji?: string;
  industryLabel?: string;
  itemExtra?: (ctx: {
    item: Purchase['items'][number];
    purchase: Purchase;
  }) => React.ReactNode;
  draftLineExtra?: (ctx: { productId: string }) => React.ReactNode;
  productWizardPath?: string;
}

const PAY_OPTIONS: { v: PaymentMethod; label: string; icon: any }[] = [
  { v: 'CASH', label: 'Cash', icon: Banknote },
  { v: 'BANK_TRANSFER', label: 'Bank', icon: Building2 },
  { v: 'CARD', label: 'Card', icon: CreditCard },
  { v: 'JAZZCASH', label: 'JazzCash', icon: Smartphone },
  { v: 'EASYPAISA', label: 'Easypaisa', icon: Smartphone },
];

const PAY_COLORS: Record<string, string> = {
  CASH: '#10b981', BANK_TRANSFER: '#6366f1', CARD: '#3b82f6',
  JAZZCASH: '#e11d48', EASYPAISA: '#84cc16',
};

const PAY_LABEL: Record<string, string> = {
  CASH: 'Cash', BANK_TRANSFER: 'Bank Transfer', CARD: 'Card',
  JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa',
};

interface DraftLine {
  productId: string;
  name: string;
  unit: string;
  sku?: string | null;
  barcode?: string | null;
  imageUrl?: string | null;
  categoryName?: string | null;
  lastCost: number;
  quantity: number;
  costPrice: number;
}

/* ── Chhote helpers ─────────────────────────────────────── */
const num = (v: any): number => (typeof v === 'number' && !isNaN(v) ? v : Number(v) || 0);
const str = (v: any): string => (typeof v === 'string' ? v : v != null ? String(v) : '');

function makeShortNo(no: string, id: string): string {
  const src = no || id;
  if (!src) return '—';
  if (src.length <= 14) return src;
  return '#' + src.replace(/-/g, '').slice(-8).toUpperCase();
}

/* ════════════════════════════════════════════════════════════
   RECEIPT DATA — kisi bhi purchase object ko print-ready shape
   ════════════════════════════════════════════════════════════ */
interface ReceiptLine {
  name: string; qty: number; price: number; total: number; unit?: string; sku?: string;
}
interface PurchaseReceiptData {
  id: string; purchaseNumber: string; shortNo: string; date: string;
  supplierName: string; supplierPhone?: string; cashierName?: string;
  paymentMethod?: string; notes?: string;
  items: ReceiptLine[];
  subtotal: number; discount: number; total: number; paid: number; due: number;
}
interface ShopInfo {
  businessName: string; address: string; phone: string; ntn: string;
  receiptFooter: string; receiptLogoUrl: string; paperWidth: PaperWidth;
}

function normalizePurchaseForReceipt(raw: any): PurchaseReceiptData {
  const items: ReceiptLine[] = (raw?.items ?? []).map((it: any) => {
    const qty = num(it.quantity ?? it.qty ?? 1);
    const price = num(it.costPrice ?? it.price ?? 0);
    return {
      name: str(it.product?.name ?? it.name ?? 'Item'),
      qty, price,
      total: num(it.total ?? qty * price),
      unit: str(it.product?.unit ?? it.unit ?? '') || undefined,
      sku: str(it.product?.sku ?? it.sku ?? '') || undefined,
    };
  });
  const subtotal = num(raw?.subtotal ?? items.reduce((s, i) => s + i.total, 0));
  const discount = num(raw?.discount ?? 0);
  const total = num(raw?.total ?? subtotal - discount);
  const paid = num(raw?.paidAmount ?? raw?.paid ?? 0);
  const id = str(raw?.id);
  const purchaseNumber = str(raw?.purchaseNumber ?? id);
  return {
    id,
    purchaseNumber,
    shortNo: makeShortNo(purchaseNumber, id),
    date: str(raw?.purchasedAt ?? raw?.createdAt ?? new Date().toISOString()),
    supplierName: str(raw?.supplier?.name ?? raw?.supplierName ?? 'Supplier'),
    supplierPhone: str(raw?.supplier?.phone ?? '') || undefined,
    cashierName: str(raw?.createdBy?.fullName ?? raw?.createdBy?.name ?? '') || undefined,
    paymentMethod: PAY_LABEL[str(raw?.paymentMethod ?? '')] ?? (str(raw?.paymentMethod ?? '') || undefined),
    notes: str(raw?.notes ?? '') || undefined,
    items, subtotal, discount, total, paid,
    due: Math.max(0, total - paid),
  };
}

function normalizeShop(res: any): ShopInfo {
  const s = res?.settings ?? {};
  const t = res?.tenant ?? {};
  return {
    businessName: str(t.name ?? t.businessName ?? s.businessName ?? s.shopName ?? 'Nafaa Store'),
    address: str(t.address ?? s.address ?? s.shopAddress ?? ''),
    phone: str(t.phone ?? s.phone ?? s.shopPhone ?? ''),
    ntn: str(s.ntn ?? s.ntnNumber ?? t.ntn ?? ''),
    receiptFooter: str(s.receiptFooter ?? s.receipt_footer ?? 'Shukriya! Maal sahi receive ho gaya.'),
    receiptLogoUrl: str(s.receiptLogoUrl ?? s.logoUrl ?? t.logoUrl ?? ''),
    paperWidth: (str(s.paperWidth ?? s.receiptPaperWidth) === '58' ? '58' : '80') as PaperWidth,
  };
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════ */
export default function PurchasesPage({
  gradient = 'from-slate-950 via-teal-900 to-emerald-700',
  emoji = '🚚',
  industryLabel = 'Kharidari',
  itemExtra,
  draftLineExtra,
  productWizardPath = '/products/new',
}: PurchasesPageProps = {}) {
  const qc = useQueryClient();
  const hideCost = useCostHidden();
  const currentShopId = useShopParam();
  const shopName = useAuthStore((s: any) => s.user?.assignedShop?.name);
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [tab, setTab] = useState<Tab>('create');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  /* ─── Draft bill ─── */
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [pickSearch, setPickSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const pickRef = useRef<HTMLInputElement>(null);

  /* ─── Quick add / khata ─── */
  const [supSearch, setSupSearch] = useState('');
  const [supOpen, setSupOpen] = useState(false);
  const [quickSupplier, setQuickSupplier] = useState<string | null>(null);
  const [quickProduct, setQuickProduct] = useState<{ name?: string; barcode?: string } | null>(null);
  const [khataOpen, setKhataOpen] = useState(false);
  const supBoxRef = useRef<HTMLDivElement>(null);

  /* ─── Receipt (print) — save ke baad ya history se ─── */
  const [receiptOf, setReceiptOf] = useState<PurchaseReceiptData | null>(null);

  /* ─── Data ─── */
  const { data: purchases = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => purchasesApi.list(),
  });

  const { data: summary } = useQuery({
    queryKey: ['purchases-summary'],
    queryFn: () => purchasesApi.summary(),
  });

  const { data: suppliersRes } = useQuery({
    queryKey: ['suppliers-for-purchase'],
    queryFn: () => suppliersApi.list({ page: 1, limit: 200 }),
  });
  const suppliers = (suppliersRes as any)?.items ?? [];

  const { data: productsRes, isLoading: productsLoading } = useQuery({
    queryKey: ['products-for-purchase'],
    queryFn: () => productsApi.list({ page: 1, limit: 500 } as any),
  });
  const allProducts: Product[] = (productsRes as any)?.items ?? [];

  /* Dukaan ki settings — receipt header ke liye */
  const { data: settingsRes } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 60_000,
    retry: 1,
  });
  const shop = useMemo(() => normalizeShop(settingsRes), [settingsRes]);

  const reorderSource = useMemo(
    () => allProducts
      .filter((p) => p.isActive !== false && !p.hasVariants)
      .filter((p) => (p.stock ?? 0) <= (p.lowStockAlert ?? 0))
      .map((p) => ({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        stock: p.stock ?? 0,
        lowStockAlert: p.lowStockAlert ?? 0,
        isOut: (p.stock ?? 0) <= 0,
      })),
    [allProducts],
  );

  /* ─── Shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        if (receiptOf) return setReceiptOf(null);
        if (showShortcuts) return setShowShortcuts(false);
        if (showTeacher) return setShowTeacher(false);
        if (scannerOpen) return setScannerOpen(false);
        return;
      }
      if (typing || e.ctrlKey || e.metaKey) return;
      if (e.key === '/') {
        e.preventDefault();
        (tab === 'create' ? pickRef : searchRef).current?.focus();
      }
      if (e.key === 'b') { e.preventDefault(); setScannerOpen(true); }
      if (e.key === 'g') setShowTeacher(true);
      if (e.key === 'r') refetch();
      if (e.key === '?') setShowShortcuts((v) => !v);
      if (['1', '2', '3', '4'].includes(e.key)) {
        const t: Tab[] = ['create', 'reorder', 'analytics', 'history'];
        setTab(t[Number(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, showShortcuts, scannerOpen, tab, receiptOf]);

  const anyModal = showTeacher || showShortcuts || !!receiptOf;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  /* ─── Draft helpers ─── */
  const picked = useMemo(() => new Set(lines.map((l) => l.productId)), [lines]);

  const toLine = (p: Product, qty = 1): DraftLine => ({
    productId: p.id,
    name: p.name,
    unit: p.unit,
    sku: p.sku,
    barcode: p.barcode,
    imageUrl: (p as any).images?.[0]?.url ?? null,
    categoryName: (p as any).category?.name ?? null,
    lastCost: p.costPrice ?? 0,
    quantity: qty,
    costPrice: p.costPrice ?? 0,
  });

  const addProduct = (p: Product, qty = 1) => {
    setLines((prev) => {
      const hit = prev.find((l) => l.productId === p.id);
      if (hit) return prev.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + qty } : l));
      return [...prev, toLine(p, qty)];
    });
    setPickSearch('');
  };

  const patchLine = (id: string, v: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l) => (l.productId === id ? { ...l, ...v } : l)));

  const dropLine = (id: string) => setLines((prev) => prev.filter((l) => l.productId !== id));

  const handleBarcode = (code: string) => {
    const clean = code.trim();
    const hit = allProducts.find(
      (p) => p.barcode === clean || p.sku === clean ||
        (p.barcode ?? '').toLowerCase() === clean.toLowerCase(),
    );
    setScannerOpen(false);
    if (!hit) {
      toast.error(`Barcode ${clean} kisi cheez se nahi mila — nayi bana lein`);
      setTab('create');
      setQuickProduct({ barcode: clean });
      return;
    }
    setTab('create');
    addProduct(hit, 1);
    toast.success(`${hit.name} bill me aa gaya`);
  };

  const pickResults = useMemo(() => {
    const q = pickSearch.toLowerCase().trim();
    let l = allProducts.filter((p) => p.isActive !== false && !picked.has(p.id));
    if (q) {
      l = l.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q) ||
        (p.barcode ?? '').toLowerCase().includes(q),
      );
    }
    return l.slice(0, 50);
  }, [allProducts, pickSearch, picked]);

  const selectedSupplier = useMemo(
    () => suppliers.find((s: any) => s.id === supplierId) ?? null,
    [suppliers, supplierId],
  );

  const supplierResults = useMemo(() => {
    const q = supSearch.toLowerCase().trim();
    let l = [...suppliers];
    if (q) {
      l = l.filter((s: any) =>
        (s.name ?? '').toLowerCase().includes(q) ||
        (s.phone ?? '').toLowerCase().includes(q) ||
        (s.contactPerson ?? '').toLowerCase().includes(q) ||
        (s.city ?? '').toLowerCase().includes(q),
      );
    }
    return l.sort((a: any, b: any) =>
      Number(b.outstandingDue ?? 0) - Number(a.outstandingDue ?? 0),
    ).slice(0, 40);
  }, [suppliers, supSearch]);

  useEffect(() => {
    if (!supOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (supBoxRef.current && !supBoxRef.current.contains(e.target as Node)) setSupOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [supOpen]);

  const chooseSupplier = (s: any) => {
    setSupplierId(s.id);
    setSupSearch('');
    setSupOpen(false);
  };

  const subtotal = useMemo(() => lines.reduce((a, l) => a + l.quantity * l.costPrice, 0), [lines]);
  const total = Math.max(0, subtotal - Number(discount || 0));
  const paid = Number(paidAmount || 0);
  const due = Math.max(0, total - paid);
  const noPrice = lines.some((l) => l.costPrice <= 0);
  const canSave = !!supplierId && lines.length > 0 && !noPrice;
  const totalQty = useMemo(() => lines.reduce((a, l) => a + l.quantity, 0), [lines]);

  const resetDraft = () => {
    setLines([]); setSupplierId(''); setPaidAmount(''); setDiscount('');
    setNotes(''); setPickSearch(''); setPaymentMethod('CASH');
  };

  /* ─── Create — save hote hi receipt khol do ─── */
  const create = useMutation({
    mutationFn: () => purchasesApi.create({
      supplierId,
      paymentMethod,
      discount: Number(discount || 0) || undefined,
      paidAmount: paid,
      notes: notes || undefined,
      shopId: currentShopId || undefined,
      items: lines.map((l) => ({
        productId: l.productId, quantity: l.quantity, costPrice: l.costPrice,
      })),
    }),
    onSuccess: (created: any) => {
      toast.success('Kharidari darj ho gayi — stock barh gaya');

      /* Receipt ke liye: API ne poora purchase wapas diya to wahi use
         karein; warna draft se hi receipt bana lein (data same hai). */
      const supplier = selectedSupplier;
      const receiptBase = created && created.items
        ? normalizePurchaseForReceipt(created)
        : normalizePurchaseForReceipt({
            id: created?.id ?? `DRAFT-${Date.now()}`,
            purchaseNumber: created?.purchaseNumber ?? '',
            purchasedAt: new Date().toISOString(),
            supplier: supplier ? { name: supplier.name, phone: supplier.phone } : undefined,
            paymentMethod,
            notes,
            discount: Number(discount || 0),
            paidAmount: paid,
            items: lines.map((l) => ({
              quantity: l.quantity,
              costPrice: l.costPrice,
              total: l.quantity * l.costPrice,
              product: { name: l.name, unit: l.unit, sku: l.sku },
            })),
          });
      setReceiptOf(receiptBase);

      resetDraft();
      qc.invalidateQueries({ queryKey: ['purchases'] });
      qc.invalidateQueries({ queryKey: ['purchases-summary'] });
      qc.invalidateQueries({ queryKey: ['products-for-purchase'] });
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['suppliers-summary'] });
      qc.invalidateQueries({ queryKey: ['supplier'] });
      qc.invalidateQueries({ queryKey: ['supplier-statement'] });
      qc.invalidateQueries({ queryKey: ['electronics-stock-report'] });
      qc.invalidateQueries({ queryKey: ['electronics-low-stock'] });
      qc.invalidateQueries({ queryKey: ['electronics-pos-catalog'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Kharidari save nahi hui'),
  });

  /* ─── Reorder ─── */
  const reorderRows = useMemo(() => {
    const rows = reorderSource.filter((r) => !picked.has(r.productId));
    return rows.sort((a, b) => Number(b.isOut) - Number(a.isOut) || a.stock - b.stock);
  }, [reorderSource, picked]);

  const addAllReorder = () => {
    const toAdd = reorderRows
      .map((r) => {
        const p = allProducts.find((x) => x.id === r.productId);
        if (!p) return null;
        const need = Math.max(1, Math.ceil((r.lowStockAlert || 5) * 2 - r.stock));
        return toLine(p, need);
      })
      .filter(Boolean) as DraftLine[];
    if (toAdd.length === 0) return toast.error('Kuch add karne ko nahi');
    setLines((prev) => [...prev, ...toAdd]);
    setTab('create');
    toast.success(`${toAdd.length} cheezein bill me aa gayin`);
  };

  /* ─── History ─── */
  const historyList = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return purchases;
    return purchases.filter((p) =>
      p.purchaseNumber.toLowerCase().includes(q) ||
      p.supplier.name.toLowerCase().includes(q) ||
      p.items.some((it) => it.product.name.toLowerCase().includes(q)),
    );
  }, [purchases, search]);

  const dueOf = (p: Purchase) => Math.max(0, (p.total ?? 0) - (p.paidAmount ?? 0));

  const stats = useMemo(() => {
    let t = 0, pd = 0, units = 0;
    for (const p of purchases) {
      t += p.total ?? 0;
      pd += p.paidAmount ?? 0;
      for (const it of p.items) units += it.quantity ?? 0;
    }
    return { total: t, paid: pd, due: Math.max(0, t - pd), units };
  }, [purchases]);

  /* ─── Analytics ─── */
  const supplierRank = useMemo(() => {
    const m = new Map<string, { name: string; total: number; bills: number; due: number }>();
    for (const p of purchases) {
      const k = p.supplier.id;
      const row = m.get(k) ?? { name: p.supplier.name, total: 0, bills: 0, due: 0 };
      row.total += p.total ?? 0;
      row.bills += 1;
      row.due += dueOf(p);
      m.set(k, row);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [purchases]);

  const monthly = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of purchases) {
      const d = new Date(p.purchasedAt);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      m.set(k, (m.get(k) ?? 0) + (p.total ?? 0));
    }
    return [...m.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([k, v]) => ({
        month: new Date(k + '-01').toLocaleDateString('en-PK', { month: 'short', year: '2-digit' }),
        Kharch: Math.round(v),
      }));
  }, [purchases]);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of purchases) {
      for (const it of p.items) {
        const key = (it.product as any)?.category?.name
          ?? allProducts.find((ap) => ap.id === it.product.id)?.category?.name
          ?? 'Baqi';
        m.set(key, (m.get(key) ?? 0) + (it.total ?? 0));
      }
    }
    return [...m.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [purchases, allProducts]);

  const payBreakdown = useMemo(
    () => (summary?.paymentBreakdown ?? []).map((p: any) => ({
      name: p.paymentMethod, value: Math.round(p.total ?? 0),
    })),
    [summary],
  );

  const exportCsv = () => {
    const out: string[][] = [
      [`${tenantName ?? 'Nafaa'} — ${industryLabel} Kharidari`],
      [`Shop: ${shopName ?? 'All'}`, new Date().toLocaleString('en-PK')],
      [],
      ['KHULASA'],
      ['Kul kharidari', String(Math.round(stats.total))],
      ['Ada kiya', String(Math.round(stats.paid))],
      ['Supplier ka baqi', String(Math.round(stats.due))],
      ['Kul units khareede', String(stats.units)],
      [],
      ['SUPPLIERS', 'Bills', 'Kul kharidari', 'Baqi'],
      ...supplierRank.map((s) => [s.name, String(s.bills), String(Math.round(s.total)), String(Math.round(s.due))]),
      [],
      ['Purchase #', 'Tareekh', 'Supplier', 'Item', 'SKU', 'Ginti', 'Per unit', 'Kul', 'Bill ka baqi'],
      ...historyList.flatMap((p) =>
        p.items.map((it) => [
          p.purchaseNumber,
          new Date(p.purchasedAt).toLocaleDateString('en-PK'),
          p.supplier.name,
          it.product.name,
          it.product.sku ?? '',
          String(it.quantity),
          String(Math.round(it.costPrice)),
          String(Math.round(it.total)),
          String(Math.round(dueOf(p))),
        ]),
      ),
    ];
    const csv = out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-44 rounded-3xl bg-slate-200 animate-pulse" />
        <div className="h-14 rounded-3xl bg-slate-200 animate-pulse" />
        <div className="h-96 rounded-3xl bg-slate-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24 xl:pb-10 print:space-y-3">
      <PrintStyles orientation="landscape" title={`${industryLabel} Kharidari`} subtitle="Supplier se kya aaya" />
      {showTeacher && <PurchasesTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {scannerOpen && <BarcodeScanner onDetected={handleBarcode} onClose={() => setScannerOpen(false)} />}

      {/* 🖨️ Purchase receipt — save ke baad ya Record se */}
      {receiptOf && (
        <PurchaseReceiptModal
          data={receiptOf}
          shop={shop}
          onClose={() => setReceiptOf(null)}
          onDone={() => { setReceiptOf(null); setTab('history'); }}
        />
      )}

      {khataOpen && supplierId && (
        <SupplierKhataModal supplierId={supplierId} onClose={() => setKhataOpen(false)} />
      )}

      {quickSupplier !== null && (
        <QuickSupplierModal
          initialName={quickSupplier}
          onClose={() => setQuickSupplier(null)}
          onCreated={(sp) => {
            setQuickSupplier(null);
            setSupSearch('');
            setSupOpen(false);
            setSupplierId(sp.id);
          }}
        />
      )}

      {quickProduct !== null && (
        <QuickProductModal
          initialName={quickProduct.name}
          initialBarcode={quickProduct.barcode}
          wizardPath={productWizardPath}
          onClose={() => setQuickProduct(null)}
          onCreated={(pr) => {
            setQuickProduct(null);
            addProduct(pr as Product, 1);
            setPickSearch('');
            pickRef.current?.focus();
          }}
        />
      )}

      {/* ═══ HERO — redesigned, scanner yahan NAHI ═══ */}
      <section className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} text-white p-6 sm:p-7 shadow-2xl print:hidden`}>
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl animate-pulse" />
        <div className="absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-teal-300/15 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />

        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20 shadow-inner">
                <Truck className="h-3.5 w-3.5 text-amber-300" /> {industryLabel}
                {shopName && <><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>}
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight">
                {emoji} Supplier Se Maal
              </h1>
              <p className="mt-2 text-sm text-white/85 font-semibold max-w-lg">
                Naam se dhoondein ya product section se scan karein — stock khud barh jayega, bill ka print bhi ready
              </p>
            </div>

            {/* Header actions — Scan hata diya, wo neeche picker me hai */}
            <div className="flex items-center gap-1.5 flex-wrap print:hidden">
              <button onClick={() => setShowTeacher(true)}
                className="h-11 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition active:scale-95" title="Guide (G)">
                <GraduationCap className="h-4 w-4" /> Guide
              </button>
              <button onClick={() => setShowShortcuts(true)}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 inline-flex items-center justify-center backdrop-blur transition active:scale-95" title="Shortcuts (?)">
                <Keyboard className="h-4 w-4" />
              </button>
              <PrivacyToggle compact />
              <button onClick={() => refetch()} disabled={isRefetching}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition disabled:opacity-50 active:scale-95" title="Refresh (R)">
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={exportCsv}
                className="h-11 px-3.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition active:scale-95">
                <FileSpreadsheet className="h-4 w-4" /> CSV
              </button>
              <button onClick={() => window.print()}
                className="h-11 px-3.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition active:scale-95">
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          </div>

          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <HeroStat label="Kul Kharidari" value={hideCost ? '••••••' : formatPKR(stats.total)} icon={Wallet}
              sub={`${purchases.length} bills`} />
            <HeroStat label="Ada Kiya" value={hideCost ? '••••••' : formatPKR(stats.paid)} icon={CheckCircle2}
              sub={stats.total > 0 ? `${Math.round((stats.paid / Math.max(1, stats.total)) * 100)}% ada` : undefined} />
            <HeroStat label="Supplier Ka Baqi" value={formatPKR(stats.due)} icon={HandCoins}
              highlight={stats.due > 0}
              sub={stats.due > 0 ? `${purchases.filter((p) => dueOf(p) > 0).length} bills me baqi` : 'sab clear ✅'} />
            <HeroStat label="Is Mahine" value={hideCost ? '••••••' : formatPKR(summary?.monthPurchases ?? 0)}
              icon={CalendarClock} sub={`${summary?.monthCount ?? 0} bills`} />
          </div>
        </div>
      </section>

      {/* ═══ TABS ═══ */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-2 flex gap-1.5 overflow-x-auto print:hidden sticky top-2 z-30">
        {([
          { v: 'create', label: 'Nayi Kharidari', icon: Plus, n: lines.length || undefined },
          { v: 'reorder', label: 'Dobara Mangwao', icon: RefreshCw, n: reorderRows.length || undefined },
          { v: 'analytics', label: 'Analytics', icon: BarChart3 },
          { v: 'history', label: 'Record', icon: Receipt, n: purchases.length || undefined },
        ] as { v: Tab; label: string; icon: any; n?: number }[]).map((k, i) => (
          <button key={k.v} onClick={() => setTab(k.v)} title={`Shortcut: ${i + 1}`}
            className={`h-11 px-4 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 shrink-0 transition active:scale-95 ${
              tab === k.v ? 'bg-gradient-to-r from-teal-600 to-emerald-700 text-white shadow-lg shadow-teal-600/25'
                : 'text-slate-600 hover:bg-slate-100'
            }`}>
            <k.icon className="h-4 w-4" /> {k.label}
            {k.n != null && (
              <span className={`px-1.5 rounded-full text-[10px] tabular-nums ${tab === k.v ? 'bg-black/20' : 'bg-slate-200'}`}>{k.n}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════ CREATE ══════════════ */}
      {tab === 'create' && (
        <div className="grid xl:grid-cols-[1fr_400px] gap-5 items-start">
          <div className="space-y-4 min-w-0">

            {/* ── STEP 1: Supplier ── */}
            <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-3 hover:border-teal-200 transition-colors">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Head n={1} icon={Building2} title="Supplier" desc="Kis se maal liya" tone="teal" />
                <button onClick={() => setQuickSupplier('')}
                  className="h-9 px-3 rounded-xl bg-teal-50 border-2 border-teal-200 text-teal-700 text-[11px] font-extrabold inline-flex items-center gap-1 hover:bg-teal-100 transition shrink-0 active:scale-95">
                  <Plus className="h-3.5 w-3.5" /> Naya
                </button>
              </div>

              {selectedSupplier ? (
                <div className="rounded-2xl border-2 border-teal-300 bg-gradient-to-br from-teal-50/80 to-emerald-50/60 p-3.5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white flex items-center justify-center font-black text-base shrink-0 shadow-lg shadow-teal-600/30">
                      {(selectedSupplier.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-slate-900 truncate">{selectedSupplier.name}</div>
                      <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-600">
                        {selectedSupplier.phone && <span>📞 {selectedSupplier.phone}</span>}
                        {selectedSupplier.contactPerson && <span>👤 {selectedSupplier.contactPerson}</span>}
                        {selectedSupplier.city && <span>📍 {selectedSupplier.city}</span>}
                        <span>Ab tak {formatPKR(selectedSupplier.totalPurchased ?? 0)}</span>
                        {Number(selectedSupplier.outstandingDue ?? 0) > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-extrabold">
                            {formatPKR(selectedSupplier.outstandingDue)} purana baqi
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => setKhataOpen(true)} title="Is supplier ka khata"
                        className="h-9 px-3 rounded-xl bg-violet-100 border-2 border-violet-200 text-[11px] font-extrabold text-violet-700 hover:bg-violet-200 transition inline-flex items-center gap-1 active:scale-95">
                        <Receipt className="h-3.5 w-3.5" /> Khata
                      </button>
                      <button onClick={() => { setSupplierId(''); setSupOpen(true); }} title="Badlein"
                        className="h-9 px-3 rounded-xl bg-white border-2 border-slate-200 text-[11px] font-extrabold text-slate-600 hover:border-teal-400 transition active:scale-95">
                        Badlein
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div ref={supBoxRef} className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={supSearch} onFocus={() => setSupOpen(true)}
                    onChange={(e) => { setSupSearch(e.target.value); setSupOpen(true); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && supplierResults.length === 1) chooseSupplier(supplierResults[0]);
                      if (e.key === 'Escape') setSupOpen(false);
                    }}
                    placeholder={suppliers.length === 0 ? 'Abhi koi supplier nahi — naam likh kar bana lein' : 'Naam, phone ya sheher se dhoondein…'}
                    className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-bold focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition" />

                  {supOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1.5 rounded-2xl border-2 border-slate-200 bg-white shadow-2xl overflow-hidden">
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                        {supplierResults.length === 0 ? (
                          <div className="p-6 text-center">
                            <Truck className="h-7 w-7 text-slate-300 mx-auto mb-1.5" />
                            <p className="text-sm font-bold text-slate-700">
                              {supSearch ? `"${supSearch}" naam ka koi supplier nahi` : 'Abhi koi supplier nahi bana'}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Neeche se yahin bana lein</p>
                          </div>
                        ) : supplierResults.map((sp: any) => (
                          <button key={sp.id} onClick={() => chooseSupplier(sp)}
                            className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-teal-50 transition">
                            <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black text-xs shrink-0">
                              {(sp.name ?? '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-extrabold text-slate-900 text-sm truncate">{sp.name}</div>
                              <div className="text-[11px] font-bold text-slate-500 flex items-center gap-2 flex-wrap">
                                {sp.phone && <span className="font-mono">{sp.phone}</span>}
                                {sp.city && <span>{sp.city}</span>}
                              </div>
                            </div>
                            {Number(sp.outstandingDue ?? 0) > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold tabular-nums shrink-0">
                                {formatPKR(sp.outstandingDue)} baqi
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => { setQuickSupplier(supSearch.trim()); setSupOpen(false); }}
                        className="w-full px-3 py-3 flex items-center gap-2 text-left bg-teal-50 border-t-2 border-teal-200 hover:bg-teal-100 transition">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white flex items-center justify-center shrink-0">
                          <Plus className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-black text-teal-900 truncate">
                            {supSearch.trim() ? `"${supSearch.trim()}" naam se naya supplier` : 'Naya supplier banayein'}
                          </div>
                          <div className="text-[10px] font-bold text-teal-700">Yahin, page chhore baghair</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── STEP 2: Products — SCANNER YAHIN HAI ── */}
            <section className="rounded-3xl bg-white border-2 border-blue-300 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Head n={2} icon={Package} title="Kya Kya Aaya" desc="Scan karein ya naam/SKU se dhoondein" tone="blue" />
                <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition ${
                  lines.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {lines.length} cheezein
                </span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input ref={pickRef} value={pickSearch} onChange={(e) => setPickSearch(e.target.value)}
                    placeholder="Naam, SKU ya barcode se dhoondein... (/)"
                    className="h-12 w-full rounded-xl border-2 border-slate-200 pl-9 pr-3 text-sm font-bold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition" />
                </div>
                <button onClick={() => setScannerOpen(true)} title="Barcode scan (B)"
                  className="h-12 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-sm font-extrabold inline-flex items-center gap-1.5 shadow-lg shadow-blue-600/25 shrink-0 transition active:scale-95 hover:brightness-110">
                  <ScanLine className="h-4 w-4" /> Scan
                </button>
                <button onClick={() => setQuickProduct({ name: pickSearch.trim() })} title="Nayi cheez yahin banayein"
                  className="h-12 px-4 rounded-xl bg-white border-2 border-blue-300 text-blue-700 text-sm font-extrabold inline-flex items-center gap-1.5 hover:bg-blue-50 shrink-0 transition active:scale-95">
                  <Plus className="h-4 w-4" /> Nayi
                </button>
              </div>

              <div className="rounded-xl border-2 border-slate-200 max-h-64 overflow-y-auto divide-y divide-slate-100">
                {productsLoading ? (
                  <div className="p-8 text-center text-sm font-bold text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Products aa rahe hain…
                  </div>
                ) : allProducts.length === 0 ? (
                  <div className="p-8 text-center">
                    <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">Abhi koi cheez hi nahi bani</p>
                    <button onClick={() => setQuickProduct({ name: '' })}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-blue-700 hover:underline">
                      Pehli cheez yahin banayein <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : pickResults.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm font-bold text-slate-500">
                      {pickSearch ? `"${pickSearch}" se kuch nahi mila` : 'Sab cheezein bill me daal di'}
                    </p>
                    {pickSearch && (
                      <button onClick={() => setQuickProduct({ name: pickSearch.trim() })}
                        className="mt-2 inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xs font-extrabold shadow transition active:scale-95">
                        <Plus className="h-4 w-4" /> "{pickSearch.trim()}" banayein
                      </button>
                    )}
                  </div>
                ) : pickResults.map((p) => (
                  <button key={p.id} onClick={() => addProduct(p)}
                    className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-blue-50 transition group">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-lg overflow-hidden border border-slate-200">
                      {(p as any).images?.[0]?.url
                        ? <img src={(p as any).images[0].url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        : '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-slate-900 text-sm truncate">{p.name}</div>
                      <div className="text-[11px] font-bold text-slate-500 flex items-center gap-2 flex-wrap">
                        {p.sku && <span className="font-mono">{p.sku}</span>}
                        {p.barcode && <span className="font-mono text-slate-400">{p.barcode}</span>}
                        <span className={(p.stock ?? 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {p.stock ?? 0} {p.unit} maujood
                        </span>
                        {draftLineExtra?.({ productId: p.id })}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-extrabold text-slate-700 tabular-nums">
                        {hideCost ? '•••' : formatPKR(p.costPrice ?? 0)}
                      </div>
                      <div className="text-[9px] font-bold text-slate-400">pichli lagat</div>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition">
                      <Plus className="h-4 w-4" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Draft lines */}
              {lines.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-blue-50/40 p-8 text-center">
                  <ShoppingCart className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">Bill abhi khaali hai</p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    Upar se scan ya dhoond kar cheezein daalein
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-slate-200 divide-y divide-slate-100 overflow-hidden">
                  {lines.map((l, idx) => {
                    const diff = l.lastCost > 0 ? l.costPrice - l.lastCost : 0;
                    const diffPct = l.lastCost > 0 ? (diff / l.lastCost) * 100 : 0;
                    return (
                      <div key={l.productId} className="px-3 py-3 space-y-2 bg-white hover:bg-slate-50/60 transition">
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg overflow-hidden border border-slate-200">
                              {l.imageUrl
                                ? <img src={l.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                                : '📦'}
                            </div>
                            <span className="absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full bg-slate-800 text-white text-[9px] font-black flex items-center justify-center">
                              {idx + 1}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-extrabold text-slate-900 text-sm truncate">{l.name}</div>
                            <div className="text-[11px] font-bold text-slate-500 flex items-center gap-2 flex-wrap">
                              {l.sku && <span className="font-mono">{l.sku}</span>}
                              {draftLineExtra?.({ productId: l.productId })}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-extrabold text-slate-900 tabular-nums">
                              {formatPKR(l.quantity * l.costPrice)}
                            </div>
                          </div>
                          <button onClick={() => dropLine(l.productId)}
                            className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 transition active:scale-95">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-end gap-2 flex-wrap pl-12">
                          <div>
                            <div className="text-[9px] uppercase font-extrabold text-slate-500 mb-0.5">Ginti</div>
                            <div className="inline-flex items-center bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                              <button onClick={() => patchLine(l.productId, { quantity: Math.max(1, l.quantity - 1) })}
                                className="h-9 w-9 hover:bg-slate-200 transition flex items-center justify-center active:scale-95">
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <input type="number" min={1} value={l.quantity}
                                onChange={(e) => patchLine(l.productId, { quantity: Math.max(1, Number(e.target.value || 1)) })}
                                className="h-9 w-16 text-center bg-transparent border-0 font-extrabold text-sm focus:outline-none tabular-nums" />
                              <button onClick={() => patchLine(l.productId, { quantity: l.quantity + 1 })}
                                className="h-9 w-9 bg-blue-600 text-white hover:bg-blue-700 transition flex items-center justify-center active:scale-95">
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <div className="text-[9px] uppercase font-extrabold text-slate-500 mb-0.5">Per unit rate</div>
                            <input type="number" min={0} value={l.costPrice || ''}
                              onChange={(e) => patchLine(l.productId, { costPrice: Number(e.target.value || 0) })}
                              placeholder="0"
                              className={`h-9 w-28 rounded-lg border-2 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none transition ${
                                l.costPrice <= 0 ? 'border-rose-300 focus:border-rose-500 bg-rose-50/50' : 'border-slate-200 focus:border-teal-500'
                              }`} />
                          </div>
                          {l.lastCost > 0 && Math.abs(diffPct) >= 1 && (
                            <div className={`px-2 py-1 rounded-lg text-[10px] font-extrabold ${
                              diff > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {diff > 0 ? '▲' : '▼'} {Math.abs(diffPct).toFixed(0)}% — pichli baar {formatPKR(l.lastCost)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {noPrice && (
                <div className="rounded-xl bg-rose-50 border-2 border-rose-200 p-3 flex items-center gap-2 text-sm font-semibold text-rose-900">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> Har cheez ka per-unit rate likhna zaroori hai
                </div>
              )}
            </section>

            {/* ── STEP 3: Payment ── */}
            {lines.length > 0 && (
              <section className="rounded-3xl bg-white border-2 border-emerald-300 shadow-sm p-5 space-y-3">
                <Head n={3} icon={Wallet} title="Paisa" desc="Kitna diya, kitna baqi" tone="emerald" />

                <div className="flex gap-1.5 flex-wrap">
                  {PAY_OPTIONS.map((o) => (
                    <button key={o.v} onClick={() => setPaymentMethod(o.v)}
                      className={`h-10 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 active:scale-95 ${
                        paymentMethod === o.v ? 'bg-teal-600 text-white border-transparent shadow-lg shadow-teal-600/25'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300'
                      }`}>
                      <o.icon className="h-3.5 w-3.5" /> {o.label}
                    </button>
                  ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Lbl>Discount <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
                    <input type="number" min={0} value={discount}
                      onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition" />
                  </div>
                  <div>
                    <Lbl>Kitna Ada Kiya</Lbl>
                    <input type="number" min={0} value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="h-11 w-full rounded-xl border-2 border-emerald-300 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 transition" />
                    <button onClick={() => setPaidAmount(total)}
                      className="mt-1.5 text-[11px] font-extrabold text-emerald-700 hover:underline">
                      Poora ada kiya ({formatPKR(total)})
                    </button>
                  </div>
                </div>

                <div>
                  <Lbl>Note <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
                  <input value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="jaise: supplier ka bill number 4471"
                    className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition" />
                </div>
              </section>
            )}
          </div>

          {/* ── Sticky summary (desktop) ── */}
          <aside className="xl:sticky xl:top-20 xl:self-start space-y-3">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white p-5 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-300">
                    Bill Ka Khulasa
                  </div>
                  {lines.length > 0 && (
                    <span className="text-[10px] font-extrabold text-white/60 tabular-nums">
                      {lines.length} items • {totalQty} qty
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <SumRow label="Subtotal" value={formatPKR(subtotal)} />
                  {Number(discount || 0) > 0 && (
                    <SumRow label="Discount" value={`− ${formatPKR(Number(discount))}`} tone="rose" />
                  )}
                  <div className="pt-2 border-t border-white/20">
                    <SumRow label="Kul" value={formatPKR(total)} big />
                  </div>
                  <SumRow label="Ada kiya" value={formatPKR(paid)} tone="emerald" />
                  <div className="pt-2 border-t border-white/20">
                    <SumRow label="Supplier ka baqi" value={due > 0 ? formatPKR(due) : 'Clear ✅'}
                      big tone={due > 0 ? 'rose' : 'emerald'} />
                  </div>
                </div>

                <Button onClick={() => create.mutate()} disabled={!canSave || create.isPending}
                  className="mt-4 w-full bg-gradient-to-r from-emerald-500 to-teal-600 font-extrabold shadow-lg shadow-emerald-500/25 h-12 text-sm">
                  {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Kharidari Darj Karein
                </Button>

                <p className="mt-2 text-[10px] font-bold text-white/50 text-center">
                  Save hote hi receipt khul jayegi — print ready 🖨️
                </p>

                {!canSave && lines.length > 0 && (
                  <p className="mt-1.5 text-[11px] font-bold text-amber-300 text-center">
                    {!supplierId ? 'Supplier chunein' : 'Har cheez ka rate likhein'}
                  </p>
                )}

                {lines.length > 0 && (
                  <button onClick={() => { if (confirm('Poora bill khaali kar dein?')) resetDraft(); }}
                    className="mt-2 w-full h-9 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-extrabold transition active:scale-95">
                    Bill Khaali Karein
                  </button>
                )}
              </div>
            </div>

            {reorderRows.length > 0 && (
              <button onClick={() => setTab('reorder')}
                className="w-full rounded-2xl bg-amber-50 border-2 border-amber-300 p-3 flex items-center gap-2.5 text-left hover:bg-amber-100 transition active:scale-[0.98]">
                <RefreshCw className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0 text-xs font-bold text-amber-900">
                  <b>{reorderRows.length} cheezein</b> khatam ho rahi hain — dobara mangwayein
                </div>
                <ArrowRight className="h-4 w-4 text-amber-600 shrink-0" />
              </button>
            )}
          </aside>
        </div>
      )}

      {/* ── Mobile sticky save bar ── */}
      {tab === 'create' && lines.length > 0 && (
        <div className="xl:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t-2 border-slate-200 p-3 print:hidden">
          <div className="flex items-center gap-3 max-w-3xl mx-auto">
            <div className="min-w-0">
              <div className="text-[10px] font-extrabold text-slate-500 uppercase">{lines.length} items • {totalQty} qty</div>
              <div className="text-lg font-black text-slate-900 tabular-nums leading-tight">{formatPKR(total)}</div>
            </div>
            <Button onClick={() => create.mutate()} disabled={!canSave || create.isPending}
              className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 font-extrabold shadow-lg">
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Darj Karein
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════ REORDER ══════════════ */}
      {tab === 'reorder' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 p-5 flex items-center gap-3 flex-wrap">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-amber-950">Jo Khatam Ho Raha Hai</h3>
              <p className="text-xs font-semibold text-amber-800">
                Ginti khud tajweez ki gayi hai — alert level ka dugna. Badal bhi sakte hain.
              </p>
            </div>
            {reorderRows.length > 0 && (
              <button onClick={addAllReorder}
                className="h-11 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg shadow-amber-600/30 transition shrink-0 active:scale-95">
                <Plus className="h-4 w-4" /> Sab Bill Me Daalein
              </button>
            )}
          </div>

          {reorderRows.length === 0 ? (
            <div className="rounded-3xl bg-white border-2 border-slate-200 p-12 text-center shadow-sm">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="font-extrabold text-slate-900 text-lg">Sab kuch stock me hai 🎉</h3>
              <p className="text-sm font-semibold text-slate-500 mt-1.5">Abhi kuch mangwane ki zaroorat nahi</p>
            </div>
          ) : (
            <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
              {reorderRows.map((r) => {
                const p = allProducts.find((x) => x.id === r.productId);
                const need = Math.max(1, Math.ceil((r.lowStockAlert || 5) * 2 - r.stock));
                return (
                  <div key={r.productId} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${
                      r.isOut ? 'bg-rose-100' : 'bg-amber-100'
                    }`}>📦</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-slate-900 text-sm truncate">{r.name}</div>
                      <div className="text-[11px] font-bold text-slate-500 flex items-center gap-2 flex-wrap">
                        {r.sku && <span className="font-mono">{r.sku}</span>}
                        {draftLineExtra?.({ productId: r.productId })}
                      </div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-extrabold shrink-0 ${
                      r.isOut ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {r.isOut ? 'Khatam' : `${r.stock} ${r.unit}`}
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="text-sm font-extrabold text-slate-900 tabular-nums">{need}</div>
                      <div className="text-[10px] font-bold text-slate-400">mangwao</div>
                    </div>
                    <button onClick={() => { if (p) { addProduct(p, need); toast.success(`${p.name} bill me aa gaya`); } }}
                      disabled={!p}
                      className="h-10 px-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow shrink-0 disabled:opacity-40 transition active:scale-95">
                      <Plus className="h-3.5 w-3.5" /> Daalein
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ ANALYTICS ══════════════ */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Kul Bills" value={String(purchases.length)} icon={Receipt} tone="blue" />
            <Kpi label="Suppliers" value={String(supplierRank.length)} icon={Building2} tone="violet" />
            <Kpi label="Per Bill Average"
              value={hideCost ? '•••' : formatPKR(purchases.length ? stats.total / purchases.length : 0)}
              icon={Wallet} tone="emerald" />
            <Kpi label="Baqi Wale Suppliers" value={String(supplierRank.filter((s) => s.due > 0).length)}
              icon={HandCoins} tone="amber" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Mahine Ka Kharch" subtitle="Pichle 12 mahine" icon={TrendingUp}>
              {monthly.length === 0 ? <Empty msg="Abhi data nahi" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthly}>
                    <defs>
                      <linearGradient id="purchGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" width={54} tickLine={false} axisLine={false}
                      tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))}
                      contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700, fontSize: 12 }} />
                    <Area type="monotone" dataKey="Kharch" stroke="#0d9488" strokeWidth={2.5} fill="url(#purchGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Kis Cheez Par Kitna" subtitle="Category ke hisab se kharidari" icon={Layers}>
              {byCategory.length === 0 ? <Empty msg="Abhi data nahi" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={byCategory} margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" tickLine={false} axisLine={false}
                      tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748b" width={120} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))}
                      contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700, fontSize: 12 }} />
                    <Bar dataKey="value" fill="#0d9488" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Paisa Kaise Diya" subtitle="Cash, bank, card" icon={CreditCard}>
              {payBreakdown.length === 0 ? <Empty msg="Abhi data nahi" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={payBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                      {payBreakdown.map((p: any, i: number) => (
                        <Cell key={i} fill={PAY_COLORS[p.name] ?? '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                      contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b-2 border-slate-100 flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                  <Crown className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Sab Se Bare Suppliers</h3>
                  <p className="text-xs text-slate-500">Rate baat karte waqt kaam aata hai</p>
                </div>
              </div>
              {supplierRank.length === 0 ? (
                <div className="p-10 text-center text-sm font-bold text-slate-500">Abhi koi kharidari nahi</div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {supplierRank.slice(0, 10).map((s, i) => (
                    <div key={s.name} className="px-4 py-3 flex items-center gap-3">
                      <div className="w-6 text-center text-xs font-extrabold text-slate-400 tabular-nums shrink-0">{i + 1}</div>
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-slate-900 text-sm truncate">{s.name}</div>
                        <div className="text-[11px] font-bold text-slate-500">{s.bills} bills</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-slate-900 tabular-nums text-sm">
                          {hideCost ? '•••' : formatPKR(s.total)}
                        </div>
                        {s.due > 0 && (
                          <div className="text-[10px] font-extrabold text-rose-600">{formatPKR(s.due)} baqi</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ HISTORY ══════════════ */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="relative print:hidden">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Bill #, supplier, product... (/)"
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition" />
          </div>

          {historyList.length === 0 ? (
            <div className="rounded-3xl bg-white border-2 border-slate-200 p-12 text-center shadow-sm">
              <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-extrabold text-slate-900 text-lg">
                {search ? 'Kuch nahi mila' : 'Abhi tak koi kharidari nahi'}
              </h3>
              <button onClick={() => setTab('create')}
                className="mt-4 inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-700 text-white text-sm font-extrabold shadow-lg transition active:scale-95">
                <Plus className="h-4 w-4" /> Nayi Kharidari
              </button>
            </div>
          ) : (
            <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
              {historyList.map((p) => {
                const open = expanded.has(p.id);
                const due = dueOf(p);

                return (
                  <div key={p.id}>
                    <div className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition">
                      <button onClick={() => toggle(p.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 text-white shadow-lg ${
                          due > 0 ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/25'
                            : 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/25'
                        }`}>
                          <Truck className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-sm font-mono">{p.purchaseNumber}</span>
                            {due > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold">
                                Baqi {formatPKR(due)}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500">
                            <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{p.supplier.name}</span>
                            <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />
                              {new Date(p.purchasedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span>{p.items.length} items</span>
                          </div>
                        </div>
                      </button>

                      {/* 🖨️ Har bill ka seedha print */}
                      <button
                        onClick={() => setReceiptOf(normalizePurchaseForReceipt(p))}
                        title="Bill ka print (thermal receipt)"
                        className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 flex items-center justify-center shrink-0 transition active:scale-95 print:hidden">
                        <Printer className="h-4 w-4" />
                      </button>

                      <button onClick={() => toggle(p.id)} className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-base font-extrabold text-slate-900 tabular-nums">
                            {hideCost ? '•••••' : formatPKR(p.total ?? 0)}
                          </div>
                          <div className={`text-[10px] font-extrabold ${due > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {due > 0 ? `${formatPKR(due)} baqi` : 'Poora ada ✅'}
                          </div>
                        </div>
                        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                      </button>
                    </div>

                    {open && (
                      <div className="px-4 pb-4 pt-1 bg-slate-50 space-y-2.5">
                        <div className="rounded-xl border-2 border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
                          {p.items.map((it) => (
                            <div key={it.id} className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                  <Package className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-extrabold text-slate-900 text-sm truncate">{it.product.name}</div>
                                  <div className="text-[11px] font-bold text-slate-500 tabular-nums">
                                    {it.quantity} {it.product.unit} × {hideCost ? '•••' : formatPKR(it.costPrice)}
                                  </div>
                                </div>
                                <div className="font-extrabold text-slate-900 tabular-nums text-sm shrink-0">
                                  {hideCost ? '•••' : formatPKR(it.total)}
                                </div>
                              </div>
                              {itemExtra?.({ item: it, purchase: p })}
                            </div>
                          ))}
                        </div>

                        <div className="rounded-xl border-2 border-slate-200 bg-white p-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1">
                          <Detail label="Subtotal" value={hideCost ? '•••' : formatPKR(p.subtotal ?? 0)} />
                          {(p.discount ?? 0) > 0 && <Detail label="Discount" value={`− ${formatPKR(p.discount)}`} tone="rose" />}
                          <Detail label="Kul" value={hideCost ? '•••' : formatPKR(p.total ?? 0)} strong />
                          <Detail label="Ada kiya" value={hideCost ? '•••' : formatPKR(p.paidAmount ?? 0)} tone="emerald" />
                          {due > 0 && <Detail label="Baqi" value={formatPKR(due)} tone="rose" strong />}
                          <Detail label="Payment" value={PAY_LABEL[p.paymentMethod] ?? p.paymentMethod} />
                          {p.createdBy?.fullName && <Detail label="Kisne banaya" value={p.createdBy.fullName} />}
                          {p.supplier.phone && <Detail label="Supplier phone" value={p.supplier.phone} />}
                        </div>

                        {p.notes && (
                          <div className="rounded-xl bg-white border-2 border-slate-200 p-3 text-xs font-semibold text-slate-600">
                            📝 {p.notes}
                          </div>
                        )}

                        <div className="flex items-center gap-4 print:hidden">
                          <Link to={`/purchases/${p.id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-teal-700 hover:underline">
                            Poora bill dekhein <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                          <button onClick={() => setReceiptOf(normalizePurchaseForReceipt(p))}
                            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-700 hover:underline">
                            <Printer className="h-3.5 w-3.5" /> Receipt print karein
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PURCHASE RECEIPT MODAL — 58/80mm thermal, retail jaisa
   ════════════════════════════════════════════════════════════ */
function PurchaseReceiptModal({
  data, shop, onClose, onDone,
}: {
  data: PurchaseReceiptData;
  shop: ShopInfo;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [paperWidth, setPaperWidth] = useState<PaperWidth>(shop.paperWidth ?? '80');
  const [mode, setMode] = useState<'short' | 'full'>('short');
  const [copied, setCopied] = useState(false);
  const full = mode === 'full';
  const dateObj = new Date(data.date);

  const doPrint = useCallback(() => {
    document.body.dataset.paper = paperWidth;
    window.print();
  }, [paperWidth]);

  useEffect(() => {
    document.body.dataset.paper = paperWidth;
    return () => { delete document.body.dataset.paper; };
  }, [paperWidth]);

  const shareWhatsApp = () => {
    const lines = [
      `*${shop.businessName}* — Kharidari Bill`,
      `Bill ${data.shortNo}`,
      `Date: ${dateObj.toLocaleString('en-PK')}`,
      `Supplier: ${data.supplierName}`,
      '─────────────────',
      ...data.items.map((it) => `${it.name} ×${it.qty} — ${formatPKR(it.total)}`),
      '─────────────────',
      `*Kul: ${formatPKR(data.total)}*`,
      `Ada kiya: ${formatPKR(data.paid)}`,
      data.due > 0 ? `⚠ Baqi: ${formatPKR(data.due)}` : 'Poora ada ✅',
      '',
      '_Powered by Nafaa POS_',
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, '_blank');
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(
        `${shop.businessName} — Bill ${data.shortNo} — Kul ${formatPKR(data.total)} — Ada ${formatPKR(data.paid)}${data.due > 0 ? ` — Baqi ${formatPKR(data.due)}` : ''}`,
      );
      setCopied(true);
      toast.success('Copy ho gaya');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Copy nahi hua'); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 print:bg-white print:p-0 print:static"
      onClick={onClose}>
      <PurchaseReceiptPrintStyles />

      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-neutral-100 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col print:max-h-none print:shadow-none print:rounded-none print:bg-white">

        {/* Toolbar — print me nahi */}
        <div className="px-4 py-3 bg-white border-b flex items-center gap-2 flex-wrap shrink-0 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
              <ReceiptText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-wider text-emerald-600 font-extrabold">Kharidari darj ho gayi ✅</div>
              <h3 className="font-extrabold text-slate-900 text-sm truncate">Bill {data.shortNo}</h3>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
            <div className="flex rounded-xl border overflow-hidden">
              <button onClick={() => setMode('short')}
                className={`px-2.5 py-1.5 text-[11px] font-extrabold flex items-center gap-1 ${!full ? 'bg-slate-900 text-white' : ''}`}>
                <Minimize2 className="h-3 w-3" /> Short
              </button>
              <button onClick={() => setMode('full')}
                className={`px-2.5 py-1.5 text-[11px] font-extrabold flex items-center gap-1 ${full ? 'bg-slate-900 text-white' : ''}`}>
                <Maximize2 className="h-3 w-3" /> Full
              </button>
            </div>
            <div className="flex rounded-xl border overflow-hidden">
              {(['58', '80'] as const).map((w) => (
                <button key={w} onClick={() => setPaperWidth(w)}
                  className={`px-2.5 py-1.5 text-[11px] font-extrabold tabular-nums ${paperWidth === w ? 'bg-slate-900 text-white' : ''}`}>
                  {w}mm
                </button>
              ))}
            </div>
            <button onClick={shareWhatsApp} className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition active:scale-95" title="WhatsApp">
              <MessageCircle className="h-4 w-4" />
            </button>
            <button onClick={copyText} className="p-2 rounded-xl border hover:bg-slate-100 transition active:scale-95" title="Copy">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
            <button onClick={doPrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 text-white px-3.5 py-2 text-xs font-extrabold hover:bg-blue-700 transition active:scale-95 shadow-lg shadow-blue-600/25">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition active:scale-95" title="Band (Esc)">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Receipt paper */}
        <div className="flex-1 overflow-y-auto flex justify-center px-3 py-5 print:p-0 print:overflow-visible print:block">
          <div
            id="purchase-receipt-paper"
            className="pr-paper bg-white text-black shadow-xl print:shadow-none h-fit"
            style={{ width: paperWidth === '58' ? 220 : 300 }}
          >
            {/* Header */}
            <div className="pr-center">
              {shop.receiptLogoUrl && (
                <img src={shop.receiptLogoUrl} alt="" className="pr-logo"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <div className="pr-shop">{shop.businessName}</div>
              {shop.address && <div className="pr-sub"><MapPin className="h-3 w-3 inline" /> {shop.address}</div>}
              {shop.phone && <div className="pr-sub"><Phone className="h-3 w-3 inline" /> {shop.phone}</div>}
              {full && shop.ntn && <div className="pr-sub">NTN: {shop.ntn}</div>}
              <div className="pr-doctag">— KHARIDARI BILL —</div>
            </div>

            <div className="pr-div" />

            {/* Meta */}
            <div className="pr-meta">
              <div className="pr-meta-cell">
                <span className="pr-meta-label">Bill #</span>
                <b className="pr-meta-value">{data.shortNo}</b>
              </div>
              <div className="pr-meta-cell pr-right">
                <span className="pr-meta-label"><CalendarClock className="h-3 w-3 inline" /> Date</span>
                <span className="pr-meta-value tabular-nums">
                  {dateObj.toLocaleDateString('en-PK')} {dateObj.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            <div className="pr-row">
              <span><User className="h-3 w-3 inline" /> Supplier</span>
              <b>{data.supplierName}</b>
            </div>
            {data.supplierPhone && (
              <div className="pr-row pr-dim"><span>Phone</span><span className="tabular-nums">{data.supplierPhone}</span></div>
            )}
            {full && data.cashierName && (
              <div className="pr-row pr-dim"><span>Receive kiya</span><span>{data.cashierName}</span></div>
            )}

            <div className="pr-div" />

            {/* Items */}
            <div className="pr-row pr-head">
              <span><Package className="h-3 w-3 inline" /> Cheez</span>
              <span>Amount</span>
            </div>
            {data.items.map((it, i) => (
              <div key={i} className="pr-item">
                <div className="pr-iname">
                  <span className="pr-inum">{i + 1}.</span> {it.name}
                </div>
                <div className="pr-row pr-idetail">
                  <span className="tabular-nums">
                    {it.qty} × {formatPKR(it.price)}{full && it.unit ? ` ${it.unit}` : ''}
                  </span>
                  <b className="tabular-nums">{formatPKR(it.total)}</b>
                </div>
                {full && it.sku && (
                  <div className="pr-row pr-idetail pr-dim"><span>SKU</span><span className="tabular-nums">{it.sku}</span></div>
                )}
              </div>
            ))}

            <div className="pr-div" />

            {/* Totals */}
            <div className="pr-row"><span>Subtotal</span><span className="tabular-nums">{formatPKR(data.subtotal)}</span></div>
            {data.discount > 0 && (
              <div className="pr-row pr-dim"><span>Discount</span><span className="tabular-nums">−{formatPKR(data.discount)}</span></div>
            )}
            <div className="pr-row">
              <span>Items</span>
              <span className="tabular-nums">{data.items.length} ({data.items.reduce((a, i) => a + i.qty, 0)} qty)</span>
            </div>

            <div className="pr-total">
              <span>KUL</span>
              <span className="tabular-nums">{formatPKR(data.total)}</span>
            </div>

            <div className="pr-row">
              <span><Wallet className="h-3 w-3 inline" /> Ada kiya{data.paymentMethod ? ` (${data.paymentMethod})` : ''}</span>
              <span className="tabular-nums">{formatPKR(data.paid)}</span>
            </div>
            {data.due > 0 && (
              <div className="pr-credit">
                <span>⚠ BAQI (KHATA)</span>
                <b className="tabular-nums">{formatPKR(data.due)}</b>
              </div>
            )}

            {data.notes && (
              <>
                <div className="pr-div" />
                <div className="pr-sub" style={{ textAlign: 'left' }}>📝 {data.notes}</div>
              </>
            )}

            {/* Barcode strip */}
            <div className="pr-barcode" aria-hidden>
              {data.shortNo.replace(/[^A-Z0-9]/gi, '').split('').map((ch, i) => (
                <span key={i} className="pr-bar" style={{ width: (ch.charCodeAt(0) % 3) + 1.5 }} />
              ))}
            </div>
            <div className="pr-center pr-sub" style={{ letterSpacing: 2 }}>{data.shortNo}</div>

            <div className="pr-div" />

            <div className="pr-center pr-sub">{shop.receiptFooter}</div>
            <div className="pr-powered">
              <span className="pr-star">✦</span> Powered by <b>Nafaa POS</b> <span className="pr-star">✦</span>
            </div>
            <div className="pr-cut">— — — — — — — — — — — — — — ✂</div>
          </div>
        </div>

        {/* Bottom bar — print me nahi */}
        <div className="px-4 py-3 bg-white border-t flex gap-2 shrink-0 print:hidden">
          <button onClick={doPrint}
            className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition active:scale-95">
            <Printer className="h-4 w-4" /> Abhi Print Karein
          </button>
          <button onClick={onDone ?? onClose}
            className="h-11 px-5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-700 text-white text-sm font-extrabold inline-flex items-center gap-2 shadow-lg transition active:scale-95">
            <CheckCircle2 className="h-4 w-4" /> Theek Hai
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PURCHASE RECEIPT PRINT CSS — thermal bulletproof (58/80mm)
   ════════════════════════════════════════════════════════════ */
function PurchaseReceiptPrintStyles() {
  return (
    <style>{`
      .pr-paper { padding: 16px 12px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; line-height: 1.35; color: #000; }
      .pr-center { text-align: center; }
      .pr-shop { font-size: 17px; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; }
      .pr-sub { font-size: 10.5px; color: #444; }
      .pr-logo { max-height: 48px; max-width: 70%; margin: 0 auto 6px; object-fit: contain; filter: grayscale(1) contrast(1.4); }
      .pr-doctag { font-size: 11px; font-weight: 800; letter-spacing: 1.5px; margin-top: 6px; }
      .pr-div { border-top: 1px dashed #999; margin: 8px 0; }
      .pr-row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
      .pr-head { font-weight: 800; border-bottom: 1.5px solid #000; padding-bottom: 3px; margin-bottom: 4px; }
      .pr-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin: 2px 0; }
      .pr-meta-cell { display: flex; flex-direction: column; }
      .pr-meta-cell.pr-right { text-align: right; align-items: flex-end; }
      .pr-meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: .5px; color: #666; font-weight: 700; }
      .pr-meta-value { font-size: 12px; font-weight: 800; word-break: break-all; }
      .pr-item { margin-bottom: 5px; page-break-inside: avoid; break-inside: avoid; }
      .pr-iname { font-weight: 700; }
      .pr-inum { color: #888; font-weight: 400; font-size: 10px; }
      .pr-idetail { font-size: 11px; }
      .pr-dim { color: #555; }
      .pr-total { display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 4px 0; margin: 6px 0; }
      .pr-credit { display: flex; justify-content: space-between; font-weight: 800; background: #f3f4f6; border: 1.5px solid #000; padding: 4px 6px; border-radius: 4px; margin-top: 4px; }
      .pr-barcode { display: flex; align-items: flex-end; justify-content: center; gap: 1.5px; height: 28px; margin-top: 10px; }
      .pr-bar { display: inline-block; height: 100%; background: #000; }
      .pr-powered { text-align: center; font-size: 10px; color: #555; margin-top: 8px; font-weight: 600; }
      .pr-powered b { font-weight: 800; color: #000; }
      .pr-star { color: #999; }
      .pr-cut { text-align: center; color: #bbb; font-size: 10px; margin-top: 10px; letter-spacing: 2px; white-space: nowrap; overflow: hidden; }

      @media print {
        body * { visibility: hidden; }
        #purchase-receipt-paper, #purchase-receipt-paper * { visibility: visible; }
        #purchase-receipt-paper {
          position: absolute; left: 0; top: 0;
          box-shadow: none !important; margin: 0 !important;
          width: 100% !important; max-width: 100% !important;
          padding: 4mm 2mm !important;
        }
        #purchase-receipt-paper, #purchase-receipt-paper * {
          color: #000 !important; background: #fff !important;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
          text-shadow: none !important; box-shadow: none !important;
        }
        #purchase-receipt-paper .pr-credit { background: #fff !important; border: 1.5px solid #000 !important; }
        #purchase-receipt-paper .pr-div { border-top-color: #000 !important; }
        #purchase-receipt-paper .pr-logo { filter: grayscale(1) contrast(2) !important; }
        #purchase-receipt-paper .pr-bar { background: #000 !important; }
        #purchase-receipt-paper svg { display: none; }

        @page { margin: 0; size: auto; }
        body[data-paper="58"] #purchase-receipt-paper { width: 58mm !important; font-size: 10px; }
        body[data-paper="58"] #purchase-receipt-paper .pr-shop { font-size: 13px; }
        body[data-paper="58"] #purchase-receipt-paper .pr-total { font-size: 13px; }
        body[data-paper="58"] #purchase-receipt-paper .pr-barcode { height: 20px; }
        body[data-paper="80"] #purchase-receipt-paper { width: 80mm !important; }

        .pr-item, .pr-total, .pr-row { page-break-inside: avoid; break-inside: avoid; }
      }
    `}</style>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}

function Head({ n, icon: Icon, title, desc, tone }: any) {
  const g: Record<string, string> = {
    teal: 'from-teal-500 to-emerald-700',
    blue: 'from-blue-500 to-indigo-700',
    emerald: 'from-emerald-500 to-teal-700',
  };
  return (
    <div className="flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${g[tone]} text-white flex items-center justify-center shadow-md shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h3 className="font-extrabold text-slate-900 text-base leading-tight">
          <span className="text-slate-400">{n}.</span> {title}
        </h3>
        <p className="text-xs text-slate-500 font-semibold">{desc}</p>
      </div>
    </div>
  );
}

function HeroStat({ label, value, sub, icon: Icon, highlight }: any) {
  return (
    <div className={`rounded-2xl backdrop-blur border p-4 transition hover:scale-[1.02] ${
      highlight ? 'bg-white/25 border-white/40 shadow-lg' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-white/70 tracking-wider">
        <Icon className="h-3.5 w-3.5" /> <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums truncate">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] font-bold text-white/70 truncate">{sub}</div>}
    </div>
  );
}

const SUM_TONES: Record<string, string> = {
  slate: 'text-white', emerald: 'text-emerald-300', rose: 'text-rose-300',
};

function SumRow({ label, value, tone = 'slate', big }: any) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold text-white/70">{label}</span>
      <span className={`tabular-nums ${big ? 'text-xl font-extrabold' : 'text-sm font-bold'} ${SUM_TONES[tone]}`}>
        {value}
      </span>
    </div>
  );
}

const KPI_TONES: Record<string, string> = {
  blue: 'from-blue-500 to-indigo-600',
  violet: 'from-violet-500 to-purple-600',
  emerald: 'from-emerald-500 to-teal-600',
  amber: 'from-amber-500 to-orange-600',
};

function Kpi({ label, value, icon: Icon, tone }: any) {
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm flex items-center justify-between gap-2 hover:shadow-md transition">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">{label}</div>
        <div className="mt-1 text-xl font-extrabold text-slate-900 tabular-nums truncate">{value}</div>
      </div>
      <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${KPI_TONES[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

function Card({ title, subtitle, icon: Icon, children }: any) {
  return (
    <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-9 w-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="h-[280px]">{children}</div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="h-full flex items-center justify-center text-sm font-bold text-slate-500">{msg}</div>
  );
}

const DETAIL_TONES: Record<string, string> = {
  slate: 'text-slate-900', emerald: 'text-emerald-700', rose: 'text-rose-600',
};

function Detail({ label, value, strong, tone = 'slate' }: any) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-slate-100 last:border-0">
      <span className="text-[11px] font-bold text-slate-500 shrink-0">{label}</span>
      <span className={`text-[12px] tabular-nums truncate ${strong ? 'font-extrabold' : 'font-bold'} ${DETAIL_TONES[tone]}`}>
        {value}
      </span>
    </div>
  );
}

function PurchasesTeacher({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: ScanLine, title: 'Barcode scan karke bill banayein',
      body: 'Step 2 "Kya Kya Aaya" me Scan dabayein aur dabbe ka barcode scan karein — cheez foran bill me aa jati hai. Ya naam, SKU, barcode kuch bhi type karke dhoond lein.',
      tips: ['B dabao to scanner khul jaye', 'Har product nazar aata hai — stock ho ya na ho'],
    },
    {
      icon: TrendingUp, title: 'Rate ka farq nazar aata hai',
      body: 'Jo rate aap likhte hain wo pichli baar ke rate se compare hota hai. Rate barh gaya ho to laal me "▲ 12% — pichli baar 4,500" likha aata hai.',
      tips: ['Ginti + rate dono bill me set hote hain'],
    },
    {
      icon: Printer, title: 'Bill ka print foran',
      body: 'Kharidari save hote hi thermal receipt khul jati hai — 58mm ya 80mm, dono ready. Record tab me har bill par bhi 🖨 button hai, kabhi bhi dobara print kar lein.',
      tips: ['WhatsApp se supplier ko bhi bhej sakte hain'],
    },
    {
      icon: Barcode, title: 'Serial wali cheezein',
      body: 'Laptop, camera jaisi cheez bill me ho to uspar 🔖 badge aata hai. Bill save karne ke baad Record tab me wo bill kholein — wahin se saare serial numbers ek sath paste kar dein.',
      tips: ['Serial na daalein to warranty track nahi hoti'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber-700 font-extrabold">Guide</div>
              <h3 className="font-extrabold text-slate-900">Kharidari Ka Tareeqa</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {steps.map((st, i) => (
            <div key={i} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <st.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-slate-900">{st.title}</div>
                <div className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">{st.body}</div>
                <ul className="mt-2 space-y-1">
                  {st.tips.map((tp, j) => (
                    <li key={j} className="text-[11px] font-semibold text-slate-500 flex items-start gap-1.5">
                      <Sparkles className="h-2.5 w-2.5 text-amber-500 shrink-0 mt-0.5" /> {tp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 text-right shrink-0">
          <Button onClick={onClose} className="bg-gradient-to-r from-amber-500 to-orange-600 font-extrabold shadow-lg">
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const sc = [
    ['B', 'Barcode scanner'], ['/', 'Search par jao'], ['1 – 4', 'Tab badlein'],
    ['G', 'Guide kholo'], ['R', 'Refresh'], ['?', 'Ye list'], ['Esc', 'Band karo'],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <Keyboard className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-slate-900">Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {sc.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">{desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-100 border-2 border-slate-200 font-mono text-xs font-extrabold text-slate-700">{key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
