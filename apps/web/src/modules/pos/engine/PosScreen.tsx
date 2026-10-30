/**
 * The counter screen, keyboard first. One search box takes typed names and
 * barcode-gun scans alike; arrow keys walk the results and Enter adds the
 * highlighted one. F-keys reach the customer, discount, hold, payment and
 * checkout; F3 moves into the bill lines. "?" lists every shortcut.
 *
 * Four layouts on the same engine (chosen in Settings, or per user):
 * classic (grid + bill), express (big search + bill table), cart-focus
 * (big bill + narrow product list) and touch (big tiles). Phones always get
 * the grid with the bill as a sheet.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight, Camera, CreditCard, Eye, EyeOff, GraduationCap, Grid3x3, Keyboard, LayoutGrid, List, Mic, Package, Pause, Printer,
  Repeat, Search, Settings2, ShoppingCart, Sparkles, X, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Kbd, Skeleton, confirmDialog } from '@/design-system/components';
import { productEmoji, productTint } from '@modules/inventory/products/lib/productEmoji';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { VoiceSaleButton } from '@core/components/voice/VoiceSaleButton';
import { DrawerButton } from '@core/hardware/HardwareBoot';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import {
  PosCartPanel, PosCheckoutModal, PosComboTile, PosCustomerAddModal, PosDiscountModal, PosEmptyState, PosHoldCartsModal,
  PosItemCard, PosItemRow, PosPerks, PosQuickKeyTile, PosSettingsModal, PosSuccessModal, PosTeacher, PosUnitPickerModal, PosViewTab, PosWeighModal,
  VariantPicker,
} from '../components';
import { PosSellerPicker } from '../components/PosSellerPicker';
import { PosBatchChip } from '../components/PosBatchPicker';
import { PosLineTier, PosTierBar } from '../components/PosTierBar';
import { PosShortcutsOverlay } from '../components/PosShortcutsOverlay';
import { PosPayPicker, type PosPayChoice } from '../components/PosPayPicker';
import { PosMoreMenu, type PosMoreAction } from '../components/PosMoreMenu';
import { isWeightUnit } from '../lib/posUnits';
import { looksLikePhone, parseQtyPrefix, phoneDigits } from '../lib/posKeys';
import { printReceiptDirect } from '../lib/thermalReceipt';
import type { PosIndustryConfig, PosItem } from './types';
import { usePosEngine } from './usePosEngine';
import { useAiCartPrefill } from '../hooks/useAiCartPrefill';
import { freeVariantStock } from '@modules/inventory/products/api/product-variants.api';
import { t as tr } from '@core/i18n';

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => { setOnline(true); toast.success(tr('Internet wapas aa gaya')); };
    const off = () => { setOnline(false); toast.warning(tr('Offline — sales is computer par save hongi')); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
const GRID_TOUCH = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 2xl:grid-cols-4';
const CHIP = 'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium transition';
const LAYOUT_KEY = 'nafaa-pos-layout';
/** Rows in the express dropdown. */
const DROPDOWN_ROWS = 8;

function HeroButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} onMouseDown={(e) => e.preventDefault()} title={label} aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/90 transition hover:bg-white/15 hover:text-white">
      {children}
    </button>
  );
}

function HeroStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
      <div className="text-[0.5625rem] font-medium uppercase tracking-wide text-white/65">{label}</div>
      <div className="text-[0.875rem] font-bold tabular-nums leading-tight">{value}</div>
    </div>
  );
}

/** Wide screens get the chosen layout; phones and small tablets always get the grid with the bill as a sheet. */
function useIsDesktop() {
  const q = '(min-width: 1024px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);
  return new Intl.DateTimeFormat('en-PK', { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(now);
}

export function PosScreen({ config }: { config: PosIndustryConfig }) {
  const e = usePosEngine(config);
  // A bill prepared by Nafaa AI ("POS me kholein") arrives as router state.
  useAiCartPrefill(e);
  const c = e.counter;
  const qc = useQueryClient();
  const online = useOnline();
  const canEditShop = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const searchRef = useRef<HTMLInputElement>(null);
  const cartListRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [scanner, setScanner] = useState(false);
  const [settings, setSettings] = useState(false);
  const [teacher, setTeacher] = useState(false);
  const [discount, setDiscount] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [payPicker, setPayPicker] = useState(false);
  const [more, setMore] = useState(false);
  const [checkoutSplit, setCheckoutSplit] = useState(false);
  const [mobileCart, setMobileCart] = useState(false);
  const [newCustomer, setNewCustomer] = useState<{ name: string; phone: string } | null>(null);
  const [customerOpenKey, setCustomerOpenKey] = useState(0);
  const [receiverOpenKey, setReceiverOpenKey] = useState(0);
  /** Where the keyboard is: the search box or the bill lines. */
  const [zone, setZone] = useState<'search' | 'cart'>('search');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [qtyEditId, setQtyEditId] = useState<string | null>(null);
  const [noteEditId, setNoteEditId] = useState<string | null>(null);
  const { hidePrices, setHidePrices, printerWidth } = e.prefs;
  const autoPrint = e.autoPrint;
  const clock = useClock();
  const { data: overview } = useOverview();
  const { costHidden, salesHidden } = useMasked();
  // Hidden under the privacy lock as well: the counter faces customers.
  const statsHidden = costHidden || salesHidden || hidePrices;
  const today = {
    sales: statsHidden ? '••••' : formatPKR(overview?.stats.salesToday ?? 0),
    bills: statsHidden ? '•' : overview?.stats.ordersToday ?? 0,
  };
  const [gridMode, setGridModeState] = useState<'grid' | 'list'>(() => {
    try { return localStorage.getItem(LAYOUT_KEY) === 'list' ? 'list' : 'grid'; } catch { return 'grid'; }
  });
  const setGridMode = (v: 'grid' | 'list') => { setGridModeState(v); try { localStorage.setItem(LAYOUT_KEY, v); } catch { /* private window */ } };

  const isDesktop = useIsDesktop();
  const layout = isDesktop ? c.layout : 'classic';
  const touch = layout === 'touch';
  const showQuick = !!config.quickKeys && c.showQuickKeys;

  const addCustomer = useMutation({
    mutationFn: customersApi.create,
    onSuccess: (cu: { id: string; name: string }) => {
      toast.success(tr('{{name}} add ho gaya', { name: cu.name }));
      e.setCustomerId(cu.id);
      setNewCustomer(null);
      qc.invalidateQueries({ queryKey: ['customers-for-pos'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err?.response?.data?.message || tr('Customer add nahi hua')),
  });
  const openNewCustomer = (prefill?: string) =>
    setNewCustomer(prefill && looksLikePhone(prefill) ? { name: '', phone: prefill.replace(/\s/g, '') } : { name: prefill ?? '', phone: '' });

  const anyModal = scanner || settings || teacher || discount || heldOpen || shortcuts || payPicker || more || !!newCustomer || !!e.checkout || !!e.lastSale
    || !!e.unitPicker || !!e.weigh || !!e.variantPicker || !!e.picker;

  /* ── Lines the keyboard works on ── */
  const lineIds = e.cart.map((l) => l.id);
  const has = (id: string | null) => !!id && lineIds.includes(id);
  /** Selected line, else the one last added or changed, else the bottom one. */
  const targetId = (has(selectedId) ? selectedId : null) ?? (has(e.lastLineId) ? e.lastLineId : null) ?? lineIds[lineIds.length - 1] ?? null;
  useEffect(() => { setSelectedId(null); }, [e.lastLineId]);

  const focusSearch = useCallback(() => { setZone('search'); searchRef.current?.focus(); }, []);
  const focusCart = useCallback(() => {
    if (!e.cart.length) { toast.info(tr('Bill khaali hai')); return; }
    setZone('cart');
    setSelectedId(targetId);
    cartListRef.current?.focus();
  }, [e.cart.length, targetId]);
  useEffect(() => { if (!e.cart.length && zone === 'cart') focusSearch(); }, [e.cart.length, zone, focusSearch]);

  // After a qty / rate / note edit closes, the keyboard goes back where it was.
  const editing = !!(qtyEditId || e.priceEditId || noteEditId);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !editing) {
      setTimeout(() => { if (zone === 'cart') cartListRef.current?.focus(); else searchRef.current?.focus(); }, 0);
    }
    wasEditing.current = editing;
  }, [editing, zone]);

  // Keep the search box ready for the barcode gun whenever nothing else needs focus.
  useEffect(() => {
    if (anyModal || zone === 'cart') return;
    const t = setTimeout(() => {
      const a = document.activeElement as HTMLElement | null;
      if (a && a !== document.body && a !== searchRef.current && (['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName) || a.isContentEditable)) return;
      searchRef.current?.focus();
    }, 250);
    return () => clearTimeout(t);
  }, [anyModal, e.cart.length, zone]);
  useEffect(() => { if (!e.checkout) setCheckoutSplit(false); }, [e.checkout]);

  /* ── Results the arrow keys walk ── */
  const query = parseQtyPrefix(e.search).rest;
  const results: unknown[] = e.view === 'products' ? e.filtered : e.view === 'combos' ? e.filteredBundles : [];
  const resultCap = layout === 'express' ? Math.min(results.length, DROPDOWN_ROWS) : results.length;
  useEffect(() => { setActiveIdx(query ? 0 : -1); }, [query, e.view, e.categoryId, e.filterId]);
  useEffect(() => {
    if (activeIdx < 0) return;
    if (e.view === 'products' && activeIdx >= e.visible) e.setVisible((v) => Math.max(v, activeIdx + 30));
    requestAnimationFrame(() => resultsRef.current?.querySelector('[data-active="1"]')?.scrollIntoView({ block: 'nearest' }));
  }, [activeIdx]); // eslint-disable-line react-hooks/exhaustive-deps
  const move = (d: number) => {
    if (!resultCap) return;
    setActiveIdx((i) => Math.min(Math.max(i < 0 ? 0 : i + d, 0), resultCap - 1));
  };

  /* ── Actions ── */
  const needCustomer = () => {
    if (e.rules.requireCustomer && !e.customerId) {
      toast.error(tr('Har bill par customer chunna zaroori hai'));
      setCustomerOpenKey((k) => k + 1);
      return true;
    }
    return false;
  };
  const cashPrint = () => { if (e.cart.length && needCustomer()) return; setMobileCart(false); e.instantCash(); };
  const checkout = () => { if (!e.cart.length) { toast.info(tr('Bill khaali hai')); return; } if (needCustomer()) return; setMobileCart(false); e.openCheckout('full'); };
  const openPayPicker = () => { if (!e.cart.length) { toast.info(tr('Bill khaali hai')); return; } if (needCustomer()) return; setPayPicker(true); };
  const onPayPick = (choice: PosPayChoice) => {
    setPayPicker(false);
    if ('split' in choice) { setCheckoutSplit(true); e.openCheckout('full'); }
    else if ('mode' in choice) e.openCheckout('credit');
    else e.openCheckout('full', choice.method);
  };
  const openDiscount = () => {
    if (!c.showDiscount) { toast.error(tr('Discount ka button Settings me band hai')); return; }
    if (!e.rules.allowDiscount) { toast.error(tr('Is dukaan me haath se Discount band hai')); return; }
    if (!e.cart.length) { toast.info(tr('Bill khaali hai')); return; }
    setDiscount(true);
  };
  const holdOrResume = () => {
    if (e.cart.length) { e.hold(); focusSearch(); return; }
    if (e.heldCarts.length === 1) e.resume(e.heldCarts[0]);
    else if (e.heldCarts.length > 1) setHeldOpen(true);
    else toast.info(tr('Koi bill hold par nahi'));
  };
  const bump = (d: number) => { if (!targetId) { toast.info(tr('Bill khaali hai')); return; } e.changeQty(targetId, d); };
  const toggleDelivery = () => {
    if (!c.showDelivery) return;
    e.setDelivery({ ...e.delivery, on: !e.delivery.on });
  };
  const addRecent = (i: number) => { const it = e.recentItems[i]; if (it) e.addItem(it); };

  const submit = () => {
    const { qty, rest } = parseQtyPrefix(e.search);
    // "3*" alone: quantity of the selected (or last) line.
    if (qty != null && !rest) {
      if (!targetId) { toast.info(tr('Bill khaali hai — pehle cheez add karein')); return; }
      e.setQty(targetId, qty);
      e.setSearch('');
      return;
    }
    if (!rest) return;
    // A phone number picks that customer, or adds them.
    if (looksLikePhone(rest) && !e.isCode(rest)) {
      const digits = phoneDigits(rest);
      const found = e.customers.find((cu) => phoneDigits(cu.phone || '') === digits);
      if (found) { e.setCustomerId(found.id); toast.success(tr('{{name}} bill par', { name: found.name })); }
      else openNewCustomer(rest);
      e.setSearch('');
      return;
    }
    e.submitSearch(activeIdx < 0 ? 0 : activeIdx);
    // Not found: keep the text but select it, so the next scan or word replaces it.
    requestAnimationFrame(() => { const el = searchRef.current; if (el?.value) el.select(); });
  };

  const onSearchKey = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    const empty = !e.search;
    if (ev.key === 'ArrowDown') { ev.preventDefault(); move(1); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); move(-1); }
    else if (ev.key === 'Enter' && !ev.ctrlKey && !ev.metaKey) { ev.preventDefault(); submit(); }
    else if (empty && (ev.key === '+' || ev.key === '-')) { ev.preventDefault(); bump(ev.key === '+' ? 1 : -1); }
    else if (empty && ev.key === '?') { ev.preventDefault(); setShortcuts(true); }
    else if (ev.key === 'Escape' && !empty) { ev.preventDefault(); e.setSearch(''); }
  };

  const onCartKey = (ev: React.KeyboardEvent<HTMLDivElement>) => {
    if (ev.target !== ev.currentTarget || !targetId) return;
    const i = lineIds.indexOf(targetId);
    const line = e.cart[i];
    switch (ev.key) {
      case 'ArrowDown': ev.preventDefault(); setSelectedId(lineIds[Math.min(i + 1, lineIds.length - 1)]); break;
      case 'ArrowUp': ev.preventDefault(); setSelectedId(lineIds[Math.max(i - 1, 0)]); break;
      case 'Home': ev.preventDefault(); setSelectedId(lineIds[0]); break;
      case 'End': ev.preventDefault(); setSelectedId(lineIds[lineIds.length - 1]); break;
      case '+': case '=': ev.preventDefault(); e.changeQty(targetId, 1); setSelectedId(targetId); break;
      case '-': ev.preventDefault(); e.changeQty(targetId, -1); setSelectedId(targetId); break;
      case 'Delete': case 'Backspace': {
        ev.preventDefault();
        const next = lineIds[i + 1] ?? lineIds[i - 1] ?? null;
        e.removeLine(targetId);
        setSelectedId(next);
        break;
      }
      case 'Enter': ev.preventDefault(); if (!line?.lockQty) setQtyEditId(targetId); setSelectedId(targetId); break;
      case 'r': case 'R': ev.preventDefault(); if (e.canEditPrice) e.setPriceEditId(targetId); else toast.error(tr('Rate badalne ki ijazat nahi')); setSelectedId(targetId); break;
      case 't': case 'T': {
        if (!e.lineTierOverride || !line || line.fixedPrice || !line.tierSrc) break;
        ev.preventDefault();
        const open = e.tierChoices.filter(e.canPickTier);
        if (open.length > 1) e.setLineTier(targetId, open[(open.indexOf(line.priceTier ?? 'RETAIL') + 1) % open.length]);
        else toast.error(tr('Price tier badalne ki permission nahi'));
        break;
      }
      case 'n': case 'N': if (c.lineNotes) { ev.preventDefault(); setNoteEditId(targetId); setSelectedId(targetId); } break;
      case 'Escape': ev.preventDefault(); focusSearch(); break;
      // Any other letter or digit (a barcode scan, a new name) goes to the search box.
      default: if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) focusSearch(); break;
    }
  };

  // Page-wide keys. Dialogs handle their own keys; the bill lines and the search box handle theirs first.
  const onKey = useCallback((ev: KeyboardEvent) => {
    if (ev.defaultPrevented || isDialogOpen()) return;
    const a = document.activeElement as HTMLElement | null;
    const inSearch = a === searchRef.current;
    const typingElsewhere = !inSearch && isTyping();
    const mod = ev.ctrlKey || ev.metaKey;
    const k = ev.key;
    if (mod && k === 'Enter') { ev.preventDefault(); checkout(); return; }
    if (mod && !ev.shiftKey && (k === 'p' || k === 'P')) { ev.preventDefault(); e.reprintLast(); return; }
    if (ev.altKey && !mod) {
      const digit = /^Digit([1-9])$/.exec(ev.code);
      if (digit && c.recentItems) { ev.preventDefault(); addRecent(Number(digit[1]) - 1); return; }
      if (ev.code === 'KeyR') { ev.preventDefault(); e.repeatLast(); return; }
      if (ev.code === 'KeyL') { ev.preventDefault(); if (c.showReceiver && e.customerId) setReceiverOpenKey((n) => n + 1); else toast.info(tr('Pehle customer chunein (F2)')); return; }
      if (ev.code === 'KeyD') { ev.preventDefault(); toggleDelivery(); return; }
      if (ev.code === 'KeyT' && e.tiersOn) { ev.preventDefault(); e.cycleTier(); return; }
    }
    const fkeys: Record<string, () => void> = {
      F1: () => setTeacher(true),
      F2: () => setCustomerOpenKey((n) => n + 1),
      F3: () => (zone === 'cart' ? focusSearch() : focusCart()),
      F4: openDiscount,
      F6: holdOrResume,
      F7: () => e.setView(e.view === 'products' && config.useBundles ? 'combos' : 'products'),
      F8: openPayPicker,
      F9: () => setMore(true),
      F10: () => { if (showQuick) e.setView('quickkeys'); },
      F12: cashPrint,
    };
    if (fkeys[k]) { ev.preventDefault(); fkeys[k](); return; }
    if (typingElsewhere) return;
    if (k === '?' && !inSearch) { ev.preventDefault(); setShortcuts(true); return; }
    // Escape never leaves the counter (the app would otherwise blur the box or go back).
    if (k === 'Escape') { ev.preventDefault(); if (zone === 'cart' || !inSearch) focusSearch(); else if (e.search) e.setSearch(''); return; }
    if (k === '/' && !inSearch) { ev.preventDefault(); focusSearch(); return; }
    // Typing with focus nowhere goes to the search box.
    if (!inSearch && zone !== 'cart' && k.length === 1 && !mod && !ev.altKey) focusSearch();
  }, [e, c, config, zone, focusSearch, focusCart, showQuick]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onKey]);

  const onGridScroll = (ev: React.UIEvent<HTMLDivElement>) => {
    const t = ev.currentTarget;
    if (e.view === 'products' && e.filtered.length > e.visible && (t.scrollTop + t.clientHeight) / t.scrollHeight > 0.85) {
      e.setVisible((v) => Math.min(v + 60, e.filtered.length));
    }
  };

  const showTabs = !!config.useBundles || showQuick;
  const CartExtra = config.CartExtra;
  const tileProps = (it: PosItem, i: number) => ({
    name: it.name, image: c.showImages ? it.image : undefined, price: e.shownPrice(it), unit: it.unit,
    stock: it.meta?.service || !c.showStock ? undefined : it.stock,
    lowStock: it.lowStock, inCart: e.inCartBy.get(it.id) ?? 0, featured: it.featured, badges: it.badges,
    subline: it.subline, dim: it.dim, hidePrices, active: i === activeIdx, noImage: !c.showImages,
    fallback: config.cardFallback?.(it) ?? <span>{productEmoji(it.name, it.categoryName)}</span>,
    tint: productTint(it.name),
    onClick: () => e.addItem(it), onDecrement: () => e.decrementItem(it.id),
  });

  const moreActions: PosMoreAction[] = [
    { id: 'checkout', label: tr('Checkout — sab tareeqe, split'), icon: CreditCard, keys: 'Ctrl Enter', disabled: !e.cart.length, run: checkout },
    { id: 'reprint', label: tr('Pichhla bill dobara print'), hint: e.lastBill ? `${e.lastBill.number} · ${formatPKR(e.lastBill.total)}` : undefined, icon: Printer, keys: 'Ctrl P', disabled: !e.lastBill, run: e.reprintLast },
    { id: 'repeat', label: tr('Pichhla bill dobara bechein'), hint: tr('Wahi cheezein is bill me'), icon: Repeat, keys: 'Alt R', disabled: !e.lastBill, run: e.repeatLast },
    { id: 'held', label: tr('Hold kiye hue bill ({{count}})', { count: e.heldCarts.length }), icon: Pause, keys: 'F6', disabled: !e.heldCarts.length, run: () => setHeldOpen(true) },
    { id: 'scan', label: tr('Camera se barcode scan'), icon: Camera, run: () => setScanner(true) },
    { id: 'voice', label: tr('Awaaz se bill'), icon: Mic, disabled: config.voice === false, run: () => document.getElementById('pos-voice-btn')?.querySelector('button')?.click() },
    { id: 'prices', label: hidePrices ? tr('Rate dikhayein') : tr('Rate chhupayein'), hint: tr('Customer ke samne screen'), icon: hidePrices ? Eye : EyeOff, run: () => setHidePrices((v: boolean) => !v) },
    { id: 'settings', label: tr('POS settings — mera layout'), icon: Settings2, run: () => setSettings(true) },
    { id: 'keys', label: tr('Sab shortcuts'), icon: Keyboard, keys: '?', run: () => setShortcuts(true) },
    { id: 'guide', label: tr('Guide'), icon: GraduationCap, keys: 'F1', run: () => setTeacher(true) },
  ];

  /* ── Pieces shared by the layouts ── */
  const hero = (slim?: boolean) => (
    <div className={cn('relative shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white shadow-md shadow-brand-900/10', slim ? 'px-3 py-2' : 'px-3 py-2 sm:px-4')}>
      <span className="pointer-events-none absolute -end-16 -top-20 h-48 w-48 rounded-full bg-white/10 blur-3xl" aria-hidden />
      <div className={cn('relative flex items-center justify-between gap-2', !slim && 'flex-wrap')}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25"><ShoppingCart className="h-4 w-4" /></span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[1rem] font-semibold">{tr('{{label}} POS', { label: config.label })}</h1>
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold ring-1',
                online ? 'bg-white/15 text-white ring-white/25' : 'bg-amber-400 text-amber-950 ring-amber-300')}>
                <span className={cn('h-1.5 w-1.5 rounded-full', online ? 'animate-pulse bg-emerald-300' : 'bg-amber-900')} />{online ? tr('Online') : tr('Offline')}
              </span>
            </div>
            {!slim && <p className="truncate text-[0.6875rem] text-white/75">{e.tenant?.name}{clock && ` · ${clock}`}{autoPrint && tr(' · auto-print {{printerWidth}}mm', { printerWidth })}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {!slim && (
            <div className="hidden items-center gap-1.5 2xl:flex">
              <HeroStat label={tr('Aaj ki sale')} value={today.sales} />
              <HeroStat label={tr('Bill')} value={today.bills} />
            </div>
          )}
          <div className="flex shrink-0 items-center gap-0.5 rounded-xl bg-white/10 p-0.5 ring-1 ring-white/15">
            {config.voice !== false && <span id="pos-voice-btn"><VoiceSaleButton onCommand={e.onVoice} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/90 transition hover:bg-white/15 hover:text-white [&_svg]:h-4 [&_svg]:w-4" /></span>}
            <DrawerButton className="flex h-8 w-8 items-center justify-center rounded-lg text-white/90 transition hover:bg-white/15" />
            {e.heldCarts.length > 0 && (
              <button type="button" onClick={() => setHeldOpen(true)} onMouseDown={(ev) => ev.preventDefault()} title={tr('Hold kiye hue bill (F6)')}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-amber-400 px-2 text-[0.75rem] font-semibold text-amber-950 hover:bg-amber-300">
                <Pause className="h-3.5 w-3.5" />{e.heldCarts.length}
              </button>
            )}
            <HeroButton label={hidePrices ? tr('Rate dikhayein') : tr('Rate chhupayein')} onClick={() => setHidePrices((v: boolean) => !v)}>
              {hidePrices ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </HeroButton>
            <HeroButton label={tr('Shortcuts (?)')} onClick={() => setShortcuts(true)}><Keyboard className="h-4 w-4" /></HeroButton>
            <HeroButton label={tr('POS settings')} onClick={() => setSettings(true)}><Settings2 className="h-4 w-4" /></HeroButton>
            <HeroButton label={tr('Guide (F1)')} onClick={() => setTeacher(true)}><GraduationCap className="h-4 w-4" /></HeroButton>
          </div>
        </div>
      </div>
    </div>
  );

  const searchBox = (big?: boolean) => (
    <form className="flex min-w-0 flex-1 gap-2" onSubmit={(ev) => { ev.preventDefault(); submit(); }}>
      <label className="group relative min-w-0 flex-1">
        <Search className={cn('pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-brand-600', big ? 'h-6 w-6' : 'h-5 w-5')} />
        <input ref={searchRef} value={e.search} onChange={(ev) => e.setSearch(ev.target.value)} onKeyDown={onSearchKey} onFocus={() => setZone('search')}
          autoComplete="off" spellCheck={false} autoFocus
          placeholder={config.searchHint ?? tr('Naam, barcode ya SKU — Enter se bill mein · 3* qty · ? shortcuts')}
          aria-label={tr('Product search ya barcode')} role="combobox" aria-expanded={!!query} aria-controls="pos-results"
          className={cn('w-full rounded-xl border-0 bg-slate-100/80 pe-20 text-slate-900 outline-none ring-1 ring-transparent transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500',
            big || touch ? 'h-14 ps-12 text-[1.125rem]' : 'h-11 ps-11 text-[0.9375rem]')} />
        {e.search ? (
          <button type="button" onClick={() => { e.setSearch(''); focusSearch(); }} aria-label={tr('Saaf karein (Esc)')} onMouseDown={(ev) => ev.preventDefault()}
            className="absolute end-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200">
            <X className="h-4 w-4" />
          </button>
        ) : (
          <span className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 sm:flex"><Kbd>?</Kbd></span>
        )}
      </label>
      <button type="button" onClick={() => setScanner(true)} onMouseDown={(ev) => ev.preventDefault()} title={tr('Camera se scan (F9 → scan)')}
        className={cn('flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 text-white shadow-sm transition hover:bg-slate-800 sm:px-3.5', big || touch ? 'h-14 w-14 sm:w-auto' : 'h-11 w-11 sm:w-auto')}>
        <Camera className="h-5 w-5" /><span className="hidden text-[0.8125rem] font-semibold sm:inline">{tr('Scan')}</span>
      </button>
    </form>
  );

  const viewTabs = showTabs && (
    <div role="tablist" className="flex gap-1 rounded-xl bg-slate-100/80 p-1">
      <PosViewTab active={e.view === 'products'} onClick={() => e.setView('products')} icon={Package} label={tr('Products')} count={e.items.length} shortcut="F7" />
      {config.useBundles && <PosViewTab active={e.view === 'combos'} onClick={() => e.setView('combos')} icon={Sparkles} label={tr('Combos')} count={e.bundles.length} shortcut="F7" />}
      {showQuick && <PosViewTab active={e.view === 'quickkeys'} onClick={() => e.setView('quickkeys')} icon={Zap} label={tr('Quick')} count={e.quickKeys.length} shortcut="F10" />}
    </div>
  );

  const categoryChips = c.showCategories && e.view === 'products' && ((config.filters?.length ?? 0) > 0 || e.categories.length > 0) && (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
      <button type="button" onMouseDown={(ev) => ev.preventDefault()} onClick={() => { e.setFilterId(''); e.setCategoryId(''); }}
        className={cn(CHIP, !e.filterId && !e.categoryId ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>
        <Grid3x3 className="h-3.5 w-3.5" /> {' '}{tr('Sab')}{' '} <span className="tabular-nums opacity-60">{e.items.length}</span>
      </button>
      {config.filters?.filter((f) => (e.filterCounts[f.id] ?? 0) > 0 || e.filterId === f.id).map((f) => {
        const on = e.filterId === f.id;
        return (
          <button key={f.id} type="button" onMouseDown={(ev) => ev.preventDefault()} onClick={() => e.setFilterId(on ? '' : f.id)}
            className={cn(CHIP, on ? 'bg-brand-600 text-brand-fg shadow-sm shadow-brand-600/25' : 'bg-brand-50 text-brand-800 hover:bg-brand-100')}>
            {f.icon && <f.icon className="h-3.5 w-3.5" />}{f.label}<span className="tabular-nums opacity-60">{e.filterCounts[f.id] ?? 0}</span>
          </button>
        );
      })}
      {(config.filters?.length ?? 0) > 0 && e.categories.length > 0 && <span className="mx-1 my-1.5 w-px shrink-0 bg-slate-200" aria-hidden />}
      {e.categories.map((cat) => {
        const on = e.categoryId === cat.id;
        const color = cat.color || '#64748b';
        return (
          <button key={cat.id} type="button" onMouseDown={(ev) => ev.preventDefault()} onClick={() => e.setCategoryId(on ? '' : cat.id)}
            className={cn(CHIP, on && 'text-white shadow-sm')}
            style={on ? { backgroundColor: color } : { backgroundColor: `${color}14`, color }}>
            {!on && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
            <span className={on ? '' : 'text-slate-800'}>{cat.name}</span>
            <span className="tabular-nums opacity-60">{cat.count}</span>
          </button>
        );
      })}
    </div>
  );

  const recentRow = c.recentItems && e.recentItems.length > 0 && !query && e.view === 'products' && (
    <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]" aria-label={tr('Aksar bikne wali cheezein')}>
      <span className="shrink-0 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">{tr('Aksar')}</span>
      {e.recentItems.map((it, i) => (
        <button key={it.id} type="button" onMouseDown={(ev) => ev.preventDefault()} onClick={() => e.addItem(it)} title={tr('{{name}} (Alt {{value}})', { name: it.name, value: i + 1 })}
          className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white ps-1 pe-2 text-[0.75rem] font-medium text-slate-700 ring-1 ring-slate-200 transition hover:ring-brand-400', touch ? 'h-10' : 'h-7')}>
          <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 font-mono text-[0.625rem] font-bold text-slate-500">{i + 1}</span>
          <span className="max-w-[9rem] truncate">{it.name}</span>
          {!hidePrices && <span className="tabular-nums text-slate-400">{formatPKR(it.price)}</span>}
        </button>
      ))}
    </div>
  );

  const quickBar = showQuick && e.quickKeys.length > 0 && !query && (
    <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]" aria-label={tr('Quick keys')}>
      <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500" />
      {e.quickKeys.filter((k) => k.isActive).slice(0, 14).map((k) => (
        <button key={k.id} type="button" onMouseDown={(ev) => ev.preventDefault()} onClick={() => e.addQuickKey(k)}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-[0.75rem] font-semibold text-white shadow-sm"
          style={{ backgroundColor: (k as { color?: string }).color || '#0f766e' }}>
          {(k as { emoji?: string }).emoji} {k.label}
        </button>
      ))}
    </div>
  );

  const catalogBody = (
    <div ref={resultsRef} onScroll={onGridScroll} id="pos-results" className="min-h-0 flex-1 overflow-y-auto border-t border-slate-100 bg-slate-50/60 p-3">
      {e.loading ? (
        <div className={GRID}>{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />)}</div>
      ) : e.view === 'products' ? (
        e.filtered.length === 0 ? (
          <PosEmptyState icon={Package} title={tr('Kuch nahi mila')} hint={query ? tr('"{{query}}" se koi product nahi mila{{value}}', { query, value: looksLikePhone(query) ? tr(' — Enter: is number ka customer') : '' }) : tr('Pehle products add karein')} onClear={e.search ? () => e.setSearch('') : undefined} />
        ) : (
          <>
            <div className={gridMode === 'grid' || touch ? (touch ? GRID_TOUCH : GRID) : 'space-y-1.5'}>
              {e.filtered.slice(0, e.visible).map((it, i) => (gridMode === 'grid' || touch
                ? <PosItemCard key={it.id} {...tileProps(it, i)} touch={touch} />
                : <PosItemRow key={it.id} {...tileProps(it, i)} />))}
            </div>
            {e.filtered.length > e.visible && (
              <button type="button" onClick={() => e.setVisible((v) => v + 60)}
                className="mt-3 w-full rounded-xl bg-white py-3 text-[0.8125rem] font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
                {tr('Aur dikhayein ({{value}} baqi)', { value: e.filtered.length - e.visible })}
              </button>
            )}
          </>
        )
      ) : e.view === 'combos' ? (
        e.filteredBundles.length === 0 ? <PosEmptyState icon={Sparkles} title={tr('Koi combo nahi')} hint={tr('Combos setup page se banayein')} /> : (
          <div className={GRID}>
            {e.filteredBundles.map((b, i) => (
              <div key={b.id} data-active={i === activeIdx ? '1' : undefined} className={cn('rounded-2xl', i === activeIdx && 'ring-[3px] ring-amber-400')}>
                <PosComboTile combo={{ ...b, comboPrice: b.price, imageUrl: b.image, isFeatured: b.featured, savingsAmount: b.savings, savingsPercentage: b.savingsPct }}
                  cart={e.cart} hidePrices={hidePrices} onClick={() => e.addBundle(b)} />
              </div>
            ))}
          </div>
        )
      ) : Object.keys(e.groupedQuickKeys).length === 0 ? (
        <PosEmptyState icon={Zap} title={tr('Koi quick key nahi')} hint={tr('Quick keys setup page se banayein')} />
      ) : (
        <div className="space-y-5">
          {Object.entries(e.groupedQuickKeys).map(([group, keys]) => (
            <div key={group}>
              <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{group}</h3>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-6">
                {keys.map((k) => (
                  <PosQuickKeyTile key={k.id} qk={k} products={e.items.map((x) => ({ id: x.id, price: x.price, stock: x.stock }))}
                    combos={e.bundles.map((b) => ({ id: b.id, comboPrice: b.price }))} hidePrices={hidePrices} onClick={() => e.addQuickKey(k)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /** Dense result rows: the express dropdown and the cart-focus column. */
  const resultRows = (limit?: number) => (
    e.view === 'combos'
      ? e.filteredBundles.slice(0, limit ?? 200).map((b, i) => (
        <button key={b.id} type="button" data-active={i === activeIdx ? '1' : undefined} onMouseDown={(ev) => ev.preventDefault()} onClick={() => e.addBundle(b)}
          className={cn('flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-start text-[0.8125rem] ring-1', i === activeIdx ? 'bg-amber-50 ring-2 ring-amber-400' : 'bg-white ring-slate-200')}>
          <span className="truncate font-medium text-slate-900">🎁 {b.name}</span>
          <span className="shrink-0 font-bold tabular-nums">{hidePrices ? '••••' : formatPKR(b.price)}</span>
        </button>
      ))
      : e.filtered.slice(0, limit ?? e.visible).map((it, i) => <PosItemRow key={it.id} {...tileProps(it, i)} dense />)
  );

  const cartPanel = (mobile: boolean, opts: { variant?: 'panel' | 'table'; summarySide?: boolean; className?: string } = {}) => (
    <PosCartPanel key={String(mobile)} isMobile={mobile} onCloseMobile={() => setMobileCart(false)} className={opts.className}
      variant={opts.variant} summarySide={opts.summarySide} density={c.density} touch={touch} showImages={c.showImages}
      cart={e.cart} totalQty={e.totalQty} subtotal={e.subtotal} total={e.total} totalSavings={e.totalSavings}
      discountMode={e.discountMode} discountPct={e.discountPct} discountAmount={e.discountAmount}
      extraDiscounts={[{ label: e.promo ? tr('Code {{code}}', { code: e.promo.code }) : tr('Code'), amount: e.codeDiscount }, { label: tr('Points ({{used}})', { used: e.loyalty.used }), amount: e.loyaltyDiscount }]}
      onOpenDiscount={openDiscount} onClearDiscount={() => e.setDiscount(e.discountMode, 0, 0)}
      showDiscount={c.showDiscount && e.rules.allowDiscount}
      quickDiscounts={c.quickDiscounts.filter((p) => p <= e.quickDiscountLimit)} onQuickDiscount={(p) => e.setDiscount('pct', p, 0)}
      delivery={c.showDelivery ? e.delivery : undefined} onDeliveryChange={c.showDelivery ? e.setDelivery : undefined} deliveryFee={e.deliveryFee} hidePrices={hidePrices}
      customers={e.customers} customerId={e.customerId} setCustomerId={e.setCustomerId} selectedCustomer={e.selectedCustomer}
      onAddCustomer={openNewCustomer} customerOpenKey={mobile ? undefined : customerOpenKey} onCustomerClosed={focusSearch}
      receiver={c.showReceiver ? e.receiver : undefined} onReceiverChange={c.showReceiver ? e.setReceiver : undefined} receiverOpenKey={receiverOpenKey}
      customerExtra={<>{CartExtra && <CartExtra customerId={e.customerId} />}<PosSellerPicker value={e.soldById} onChange={e.setSoldById} compact /></>}
      tierBar={e.tiersOn ? <PosTierBar tier={e.billTier} choices={e.tierChoices} canPick={e.canPickTier} onPick={e.pickTier} udhaar={e.udhaarTier} udhaarExtra={e.udhaarExtra} hidePrices={hidePrices} /> : undefined}
      onHold={() => { e.hold(); focusSearch(); }} onClear={async () => { if ((await confirmDialog({ title: tr('Bill khaali karein?') }))) e.clearCart(); }}
      heldCount={e.heldCarts.length} onOpenHeld={() => setHeldOpen(true)}
      onChangeQty={e.changeQty} onSetQty={e.setQty} onRemove={e.removeLine}
      priceEditId={e.priceEditId} onStartPriceEdit={e.setPriceEditId} onSetPrice={e.setPrice} canEditPrice={e.canEditPrice}
      qtyEditId={qtyEditId} onStartQtyEdit={setQtyEditId}
      lineNotes={c.lineNotes} noteEditId={noteEditId} onStartNoteEdit={setNoteEditId} onSetNote={e.setLineNote}
      activeId={e.cart.length ? targetId : null} cartFocused={zone === 'cart' && !mobile} onSelect={(id) => setSelectedId(id)}
      listRef={mobile ? undefined : cartListRef} onListKeyDown={onCartKey} onListFocus={() => { if (!mobile) setZone('cart'); }}
      onCheckout={checkout} onInstantCash={cashPrint}
      onQuickPay={(q) => { if (needCustomer()) return; setMobileCart(false); e.openCheckout('mode' in q ? q.mode : 'full', 'method' in q ? q.method : undefined); }}
      canCheckout={!!e.shopId} checkoutPending={e.checkoutMutation.isPending}
      lastBill={c.changeDue ? e.lastBill : null} onReprint={e.reprintLast} onRepeat={e.repeatLast}
      lineExtra={(l) => {
        const info = e.batchOf(l);
        const batch = info && <PosBatchChip info={info} baseQuantity={l.baseQuantity} unit={l.baseUnit} onPick={(b) => e.setLineBatch(l.id, b)} />;
        // The line's tier shows when it differs from the bill, or on the selected line where it can be changed.
        const showTier = e.tiersOn && l.type === 'product' && !!l.productId
          && ((l.priceTier ?? 'RETAIL') !== e.activeTier || (e.lineTierOverride && targetId === l.id && !!l.tierSrc && !l.fixedPrice));
        const tier = showTier && (
          <PosLineTier line={l} billTier={e.activeTier} choices={e.tierChoices} canPick={e.canPickTier} onPick={(t) => e.setLineTier(l.id, t)}
            editable={e.lineTierOverride && !l.fixedPrice} hidePrices={hidePrices} />
        );
        return batch || tier ? <div className="flex flex-wrap items-center gap-1.5">{batch}{tier}</div> : null;
      }} />
  );

  /* ── Layouts ── */
  const classic = (
    <div className={cn('flex min-h-[calc(100dvh-5rem)] flex-col gap-3 lg:grid lg:h-[calc(100dvh-6.5rem)] lg:min-h-0',
      touch ? 'lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px]' : 'lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]')}>
      <section className="flex min-h-0 flex-col gap-3">
        {hero()}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <div className="shrink-0 space-y-2 p-3">
            {searchBox()}
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
              <div className="flex items-center gap-2">
              {viewTabs}
              {e.view === 'products' && !touch && (
                  <div className="flex rounded-xl bg-slate-100/80 p-1" role="radiogroup" aria-label={tr('Dikhawa')}>
                    {([['grid', LayoutGrid, 'Cards'], ['list', List, 'List']] as const).map(([v, Icon, label]) => (
                      <button key={v} type="button" role="radio" aria-checked={gridMode === v} title={label} onMouseDown={(ev) => ev.preventDefault()} onClick={() => setGridMode(v)}
                        className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition', gridMode === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">{categoryChips}</div>
            </div>
            {recentRow}
          </div>
          {catalogBody}
        </div>
      </section>
      {cartPanel(false)}
    </div>
  );

  const express = (
    <>
      <div className="flex h-[calc(100dvh-6.5rem)] flex-col gap-2.5">
        {hero()}
        <div className="relative z-20 shrink-0 space-y-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80">
          <div className="flex items-center gap-2">{searchBox(true)}{viewTabs}</div>
          {query && (
            <div className="absolute inset-x-3 top-[4.5rem] overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200">
              <div ref={resultsRef} id="pos-results" role="listbox" className="max-h-[27rem] space-y-1 overflow-y-auto p-2">
                {results.length === 0
                  ? <p className="px-3 py-6 text-center text-[0.875rem] text-slate-500">{tr('"{{query}}" se kuch nahi mila{{value}}', { query, value: looksLikePhone(query) ? tr(' — Enter: is number ka customer') : '' })}</p>
                  : resultRows(DROPDOWN_ROWS)}
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-[0.6875rem] text-slate-500">
                <span>{tr('{{count}} mile{{value}}', { count: results.length, value: results.length > DROPDOWN_ROWS ? tr(' · pehle {{DROPDOWN_ROWS}}', { DROPDOWN_ROWS: DROPDOWN_ROWS }) : '' })}</span>
                <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> {' '}{tr('chunein')}{' '} <Kbd>Enter</Kbd> {' '}{tr('bill me')}{' '} <Kbd>Esc</Kbd> {' '}{tr('saaf')}</span>
              </div>
            </div>
          )}
          {recentRow}
          {quickBar}
        </div>
        {cartPanel(false, { variant: 'table', summarySide: true, className: 'min-h-0 flex-1' })}
      </div>
    </>
  );

  const cartFocus = (
    <>
      <div className="grid h-[calc(100dvh-6.5rem)] grid-cols-[minmax(0,1fr)_360px] gap-3 xl:grid-cols-[minmax(0,1fr)_400px]">
        {cartPanel(false, { variant: 'table', className: 'min-h-0' })}
        <section className="flex min-h-0 flex-col gap-2.5">
          {hero(true)}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <div className="shrink-0 space-y-2 p-2.5">
              {searchBox()}
              {viewTabs}
              {categoryChips}
              {recentRow}
              {quickBar}
            </div>
            <div ref={resultsRef} id="pos-results" role="listbox" onScroll={onGridScroll} className="min-h-0 flex-1 space-y-1 overflow-y-auto border-t border-slate-100 bg-slate-50/60 p-2">
              {e.loading
                ? Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)
                : results.length === 0
                  ? <PosEmptyState icon={Package} title={tr('Kuch nahi mila')} hint={query ? `"${query}"` : undefined} onClear={e.search ? () => e.setSearch('') : undefined} />
                  : resultRows()}
            </div>
          </div>
        </section>
      </div>
    </>
  );

  return (
    <>
      {scanner && <BarcodeScanner onDetected={(code: string) => { setScanner(false); void e.handleBarcode(code); }} onClose={() => setScanner(false)} />}

      {e.unitPicker && (
        <PosUnitPickerModal product={e.unitPicker.item.product} units={e.unitPicker.units} stock={e.limitFor(e.unitPicker.item, e.unitPicker.opts)}
          onConfirm={(unit, qty) => { const u = e.unitPicker!; e.setUnitPicker(null); if (isWeightUnit(unit.unitName)) e.setWeigh({ item: u.item, unit, opts: u.opts }); else e.pushLine(u.item, unit, qty, u.opts); }}
          onClose={() => e.setUnitPicker(null)} />
      )}
      {e.weigh && (
        <PosWeighModal product={e.weigh.item.product} unit={e.weigh.unit} prefillMoney={e.weigh.prefillMoney} stock={e.limitFor(e.weigh.item, e.weigh.opts)}
          onConfirm={(qty) => { const w = e.weigh!; e.setWeigh(null); e.pushLine(w.item, w.unit, qty, w.opts); }}
          onClose={() => e.setWeigh(null)} />
      )}
      {e.variantPicker && (
        <VariantPicker product={e.variantPicker.item.product} variants={e.variantPicker.variants} ignoreStock={e.variantPicker.opts.oversell}
          onSelect={(v) => {
            const vp = e.variantPicker!;
            e.setVariantPicker(null);
            e.addItem(vp.item, { ...vp.opts, variant: { id: v.id, name: v.name, price: v.price, wholesalePrice: v.wholesalePrice ?? null, creditPrice: v.creditPrice ?? null, stock: freeVariantStock(v), reserved: v.reserved ?? null } });
          }}
          onClose={() => e.setVariantPicker(null)} />
      )}
      {e.picker}

      {e.checkout && (
        <PosCheckoutModal total={e.total} itemCount={e.cart.length} loading={e.checkoutMutation.isPending} initMethod={e.checkout.method} initSplit={checkoutSplit}
          customerName={e.selectedCustomer?.name} customerBalance={Number(e.selectedCustomer?.balance || 0)} hasCustomer={!!e.customerId}
          initMode={e.checkout.mode} receiver={e.receiver} allowCredit={e.rules.allowCredit} tradeIns={e.tradeIns}
          onCreditChange={e.udhaarCredit}
          notice={e.udhaarTier && e.billTier !== 'CREDIT' ? tr('Udhaar bill: Credit price lag gayi{{value}}', { value: e.udhaarExtra > 0.005 ? ` (+${formatPKR(e.udhaarExtra)})` : '' }) : undefined}
          onConfirm={(d) => e.checkoutMutation.mutate(d)} onClose={() => e.setCheckout(null)} />
      )}
      {e.lastSale && (
        <PosSuccessModal lastSale={e.lastSale} autoPrint={autoPrint} autoClose={e.prefs.autoClose}
          onPrintAgain={() => printReceiptDirect(e.lastSale!.printPayload, printerWidth)}
          onShare={e.shareLastSale} onClose={e.closeSuccess} />
      )}
      {discount && (
        <PosDiscountModal subtotal={e.subtotal} mode={e.discountMode} pct={e.discountPct} rs={e.discountRs}
          onApply={(m, p, r) => { e.setDiscount(m, p, r); setDiscount(false); }} onClose={() => setDiscount(false)}
          extra={<PosPerks promo={e.promo} codeDiscount={e.codeDiscount} onApplyCode={e.applyCode} onRemoveCode={e.removeCode}
            loyalty={e.loyalty} loyaltyDiscount={e.loyaltyDiscount} customerName={e.selectedCustomer?.name} />} />
      )}
      {heldOpen && (
        <PosHoldCartsModal heldCarts={e.heldCarts} onResume={(h) => { e.resume(h); setHeldOpen(false); }} onDelete={e.deleteHeld} onClose={() => setHeldOpen(false)} />
      )}
      {newCustomer && (
        <PosCustomerAddModal value={newCustomer} onChange={setNewCustomer} saving={addCustomer.isPending}
          onSubmit={(v) => { if (!v.name.trim()) { toast.error(tr('Naam likhein')); return; } addCustomer.mutate({ name: v.name.trim(), phone: v.phone?.trim() || undefined }); }}
          onClose={() => setNewCustomer(null)} />
      )}
      {settings && (
        <PosSettingsModal autoPrint={autoPrint} setAutoPrint={e.prefs.setAutoPrint} autoClose={e.prefs.autoClose} setAutoClose={e.prefs.setAutoClose}
          printerWidth={printerWidth} setPrinterWidth={e.prefs.setPrinterWidth} onClose={() => setSettings(false)}
          layout={e.userLayout.layout} setLayout={e.userLayout.setLayout} shopLayout={e.shopCounter.layout}
          density={e.userLayout.density} setDensity={e.userLayout.setDensity} shopDensity={e.shopCounter.density} canEditShop={canEditShop} />
      )}
      {teacher && <PosTeacher onClose={() => setTeacher(false)} />}
      {shortcuts && <PosShortcutsOverlay onClose={() => setShortcuts(false)} />}
      {payPicker && <PosPayPicker total={e.total} hasCustomer={!!e.customerId} allowCredit={e.rules.allowCredit} onPick={onPayPick} onClose={() => setPayPicker(false)} />}
      {more && <PosMoreMenu actions={moreActions} onClose={() => setMore(false)} />}

      <div data-pos-layout={layout} data-pos-density={c.density}>
        {layout === 'express' ? express : layout === 'cartfocus' ? cartFocus : classic}
        {mobileCart && cartPanel(true)}
      </div>

      {e.cart.length > 0 && !mobileCart && (
        <div className="fixed inset-x-3 bottom-3 z-30 lg:hidden">
          <button type="button" onClick={() => setMobileCart(true)}
            className="flex h-14 w-full items-center justify-between rounded-2xl bg-brand-600 px-4 text-brand-fg shadow-lg active:scale-[0.99]">
            <span className="inline-flex items-center gap-3">
              <span className="relative"><ShoppingCart className="h-5 w-5" />
                <span className="absolute -end-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[0.625rem] font-bold text-brand-700">{e.cart.length}</span>
              </span>
              <span className="text-[0.9375rem] font-semibold">{tr('Bill dekhein')}</span>
            </span>
            <span className="inline-flex items-center gap-2 text-lg font-bold tabular-nums">{hidePrices ? '••••' : formatPKR(e.total)}<ArrowRight className="h-5 w-5 rtl-flip" /></span>
          </button>
        </div>
      )}
    </>
  );
}
