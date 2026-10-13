/**
 * Barcode labels: build a list of items (search, scan, whole category,
 * variants and pack units), design the sticker once for the whole shop and
 * print it on a thermal roll or an A4 sticker sheet. The preview and the
 * print use the same HTML, printed from a hidden frame.
 */

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, GraduationCap, Layers, LayoutGrid, ListPlus, Printer, ScanLine, Settings2, TestTube2, Wand2 } from 'lucide-react';
import { Button, PageHero, PageShell, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { printHtml } from '@core/receipt/print';
import { getReceiptSetup, useReceiptSetup } from '@core/receipt/setup';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { productVariantsApi, type ProductVariant } from '@modules/inventory/products/api/product-variants.api';
import { productUnitsApi, type ProductUnit } from '@modules/inventory/products/api/product-units.api';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { barcodeLabelsApi } from '../api/barcode-labels.api';
import { LabelQueue } from '../components/LabelQueue';
import { LabelDesigner } from '../components/LabelDesigner';
import { LabelSheetPreview } from '../components/LabelSheetPreview';
import { LABEL_SETTINGS_KEY, useLabelConfig } from '../components/useLabelConfig';
import { renderLabels, sheetLayout, type LabelData } from '../components/renderLabels';
import {
  MAX_QTY, loadQueue, nearestExpiry, resolveLine, sameItem, saveQueue, snapVariant, type QueueLine, type ResolvedLine,
} from '../components/labelLines';

const SAMPLE: LabelData = { name: 'Namoona cheez', variant: 'Large', unit: 'Piece', sku: 'SKU-101', code: '2001234567893', price: 1250, oldPrice: 1500, expiry: '12/2027' };
const PRODUCTS_KEY = ['products-for-labels', 'all'];
const UNITS_KEY = ['product-units-for-labels'];

type NewLine = Omit<QueueLine, 'id' | 'qty'> & { stock: number };
const newId = () => Math.random().toString(36).slice(2, 10);

export default function BarcodeLabelsPage() {
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const guide = usePageGuide();
  const { config, set, saving, missingBarcodes } = useLabelConfig();
  const setupQ = useReceiptSetup();
  const shopName = (setupQ.data ?? getReceiptSetup()).shop.name;

  const productsQ = useQuery({ queryKey: PRODUCTS_KEY, queryFn: () => fetchAllProducts(), staleTime: 60_000 });
  const unitsQ = useQuery({ queryKey: UNITS_KEY, queryFn: productUnitsApi.listAll, staleTime: 60_000 });
  const catsQ = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 5 * 60_000 });

  const products = useMemo(() => productsQ.data?.items ?? [], [productsQ.data]);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const unitsByProduct = useMemo(() => {
    const m = new Map<string, ProductUnit[]>();
    for (const u of unitsQ.data ?? []) m.set(u.productId, [...(m.get(u.productId) ?? []), u]);
    return m;
  }, [unitsQ.data]);

  const [lines, setLines] = useState<QueueLine[]>(loadQueue);
  const [skip, setSkip] = useState(0);
  const [adding, setAdding] = useState(0);
  useEffect(() => { saveQueue(lines); }, [lines]);

  const layout = sheetLayout(config);
  useEffect(() => { setSkip((s) => Math.min(s, Math.max(0, layout.perPage - 1))); }, [layout.perPage]);

  const resolved = useMemo<ResolvedLine[]>(
    () => lines.map((l) => resolveLine(l, byId.get(l.productId), unitsByProduct.get(l.productId), config)),
    [lines, byId, unitsByProduct, config],
  );
  const labels = useMemo(() => resolved.flatMap((r) => (r.data ? Array<LabelData>(r.line.qty).fill(r.data) : [])), [resolved]);
  const missing = resolved.filter((r) => r.data && r.missingCode);
  const pages = layout.roll ? Math.ceil(labels.length / layout.cols) : Math.ceil((labels.length + skip) / layout.perPage);

  /* ── Queue ── */
  const firstQty = (stock: number) => (config.copies === 'stock' ? Math.min(MAX_QTY, Math.max(1, Math.floor(stock))) : 1);
  const addLines = (items: NewLine[]) => setLines((prev) => {
    const next = [...prev];
    for (const { stock, ...it } of items) {
      const i = next.findIndex((l) => sameItem(l, it));
      const qty = firstQty(stock);
      if (i >= 0) next[i] = { ...next[i], qty: Math.min(MAX_QTY, next[i].qty + qty) };
      else next.push({ ...it, id: newId(), qty });
    }
    return next;
  });

  const refreshVariants = (fresh: Product[]) => setLines((prev) => prev.map((l) => {
    if (!l.variant) return l;
    const v = fresh.find((p) => p.id === l.productId)?.variants?.find((x) => x.id === l.variant?.id);
    return v ? { ...l, variant: snapVariant(v) } : l;
  }));

  // Variant prices and codes saved on this device may be old; refresh them once.
  useEffect(() => {
    const ids = [...new Set(loadQueue().filter((l) => l.variant).map((l) => l.productId))].slice(0, 40);
    if (!ids.length) return;
    Promise.all(ids.map((id) => productsApi.getOne(id).catch(() => null))).then((r) => refreshVariants(r.filter(Boolean) as Product[]));
  }, []);

  const addProduct = async (p: Product, pick: { variantId?: string; unitId?: string } = {}, quiet = false) => {
    setAdding((n) => n + 1);
    try {
      const full = p.hasVariants || p.expiryTracked ? await productsApi.getOne(p.id).catch(() => null) : null;
      const variants = (full?.variants ?? []).filter((v) => v.isActive && (!pick.variantId || v.id === pick.variantId));
      const unit = pick.unitId ? unitsByProduct.get(p.id)?.find((u) => u.id === pick.unitId) : undefined;
      const rate = unit?.conversionRate || 1;
      if (p.hasVariants && variants.length) {
        addLines(variants.map((v) => ({ productId: p.id, variant: snapVariant(v), unitId: pick.unitId, expiry: full ? nearestExpiry(full, v.id) : null, stock: v.stock / rate })));
        if (!quiet && variants.length > 1) toast.success(`${p.name}: ${variants.length} variant list me — har ek ka apna label`);
      } else {
        addLines([{ productId: p.id, unitId: pick.unitId, expiry: full ? nearestExpiry(full) : null, stock: p.stock / rate }]);
        if (!quiet) toast.success(`${p.name}${unit ? ` (${unit.unitLabel || unit.unitName})` : ''} list me`);
      }
    } finally {
      setAdding((n) => n - 1);
    }
  };

  const scan = async (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    const unit = unitsQ.data?.find((u) => u.isActive && (u.barcode === code || u.sku === code));
    const unitProduct = unit && byId.get(unit.productId);
    if (unit && unitProduct) return addProduct(unitProduct, { unitId: unit.id, variantId: unit.variantId ?? undefined });
    const hit = products.find((p) => p.barcode === code || p.sku === code);
    if (hit) return addProduct(hit);
    try {
      const found = (await productsApi.byBarcode(code)) as Product & { matchedVariant?: ProductVariant };
      return addProduct(byId.get(found.id) ?? found, { variantId: found.matchedVariant?.id });
    } catch {
      toast.error(`"${code}" se koi cheez nahi mili`);
    }
  };

  const addCategory = async (categoryId: string) => {
    const list = products.filter((p) => p.categoryId === categoryId && p.isActive !== false);
    if (!list.length) { toast.info('Is category me koi cheez nahi'); return; }
    if (list.length > 150 && !window.confirm(`${list.length} cheezein list me dalni hain?`)) return;
    for (let i = 0; i < list.length; i += 6) await Promise.all(list.slice(i, i + 6).map((p) => addProduct(p, {}, true)));
    toast.success(`${list.length} cheezein list me aa gayin`);
  };

  // Items sent from the products pages ("Label" button).
  const handedOver = useRef(false);
  useEffect(() => {
    const ids = (location.state as { productIds?: string[] } | null)?.productIds;
    if (handedOver.current || !ids?.length || !productsQ.data) return;
    handedOver.current = true;
    const list = ids.map((id) => byId.get(id)).filter(Boolean) as Product[];
    (async () => {
      for (let i = 0; i < list.length; i += 6) await Promise.all(list.slice(i, i + 6).map((p) => addProduct(p, {}, true)));
      if (list.length) toast.success(`${list.length} cheezein label ki list me`);
    })();
    navigate(location.pathname, { replace: true, state: null });
  }, [productsQ.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const setQty = (id: string, qty: number) => setLines((prev) => prev.map((l) => (l.id === id ? { ...l, qty } : l)));
  const setAllQty = (q: number | 'stock') => setLines((prev) => prev.map((l) => {
    const r = resolved.find((x) => x.line.id === l.id);
    return { ...l, qty: q === 'stock' ? Math.min(MAX_QTY, Math.max(1, r?.stock ?? 1)) : q };
  }));
  const setUnit = (id: string, unitId: string | undefined) => setLines((prev) => prev.map((l) => (l.id === id ? { ...l, unitId } : l)));
  const remove = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id));
  const clear = () => { if (window.confirm('Poori list saaf karni hai?')) setLines([]); };

  const refreshData = () => {
    qc.invalidateQueries({ queryKey: PRODUCTS_KEY });
    qc.invalidateQueries({ queryKey: UNITS_KEY });
    qc.invalidateQueries({ queryKey: ['products'] });
    qc.invalidateQueries({ queryKey: LABEL_SETTINGS_KEY });
  };

  /* ── Barcodes ── */
  const assign = useMutation({
    mutationFn: async () => {
      const productIds = [...new Set(missing.filter((r) => !r.unit).map((r) => r.line.productId))];
      const unitIds = [...new Set(missing.flatMap((r) => (r.unit ? [r.unit.id] : [])))];
      let made = 0;
      if (productIds.length) {
        const res = await barcodeLabelsApi.assign(productIds, true);
        made += res.products + res.variants;
      }
      for (const id of unitIds) { await productUnitsApi.generateBarcode(id); made++; }
      const variantIds = [...new Set(lines.filter((l) => l.variant && productIds.includes(l.productId)).map((l) => l.productId))];
      const fresh = await Promise.all(variantIds.map((id) => productsApi.getOne(id).catch(() => null)));
      return { made, fresh: fresh.filter(Boolean) as Product[] };
    },
    onSuccess: ({ made, fresh }) => {
      refreshVariants(fresh);
      refreshData();
      toast.success(made ? `${made} naye barcode ban gaye — scanner par chalenge` : 'Sab ke barcode pehle se hain');
    },
    onError: () => toast.error('Barcode nahi bane — internet check karke dobara koshish karein'),
  });

  const saveCode = async (r: ResolvedLine, code: string) => {
    try {
      const v = r.line.variant;
      if (r.unit) await productUnitsApi.update(r.unit.id, { barcode: code });
      else if (v) {
        await productVariantsApi.update(r.line.productId, v.id, { name: v.name, price: v.price, barcode: code });
        setLines((prev) => prev.map((l) => (l.variant?.id === v.id ? { ...l, variant: { ...v, barcode: code } } : l)));
      } else await productsApi.update(r.line.productId, { barcode: code });
      refreshData();
      toast.success('Barcode save ho gaya');
      return true;
    } catch {
      toast.error('Barcode save nahi hua — shayad ye code kisi aur cheez ka hai');
      return false;
    }
  };

  /* ── Preview and print ── */
  const dConfig = useDeferredValue(config);
  const dLabels = useDeferredValue(labels);
  const dSkip = useDeferredValue(skip);
  const preview = useMemo(() => {
    const lay = sheetLayout(dConfig);
    const room = lay.roll ? lay.cols * 4 : lay.perPage - dSkip;
    const list = dLabels.length ? dLabels.slice(0, room) : Array<LabelData>(lay.roll ? lay.cols * 2 : room).fill(SAMPLE);
    return {
      html: renderLabels(list, dConfig, { shopName, preview: true, skip: dSkip, maxPages: lay.roll ? 4 : 1 }),
      pages: lay.roll ? Math.ceil(list.length / lay.cols) : 1,
      lay,
      sample: !dLabels.length,
    };
  }, [dConfig, dLabels, dSkip, shopName]);

  const print = (test = false) => {
    const list = test ? [labels[0] ?? SAMPLE] : labels;
    if (!list.length) { toast.error('Pehle list me koi cheez dalain'); return; }
    printHtml(renderLabels(list, config, { shopName, skip }));
  };

  const sheetName = layout.roll ? `Roll ${layout.w}×${layout.h} mm` : `A4 · ${layout.perPage} label`;

  return (
    <PageShell>
      <PageHero
        title="Barcode labels"
        chip={<><ScanLine /> {sheetName}</>}
        meta="Qeemat aur barcode ke sticker — roll ya A4 sheet par"
        busy={productsQ.isFetching && !productsQ.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {missing.length > 0 && (
            <button type="button" onClick={() => assign.mutate()} disabled={assign.isPending} className={heroButton}>
              <Wand2 className="h-4 w-4" /> {assign.isPending ? 'Ban rahe hain…' : `Barcode banayen (${missing.length})`}
            </button>
          )}
          <button type="button" onClick={() => print(true)} className={heroButton} title="Sirf ek label chhap kar naap check karein"><TestTube2 className="h-4 w-4" /> Test print</button>
          <button type="button" onClick={() => print()} disabled={!labels.length} className={`${heroPrimaryButton} disabled:opacity-60`}>
            <Printer className="h-4 w-4" /> Print <span className="tabular-nums">{labels.length}</span>
          </button>
        </>}
        stats={[
          { label: 'Chhapne wale label', value: labels.length.toLocaleString('en-PK'), hint: `${lines.length} cheezein` },
          { label: layout.roll ? 'Roll par' : 'A4 sheets', value: pages, hint: layout.roll ? `${layout.cols} label har line` : `${layout.perPage} har sheet` },
          { label: 'List me barcode nahi', value: missing.length, hint: missingBarcodes ? `dukaan me ${missingBarcodes} cheezein bina barcode` : undefined },
        ]}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="space-y-4">
          <LabelQueue
            products={products} loading={productsQ.isLoading} categories={catsQ.data ?? []} unitsByProduct={unitsByProduct}
            lines={resolved} busy={adding > 0}
            onAdd={(p) => addProduct(p)} onScan={scan} onAddCategory={addCategory}
            onQty={setQty} onAllQty={setAllQty} onUnit={setUnit} onRemove={remove} onClear={clear} onSaveCode={saveCode}
          />
          <LabelDesigner config={config} set={set} saving={saving} layout={layout} skip={skip} onSkip={setSkip} />
        </div>

        <aside className="space-y-3 lg:sticky lg:top-4">
          <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-1.5 text-[0.9375rem] font-semibold text-slate-900"><Eye className="h-4 w-4 text-slate-400" /> Preview</h2>
                <p className="text-[0.75rem] text-slate-500">
                  {preview.sample ? 'Namoona label — list me cheez dalein to asal dikhega' : layout.roll ? 'Pehle kuch label, bilkul isi tarah chhapenge' : 'Pehli sheet, bilkul isi tarah chhapegi'}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] tabular-nums text-slate-600">{preview.lay.pageW.toFixed(0)}×{preview.lay.pageH.toFixed(0)} mm</span>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-xl bg-slate-100 p-3">
              <LabelSheetPreview html={preview.html} pageW={preview.lay.pageW} pageH={preview.lay.pageH} pages={preview.pages} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => print(true)} leftIcon={<TestTube2 className="h-4 w-4" />}>Test print</Button>
              <Button onClick={() => print()} disabled={!labels.length} leftIcon={<Printer className="h-4 w-4" />}>Print {labels.length}</Button>
            </div>
            <p className="mt-2 text-[0.6875rem] leading-snug text-slate-500">
              Print ke dabbe me: Scale <b>100%</b> (ya "Actual size"), Margins <b>None</b>, Headers and footers <b>band</b>.
              {layout.roll ? ' Printer ki setting me bhi label ka yehi naap rakhein.' : ''}
            </p>
          </div>
        </aside>
      </div>

      {guide.isOpen && (
        <PageGuide title="Barcode labels — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: ListPlus, color: '#16a34a', title: 'Cheezein dalain', text: 'Naam likh kar search ya scanner se scan karein. Poori category bhi ek saath aa sakti hai. Har variant aur har pack (dozen, carton) ka alag label banta hai.' },
            { icon: LayoutGrid, color: '#2563eb', title: 'Kaghaz chunein', text: 'Thermal roll ho to us ka naap (jaise 50×30). A4 sticker sheet ho to us ke dabbe par likhi ginti — 65, 40, 24, 21 ya 14.' },
            { icon: Settings2, color: '#7c3aed', title: 'Label par kya ho', text: 'Naam, qeemat, barcode ke number, unit, expiry — jo chahiye on karein. Design poori dukaan ke liye save hota hai.' },
            { icon: TestTube2, color: '#d97706', title: 'Pehle test print', text: '"Test print" sirf ek label chhapta hai. Sticker par naap theek baithe to poora print karein.' },
            { icon: Printer, color: '#0891b2', title: 'Print ki setting', text: 'Print ke dabbe me Scale 100%, Margins None aur Headers/footers band rakhein — warna label khisak jate hain.' },
            { icon: Layers, color: '#db2777', title: 'Barcode nahi hai?', text: 'Upar "Barcode banayen" list ki har bina barcode cheez ko naya EAN-13 de deta hai jo har scanner parhta hai.' },
          ]}
          tips={[
            'Thermal label printer ki driver setting (Printing preferences) me bhi wohi paper size banayein jo yahan chuna hai, warna har label ke baad khali label nikalta hai.',
            'Aadhi istemaal hui A4 sheet? "Shuru kahan se" me agle khali label ka number likh dein.',
            'Pack (carton, dozen) ki qeemat khaali ho to label par piece ki qeemat × pack ki ginti chhapti hai.',
            'Ye list isi device par yaad rehti hai — page band kar ke wapas aayein to wohi milegi.',
          ]}
          shortcuts={[['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
