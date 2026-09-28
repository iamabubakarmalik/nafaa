import { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wheat, Search, X, RefreshCw, Plus, Minus, Package, Sprout, FlaskConical,
  Bug, Tractor, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2, XCircle,
  FileSpreadsheet, Printer, GraduationCap, TrendingUp, Award, Layers,
  Grid3x3, List as ListIcon, Star, DollarSign, Boxes, Flame, Barcode,
  ShoppingCart, Edit3, Eye, Trash2, Download, SlidersHorizontal, Save, PackageX,
  Calendar, Scale, Landmark, Leaf,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productEmoji, productTint } from '@modules/inventory/products/lib/productEmoji';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { tagsApi } from '@modules/inventory/tags/api/tags.api';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';
import { ProductDeleteButton } from '@core/components/ProductDeleteButton';
import { PrivacyToggle, useCostHidden } from '@/core/security/HiddenValue';
import { agriProductsApi, type AgriProductProfile } from '../api/products.api';
import { certStatus, isMeasured, agriUnitLabel, SEASONS } from '../lib/agriUnits';
import {
  deriveAgriKind, prettyAgriKind, AGRI_KIND_EMOJI,
  isSeedKind, isFertKind, isSprayKind, isFeedKind, isToolKind, needsGovtReg,
  type AgriKind,
} from '../lib/agriCategory';

/* ═════════════════════════════════════════════════════════════
   AGRI — SAARA MAAL EK JAGAH  (Bakery/Retail jaisa, poora)
   ─────────────────────────────────────────────────────────────
   💀 Skeleton loading      📌 Sticky toolbar
   📷 Barcode scan (B)      🔒 Cost chhupao (PIN)
   ☑️ Select + bulk actions  🗑️ Delete (2-step, safe)
   🏷️ Brand / Tag / Status  📦 Quick stock — ISI file me
   🖨️ Print + CSV           ⌨️ / B A V G Esc

   Aur agri ki apni do cheezein jo kisi aur industry me nahi:

   1. SARKARI REGISTRATION — beej aur zehreeli dawa ki meyaad
      khatam ho jaye to bechna ghair-qanooni hai. Wo sab se ooper
      dikhti hai, kisi filter ke peeche nahi.

   2. BORI KA HISAAB — ek bori urea = 50 kg. Stock kilo me ginta
      hai, bikri bori me hoti hai. Card par dono dikhte hain.
   ═════════════════════════════════════════════════════════════ */

/** Raaste ek jagah — app me alag hon to sirf yahan badlein */
const ROUTES = {
  create: '/agri-products/new',
  detail: (id: string) => `/agri-products/${id}`,
  edit: (id: string) => `/agri-products/${id}/edit`,
  labels: '/retail/barcode-labels',
  pos: '/pos',
  farmers: '/agri/farmers',
};

type Tab = 'list' | 'analytics';
type Kind = 'all' | 'seed' | 'fert' | 'spray' | 'feed' | 'tool';
type View = 'grid' | 'table';
type StockFilter = 'all' | 'in' | 'low' | 'out';
type StatusFilter = 'all' | 'active' | 'inactive';
type CertFilter = 'all' | 'expired' | 'soon' | 'missing';
type SortKey = 'name' | 'newest' | 'stock-low' | 'stock-high' | 'price-low' | 'price-high' | 'value-desc' | 'cert';

const VIEW_KEY = 'agri-products-view';
const PAGE_SIZE = 48;

const GRID_COLOR = '#94a3b8';
const AXIS = '#64748b';
const PIE_COLORS = ['#10b981', '#84cc16', '#f59e0b', '#8b5cf6', '#3b82f6', '#ef4444', '#14b8a6', '#f97316'];
const TOOLTIP = {
  borderRadius: 12, border: '2px solid #cbd5e1', background: '#ffffff',
  color: '#0f172a', fontWeight: 700, fontSize: 12,
};

const fmtQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

interface Row {
  product: any;
  profile?: AgriProductProfile;
  kind: AgriKind;
  group: Exclude<Kind, 'all'>;
  stock: number;
  isOut: boolean;
  isLow: boolean;
  costValue: number;
  retailValue: number;
  cert: ReturnType<typeof certStatus>;
  packSize: number | null;
  packUnit: string;
  season: string | null;
  restricted: boolean;
}

/** Qism ko patti wale group me daalna */
function groupOf(k: AgriKind): Exclude<Kind, 'all'> {
  if (isSeedKind(k)) return 'seed';
  if (isFertKind(k)) return 'fert';
  if (isSprayKind(k)) return 'spray';
  if (isFeedKind(k)) return 'feed';
  if (isToolKind(k)) return 'tool';
  return 'tool';
}

export default function AgriProductsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hideCost = useCostHidden();
  const tenant = useAuthStore((s) => s.tenant);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const searchRef = useRef<HTMLInputElement>(null);
  const [urlParams, setUrlParams] = useSearchParams();

  const [tab, setTab] = useState<Tab>('list');
  const [view, setView] = useState<View>('grid');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const [categoryId, setCategoryId] = useState('all');
  const [brandId, setBrandId] = useState('all');
  const [tagId, setTagId] = useState(() => urlParams.get('tag') ?? 'all');
  const [season, setSeason] = useState('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [certFilter, setCertFilter] = useState<CertFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [stockModal, setStockModal] = useState<Row | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteStep, setBulkDeleteStep] = useState<1 | 2>(1);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  /* View yaad rahe */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === 'grid' || saved === 'table') setView(saved);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view); } catch { /* ignore */ } }, [view]);

  /* Tag URL me — link share ho sake */
  useEffect(() => {
    const cur = urlParams.get('tag') ?? 'all';
    if (cur === tagId) return;
    const next = new URLSearchParams(urlParams);
    if (tagId === 'all') next.delete('tag');
    else next.set('tag', tagId);
    setUrlParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagId]);

  /* ── Data ── */
  const productsQ = useQuery({
    queryKey: ['agri-all-products'],
    queryFn: () => fetchAllProducts({ isActive: undefined }),
  });
  const profilesQ = useQuery({
    queryKey: ['agri-profiles-all'],
    queryFn: () => agriProductsApi.list({}),
  });
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list() });
  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const isLoading = productsQ.isLoading || profilesQ.isLoading;
  const isRefetching = productsQ.isRefetching || profilesQ.isRefetching;
  const refetchAll = () => {
    productsQ.refetch(); profilesQ.refetch();
    forceRefreshProducts().catch(() => {});
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['agri-all-products'] });
    queryClient.invalidateQueries({ queryKey: ['agri-profiles-all'] });
    queryClient.invalidateQueries({ queryKey: ['agri-products'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    forceRefreshProducts().catch(() => {});
  };

  const profileByProduct = useMemo(() => {
    const m = new Map<string, AgriProductProfile>();
    (profilesQ.data ?? []).forEach((p) => { if (p.productId) m.set(p.productId, p); });
    return m;
  }, [profilesQ.data]);

  /** Har product + uski agri tafseel */
  const rows = useMemo<Row[]>(() => {
    const items: any[] = productsQ.data?.items ?? [];
    return items.map((p) => {
      const profile = profileByProduct.get(p.id);
      const stock = Number(p.shopStock ?? p.stock ?? 0);
      /* Reorder level profile me hai to wohi, warna product ka apna */
      const alert = Number(profile?.minStockAlert ?? profile?.reorderLevel ?? p.lowStockAlert ?? 5);
      /* Qism: profile me likhi hui, warna category ke naam se nikaali hui.
         Purane products jin ka profile hi nahi — un par bhi sahi chalta hai. */
      const k = (profile?.category as AgriKind) ?? deriveAgriKind(p.category?.name, p.name);
      const packSize = profile?.packSize ? Number(profile.packSize) : null;
      return {
        product: p,
        profile,
        kind: k,
        group: groupOf(k),
        stock,
        isOut: stock <= 0,
        isLow: stock > 0 && stock <= alert,
        costValue: stock * Number(p.costPrice ?? 0),
        retailValue: stock * Number(p.price ?? 0),
        cert: certStatus(profile?.govtRegExpiry),
        packSize: packSize && packSize > 0 ? packSize : null,
        packUnit: profile?.packUnit ?? 'kg',
        season: profile?.season ?? null,
        restricted: !!profile?.isRestricted,
      };
    });
  }, [productsQ.data, profileByProduct]);

  /** Sirf wo categories jo asal me istemal ho rahi hain */
  const categories = useMemo(() => {
    const m = new Map<string, { id: string; name: string; color: string; count: number }>();
    rows.forEach((r) => {
      const c = r.product.category;
      if (!c) return;
      const e = m.get(c.id);
      if (e) e.count += 1;
      else m.set(c.id, { id: c.id, name: c.name, color: c.color, count: 1 });
    });
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [rows]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const low = rows.filter((r) => r.isLow);
    const active = rows.filter((r) => r.product.isActive).length;
    /* Sirf un cheezon ki registration ginte hain jin par qanoon lagu hota
       hai — belcha par Seed Act nahi chalta. */
    const regulated = rows.filter((r) => needsGovtReg(r.kind));
    const expired = regulated.filter((r) => r.cert.state === 'expired');
    const soon = regulated.filter((r) => r.cert.state === 'soon');
    const missing = regulated.filter((r) => r.cert.state === 'none');
    return {
      total: rows.length,
      active,
      inactive: rows.length - active,
      seed: rows.filter((r) => r.group === 'seed').length,
      fert: rows.filter((r) => r.group === 'fert').length,
      spray: rows.filter((r) => r.group === 'spray').length,
      feed: rows.filter((r) => r.group === 'feed').length,
      tool: rows.filter((r) => r.group === 'tool').length,
      out: rows.filter((r) => r.isOut).length,
      low: low.length,
      lowList: low.slice(0, 6),
      costValue: rows.reduce((s, r) => s + r.costValue, 0),
      retailValue: rows.reduce((s, r) => s + r.retailValue, 0),
      regulated: regulated.length,
      expired: expired.length,
      expiredList: expired.slice(0, 6),
      soon: soon.length,
      soonList: soon.slice(0, 6),
      missingCert: missing.length,
      restricted: rows.filter((r) => r.restricted).length,
      organic: rows.filter((r) => r.profile?.isOrganic).length,
      noProfile: rows.filter((r) => !r.profile).length,
      noCost: rows.filter((r) => Number(r.product.costPrice ?? 0) <= 0).length,
      noPack: rows.filter((r) => r.profile && !isMeasured(r.product.unit ?? '') && !r.packSize).length,
    };
  }, [rows]);

  const potentialProfit = stats.retailValue - stats.costValue;
  const margin = stats.retailValue > 0 ? (potentialProfit / stats.retailValue) * 100 : 0;
  const money = (v: number) => (hideCost ? '••••' : formatPKR(v));

  /* ── Chaant + tarteeb ── */
  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    let out = rows;
    if (kind !== 'all') out = out.filter((r) => r.group === kind);
    if (categoryId !== 'all') {
      out = categoryId === 'none'
        ? out.filter((r) => !r.product.categoryId)
        : out.filter((r) => r.product.categoryId === categoryId);
    }
    if (brandId !== 'all') {
      out = brandId === 'none'
        ? out.filter((r) => !r.product.brandId)
        : out.filter((r) => r.product.brandId === brandId);
    }
    if (tagId !== 'all') {
      out = tagId === 'none'
        ? out.filter((r) => !(r.product.tags ?? []).length)
        : out.filter((r) => (r.product.tags ?? []).some((t: any) => (t?.tag?.id ?? t?.tagId ?? t?.id) === tagId));
    }
    if (season !== 'all') out = out.filter((r) => r.season === season);
    if (certFilter !== 'all') {
      out = out.filter((r) => {
        if (!needsGovtReg(r.kind)) return false;
        if (certFilter === 'missing') return r.cert.state === 'none';
        return r.cert.state === certFilter;
      });
    }
    if (stockFilter === 'out') out = out.filter((r) => r.isOut);
    if (stockFilter === 'low') out = out.filter((r) => r.isLow);
    if (stockFilter === 'in') out = out.filter((r) => !r.isLow && !r.isOut);
    if (statusFilter !== 'all') {
      out = out.filter((r) => (statusFilter === 'active' ? r.product.isActive : !r.product.isActive));
    }
    if (q) {
      out = out.filter((r) =>
        (r.product.name ?? '').toLowerCase().includes(q) ||
        (r.product.sku ?? '').toLowerCase().includes(q) ||
        (r.product.barcode ?? '').toLowerCase().includes(q) ||
        (r.product.category?.name ?? '').toLowerCase().includes(q) ||
        (r.product.brand?.name ?? '').toLowerCase().includes(q) ||
        (r.profile?.activeIngredient ?? '').toLowerCase().includes(q) ||
        (r.profile?.targetCrops ?? []).some((c: string) => c.toLowerCase().includes(q)) ||
        (r.profile?.targetPests ?? []).some((c: string) => c.toLowerCase().includes(q)));
    }
    const sorted = [...out];
    const certRank = (r: Row) =>
      r.cert.state === 'expired' ? 0 : r.cert.state === 'soon' ? 1 : r.cert.state === 'none' ? 2 : 3;
    sorted.sort((a, b) => {
      switch (sortKey) {
        case 'stock-low': return a.stock - b.stock;
        case 'stock-high': return b.stock - a.stock;
        case 'price-low': return Number(a.product.price || 0) - Number(b.product.price || 0);
        case 'price-high': return Number(b.product.price || 0) - Number(a.product.price || 0);
        case 'value-desc': return b.costValue - a.costValue;
        case 'cert': return certRank(a) - certRank(b);
        case 'newest': return new Date(b.product.createdAt || 0).getTime() - new Date(a.product.createdAt || 0).getTime();
        default: return (a.product.name || '').localeCompare(b.product.name || '');
      }
    });
    return sorted;
  }, [rows, kind, categoryId, brandId, tagId, season, certFilter, stockFilter, statusFilter, q, sortKey]);

  const visible = filtered.slice(0, visibleCount);
  useEffect(() => { setVisibleCount(PAGE_SIZE); },
    [search, kind, categoryId, brandId, tagId, season, certFilter, stockFilter, statusFilter, sortKey]);

  const hasFilters = !!search || kind !== 'all' || categoryId !== 'all' || brandId !== 'all'
    || tagId !== 'all' || season !== 'all' || certFilter !== 'all'
    || stockFilter !== 'all' || statusFilter !== 'active';
  const clearFilters = () => {
    setSearch(''); setKind('all'); setCategoryId('all'); setBrandId('all'); setTagId('all');
    setSeason('all'); setCertFilter('all'); setStockFilter('all'); setStatusFilter('active');
  };

  /* ── Charts ── */
  const categoryChart = useMemo(
    () => categories.slice(0, 8).map((c) => ({ name: c.name, count: c.count })),
    [categories],
  );
  const kindPie = useMemo(() => ([
    { name: 'Beej', value: stats.seed },
    { name: 'Khaad', value: stats.fert },
    { name: 'Dawa', value: stats.spray },
    { name: 'Feed', value: stats.feed },
    { name: 'Auzaar', value: stats.tool },
  ].filter((x) => x.value > 0)), [stats]);
  const valueChart = useMemo(
    () => [...rows].sort((a, b) => b.costValue - a.costValue).slice(0, 10).map((r) => ({
      name: String(r.product.name).slice(0, 14),
      lagat: Math.round(r.costValue),
      bikri: Math.round(r.retailValue),
    })),
    [rows],
  );
  const seasonChart = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const s = SEASONS.find((x) => x.v === r.season);
      const label = s ? `${s.e} ${s.l}` : 'Likha hi nahi';
      m.set(label, (m.get(label) ?? 0) + 1);
    });
    return [...m.entries()].map(([name, value]) => ({ name, value })).filter((x) => x.value > 0);
  }, [rows]);
  const certChart = useMemo(() => ([
    { name: 'Chal rahi', value: rows.filter((r) => needsGovtReg(r.kind) && r.cert.state === 'ok').length, color: '#10b981' },
    { name: 'Jald khatam', value: stats.soon, color: '#f59e0b' },
    { name: 'Khatam', value: stats.expired, color: '#ef4444' },
    { name: 'Likhi hi nahi', value: stats.missingCert, color: '#94a3b8' },
  ].filter((x) => x.value > 0)), [rows, stats]);
  const stockHealth = useMemo(() => ([
    { name: 'Theek', value: rows.filter((r) => !r.isLow && !r.isOut).length, color: '#10b981' },
    { name: 'Kam ho gaya', value: stats.low, color: '#f59e0b' },
    { name: 'Khatam', value: stats.out, color: '#ef4444' },
  ].filter((x) => x.value > 0)), [rows, stats]);

  /* ── Selection ── */
  const toggleOne = (id: string) => setSelected((prev) => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const toggleAllVisible = () => {
    const all = visible.length > 0 && visible.every((r) => selected.has(r.product.id));
    setSelected(all ? new Set() : new Set(visible.map((r) => r.product.id)));
  };

  /* ── Bulk ── */
  const bulkStatus = useMutation({
    mutationFn: async (isActive: boolean) => {
      const ids = Array.from(selected);
      const res = await Promise.allSettled(ids.map((id) => productsApi.update(id, { isActive } as any)));
      const ok = res.filter((r) => r.status === 'fulfilled').length;
      return { ok, fail: res.length - ok };
    },
    onSuccess: ({ ok, fail }) => {
      if (ok) toast.success(`${ok} cheezein update ho gayin`);
      if (fail) toast.error(`${fail} fail huin`);
      setSelected(new Set());
      invalidateAll();
    },
  });

  const forceDeleteAll = async (ids: string[]) => {
    const res = await Promise.allSettled(ids.map((id) => productsApi.remove(id, true)));
    const ok = res.filter((r) => r.status === 'fulfilled').length;
    if (ok) toast.success(`${ok} cheezein force-delete — sales, stock, sab kuch`);
    if (res.length - ok) toast.error(`${res.length - ok} phir bhi fail huin`);
    setSelected(new Set());
    queryClient.invalidateQueries();
    forceRefreshProducts().catch(() => {});
  };

  /* Pehle aam delete — jin ki history hai un ke liye Force ka option */
  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await Promise.allSettled(ids.map((id) => productsApi.remove(id, false)));
      const failedIds = ids.filter((_, i) => res[i].status === 'rejected');
      return { ok: ids.length - failedIds.length, failedIds };
    },
    onSuccess: ({ ok, failedIds }) => {
      if (ok) toast.success(`${ok} cheezein delete ho gayin`);
      if (failedIds.length) {
        toast.error(`${failedIds.length} cheezon ki sales/purchase history hai`, {
          duration: 15000,
          action: {
            label: '⚠️ Force Delete',
            onClick: () => {
              if (!confirm(`⚠️ ${failedIds.length} cheezein AUR unki saari sales / purchase / stock history PERMANENTLY delete hogi.\n\nYe undo nahi ho sakta. Continue?`)) return;
              if (!confirm('Bilkul sure? Sirf demo/test data cleanup ke liye.')) return;
              forceDeleteAll(failedIds);
            },
          },
        });
      }
      setSelected(new Set());
      invalidateAll();
    },
    onError: () => toast.error('Delete nahi hua'),
  });

  /* ── CSV / print ── */
  const exportCsv = (list: Row[]) => {
    if (list.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`Agri Products — ${tenant?.name || 'Nafaa'}`],
      [`Shop: ${shopName || 'All'}  •  Generated: ${new Date().toLocaleString('en-PK')}`],
      [''],
    ];
    const head = ['Naam', 'SKU', 'Barcode', 'Category', 'Qism', 'Brand', 'Stock', 'Naap',
      '1 packet me', ...(hideCost ? [] : ['Cost', 'Stock ki lagat']), 'Rate',
      'Registration', 'Meyaad', 'Mausam', 'Fasal', 'Restricted', 'Active'];
    const body = list.map((r) => [
      r.product.name, r.product.sku ?? '', r.product.barcode ?? '',
      r.product.category?.name ?? '', prettyAgriKind(r.kind),
      r.product.brand?.name ?? '',
      r.stock, r.product.unit ?? '',
      r.packSize ? `${r.packSize} ${r.packUnit}` : '',
      ...(hideCost ? [] : [Number(r.product.costPrice || 0).toFixed(2), Math.round(r.costValue)]),
      Number(r.product.price || 0).toFixed(2),
      r.profile?.govtRegNumber ?? '',
      r.profile?.govtRegExpiry ? String(r.profile.govtRegExpiry).slice(0, 10) : '',
      SEASONS.find((s) => s.v === r.season)?.l ?? '',
      (r.profile?.targetCrops ?? []).join(' / '),
      r.restricted ? 'Haan' : 'Nahi',
      r.product.isActive ? 'Haan' : 'Nahi',
    ]);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [...summary, head, ...body].map((x) => x.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `agri-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${list.length} cheezein CSV me`);
  };

  const printLabels = (ids: string[]) => navigate(ROUTES.labels, { state: { productIds: ids } });
  const doPrint = () => window.print();
  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  /* ── Scan ── */
  const onScan = (code: string) => {
    const clean = code.trim();
    setScannerOpen(false);
    const hit = rows.find((r) =>
      r.product.barcode === clean || r.product.sku === clean ||
      (r.product.barcode ?? '').toLowerCase() === clean.toLowerCase());
    /* Chaant hata do — warna cheez "band" ya "khatam" filter me chhupi reh jati */
    setTab('list'); setKind('all'); setStockFilter('all'); setStatusFilter('all');
    setCategoryId('all'); setBrandId('all'); setTagId('all'); setSeason('all'); setCertFilter('all');
    setSearch(clean);
    if (hit) {
      toast.success(`${hit.product.name} mil gaya`, {
        action: { label: '+ Stock', onClick: () => setStockModal(hit) },
      });
    } else {
      toast.error(`Barcode ${clean} kisi cheez se nahi mila`, {
        action: { label: 'Nayi banao', onClick: () => navigate(ROUTES.create) },
      });
    }
  };

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (scannerOpen) return setScannerOpen(false);
        if (stockModal) return; // modal khud sambhalta hai
        if (bulkDeleteOpen) return setBulkDeleteOpen(false);
        if (showTeacher) return setShowTeacher(false);
        if (showMobileFilters) return setShowMobileFilters(false);
        return;
      }
      if (stockModal || scannerOpen || bulkDeleteOpen) return;
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      else if (k === 'b') { e.preventDefault(); setScannerOpen(true); }
      else if (k === 'a') setTab((x) => (x === 'analytics' ? 'list' : 'analytics'));
      else if (k === 'v') setView((v) => (v === 'grid' ? 'table' : 'grid'));
      else if (k === 'g') setShowTeacher(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scannerOpen, stockModal, bulkDeleteOpen, showTeacher, showMobileFilters]);

  /* ── LOADING — skeleton ── */
  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-5 pb-24 animate-pulse">
        <div className="rounded-3xl bg-slate-200 dark:bg-slate-800 h-36 sm:h-44" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="rounded-2xl bg-slate-200 dark:bg-slate-800 h-24" />)}
        </div>
        <div className="rounded-2xl bg-slate-200 dark:bg-slate-800 h-14" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-800" />
              <div className="p-2.5 space-y-2">
                <div className="h-3 rounded bg-slate-200 dark:bg-slate-800 w-4/5" />
                <div className="h-3 rounded bg-slate-200 dark:bg-slate-800 w-2/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 print:space-y-3">
      {stockModal && (
        <AgriQuickStock
          row={stockModal}
          hideCost={hideCost}
          onClose={() => setStockModal(null)}
          onSaved={invalidateAll}
        />
      )}

      {scannerOpen && (
        <BarcodeScanner onClose={() => setScannerOpen(false)} onDetected={onScan}
          title="Barcode scan karein" hint="Bori ya bottle ka barcode camera ke samne rakhein" />
      )}

      {/* ═══ BULK DELETE — 2 step ═══ */}
      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setBulkDeleteOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in"
            onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-br from-rose-600 to-red-700 text-white p-5 flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest font-extrabold text-white/80">Delete — Step {bulkDeleteStep}/2</div>
                <h3 className="font-extrabold text-lg">{selected.size} cheezein</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {bulkDeleteStep === 1 ? (
                <>
                  <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-200 dark:border-rose-800 p-4 text-xs font-semibold text-rose-800 dark:text-rose-300 space-y-1">
                    <div className="font-extrabold text-rose-900 dark:text-rose-200 text-sm flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="h-4 w-4" /> Kya hoga:
                    </div>
                    <div>• Jin ki koi sale/purchase nahi — seedha delete</div>
                    <div>• Jin ki history hai — wo bach jayengi, aur "Force Delete" ka option aayega</div>
                    <div>• Agri profile, registration, tasveerein sath jayengi</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setBulkDeleteOpen(false)}
                      className="flex-1 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-extrabold text-slate-700 dark:text-slate-200 transition">
                      Rehne do
                    </button>
                    <button onClick={() => setBulkDeleteStep(2)}
                      className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-extrabold transition">
                      Samajh gaya, aage
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 text-center leading-relaxed">
                    Pakka? <span className="text-rose-600 dark:text-rose-400 font-extrabold">{selected.size} cheezein</span> delete kar dein?
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setBulkDeleteStep(1)}
                      className="flex-1 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-extrabold text-slate-700 dark:text-slate-200 transition">
                      ← Wapas
                    </button>
                    <button
                      disabled={bulkDelete.isPending}
                      onClick={() => { setBulkDeleteOpen(false); bulkDelete.mutate(Array.from(selected)); }}
                      className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 transition">
                      <Trash2 className="h-4 w-4" /> Delete karo
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ PRINT HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-emerald-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">🌾 {tenant?.name || 'Agri'} — Saara maal</h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {shopName ? `${shopName} • ` : ''}{filtered.length} cheezein
              {!hideCost && ` • Stock ki lagat ${formatPKR(stats.costValue)}`}
            </p>
          </div>
          <div className="text-right text-xs font-bold text-slate-900">{printDate}</div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-lime-700 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-lime-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Wheat className="h-3.5 w-3.5 text-lime-300" /> Agri
              {shopName && (<><span className="opacity-40">•</span><span className="text-emerald-200">🏪 {shopName}</span></>)}
            </div>
            <h1 className="mt-2.5 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">🌾 Maal ki List</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <Chip><strong className="text-lime-200">{stats.seed}</strong> beej</Chip>
              <Chip><strong className="text-emerald-200">{stats.fert}</strong> khaad</Chip>
              <Chip><strong className="text-amber-200">{stats.spray}</strong> dawa</Chip>
              <Chip><strong className="text-sky-200">{stats.feed}</strong> feed</Chip>
              {!hideCost && <Chip>Lagat <strong className="text-emerald-300">{formatPKR(stats.costValue)}</strong></Chip>}
              {stats.low > 0 && <Chip tone="amber"><strong className="text-amber-300">{stats.low}</strong> kam</Chip>}
              {stats.expired > 0 && <Chip tone="rose"><strong className="text-rose-300">{stats.expired}</strong> registration khatam</Chip>}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition active:scale-[0.97]">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <PrivacyToggle compact />
            <HeroBtn onClick={refetchAll} disabled={isRefetching} title="Taaza">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </HeroBtn>
            <HeroBtn onClick={doPrint} title="Print">
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
            </HeroBtn>
            <Link to={ROUTES.farmers}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition active:scale-[0.97]">
              <Sprout className="h-4 w-4" /> <span className="hidden sm:inline">Farmers</span>
            </Link>
            <Link to={ROUTES.create}
              className="h-11 px-4 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-black inline-flex items-center gap-1.5 shadow-2xl transition active:scale-[0.97]">
              <Plus className="h-4 w-4" /> Nayi cheez
            </Link>
          </div>
        </div>

        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>B</Kbd><span className="text-white/60">Scan</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>A</Kbd><span className="text-white/60">Analytics</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>V</Kbd><span className="text-white/60">Grid/List</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Esc</Kbd><span className="text-white/60">Band</span>
        </div>
      </section>

      {/* ═══ REGISTRATION KHATAM — sab se ooper, kisi filter ke peeche nahi ═══ */}
      {stats.expired > 0 && certFilter !== 'expired' && (
        <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-500/10 dark:to-red-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-4 print:hidden">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-center shadow-md shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-rose-900 dark:text-rose-200 text-sm">
                🚫 {stats.expired} cheezon ki sarkari registration khatam — inhein bechna ghair-qanooni hai
              </h3>
              <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300 mt-0.5">
                Beej (Seed Act) aur zehreeli dawa (Pesticides Ordinance) — meyaad khatam hone par
                inspector jurmana kar sakta hai. Renew karwa kar tareekh update kar lein.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {stats.expiredList.map((r) => (
                  <Link key={r.product.id} to={ROUTES.edit(r.product.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-500/40 hover:border-rose-400 text-[11px] font-extrabold text-rose-900 dark:text-rose-200 transition active:scale-[0.97]">
                    {r.product.name} <span className="text-rose-600">({Math.abs(r.cert.days ?? 0)} din pehle)</span>
                  </Link>
                ))}
              </div>
            </div>
            <button onClick={() => { setCertFilter('expired'); setKind('all'); setStatusFilter('all'); }}
              className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shrink-0 transition active:scale-[0.97]">
              Sab dekhein →
            </button>
          </div>
        </section>
      )}

      {/* ═══ KPI ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <Kpi icon={Package} label="Kul cheezein" value={stats.total}
          sub={`${stats.inactive} band • ${stats.organic} organic`} tone="emerald" />
        <Kpi icon={DollarSign} label="Stock ki lagat" value={money(stats.costValue)}
          sub={hideCost ? '🔒 PIN se dekho' : `Bikri par ${formatPKR(stats.retailValue)}`} tone="lime" />
        <Kpi icon={AlertTriangle} label="Kam stock" value={stats.low} sub="Mangwane ka waqt" tone="amber"
          active={stockFilter === 'low'}
          onClick={() => { setTab('list'); setKind('all'); setStockFilter('low'); setStatusFilter('all'); }} />
        <Kpi icon={ShieldAlert} label="Registration" value={stats.expired + stats.soon}
          sub={`${stats.expired} khatam • ${stats.soon} jald`} tone="rose"
          active={certFilter !== 'all'}
          onClick={() => { setTab('list'); setKind('all'); setCertFilter('expired'); setStatusFilter('all'); }} />
      </section>

      {/* ═══ TABS ═══ */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 print:hidden">
        {([
          { v: 'list' as const, label: 'Maal', hint: 'Poori list, chaant aur scan', icon: Package, n: stats.total as number | undefined },
          { v: 'analytics' as const, label: 'Analytics', hint: 'Paisa kahan phansa hai', icon: TrendingUp, n: undefined },
        ]).map((t) => {
          const on = tab === t.v;
          return (
            <button key={t.v} onClick={() => setTab(t.v)}
              className={`group relative overflow-hidden rounded-3xl border-2 px-4 sm:px-6 py-4 text-left transition active:scale-[0.99] ${
                on ? 'bg-gradient-to-br from-emerald-600 to-lime-700 border-transparent text-white shadow-xl shadow-emerald-500/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:shadow-lg'
              }`}>
              <div className="relative flex items-center gap-3">
                <div className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  on ? 'bg-white/20' : 'bg-gradient-to-br from-emerald-500 to-lime-700 text-white'
                }`}>
                  <t.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-black truncate">{t.label}</span>
                    {t.n !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums shrink-0 ${
                        on ? 'bg-black/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>{t.n.toLocaleString()}</span>
                    )}
                  </div>
                  <div className={`text-[11px] font-bold truncate ${on ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>{t.hint}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {tab === 'analytics' && (
        <Analytics
          stats={stats} margin={margin} potentialProfit={potentialProfit} money={money} hideCost={hideCost}
          categoryChart={categoryChart} kindPie={kindPie} valueChart={valueChart}
          seasonChart={seasonChart} certChart={certChart} stockHealth={stockHealth} rows={rows}
        />
      )}

      {tab === 'list' && (<>
        {/* ═══ LOW STOCK BANNER ═══ */}
        {stats.low > 0 && stockFilter !== 'low' && (
          <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-300 dark:border-amber-500/40 p-4 print:hidden">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-amber-900 dark:text-amber-200 text-sm">
                  ⚠️ {stats.low} cheezein khatam hone wali hain — click karke stock daalein
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {stats.lowList.map((r) => (
                    <button key={r.product.id} onClick={() => setStockModal(r)}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-500/40 hover:border-amber-400 text-[11px] font-extrabold text-amber-900 dark:text-amber-200 transition active:scale-[0.97]">
                      {r.product.name} <span className="text-rose-700 dark:text-rose-400">({fmtQty(r.stock)} {r.product.unit})</span>
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => { setStockFilter('low'); setStatusFilter('all'); }}
                className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shrink-0 transition active:scale-[0.97]">
                Sab dekhein →
              </button>
            </div>
          </section>
        )}

        {/* ═══ TOOLBAR — sticky ═══ */}
        <section className="sticky top-0 z-30 -mx-1 px-1 py-1 print:hidden">
          <div className="rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-slate-200 dark:border-slate-800 shadow-lg shadow-slate-900/5 dark:shadow-black/30 p-3 sm:p-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px] sm:min-w-[240px]">
                <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Naam, barcode, brand, fasal, keera… (/ dabao)"
                  className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-500/30 transition" />
                {search && (
                  <button onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>

              <button onClick={() => setScannerOpen(true)} title="Barcode scan (B)"
                className="h-12 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-lime-700 hover:from-emerald-500 hover:to-lime-600 text-white text-sm font-extrabold inline-flex items-center gap-1.5 shadow-lg shadow-emerald-500/30 shrink-0 transition active:scale-[0.97]">
                <Barcode className="h-4 w-4" /> <span className="hidden sm:inline">Scan</span>
              </button>

              <button onClick={() => setShowMobileFilters((v) => !v)}
                className={`lg:hidden h-12 px-4 rounded-2xl border-2 text-sm font-extrabold inline-flex items-center gap-1.5 transition active:scale-[0.97] ${
                  showMobileFilters ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}>
                <SlidersHorizontal className="h-4 w-4" /> Chaant
                {hasFilters && <span className="h-2 w-2 rounded-full bg-amber-500" />}
              </button>

              <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                <button onClick={() => setView('grid')} title="Card view"
                  className={`px-4 h-12 transition ${view === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                  <Grid3x3 className="h-4 w-4" />
                </button>
                <button onClick={() => setView('table')} title="List view"
                  className={`px-4 h-12 border-l-2 border-slate-200 dark:border-slate-700 transition ${view === 'table' ? 'bg-emerald-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                  <ListIcon className="h-4 w-4" />
                </button>
              </div>

              <button onClick={() => exportCsv(filtered)}
                className="h-12 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-300 bg-white dark:bg-slate-800 text-sm font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition active:scale-[0.97]">
                <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">Export</span>
              </button>
            </div>

            {/* Qism ki patti — hamesha samne */}
            <div className="flex gap-1.5 flex-wrap">
              {([
                ['all', `Sab (${stats.total})`, Package],
                ['seed', `Beej (${stats.seed})`, Sprout],
                ['fert', `Khaad (${stats.fert})`, FlaskConical],
                ['spray', `Dawa (${stats.spray})`, Bug],
                ['feed', `Feed (${stats.feed})`, Wheat],
                ['tool', `Auzaar (${stats.tool})`, Tractor],
              ] as const).map(([v, label, Icon]) => (
                <button key={v} onClick={() => setKind(v as Kind)}
                  className={`h-10 px-3 rounded-xl border-2 text-[11px] font-black inline-flex items-center gap-1.5 transition active:scale-[0.97] ${
                    kind === v ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                  }`}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            {/* Filter — desktop hamesha, mobile par toggle */}
            <div className={`gap-2 flex-wrap items-center ${showMobileFilters ? 'flex' : 'hidden lg:flex'}`}>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={sel}>
                <option value="all">Sab Categories ({categories.length})</option>
                <option value="none">Bina category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.count})</option>)}
              </select>

              <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={sel}>
                <option value="all">Sab Brands ({(brands as any[]).length})</option>
                <option value="none">Bina brand</option>
                {(brands as any[]).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>

              <select value={season} onChange={(e) => setSeason(e.target.value)} className={sel}>
                <option value="all">Har mausam</option>
                {SEASONS.map((s) => <option key={s.v} value={s.v}>{s.e} {s.l}</option>)}
              </select>

              <select value={tagId} onChange={(e) => setTagId(e.target.value)} className={sel}>
                <option value="all">Sab Tags ({(tags as any[]).length})</option>
                <option value="none">Bina tag</option>
                {(tags as any[]).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              <select value={certFilter} onChange={(e) => setCertFilter(e.target.value as CertFilter)} className={sel}>
                <option value="all">Registration — sab</option>
                <option value="expired">Khatam ({stats.expired})</option>
                <option value="soon">Jald khatam ({stats.soon})</option>
                <option value="missing">Likhi hi nahi ({stats.missingCert})</option>
              </select>

              <Segmented
                value={stockFilter} onChange={setStockFilter} activeCls="bg-emerald-600 text-white"
                options={[
                  { v: 'all', l: 'Sab' }, { v: 'in', l: 'Stock me' },
                  { v: 'low', l: 'Kam', c: stats.low }, { v: 'out', l: 'Khatam', c: stats.out },
                ]}
              />
              <Segmented
                value={statusFilter} onChange={setStatusFilter}
                activeCls="bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                options={[{ v: 'active', l: 'Active' }, { v: 'inactive', l: 'Band' }, { v: 'all', l: 'Dono' }]}
              />

              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={sel}>
                <option value="name">A → Z</option>
                <option value="newest">Naye pehle</option>
                <option value="cert">Registration khatam pehle</option>
                <option value="stock-low">Stock kam pehle</option>
                <option value="stock-high">Stock zyada pehle</option>
                <option value="price-low">Sasta pehle</option>
                <option value="price-high">Mehnga pehle</option>
                {!hideCost && <option value="value-desc">Lagat zyada pehle</option>}
              </select>

              {hasFilters && (
                <button onClick={clearFilters} className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 transition">
                  <X className="h-3 w-3" /> Chaant hatao
                </button>
              )}

              <div className="ml-auto text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">
                {filtered.length} cheezein
              </div>
            </div>
          </div>
        </section>

        {/* ═══ BULK BAR ═══ */}
        {selected.size > 0 && (
          <section className="sticky top-[76px] z-20 rounded-2xl bg-slate-950 dark:bg-slate-900 text-white shadow-2xl border border-white/20 p-3 flex items-center gap-2 flex-wrap print:hidden animate-in">
            <div className="font-extrabold text-sm px-2"><span className="text-lime-300">{selected.size}</span> chuni</div>
            <button onClick={() => bulkStatus.mutate(true)} disabled={bulkStatus.isPending}
              className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-extrabold inline-flex items-center gap-1 transition active:scale-[0.97] disabled:opacity-50">
              <CheckCircle2 className="h-3.5 w-3.5" /> Active karo
            </button>
            <button onClick={() => bulkStatus.mutate(false)} disabled={bulkStatus.isPending}
              className="px-3 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-extrabold inline-flex items-center gap-1 transition active:scale-[0.97] disabled:opacity-50">
              <XCircle className="h-3.5 w-3.5" /> Band karo
            </button>
            <button onClick={() => printLabels(Array.from(selected))}
              className="px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-extrabold inline-flex items-center gap-1 transition active:scale-[0.97]">
              <Barcode className="h-3.5 w-3.5" /> Labels print
            </button>
            <button onClick={() => exportCsv(rows.filter((r) => selected.has(r.product.id)))}
              className="px-3 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-extrabold inline-flex items-center gap-1 transition active:scale-[0.97]">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button onClick={() => { setBulkDeleteStep(1); setBulkDeleteOpen(true); }}
              className="px-3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-extrabold inline-flex items-center gap-1 transition active:scale-[0.97]">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
            <button onClick={() => setSelected(new Set())}
              className="ml-auto px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-extrabold transition active:scale-[0.97]">
              Clear
            </button>
          </section>
        )}

        {/* ═══ LIST ═══ */}
        {filtered.length === 0 ? (
          <Empty hasFilters={hasFilters} onClear={clearFilters} onGuide={() => setShowTeacher(true)} />
        ) : view === 'grid' ? (
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {visible.map((r) => (
              <AgriCard key={r.product.id} r={r}
                selected={selected.has(r.product.id)}
                onToggle={() => toggleOne(r.product.id)}
                onStock={() => setStockModal(r)} />
            ))}
          </section>
        ) : (
          <AgriTable rows={visible} hideCost={hideCost}
            selected={selected} onToggle={toggleOne} onToggleAll={toggleAllVisible}
            onStock={(r) => setStockModal(r)} />
        )}

        {visibleCount < filtered.length && (
          <div className="flex justify-center print:hidden">
            <button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400 text-sm font-extrabold text-slate-700 dark:text-slate-200 shadow-sm transition active:scale-[0.98]">
              Aur {Math.min(PAGE_SIZE, filtered.length - visibleCount)} dikhao
              <span className="text-slate-400 font-bold ml-1">({visibleCount}/{filtered.length})</span>
            </button>
          </div>
        )}
      </>)}

      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm 8mm; }
          html, body { background: white !important; color: #0f172a !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
          .overflow-x-auto, .overflow-y-auto, .overflow-hidden, .overflow-auto {
            overflow: visible !important; max-height: none !important; height: auto !important; }
          [class*="fixed"] { display: none !important; }
          [class*="sticky"] { position: static !important; }
          html, body, #root { height: auto !important; overflow: visible !important; }
          table { font-size: 9px !important; border-collapse: collapse !important; width: 100% !important; }
          thead { display: table-header-group !important; }
          thead th { background: #059669 !important; color: white !important; padding: 5px 4px !important; border: 1px solid #047857 !important; }
          tbody tr { page-break-inside: avoid !important; }
          tbody td { padding: 5px 4px !important; border: 1px solid #e2e8f0 !important; color: #0f172a !important; }
          tbody td img { display: none !important; }
          .avoid-break { page-break-inside: avoid !important; }
          [data-sonner-toaster] { display: none !important; }
        }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fadeUp 0.25s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .animate-in { animation: none; } }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   QUICK STOCK — isi file me
   ─────────────────────────────────────────────────────────────
   ➕ Maal aaya   ➖ Kam hua (kharab, phata)   ✍️ Ginti
   Bori wali cheezon par sath hi kilo ka hisab bhi dikhta hai,
   kyunke dukaan-daar bori ginta hai magar farmer kilo poochta hai.
   Enter = Save • Esc = Band
   ═════════════════════════════════════════════════════════════ */
type StockMode = 'add' | 'remove' | 'set';

function AgriQuickStock({ row, hideCost, onClose, onSaved }: {
  row: Row; hideCost: boolean; onClose: () => void; onSaved: () => void;
}) {
  const p = row.product;
  const current = row.stock;
  const unit = p.unit || 'bag';
  const weighed = isMeasured(unit);
  const chips = weighed ? [0.5, 1, 5, 10, 25, 50] : [1, 5, 10, 20, 50, 100];
  const inputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<StockMode>('add');
  const [qty, setQty] = useState<number | ''>('');
  const [setTo, setSetTo] = useState<number | ''>(current);

  const round = (n: number) => Math.round(n * 1000) / 1000;
  const finalStock = round(
    mode === 'add' ? current + Number(qty || 0)
      : mode === 'remove' ? current - Number(qty || 0)
      : Number(setTo || 0),
  );
  const diff = round(finalStock - current);
  const empty = mode === 'set' ? setTo === '' : qty === '';
  const canSave = !empty && diff !== 0 && finalStock >= 0;

  const mutation = useMutation({
    mutationFn: () => productsApi.update(p.id, { stock: finalStock } as any),
    onSuccess: () => {
      toast.success(`${p.name} — stock ${fmtQty(finalStock)} ${unit}`, {
        description: diff > 0 ? `+${fmtQty(diff)} ${unit} aaya` : `${fmtQty(diff)} ${unit} kam hua`,
      });
      onSaved();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Stock update nahi hua'),
  });

  const switchMode = (m: StockMode) => {
    setMode(m); setQty('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'Enter' && canSave && !mutation.isPending) { e.preventDefault(); mutation.mutate(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSave, mutation.isPending, finalStock]);

  const addCls = mode === 'add';
  const tone = addCls
    ? { field: 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 focus:border-emerald-600',
        btn: 'bg-emerald-600 hover:bg-emerald-700',
        chip: 'border-emerald-200 dark:border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' }
    : { field: 'border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 text-rose-900 dark:text-rose-200 focus:border-rose-600',
        btn: 'bg-rose-600 hover:bg-rose-700',
        chip: 'border-rose-200 dark:border-rose-500/40 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-rose-800 dark:text-rose-300' };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in"
        onClick={(e) => e.stopPropagation()}>
        {/* Head */}
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-emerald-600 to-lime-700 text-white flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold">
              <Boxes className="h-3 w-3" /> Quick Stock • {AGRI_KIND_EMOJI[row.kind]} {prettyAgriKind(row.kind)}
            </div>
            <h3 className="font-extrabold text-lg mt-1.5 truncate">{p.name}</h3>
            <div className="text-xs text-white/80 font-bold">
              Abhi stock: <strong>{fmtQty(current)} {unit}</strong>
              {row.packSize && ` = ${fmtQty(current * row.packSize)} ${row.packUnit}`}
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <ModeBtn active={mode === 'add'} onClick={() => switchMode('add')}
              activeCls="border-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
              title="➕ Aaya" sub="Add karo" />
            <ModeBtn active={mode === 'remove'} onClick={() => switchMode('remove')}
              activeCls="border-rose-600 bg-rose-50 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300"
              title="➖ Kam" sub="Kharab / phata" />
            <ModeBtn active={mode === 'set'} onClick={() => switchMode('set')}
              activeCls="border-sky-600 bg-sky-50 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300"
              title="✍️ Ginti" sub="Exact set" />
          </div>

          {mode !== 'set' ? (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                {mode === 'add' ? `Kitna aaya? (${unit})` : `Kitna kam hua? (${unit})`}
              </label>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(Math.max(0, round(Number(qty || 0) - (weighed ? 0.5 : 1))))}
                  className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 transition">
                  <Minus className="h-5 w-5" />
                </button>
                <input ref={inputRef} autoFocus type="number" inputMode="decimal" step="any" min={0}
                  value={qty} placeholder="0"
                  onChange={(e) => setQty(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  className={`h-14 flex-1 min-w-0 rounded-2xl border-2 px-4 text-center text-3xl font-extrabold tabular-nums focus:outline-none transition ${tone.field}`} />
                <button onClick={() => setQty(round(Number(qty || 0) + (weighed ? 0.5 : 1)))}
                  className={`h-14 w-14 rounded-2xl text-white flex items-center justify-center shrink-0 transition ${tone.btn}`}>
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <button key={c} onClick={() => setQty(round(Number(qty || 0) + c))}
                    className={`px-3 py-1.5 rounded-xl border-2 bg-white dark:bg-slate-800 text-xs font-extrabold transition ${tone.chip}`}>
                    +{c}
                  </button>
                ))}
                {mode === 'remove' && current > 0 && (
                  <button onClick={() => setQty(current)}
                    className={`px-3 py-1.5 rounded-xl border-2 bg-white dark:bg-slate-800 text-xs font-extrabold transition ${tone.chip}`}>
                    Sab ({fmtQty(current)})
                  </button>
                )}
                <button onClick={() => setQty('')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-extrabold transition">
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Gudaam me asal me kitna hai? ({unit})
              </label>
              <input ref={inputRef} autoFocus type="number" inputMode="decimal" step="any" min={0}
                value={setTo}
                onChange={(e) => setSetTo(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                className="h-14 w-full rounded-2xl border-2 border-sky-300 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/10 px-4 text-center text-3xl font-extrabold tabular-nums text-sky-900 dark:text-sky-200 focus:outline-none focus:border-sky-600 transition" />
            </div>
          )}

          {/* Preview */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">Naya stock</div>
              <div className={`text-2xl font-extrabold tabular-nums ${finalStock < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                {fmtQty(finalStock)} <span className="text-sm font-bold text-slate-500">{unit}</span>
              </div>
              {row.packSize && finalStock >= 0 && (
                <div className="text-[10px] font-bold text-slate-500 tabular-nums">
                  = {fmtQty(finalStock * row.packSize)} {row.packUnit}
                </div>
              )}
            </div>
            {diff !== 0 && (
              <div className={`px-2.5 py-1 rounded-xl text-sm font-extrabold tabular-nums shrink-0 ${
                diff > 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
              }`}>{diff > 0 ? '+' : ''}{fmtQty(diff)}</div>
            )}
            <div className="text-right">
              <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">Bikri qeemat</div>
              <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {hideCost ? '••••' : formatPKRFull(Math.max(finalStock, 0) * Number(p.price || 0))}
              </div>
            </div>
          </div>

          {finalStock < 0 && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/15 border-2 border-rose-200 dark:border-rose-500/40 p-2.5 flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Stock minus nahi ho sakta — abhi sirf {fmtQty(current)} {unit} hai
            </div>
          )}

          {row.cert.state === 'expired' && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/15 border-2 border-rose-200 dark:border-rose-500/40 p-2.5 flex items-start gap-2 text-[11px] font-bold text-rose-800 dark:text-rose-300">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{row.cert.text} — stock daal to sakte hain, magar bechne se pehle renew karwa lein.</span>
            </div>
          )}
          {row.restricted && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-2.5 flex items-start gap-2 text-[11px] font-bold text-amber-900 dark:text-amber-200">
              <Landmark className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Restricted cheez hai — har kisi ko nahi bechni.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-4 flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSave}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-lime-700 disabled:opacity-50">
            <Save className="h-4 w-4" /> Stock save karo
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModeBtn({ active, onClick, activeCls, title, sub }: {
  active: boolean; onClick: () => void; activeCls: string; title: string; sub: string;
}) {
  return (
    <button onClick={onClick}
      className={`py-3 rounded-2xl border-2 font-extrabold text-xs sm:text-sm transition ${
        active ? activeCls
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
      }`}>
      {title}
      <div className="text-[10px] font-bold opacity-70">{sub}</div>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════
   CARD
   ═════════════════════════════════════════════════════════════ */
function AgriCard({ r, selected, onToggle, onStock }: {
  r: Row; selected: boolean; onToggle: () => void; onStock: () => void;
}) {
  const p = r.product;
  const img = p.images?.find((i: any) => i.isPrimary)?.url ?? p.images?.[0]?.url ?? r.profile?.imageUrls?.[0];
  const badCert = needsGovtReg(r.kind) && (r.cert.state === 'expired' || r.cert.state === 'soon');

  return (
    <div className={[
      'group relative rounded-2xl bg-white dark:bg-slate-900/80 border-2 overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 avoid-break',
      selected ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-500/30'
        : r.cert.state === 'expired' ? 'border-rose-300 dark:border-rose-500/50'
        : r.isOut ? 'border-rose-200 dark:border-rose-500/40'
        : r.isLow ? 'border-amber-200 dark:border-amber-500/40'
        : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/40',
      !p.isActive ? 'opacity-60' : '',
    ].join(' ')}>
      <button onClick={onToggle} aria-label="Select"
        className={[
          'absolute top-2 left-2 z-10 h-7 w-7 rounded-lg border-2 flex items-center justify-center transition shadow-sm print:hidden',
          selected ? 'bg-emerald-600 border-emerald-600 text-white'
            : 'bg-white/90 dark:bg-slate-900/90 border-slate-300 dark:border-slate-600 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100',
        ].join(' ')}>
        {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
      </button>

      <Link to={ROUTES.detail(p.id)} className="block">
        <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden">
          {img ? (
            <img src={img} alt={p.name} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${productTint(p.name)} select-none`}>
              <span className="text-5xl drop-shadow-sm">{AGRI_KIND_EMOJI[r.kind] || productEmoji(p.name, p.category?.name)}</span>
            </div>
          )}
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            {p.isFeatured && (
              <span className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shadow">
                <Star className="h-3 w-3 fill-white text-white" />
              </span>
            )}
            {r.restricted && <Badge tone="rose"><ShieldAlert className="h-2.5 w-2.5" /> Restricted</Badge>}
            {r.profile?.isOrganic && <Badge tone="emerald"><Leaf className="h-2.5 w-2.5" /> Organic</Badge>}
            {badCert && (
              <Badge tone={r.cert.state === 'expired' ? 'rose' : 'amber'}>
                <ShieldAlert className="h-2.5 w-2.5" />
                {r.cert.state === 'expired' ? 'Reg khatam' : `${r.cert.days}d`}
              </Badge>
            )}
          </div>
          {(r.isOut || r.isLow) && (
            <div className={`absolute inset-x-0 bottom-0 py-1 text-center text-[10px] font-extrabold text-white tracking-wide ${r.isOut ? 'bg-rose-600' : 'bg-amber-500'}`}>
              {r.isOut ? 'STOCK KHATAM' : `SIRF ${fmtQty(r.stock)} ${p.unit} BACHA`}
            </div>
          )}
        </div>

        <div className="p-2.5">
          <div className="font-extrabold text-slate-900 dark:text-white text-xs leading-tight line-clamp-2 min-h-[2rem] group-hover:text-emerald-600">{p.name}</div>
          <div className="mt-1 flex items-center gap-1 flex-wrap">
            <KindChip kind={r.kind} />
            {p.category && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md text-white truncate max-w-[8rem]"
                style={{ backgroundColor: p.category.color || '#64748b' }}>
                {p.category.name}
              </span>
            )}
          </div>
          {(r.profile?.targetCrops ?? []).length > 0 && (
            <div className="mt-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 truncate">
              🌾 {(r.profile?.targetCrops ?? []).slice(0, 3).join(', ')}
            </div>
          )}
          <ProductTags tags={p.tags} />
          <div className="mt-1.5 flex items-end justify-between gap-1">
            <div>
              <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">{formatPKR(p.price || 0)}</div>
              <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                per {agriUnitLabel(p.unit ?? 'bag')}
                {r.packSize ? ` (${r.packSize} ${r.packUnit})` : ''}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-extrabold tabular-nums leading-none ${
                r.isOut ? 'text-rose-700 dark:text-rose-400' : r.isLow ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
              }`}>{fmtQty(r.stock)}</div>
              <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">stock</div>
            </div>
          </div>
        </div>
      </Link>

      <div className="px-2.5 pb-2.5 flex items-center gap-1 print:hidden">
        <button onClick={onStock}
          className="flex-1 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold inline-flex items-center justify-center gap-1 transition active:scale-[0.97]">
          <Plus className="h-3 w-3" /> Stock
        </button>
        <Link to={ROUTES.edit(p.id)} title="Edit"
          className="h-9 w-9 rounded-lg bg-violet-50 dark:bg-violet-500/15 hover:bg-violet-100 dark:hover:bg-violet-500/25 text-violet-700 dark:text-violet-300 flex items-center justify-center transition">
          <Edit3 className="h-3.5 w-3.5" />
        </Link>
        <Link to={ROUTES.pos} title="POS"
          className="h-9 w-9 rounded-lg bg-lime-50 dark:bg-lime-500/15 hover:bg-lime-100 dark:hover:bg-lime-500/25 text-lime-700 dark:text-lime-300 flex items-center justify-center transition">
          <ShoppingCart className="h-3.5 w-3.5" />
        </Link>
        <ProductDeleteButton id={p.id} name={p.name} />
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   TABLE
   ═════════════════════════════════════════════════════════════ */
function AgriTable({ rows, hideCost, selected, onToggle, onToggleAll, onStock }: {
  rows: Row[]; hideCost: boolean; selected: Set<string>;
  onToggle: (id: string) => void; onToggleAll: () => void; onStock: (r: Row) => void;
}) {
  const allOn = rows.length > 0 && rows.every((r) => selected.has(r.product.id));
  return (
    <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:border-0 print:shadow-none">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-3 py-3 w-10 print:hidden">
                <input type="checkbox" checked={allOn} onChange={onToggleAll} className="h-4 w-4 rounded accent-emerald-600" />
              </th>
              <Th>Cheez</Th>
              <Th>Qism</Th>
              <Th>Category</Th>
              {!hideCost && <Th className="text-right">Cost</Th>}
              <Th className="text-right">Rate</Th>
              <Th className="text-right">Stock</Th>
              {!hideCost && <Th className="text-right">Lagat</Th>}
              <Th className="text-center">Registration</Th>
              <Th className="text-center">Halat</Th>
              <Th className="text-right print:hidden">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => {
              const p = r.product;
              const on = selected.has(p.id);
              return (
                <tr key={p.id} className={`hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition avoid-break ${on ? 'bg-emerald-50/60 dark:bg-emerald-500/10' : ''}`}>
                  <td className="px-3 py-2.5 print:hidden">
                    <input type="checkbox" checked={on} onChange={() => onToggle(p.id)} className="h-4 w-4 rounded accent-emerald-600" />
                  </td>
                  <td className="px-3 py-2.5">
                    <Link to={ROUTES.detail(p.id)} className="flex items-center gap-2.5 group">
                      <Thumb p={p} kind={r.kind} />
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate group-hover:text-emerald-600 flex items-center gap-1">
                          {p.name}
                          {p.isFeatured && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                          {r.restricted && <ShieldAlert className="h-3 w-3 text-rose-500 shrink-0" />}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                          {p.sku || p.barcode || '—'}
                          {r.packSize ? ` • 1 ${agriUnitLabel(p.unit ?? 'bag')} = ${r.packSize} ${r.packUnit}` : ''}
                        </div>
                        <ProductTags tags={p.tags} max={2} />
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5"><KindChip kind={r.kind} /></td>
                  <td className="px-3 py-2.5">
                    {p.category ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white" style={{ backgroundColor: p.category.color || '#64748b' }}>
                        {p.category.name}
                      </span>
                    ) : <span className="text-[10px] text-slate-400 font-bold">—</span>}
                  </td>
                  {!hideCost && <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums">{formatPKR(p.costPrice || 0)}</td>}
                  <td className="px-3 py-2.5 text-right font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(p.price || 0)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => onStock(r)} className="inline-flex flex-col items-end group">
                      <span className={`font-extrabold tabular-nums text-sm ${
                        r.isOut ? 'text-rose-700 dark:text-rose-400' : r.isLow ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-white'
                      }`}>
                        {fmtQty(r.stock)} <span className="text-[10px] font-bold text-slate-500">{p.unit}</span>
                      </span>
                      <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition print:hidden">+ Stock</span>
                    </button>
                  </td>
                  {!hideCost && <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">{formatPKR(r.costValue)}</td>}
                  <td className="px-3 py-2.5 text-center">
                    {!needsGovtReg(r.kind) ? <span className="text-[10px] text-slate-400 font-bold">—</span>
                      : r.cert.state === 'expired' ? <Pill tone="rose">Khatam</Pill>
                      : r.cert.state === 'soon' ? <Pill tone="amber">{r.cert.days}d</Pill>
                      : r.cert.state === 'ok' ? <Pill tone="emerald">OK</Pill>
                      : <Pill tone="slate">Nahi likhi</Pill>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {r.isOut ? <Pill tone="rose">Khatam</Pill>
                      : r.isLow ? <Pill tone="amber">Kam</Pill>
                      : p.isActive ? <Pill tone="emerald">OK</Pill>
                      : <Pill tone="slate">Band</Pill>}
                  </td>
                  <td className="px-3 py-2.5 print:hidden">
                    <div className="flex items-center justify-end gap-1">
                      <IconLink to={ROUTES.detail(p.id)} title="Dekho" tone="sky"><Eye className="h-3.5 w-3.5" /></IconLink>
                      <IconLink to={ROUTES.edit(p.id)} title="Edit" tone="violet"><Edit3 className="h-3.5 w-3.5" /></IconLink>
                      <button onClick={() => onStock(r)} title="Stock"
                        className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 flex items-center justify-center transition">
                        <Boxes className="h-3.5 w-3.5" />
                      </button>
                      <ProductDeleteButton id={p.id} name={p.name} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════
   ANALYTICS
   ═════════════════════════════════════════════════════════════ */
function Analytics({ stats, margin, potentialProfit, money, hideCost, categoryChart, kindPie, valueChart, seasonChart, certChart, stockHealth, rows }: any) {
  const topByValue = useMemo(
    () => [...rows].sort((a: Row, b: Row) => b.costValue - a.costValue).slice(0, 5),
    [rows],
  );

  return (
    <div className="space-y-4">
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat icon={Boxes} label="Gudaam ki qeemat" value={money(stats.costValue)} tone="lime" />
        <MiniStat icon={TrendingUp} label="Sab bik jaye to" value={money(stats.retailValue)} tone="emerald" />
        <MiniStat icon={Award} label="Munafa" value={hideCost ? '••••' : `${margin.toFixed(1)}%`} sub={money(potentialProfit)} tone="amber" />
        <MiniStat icon={ShieldCheck} label="Registration wali" value={stats.regulated}
          sub={`${stats.expired} khatam • ${stats.missingCert} nahi likhi`} tone="rose" />
      </section>

      {(stats.noCost > 0 || stats.noPack > 0 || stats.missingCert > 0 || stats.noProfile > 0) && (
        <section className="rounded-3xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="font-black text-amber-900 dark:text-amber-200">Ye theek kar lein</h3>
          </div>
          {stats.noCost > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{stats.noCost}</strong> cheezon ki cost 0 hai — in ka munafa poora dikhta hai, jo sach nahi.
            </p>
          )}
          {stats.noPack > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{stats.noPack}</strong> cheezon par "1 bori me kitna hai" likha nahi — POS par kilo ka hisab ghalat aayega.
            </p>
          )}
          {stats.missingCert > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{stats.missingCert}</strong> beej/dawa par registration ki tareekh nahi bhari — khatam hone par warning nahi aayegi.
            </p>
          )}
          {stats.noProfile > 0 && (
            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              • <strong>{stats.noProfile}</strong> cheezein bina agri tafseel ke hain — fasal, mausam aur safety kuch nahi likha.
            </p>
          )}
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard icon={Layers} title="Category me kitni cheezein" tone="emerald">
          {categoryChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke={AXIS} fontSize={11} width={45} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => [v, 'Cheezein']} />
                <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard icon={Package} title="Kis tarah ka maal" tone="lime">
          {kindPie.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={kindPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {kindPie.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard icon={DollarSign} title="Sab se zyada paisa kis me phansa hai" tone="emerald" wide>
          {hideCost ? (
            <div className="h-full flex items-center justify-center text-sm font-bold text-slate-400">🔒 Cost chhupi hai — PIN se kholein</div>
          ) : valueChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={valueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="name" stroke={AXIS} fontSize={10} fontWeight={700} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke={AXIS} fontSize={11} width={78} tickFormatter={(v) => Number(v).toLocaleString('en-PK')} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: any, n: any) => [formatPKR(Number(v)), n === 'lagat' ? 'Lagat' : 'Bikri par']} />
                <Legend formatter={(v) => (v === 'lagat' ? 'Lagat' : 'Bikri par')} />
                <Bar dataKey="lagat" fill="#84cc16" radius={[6, 6, 0, 0]} />
                <Bar dataKey="bikri" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard icon={Calendar} title="Kis mausam ka maal" tone="amber">
          {seasonChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={seasonChart} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {seasonChart.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard icon={ShieldCheck} title="Sarkari registration ki halat" tone="rose">
          {certChart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={certChart} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {certChart.map((x: any, i: number) => <Cell key={i} fill={x.color} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard icon={Flame} title="Stock ki halat" tone="amber">
          {stockHealth.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stockHealth} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {stockHealth.map((x: any, i: number) => <Cell key={i} fill={x.color} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      {!hideCost && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            <h3 className="font-black text-slate-900 dark:text-white">Sab se qeemti stock</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {topByValue.map((r: Row, i: number) => (
              <div key={r.product.id} className="p-3 flex items-center gap-3">
                <span className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 shrink-0">{i + 1}</span>
                <Link to={ROUTES.detail(r.product.id)} className="min-w-0 flex-1 font-extrabold text-sm text-slate-900 dark:text-white truncate hover:text-emerald-600">
                  {r.product.name}
                </Link>
                <span className="text-sm font-black tabular-nums text-slate-900 dark:text-white shrink-0">{formatPKR(r.costValue)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   CHHOTE HISSE
   ═════════════════════════════════════════════════════════════ */
const sel = 'h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition';

function Segmented<T extends string>({ value, onChange, options, activeCls }: {
  value: T; onChange: (v: T) => void; activeCls: string;
  options: Array<{ v: T; l: string; c?: number }>;
}) {
  return (
    <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button key={o.v} onClick={() => onChange(o.v)}
            className={`px-3 py-2 rounded-lg text-xs font-extrabold transition active:scale-[0.97] ${
              on ? `${activeCls} shadow-sm` : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}>
            {o.l}
            {o.c != null && <span className={`ml-1 tabular-nums ${on ? 'opacity-70' : 'text-slate-400 dark:text-slate-500'}`}>{o.c}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Chip({ tone, children }: { tone?: 'amber' | 'rose'; children: any }) {
  const bg = tone === 'amber' ? 'bg-amber-400/20' : tone === 'rose' ? 'bg-rose-400/20' : 'bg-white/10';
  return <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 ${bg}`}>{children}</span>;
}

function HeroBtn({ children, ...rest }: any) {
  return (
    <button {...rest}
      className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur disabled:opacity-50 transition active:scale-[0.97]">
      {children}
    </button>
  );
}

function Kbd({ children }: { children: any }) {
  return <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm">{children}</kbd>;
}

function KindChip({ kind }: { kind: AgriKind }) {
  const tones: Partial<Record<AgriKind, string>> = {
    SEEDS: 'bg-lime-100 dark:bg-lime-500/20 text-lime-700 dark:text-lime-300',
    FERTILIZER: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    PESTICIDE: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
    HERBICIDE: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
    FUNGICIDE: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
    INSECTICIDE: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
  };
  const cls = tones[kind] ?? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
  return (
    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${cls}`}>
      {AGRI_KIND_EMOJI[kind]} {prettyAgriKind(kind)}
    </span>
  );
}

function ProductTags({ tags, max = 3 }: { tags?: any[]; max?: number }) {
  const list = (tags ?? []).map((t: any) => t?.tag ?? t).filter((t: any) => t?.name);
  if (!list.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {list.slice(0, max).map((t: any) => (
        <span key={t.id} className="inline-flex items-center text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border"
          style={{ color: t.color || '#059669', borderColor: `${t.color || '#059669'}55`, backgroundColor: `${t.color || '#059669'}14` }}>
          #{t.name}
        </span>
      ))}
      {list.length > max && <span className="text-[9px] font-extrabold text-slate-400">+{list.length - max}</span>}
    </div>
  );
}

function Thumb({ p, kind }: { p: any; kind: AgriKind }) {
  const url = p.images?.find((i: any) => i.isPrimary)?.url ?? p.images?.[0]?.url;
  return (
    <div className={`h-10 w-10 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 ${
      url ? 'bg-slate-100 dark:bg-slate-800' : `bg-gradient-to-br ${productTint(p.name)}`
    }`}>
      {url ? <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-lg select-none">{AGRI_KIND_EMOJI[kind]}</div>}
    </div>
  );
}

function Th({ children, className = '' }: any) {
  return <th className={`px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 ${className}`}>{children}</th>;
}

function Pill({ tone, children }: any) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
    slate: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${tones[tone]}`}>{children}</span>;
}

function IconLink({ to, title, tone, children }: any) {
  const tones: Record<string, string> = {
    sky: 'bg-sky-50 dark:bg-sky-500/15 hover:bg-sky-100 dark:hover:bg-sky-500/25 text-sky-700 dark:text-sky-300',
    violet: 'bg-violet-50 dark:bg-violet-500/15 hover:bg-violet-100 dark:hover:bg-violet-500/25 text-violet-700 dark:text-violet-300',
  };
  return <Link to={to} title={title} className={`h-8 w-8 rounded-lg flex items-center justify-center transition ${tones[tone]}`}>{children}</Link>;
}

function Badge({ tone, children }: any) {
  const tones: Record<string, string> = {
    rose: 'bg-rose-600 text-white', amber: 'bg-amber-500 text-white',
    sky: 'bg-sky-600 text-white', emerald: 'bg-emerald-600 text-white',
  };
  return <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 shadow ${tones[tone]}`}>{children}</span>;
}

function Kpi({ icon: Icon, label, value, sub, tone, onClick, active }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/40',
    lime: 'from-lime-500 to-green-600 shadow-lime-500/40',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={[
        'rounded-2xl bg-white dark:bg-slate-900/80 border-2 p-3 sm:p-4 shadow-sm text-left w-full transition-all duration-200',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer active:scale-[0.98]' : '',
        active ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
      ].join(' ')}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}

function MiniStat({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400', lime: 'text-lime-600 dark:text-lime-400',
    amber: 'text-amber-600 dark:text-amber-400', rose: 'text-rose-600 dark:text-rose-400',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-4 w-4 ${tones[tone]}`} />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      </div>
      <div className="mt-1.5 text-xl font-black text-slate-900 dark:text-white tabular-nums break-words">{value}</div>
      {sub && <div className="text-[11px] font-bold text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function ChartCard({ icon: Icon, title, tone, wide, children }: any) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-600', lime: 'text-lime-600', amber: 'text-amber-600', rose: 'text-rose-600',
  };
  return (
    <section className={`rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 ${wide ? 'lg:col-span-2' : ''}`}>
      <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tones[tone]}`} /> {title}
      </h3>
      <div className="h-64">{children}</div>
    </section>
  );
}

function EmptyChart() {
  return <div className="h-full flex items-center justify-center"><p className="text-sm font-bold text-slate-400">Abhi dikhane ko kuch nahi</p></div>;
}

function Empty({ hasFilters, onClear, onGuide }: { hasFilters: boolean; onClear: () => void; onGuide: () => void }) {
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 sm:p-16 text-center">
      <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-lime-700 flex items-center justify-center shadow-lg shadow-emerald-500/40">
        <Wheat className="h-10 w-10 text-white" />
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">{hasFilters ? 'Kuch nahi mila' : 'Abhi koi cheez nahi'}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-semibold max-w-md mx-auto">
        {hasFilters ? 'Chaant badal kar dekhein' : 'Pehli cheez daaliye — urea ki bori, gandum ka beej ya spray'}
      </p>
      <div className="mt-5 flex gap-2 justify-center flex-wrap">
        {hasFilters ? (
          <Button variant="secondary" onClick={onClear}><X className="h-4 w-4" /> Chaant hatao</Button>
        ) : (
          <>
            <button onClick={onGuide}
              className="h-11 px-4 rounded-xl bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 text-amber-800 dark:text-amber-200 text-xs font-extrabold inline-flex items-center gap-1.5 border-2 border-amber-300 dark:border-amber-500/40 transition">
              <GraduationCap className="h-4 w-4" /> Pehle seekh lo
            </button>
            <Link to={ROUTES.create}
              className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition">
              <Plus className="h-4 w-4" /> Nayi cheez
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl animate-in"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-lime-50 dark:from-emerald-500/15 dark:to-lime-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Ye safha kaise chalta hai
          </h3>
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <p className="font-bold text-slate-700 dark:text-slate-200">
            Aap ki dukaan ka <strong>saara maal</strong> ek jagah — beej, khaad, dawa, feed aur auzaar.
          </p>
          <Tip icon={ShieldAlert} title="Sarkari registration — sab se ahem">
            Beej aur zehreeli dawa ki meyaad khatam ho jaye to bechna ghair-qanooni hai. Wo warning
            sab se ooper aati hai, kisi filter ke peeche nahi. Renew karwa kar tareekh update karein.
          </Tip>
          <Tip icon={Scale} title="Bori ka hisab">
            1 bori urea = 50 kg. Card aur table par dono dikhte hain, aur POS par bori bikne se
            stock me se poore 50 kg ghatte hain — 1 nahi.
          </Tip>
          <Tip icon={Sprout} title="Fasal se dhoondein">
            Search me "gandum" ya "sundi" likh dein — jo cheezein us fasal ya us keeray ke liye
            hain, sab saamne aa jayengi. Farmer ke sawal ka jawab foran.
          </Tip>
          <Tip icon={Boxes} title="Quick stock">
            Card par "+ Stock", table me stock ke number par, ya kam-stock patti par click —
            foran maal daalein.
          </Tip>
          <Tip icon={Barcode} title="Scan">Scan dabayein ya B — cheez foran samne, sath me "+ Stock" ka button.</Tip>
          <Tip icon={CheckCircle2} title="Ek saath kai cheezein">Card par checkbox — phir active/band, labels, export ya delete.</Tip>
          <Tip icon={Trash2} title="Delete">Jin ki sales history hai wo nahi mitti — Force Delete ka alag option aata hai.</Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">/</kbd> dhoondo</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">B</kbd> scan</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">A</kbd> analytics</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">V</kbd> grid / table</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">Enter</kbd> stock save</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">Esc</kbd> band</div>
            </div>
          </div>
          <Button className="w-full" onClick={onClose}>Samajh gaya</Button>
        </div>
      </div>
    </div>
  );
}

function Tip({ icon: Icon, title, children }: any) {
  return (
    <div className="flex gap-2.5">
      <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}
