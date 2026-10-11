/**
 * The counter screen. One search box takes typed names and barcode-gun
 * scans alike (Enter adds the first match or the scanned code); filters and
 * categories narrow the grid; the bill sits on the right, or slides up on
 * phones.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight, Camera, Eye, EyeOff, GraduationCap, Grid3x3, Package, Pause, Search, Settings2, ShoppingCart, Sparkles,
  Wifi, WifiOff, X, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IconButton, Skeleton } from '@/design-system/components';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { VoiceSaleButton } from '@core/components/voice/VoiceSaleButton';
import { DrawerButton } from '@core/hardware/HardwareBoot';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import {
  PosCartPanel, PosCheckoutModal, PosComboTile, PosCustomerAddModal, PosDiscountModal, PosEmptyState, PosHoldCartsModal,
  PosItemCard, PosQuickKeyTile, PosSettingsModal, PosSuccessModal, PosTeacher, PosUnitPickerModal, PosViewTab, PosWeighModal,
  VariantPicker,
} from '../components';
import { PosSellerPicker } from '../components/PosSellerPicker';
import { isWeightUnit } from '../lib/posUnits';
import { printReceiptDirect } from '../lib/thermalReceipt';
import type { PosIndustryConfig } from './types';
import { usePosEngine } from './usePosEngine';

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => { setOnline(true); toast.success('Internet wapas aa gaya'); };
    const off = () => { setOnline(false); toast.warning('Offline — sales is computer par save hongi'); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

export function PosScreen({ config }: { config: PosIndustryConfig }) {
  const e = usePosEngine(config);
  const qc = useQueryClient();
  const online = useOnline();
  const searchRef = useRef<HTMLInputElement>(null);
  const [scanner, setScanner] = useState(false);
  const [settings, setSettings] = useState(false);
  const [teacher, setTeacher] = useState(false);
  const [discount, setDiscount] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [mobileCart, setMobileCart] = useState(false);
  const [newCustomer, setNewCustomer] = useState<{ name: string; phone: string } | null>(null);
  const { hidePrices, setHidePrices, autoPrint, printerWidth } = e.prefs;

  const addCustomer = useMutation({
    mutationFn: customersApi.create,
    onSuccess: (c: { id: string; name: string }) => {
      toast.success(`${c.name} add ho gaya`);
      e.setCustomerId(c.id);
      setNewCustomer(null);
      qc.invalidateQueries({ queryKey: ['customers-for-pos'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err?.response?.data?.message || 'Customer add nahi hua'),
  });

  const anyModal = scanner || settings || teacher || discount || heldOpen || !!newCustomer || !!e.checkout || !!e.lastSale
    || !!e.unitPicker || !!e.weigh || !!e.variantPicker || !!e.picker;

  // Keep the search box ready for the barcode gun whenever nothing else needs focus.
  useEffect(() => {
    if (anyModal) return;
    const t = setTimeout(() => {
      const a = document.activeElement as HTMLElement | null;
      if (a && a !== document.body && a !== searchRef.current && (['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName) || a.isContentEditable)) return;
      searchRef.current?.focus();
    }, 250);
    return () => clearTimeout(t);
  }, [anyModal, e.cart.length]);

  const onKey = useCallback((ev: KeyboardEvent) => {
    if (document.querySelector('[role="dialog"]')) return;
    const a = document.activeElement as HTMLElement | null;
    const typing = !!a && a !== searchRef.current && (['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName) || a.isContentEditable);
    const map: Record<string, () => void> = {
      F1: () => setTeacher(true),
      F2: () => setScanner(true),
      F6: () => document.getElementById('pos-voice-btn')?.querySelector('button')?.click(),
      F7: () => e.setView('products'),
      F8: () => { if (config.useBundles) e.setView('combos'); },
      F9: () => e.openCheckout('full'),
      F10: () => { if (config.quickKeys) e.setView('quickkeys'); },
      F12: () => e.instantCash(),
    };
    if (map[ev.key]) { ev.preventDefault(); map[ev.key](); return; }
    if (ev.key === '/' && !typing && a !== searchRef.current) { ev.preventDefault(); searchRef.current?.focus(); }
  }, [e, config]);
  useEffect(() => { window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onKey]);

  const onGridScroll = (ev: React.UIEvent<HTMLDivElement>) => {
    const t = ev.currentTarget;
    if (e.view === 'products' && e.filtered.length > e.visible && (t.scrollTop + t.clientHeight) / t.scrollHeight > 0.85) {
      e.setVisible((v) => Math.min(v + 60, e.filtered.length));
    }
  };

  const showTabs = !!config.useBundles || !!config.quickKeys;
  const chip = (active: boolean) => cn(
    'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[0.8125rem] font-medium transition',
    active ? 'border-brand-600 bg-brand-600 text-brand-fg' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
  );
  const CartExtra = config.CartExtra;

  return (
    <>
      {scanner && <BarcodeScanner onDetected={(c: string) => { setScanner(false); void e.handleBarcode(c); }} onClose={() => setScanner(false)} />}

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
            e.addItem(vp.item, { ...vp.opts, variant: { id: v.id, name: v.name, price: v.price, stock: v.stock } });
          }}
          onClose={() => e.setVariantPicker(null)} />
      )}
      {e.picker}

      {e.checkout && (
        <PosCheckoutModal total={e.total} itemCount={e.cart.length} loading={e.checkoutMutation.isPending}
          customerName={e.selectedCustomer?.name} customerBalance={Number(e.selectedCustomer?.balance || 0)} hasCustomer={!!e.customerId}
          initMode={e.checkout.mode} receiver={e.receiver}
          onConfirm={(d) => e.checkoutMutation.mutate(d)} onClose={() => e.setCheckout(null)} />
      )}
      {e.lastSale && (
        <PosSuccessModal lastSale={e.lastSale} autoPrint={autoPrint} autoClose={e.prefs.autoClose}
          onPrintAgain={() => printReceiptDirect(e.lastSale!.printPayload, printerWidth)}
          onShare={e.shareLastSale} onClose={e.closeSuccess} />
      )}
      {discount && (
        <PosDiscountModal subtotal={e.subtotal} mode={e.discountMode} pct={e.discountPct} rs={e.discountRs}
          onApply={(m, p, r) => { e.setDiscount(m, p, r); setDiscount(false); }} onClose={() => setDiscount(false)} />
      )}
      {heldOpen && (
        <PosHoldCartsModal heldCarts={e.heldCarts} onResume={(h) => { e.resume(h); setHeldOpen(false); }} onDelete={e.deleteHeld} onClose={() => setHeldOpen(false)} />
      )}
      {newCustomer && (
        <PosCustomerAddModal value={newCustomer} onChange={setNewCustomer} saving={addCustomer.isPending}
          onSubmit={(v) => { if (!v.name.trim()) { toast.error('Naam likhein'); return; } addCustomer.mutate({ name: v.name.trim(), phone: v.phone?.trim() || undefined }); }}
          onClose={() => setNewCustomer(null)} />
      )}
      {settings && (
        <PosSettingsModal autoPrint={autoPrint} setAutoPrint={e.prefs.setAutoPrint} autoClose={e.prefs.autoClose} setAutoClose={e.prefs.setAutoClose}
          printerWidth={printerWidth} setPrinterWidth={e.prefs.setPrinterWidth} onClose={() => setSettings(false)} />
      )}
      {teacher && <PosTeacher onClose={() => setTeacher(false)} />}

      <div className="flex min-h-[calc(100dvh-5rem)] flex-col gap-3 lg:grid lg:h-[calc(100dvh-6.5rem)] lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Toolbar */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-[0.9375rem] font-semibold text-slate-900">{config.label} POS</h1>
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold',
                online ? 'bg-success-50 text-success-700' : 'bg-amber-50 text-amber-700')}>
                {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}{online ? 'Online' : 'Offline'}
              </span>
              {autoPrint && <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-medium text-slate-600 sm:inline">Auto-print {printerWidth}mm</span>}
            </div>
            <div className="flex items-center gap-1">
              {config.voice !== false && <span id="pos-voice-btn"><VoiceSaleButton onCommand={e.onVoice} /></span>}
              <DrawerButton className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100" />
              {e.heldCarts.length > 0 && (
                <button type="button" onClick={() => setHeldOpen(true)}
                  className="inline-flex h-9 items-center gap-1 rounded-lg bg-amber-50 px-2.5 text-[0.8125rem] font-semibold text-amber-800 hover:bg-amber-100">
                  <Pause className="h-4 w-4" />{e.heldCarts.length}
                </button>
              )}
              <IconButton label={hidePrices ? 'Rate dikhayein' : 'Rate chhupayein'} onClick={() => setHidePrices((v: boolean) => !v)}>
                {hidePrices ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </IconButton>
              <IconButton label="POS settings" onClick={() => setSettings(true)}><Settings2 className="h-4 w-4" /></IconButton>
              <IconButton label="Guide (F1)" onClick={() => setTeacher(true)}><GraduationCap className="h-4 w-4" /></IconButton>
            </div>
          </div>

          {/* Search + filters */}
          <div className="shrink-0 space-y-2.5 border-b border-slate-200 px-3 py-3 sm:px-4">
            <form className="flex gap-2" onSubmit={(ev) => { ev.preventDefault(); e.submitSearch(); }}>
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input ref={searchRef} value={e.search} onChange={(ev) => e.setSearch(ev.target.value)} autoComplete="off" spellCheck={false}
                  placeholder={config.searchHint ?? 'Naam likhein ya barcode scan karein — Enter se bill mein'}
                  aria-label="Product search ya barcode"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-10 text-[0.9375rem] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                {e.search && (
                  <button type="button" onClick={() => e.setSearch('')} aria-label="Saaf karein"
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </label>
              <button type="button" onClick={() => setScanner(true)} title="Camera se scan (F2)"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-50 sm:w-auto sm:gap-2 sm:px-4">
                <Camera className="h-5 w-5" /><span className="hidden text-[0.8125rem] font-medium sm:inline">Scan</span>
              </button>
            </form>

            {showTabs && (
              <div role="tablist" className="flex gap-1 rounded-lg bg-slate-100 p-1">
                <PosViewTab active={e.view === 'products'} onClick={() => e.setView('products')} icon={Package} label="Products" count={e.items.length} shortcut="F7" />
                {config.useBundles && <PosViewTab active={e.view === 'combos'} onClick={() => e.setView('combos')} icon={Sparkles} label="Combos" count={e.bundles.length} shortcut="F8" />}
                {config.quickKeys && <PosViewTab active={e.view === 'quickkeys'} onClick={() => e.setView('quickkeys')} icon={Zap} label="Quick" count={e.quickKeys.length} shortcut="F10" />}
              </div>
            )}

            {e.view === 'products' && ((config.filters?.length ?? 0) > 0 || e.categories.length > 0) && (
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
                <button type="button" onClick={() => { e.setFilterId(''); e.setCategoryId(''); }} className={chip(!e.filterId && !e.categoryId)}>
                  <Grid3x3 className="h-3.5 w-3.5" /> Sab <span className="tabular-nums opacity-70">{e.items.length}</span>
                </button>
                {config.filters?.filter((f) => (e.filterCounts[f.id] ?? 0) > 0 || e.filterId === f.id).map((f) => (
                  <button key={f.id} type="button" onClick={() => e.setFilterId(e.filterId === f.id ? '' : f.id)} className={chip(e.filterId === f.id)}>
                    {f.icon && <f.icon className="h-3.5 w-3.5" />}{f.label}<span className="tabular-nums opacity-70">{e.filterCounts[f.id] ?? 0}</span>
                  </button>
                ))}
                {(config.filters?.length ?? 0) > 0 && e.categories.length > 0 && <span className="mx-1 w-px shrink-0 bg-slate-200" aria-hidden />}
                {e.categories.map((c) => (
                  <button key={c.id} type="button" onClick={() => e.setCategoryId(e.categoryId === c.id ? '' : c.id)} className={chip(e.categoryId === c.id)}>
                    {e.categoryId !== c.id && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color || '#94a3b8' }} />}
                    {c.name}<span className="tabular-nums opacity-70">{c.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grid */}
          <div onScroll={onGridScroll} className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-3 sm:p-4">
            {e.loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
              </div>
            ) : e.view === 'products' ? (
              e.filtered.length === 0 ? (
                <PosEmptyState icon={Package} title="Kuch nahi mila" hint={e.search ? `"${e.search}" se koi product nahi mila` : 'Pehle products add karein'} onClear={e.search ? () => e.setSearch('') : undefined} />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {e.filtered.slice(0, e.visible).map((it) => (
                      <PosItemCard key={it.id} name={it.name} image={it.image} price={it.price} unit={it.unit} stock={it.stock}
                        lowStock={it.lowStock} inCart={e.inCartBy.get(it.id) ?? 0} featured={it.featured} badges={it.badges}
                        subline={it.subline} dim={it.dim} hidePrices={hidePrices} fallback={config.cardFallback?.(it)}
                        onClick={() => e.addItem(it)} />
                    ))}
                  </div>
                  {e.filtered.length > e.visible && (
                    <button type="button" onClick={() => e.setVisible((v) => v + 60)}
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white py-3 text-[0.8125rem] font-medium text-slate-600 hover:bg-slate-50">
                      Aur dikhayein ({e.filtered.length - e.visible} baqi)
                    </button>
                  )}
                </>
              )
            ) : e.view === 'combos' ? (
              e.filteredBundles.length === 0 ? <PosEmptyState icon={Sparkles} title="Koi combo nahi" hint="Combos Retail → Combos se banayein" /> : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                  {e.filteredBundles.map((b) => (
                    <PosComboTile key={b.id} combo={{ ...b, comboPrice: b.price, imageUrl: b.image, isFeatured: b.featured, savingsAmount: b.savings, savingsPercentage: b.savingsPct }}
                      cart={e.cart} hidePrices={hidePrices} onClick={() => e.addBundle(b)} />
                  ))}
                </div>
              )
            ) : Object.keys(e.groupedQuickKeys).length === 0 ? (
              <PosEmptyState icon={Zap} title="Koi quick key nahi" hint="Quick keys setup page se banayein" />
            ) : (
              <div className="space-y-4">
                {Object.entries(e.groupedQuickKeys).map(([group, keys]) => (
                  <div key={group}>
                    <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{group}</h3>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-6">
                      {keys.map((k) => (
                        <PosQuickKeyTile key={k.id} qk={k} products={e.items.map((i) => ({ id: i.id, price: i.price, stock: i.stock }))}
                          combos={e.bundles.map((b) => ({ id: b.id, comboPrice: b.price }))} hidePrices={hidePrices} onClick={() => e.addQuickKey(k)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {[false, true].map((mobile) => (mobile && !mobileCart ? null : (
          <PosCartPanel key={String(mobile)} isMobile={mobile} onCloseMobile={() => setMobileCart(false)}
            cart={e.cart} itemCount={e.cart.length} totalQty={e.totalQty} subtotal={e.subtotal} total={e.total} totalSavings={e.totalSavings}
            discountMode={e.discountMode} discountPct={e.discountPct} discountRs={e.discountRs} discountAmount={e.discountAmount}
            onOpenDiscount={() => setDiscount(true)} onClearDiscount={() => e.setDiscount(e.discountMode, 0, 0)}
            delivery={e.delivery} onDeliveryChange={e.setDelivery} deliveryFee={e.deliveryFee} hidePrices={hidePrices}
            customers={e.customers} customerId={e.customerId} setCustomerId={e.setCustomerId} selectedCustomer={e.selectedCustomer}
            onAddCustomer={() => setNewCustomer({ name: '', phone: '' })} receiver={e.receiver} onReceiverChange={e.setReceiver}
            customerExtra={<>{CartExtra && <CartExtra />}<PosSellerPicker value={e.soldById} onChange={e.setSoldById} /></>}
            onHold={e.hold} onClear={() => { if (confirm('Bill khaali karein?')) e.clearCart(); }}
            onChangeQty={e.changeQty} onSetQty={e.setQty} onRemove={e.removeLine}
            priceEditId={e.priceEditId} onStartPriceEdit={e.setPriceEditId} onSetPrice={e.setPrice}
            onCheckout={() => { setMobileCart(false); e.openCheckout('full'); }} onInstantCash={() => { setMobileCart(false); e.instantCash(); }}
            canCheckout={!!e.shopId} checkoutPending={e.checkoutMutation.isPending} />
        )))}
      </div>

      {e.cart.length > 0 && !mobileCart && (
        <div className="fixed inset-x-3 bottom-3 z-30 lg:hidden">
          <button type="button" onClick={() => setMobileCart(true)}
            className="flex h-14 w-full items-center justify-between rounded-2xl bg-brand-600 px-4 text-brand-fg shadow-lg active:scale-[0.99]">
            <span className="inline-flex items-center gap-3">
              <span className="relative"><ShoppingCart className="h-5 w-5" />
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[0.625rem] font-bold text-brand-700">{e.cart.length}</span>
              </span>
              <span className="text-[0.9375rem] font-semibold">Bill dekhein</span>
            </span>
            <span className="inline-flex items-center gap-2 text-lg font-bold tabular-nums">{hidePrices ? '••••' : formatPKR(e.total)}<ArrowRight className="h-5 w-5" /></span>
          </button>
        </div>
      )}
    </>
  );
}
