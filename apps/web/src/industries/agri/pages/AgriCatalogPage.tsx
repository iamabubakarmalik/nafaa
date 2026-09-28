import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, X, ShoppingBag, Heart, Plus, Minus, Sprout, Wheat,
  Package, Info, ShieldAlert, Scale, Calculator, Leaf,
  GraduationCap, AlertTriangle, Droplets, Bug, Award,
  MapPin, Beaker, Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { agriProductsApi } from '../api/products.api';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { useAuthStore } from '@core/stores/auth.store';
import { useCatalogCart } from '@modules/catalog/hooks/useCatalogCart';
import { useWishlist } from '@modules/catalog/hooks/useWishlist';
import { CatalogCartDrawer } from '@modules/catalog/components/CatalogCartDrawer';
import { certStatus, isMeasured, agriUnitLabel, SEASONS } from '../lib/agriUnits';
import {
  deriveAgriKind, prettyAgriKind, AGRI_KIND_EMOJI, needsGovtReg,
  isSeedKind, isFertKind, isSprayKind, isFeedKind, isToolKind, type AgriKind,
} from '../lib/agriCategory';

/* ═════════════════════════════════════════════════════════════
   AGRI CATALOG — jo farmer ko dikhaya jata hai
   ─────────────────────────────────────────────────────────────
   Ye safha dukaan-daar ke liye nahi, farmer ke liye hai. Farmer
   dukaan par aa kar ye nahi kehta "mujhe DAP chahiye" — wo kehta
   hai "mere paas paanch acre gandum hai, kya daalun?"

   Is liye yahan pehli cheez fasal hai, maal baad me:

     🌾 FASAL — gandum chunte hi sirf gandum ka beej, khaad aur
        dawa reh jati hai. Baqi sab chhup jata hai.

     📐 RAQBA — acre likhte hi har cheez par likh aata hai ke
        "5 acre ke liye 10 bori" — aur cart me bhi utni hi jati
        hai. Farmer ko khud ginti nahi karni parti.

     ⚖️ BORI AUR KILO — rate bori ka hai, magar neeche kilo ka
        bhi likha hai. Farmer kilo me sochta hai.

   Aur ek cheez jo yahan se GHAYAB hai: wo maal jiski government
   registration khatam ho chuki. Dukaan ke andar us par laal
   nishan lagta hai; yahan wo dikhta hi nahi. Jo bik nahi sakta,
   uska ishtihar bhi nahi hona chahiye.
   ═════════════════════════════════════════════════════════════ */

type KindTab = 'all' | 'seed' | 'fert' | 'spray' | 'feed' | 'tool';

const KIND_TABS: Array<{ v: KindTab; l: string; e: string; test: (k: AgriKind) => boolean }> = [
  { v: 'all',   l: 'Sab kuch', e: '🏪', test: () => true },
  { v: 'seed',  l: 'Beej',     e: '🌱', test: isSeedKind },
  { v: 'fert',  l: 'Khaad',    e: '💊', test: isFertKind },
  { v: 'spray', l: 'Dawa',     e: '🧪', test: isSprayKind },
  { v: 'feed',  l: 'Feed',     e: '🐄', test: isFeedKind },
  { v: 'tool',  l: 'Auzaar',   e: '🔧', test: isToolKind },
];

type SortBy = 'popular' | 'price-low' | 'price-high' | 'name';

const SORTS: Array<{ v: SortBy; l: string }> = [
  { v: 'popular',    l: '🔥 Mashhoor pehle' },
  { v: 'price-low',  l: '💰 Sasta pehle' },
  { v: 'price-high', l: '💎 Mehnga pehle' },
  { v: 'name',       l: '🔤 Naam A–Z' },
];

const fmtQty = (q: number) => Number(q || 0).toFixed(Number(q || 0) % 1 === 0 ? 0 : 2);

/** "2 bori per acre" jaisi line se pehla number */
function perAcreFrom(rate?: string): number | null {
  if (!rate) return null;
  const m = String(rate).match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function AgriCatalogPage() {
  const tenant = useAuthStore((s) => s.tenant);
  const cart = useCatalogCart();
  const wishlist = useWishlist();
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [kindTab, setKindTab] = useState<KindTab>('all');
  const [crop, setCrop] = useState('');
  const [season, setSeason] = useState('');
  const [acres, setAcres] = useState('');
  const [organicOnly, setOrganicOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('popular');
  const [showCart, setShowCart] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);

  const profilesQ = useQuery({
    queryKey: ['agri-catalog-profiles'],
    queryFn: () => agriProductsApi.list({}),
  });
  const productsQ = useQuery({
    queryKey: ['agri-catalog-products'],
    queryFn: () => fetchAllProducts({ isActive: true }),
  });

  const isLoading = profilesQ.isLoading || productsQ.isLoading;
  const acreNum = Number(acres || 0);

  /* ── Saara maal, sirf agri-profile wala nahi ──
     Agar sirf profile wali cheezein laatay to dukaan me pari
     rassi, tirpal aur pani ki bottle catalog me aati hi nahi —
     jabke farmer wo bhi kharidta hai. Jis cheez ka profile nahi,
     uske liye product ka apna rate aur naam chal jata hai. */
  const all = useMemo(() => {
    const byProduct = new Map<string, any>();
    (profilesQ.data ?? []).forEach((pr: any) => { if (pr.productId) byProduct.set(pr.productId, pr); });

    return (productsQ.data?.items ?? []).map((prod: any) => {
      const pr = byProduct.get(prod.id);
      const kind: AgriKind = pr?.category ?? deriveAgriKind(prod.category?.name, prod.name);
      const cert = certStatus(pr?.govtRegExpiry);
      const unit = prod.unit ?? 'bag';
      const packSize = Number(pr?.packSize || 0);

      return {
        key: prod.id,
        productId: prod.id,
        name: prod.name,
        categoryName: prod.category?.name ?? '',
        price: Number(prod.price || 0),
        unit,
        image: prod.images?.find((i: any) => i.isPrimary)?.imageUrl
          ?? prod.images?.[0]?.imageUrl ?? pr?.imageUrls?.[0] ?? null,
        stock: Number(prod.stock ?? 0),
        kind,
        cert,
        /* Jis ki registration khatam — catalog se bahar */
        illegal: needsGovtReg(kind) && cert.state === 'expired',
        packSize: packSize > 0 && !isMeasured(unit) ? packSize : 0,
        packUnit: String(pr?.packUnit || 'kg'),
        crops: pr?.targetCrops ?? [],
        pests: pr?.targetPests ?? [],
        animals: pr?.targetAnimals ?? [],
        season: pr?.season ?? null,
        rate: pr?.applicationRate || '',
        method: pr?.applicationMethod || '',
        npk: pr?.npkRatio || '',
        active: pr?.activeIngredient || '',
        brand: pr?.brand || prod.brand?.name || '',
        origin: pr?.countryOfOrigin || '',
        organic: !!pr?.isOrganic,
        restricted: !!pr?.isRestricted || !!pr?.requiresLicense,
        toxicity: pr?.toxicityLevel || '',
        reEntry: Number(pr?.reEntryPeriod || 0),
        ppe: Number(pr?.ppePeriod || 0),
        usage: pr?.usageInstructions || '',
        care: pr?.precautions || '',
        firstAid: pr?.firstAid || '',
        desc: pr?.descriptionLong || prod.description || '',
        storage: pr?.storageInstructions || '',
        bulkPct: Number(pr?.bulkDiscountPct || 0),
        bulkMin: Number(pr?.bulkDiscountThreshold || 0),
        featured: !!pr?.isFeatured || !!prod.isFeatured,
        popular: !!pr?.isPopular,
        best: !!pr?.isBestSeller,
        sold: Number(pr?.totalSold || 0),
        hasProfile: !!pr,
      };
    }).filter((p: any) => !p.illegal);
  }, [profilesQ.data, productsQ.data]);

  /* Jitni fasalein sach me maal par likhi hain, sirf wohi chips */
  const cropOptions = useMemo(() => {
    const counts = new Map<string, number>();
    all.forEach((p: any) => p.crops.forEach((c: string) => {
      const k = c.trim();
      if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
    }));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  }, [all]);

  const filtered = useMemo(() => {
    const tab = KIND_TABS.find((t) => t.v === kindTab)!;
    const q = search.trim().toLowerCase();
    const c = crop.trim().toLowerCase();

    let list = all.filter((p: any) => {
      if (!tab.test(p.kind)) return false;
      if (organicOnly && !p.organic) return false;
      if (season && p.season && p.season !== season) return false;
      if (c && !p.crops.some((x: string) => x.toLowerCase().includes(c))) return false;
      if (q) {
        const hay = `${p.name} ${p.categoryName} ${p.brand} ${p.active} ${p.npk} ${p.crops.join(' ')} ${p.pests.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a: any, b: any) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      const score = (p: any) => (p.featured ? 4 : 0) + (p.best ? 3 : 0) + (p.popular ? 2 : 0);
      return score(b) - score(a) || b.sold - a.sold;
    });
    return list;
  }, [all, kindTab, search, crop, season, organicOnly, sortBy]);

  /** Raqba likha ho to itni tadaad, warna ek */
  const suggestQty = (p: any): number => {
    const per = perAcreFrom(p.rate);
    if (acreNum > 0 && per) return Number((per * acreNum).toFixed(2));
    return 1;
  };

  const addToCart = (p: any, qty?: number) => {
    const n = qty ?? suggestQty(p);
    cart.addItem({
      productId: p.productId,
      name: p.name,
      image: p.image ?? undefined,
      price: p.price,
      unit: p.unit,
      quantity: n,
      meta: {
        kind: p.kind,
        ...(p.packSize > 0 ? { packSize: p.packSize, packUnit: p.packUnit } : {}),
        ...(acreNum > 0 ? { acres: acreNum } : {}),
      },
    });
    toast.success(
      `${p.name} — ${fmtQty(n)} ${agriUnitLabel(p.unit)}`
      + (acreNum > 0 && perAcreFrom(p.rate) ? ` (${acreNum} acre ke hisab se)` : ''),
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (detail) return setDetail(null);
        if (showTeacher) return setShowTeacher(false);
        if (showCart) return setShowCart(false);
        return;
      }
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'g') setShowTeacher(true);
      if (e.key.toLowerCase() === 'c') setShowCart(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail, showTeacher, showCart]);

  const shopSettings = (tenant as any)?.settings ?? {};
  const shopWhatsapp = shopSettings.shopWhatsapp || shopSettings.shopPhone || (tenant as any)?.phone;

  const wishItems = useMemo(
    () => all.filter((p: any) => wishlist.has(p.productId)),
    [all, wishlist],
  );

  return (
    <div className="space-y-4 sm:space-y-5 pb-24">
      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}
      {detail && (
        <DetailModal p={detail} acres={acreNum} onClose={() => setDetail(null)}
          onAdd={(n: number) => { addToCart(detail, n); setDetail(null); }} />
      )}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-lime-700 text-white p-5 sm:p-7 shadow-2xl">
        <div className="absolute -top-24 -right-20 h-80 w-80 rounded-full bg-lime-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-0.5 text-[10px] font-black border border-white/25 uppercase tracking-widest">
                <Wheat className="h-2.5 w-2.5 text-lime-300" /> Beej · Khaad · Dawa
              </div>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-black truncate">
                {tenant?.name || 'Hamari dukaan'}
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm font-bold text-white/75">
                Apni fasal chunein — jo us ke liye chahiye, wohi dikhayenge
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setShowTeacher(true)} title="Sikhein (G)"
                className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
                <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
              </button>
              <button onClick={() => setShowWishlist((v) => !v)} title="Pasand"
                className="relative h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition">
                <Heart className={`h-4 w-4 ${wishlist.count > 0 ? 'fill-rose-400 text-rose-400' : ''}`} />
                {wishlist.count > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-rose-500 text-[10px] font-black flex items-center justify-center">
                    {wishlist.count}
                  </span>
                )}
              </button>
              <button onClick={() => setShowCart(true)} title="List (C)"
                className="relative h-11 px-4 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 text-sm font-black inline-flex items-center gap-2 shadow-2xl transition active:scale-[0.97]">
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">Meri list</span>
                {cart.totalItems > 0 && (
                  <span className="h-5 min-w-[20px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
                    {fmtQty(cart.totalItems)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Dhoondna + raqba */}
          <div className="mt-4 grid sm:grid-cols-[1fr_auto] gap-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Naam, brand, fasal ya keeray se dhoondein…   ( / )"
                className="h-12 w-full rounded-2xl bg-white/15 border-2 border-white/25 pl-11 pr-10 text-sm font-bold text-white placeholder:text-white/50 focus:outline-none focus:border-white/60 backdrop-blur transition" />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-lime-300" />
              <input type="number" step="0.5" min={0} value={acres}
                onChange={(e) => setAcres(e.target.value)} placeholder="Raqba (acre)"
                className="h-12 w-full sm:w-44 rounded-2xl bg-white/15 border-2 border-white/25 pl-11 pr-3 text-sm font-black text-white placeholder:text-white/50 tabular-nums focus:outline-none focus:border-lime-300 backdrop-blur transition" />
            </div>
          </div>

          {acreNum > 0 && (
            <div className="mt-2 rounded-2xl bg-lime-400/20 border border-lime-300/40 px-3 py-2 flex items-center gap-2 flex-wrap backdrop-blur">
              <Calculator className="h-4 w-4 text-lime-200 shrink-0" />
              <p className="text-[12px] font-bold text-lime-50">
                <strong>{acreNum} acre</strong> ke hisab se har cheez par miqdar likhi hai —
                list me bhi utni hi jayegi.
              </p>
              <button onClick={() => setAcres('')}
                className="ml-auto text-[11px] font-black text-lime-200 hover:text-white underline shrink-0">
                hata dein
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ═══ FASAL ═══ */}
      {cropOptions.length > 0 && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-lime-600 to-emerald-700 text-white flex items-center justify-center shrink-0">
              <Sprout className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-slate-900 dark:text-white">Kaunsi fasal?</h2>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Fasal chunte hi sirf us ka maal reh jayega
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cropOptions.map(([c, n]) => (
              <button key={c} onClick={() => setCrop(crop === c ? '' : c)}
                className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                  crop === c
                    ? 'border-lime-500 bg-lime-50 dark:bg-lime-500/15 text-lime-700 dark:text-lime-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-lime-400'
                }`}>
                🌾 {c}
                <span className="px-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[10px] font-black">{n}</span>
              </button>
            ))}
            {crop && (
              <button onClick={() => setCrop('')}
                className="h-10 px-3 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
                <X className="h-3 w-3" /> Sab dikhayein
              </button>
            )}
          </div>
        </section>
      )}

      {/* ═══ KISM + CHAANT ═══ */}
      <section className="space-y-2.5">
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {KIND_TABS.map((t) => {
            const n = all.filter((p: any) => t.test(p.kind)).length;
            return (
              <button key={t.v} onClick={() => setKindTab(t.v)}
                className={`h-11 px-3.5 rounded-2xl border-2 text-xs font-black inline-flex items-center gap-1.5 shrink-0 transition ${
                  kindTab === t.v
                    ? 'border-emerald-600 bg-gradient-to-br from-emerald-600 to-lime-700 text-white shadow-lg'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                }`}>
                <span className="text-sm">{t.e}</span> {t.l}
                <span className={`px-1.5 rounded-md text-[10px] font-black ${
                  kindTab === t.v ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-800'
                }`}>{n}</span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-1.5 flex-wrap items-center">
          {SEASONS.map((s) => (
            <button key={s.v} onClick={() => setSeason(season === s.v ? '' : s.v)} title={s.hint}
              className={`h-9 px-2.5 rounded-xl border-2 text-[11px] font-extrabold transition ${
                season === s.v
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
              }`}>{s.e} {s.l}</button>
          ))}
          <button onClick={() => setOrganicOnly((v) => !v)}
            className={`h-9 px-2.5 rounded-xl border-2 text-[11px] font-extrabold inline-flex items-center gap-1 transition ${
              organicOnly
                ? 'border-green-600 bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-green-400'
            }`}>
            <Leaf className="h-3 w-3" /> Sirf organic
          </button>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="ml-auto h-9 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition">
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>
      </section>

      {/* ═══ PASAND ═══ */}
      {showWishlist && (
        <section className="rounded-3xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-4">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <h2 className="text-sm font-black text-rose-800 dark:text-rose-300 inline-flex items-center gap-1.5">
              <Heart className="h-4 w-4 fill-rose-500 text-rose-500" /> Pasand ki hui cheezein
            </h2>
            <button onClick={() => setShowWishlist(false)}
              className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center transition">
              <X className="h-3.5 w-3.5 text-slate-500" />
            </button>
          </div>
          {wishItems.length === 0 ? (
            <p className="text-xs font-bold text-rose-700/70 dark:text-rose-300/70 py-4 text-center">
              Abhi kuch pasand nahi kiya — kisi cheez par ❤️ dabayein
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {wishItems.map((p: any) => (
                <ProductCard key={p.key} p={p} acres={acreNum} suggest={suggestQty(p)}
                  wished onWish={() => wishlist.toggle(p.productId)}
                  onAdd={() => addToCart(p)} onOpen={() => setDetail(p)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═══ MAAL ═══ */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-72 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
          <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-black text-slate-700 dark:text-slate-200">Kuch nahi mila</p>
          <p className="text-xs font-bold text-slate-400 mt-1">
            {crop ? `"${crop}" ka maal is qism me nahi hai` : 'Dhoondne ka lafz ya chaant badal kar dekhein'}
          </p>
          {(crop || season || organicOnly || kindTab !== 'all' || search) && (
            <button onClick={() => {
              setCrop(''); setSeason(''); setOrganicOnly(false); setKindTab('all'); setSearch('');
            }} className="mt-3 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition">
              Saari chaant hata dein
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {filtered.length} cheezein
            {crop && <> · 🌾 {crop}</>}
            {acreNum > 0 && <> · 📐 {acreNum} acre</>}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {filtered.map((p: any) => (
              <ProductCard key={p.key} p={p} acres={acreNum} suggest={suggestQty(p)}
                wished={wishlist.has(p.productId)} onWish={() => wishlist.toggle(p.productId)}
                onAdd={() => addToCart(p)} onOpen={() => setDetail(p)} />
            ))}
          </div>
        </>
      )}

      {/* ═══ CART ═══ */}
      <CatalogCartDrawer cart={cart} isOpen={showCart} onClose={() => setShowCart(false)}
        shopName={tenant?.name} shopPhone={shopWhatsapp} themeColor="#16a34a"
        orderMode={acreNum > 0 ? `${acreNum} acre ke liye` : undefined} />

      {/* Mobile par neeche patti */}
      {cart.totalItems > 0 && !showCart && (
        <div className="fixed bottom-4 inset-x-4 sm:hidden z-40">
          <button onClick={() => setShowCart(true)}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-lime-700 text-white shadow-2xl flex items-center justify-between px-5 active:scale-[0.98] transition">
            <span className="inline-flex items-center gap-2 text-sm font-black">
              <ShoppingBag className="h-5 w-5" /> {fmtQty(cart.totalItems)} cheezein
            </span>
            <span className="text-base font-black tabular-nums">{formatPKR(cart.subtotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ════════════════ CHHOTE HISSE ════════════════ */

function ProductCard({ p, acres, suggest, wished, onWish, onAdd, onOpen }: any) {
  const perAcre = perAcreFrom(p.rate);
  const showSuggest = acres > 0 && perAcre;
  const out = p.stock <= 0;

  return (
    <div className="group rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-emerald-300 dark:hover:border-emerald-500/40 transition flex flex-col">
      {/* Tasveer */}
      <button onClick={onOpen} className="relative aspect-square bg-gradient-to-br from-emerald-50 to-lime-50 dark:from-slate-800 dark:to-slate-800 overflow-hidden">
        {p.image ? (
          <img src={p.image} alt={p.name} loading="lazy"
            className="h-full w-full object-cover group-hover:scale-105 transition duration-300" />
        ) : (
          <span className="h-full w-full flex items-center justify-center text-5xl opacity-60">
            {AGRI_KIND_EMOJI[p.kind as AgriKind]}
          </span>
        )}

        <span className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {p.featured && (
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-black inline-flex items-center gap-0.5">
              <Star className="h-2.5 w-2.5 fill-white" /> Khaas
            </span>
          )}
          {p.organic && (
            <span className="px-1.5 py-0.5 rounded-md bg-green-600 text-white text-[9px] font-black inline-flex items-center gap-0.5">
              <Leaf className="h-2.5 w-2.5" /> Organic
            </span>
          )}
          {p.restricted && (
            <span className="px-1.5 py-0.5 rounded-md bg-orange-600 text-white text-[9px] font-black">
              🪪 License
            </span>
          )}
          {out && (
            <span className="px-1.5 py-0.5 rounded-md bg-slate-900/85 text-white text-[9px] font-black">
              Khatam
            </span>
          )}
        </span>

        <button onClick={(e) => { e.stopPropagation(); onWish(); }}
          className="absolute top-2 right-2 h-8 w-8 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur flex items-center justify-center shadow transition hover:scale-110">
          <Heart className={`h-4 w-4 ${wished ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
        </button>
      </button>

      {/* Tafseel */}
      <div className="p-3 flex-1 flex flex-col gap-1.5">
        <button onClick={onOpen} className="text-left">
          <p className="text-[13px] font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2">
            {p.name}
          </p>
          <p className="mt-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
            {AGRI_KIND_EMOJI[p.kind as AgriKind]} {p.categoryName || prettyAgriKind(p.kind)}
            {p.brand && ` · ${p.brand}`}
          </p>
        </button>

        {/* Bori aur kilo */}
        {p.packSize > 0 && (
          <span className="inline-flex w-fit items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-500/15 text-[9px] font-black text-sky-700 dark:text-sky-300">
            <Scale className="h-2.5 w-2.5" /> 1 {agriUnitLabel(p.unit)} = {p.packSize} {p.packUnit}
          </span>
        )}

        {/* Kis fasal ke liye */}
        {p.crops.length > 0 && (
          <p className="text-[10px] font-bold text-lime-700 dark:text-lime-400 truncate">
            🌾 {p.crops.slice(0, 3).join(' · ')}
          </p>
        )}

        {/* Raqba ka hisab */}
        {showSuggest && (
          <div className="rounded-lg bg-lime-50 dark:bg-lime-500/10 border border-lime-200 dark:border-lime-500/30 px-1.5 py-1">
            <p className="text-[10px] font-black text-lime-800 dark:text-lime-300 leading-tight">
              📐 {acres} acre ke liye <strong>{fmtQty(suggest)} {agriUnitLabel(p.unit)}</strong>
            </p>
            <p className="text-[9px] font-bold text-lime-700/70 dark:text-lime-400/70">{p.rate}</p>
          </div>
        )}

        {p.bulkPct > 0 && p.bulkMin > 0 && (
          <p className="text-[9px] font-black text-amber-700 dark:text-amber-400">
            🎁 {p.bulkMin}+ par {p.bulkPct}% chhoot
          </p>
        )}

        <div className="mt-auto pt-1.5 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
              {formatPKR(p.price)}
            </p>
            <p className="text-[9px] font-bold text-slate-400">
              per {agriUnitLabel(p.unit)}
              {p.packSize > 0 && ` · ${formatPKR(p.price / p.packSize)}/${p.packUnit}`}
            </p>
          </div>
          <button onClick={onAdd} title="List me daalein"
            className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-lime-700 text-white flex items-center justify-center shadow hover:shadow-lg shrink-0 transition active:scale-95">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Poori tafseel ── */
function DetailModal({ p, acres, onClose, onAdd }: any) {
  const perAcre = perAcreFrom(p.rate);
  const [qty, setQty] = useState<number>(acres > 0 && perAcre ? Number((perAcre * acres).toFixed(2)) : 1);
  const totalLoose = p.packSize > 0 ? qty * p.packSize : 0;
  const line = qty * p.price;
  const bulkOn = p.bulkPct > 0 && p.bulkMin > 0 && qty >= p.bulkMin;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl max-h-[92vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        {/* Upar */}
        <header className="relative shrink-0">
          <div className="h-40 sm:h-52 bg-gradient-to-br from-emerald-600 to-lime-700 overflow-hidden">
            {p.image ? (
              <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <span className="h-full w-full flex items-center justify-center text-7xl">
                {AGRI_KIND_EMOJI[p.kind as AgriKind]}
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="absolute top-3 right-3 h-10 w-10 rounded-xl bg-slate-900/60 hover:bg-slate-900/80 text-white flex items-center justify-center backdrop-blur transition">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{p.name}</h3>
            <p className="mt-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              {AGRI_KIND_EMOJI[p.kind as AgriKind]} {p.categoryName || prettyAgriKind(p.kind)}
              {p.brand && ` · ${p.brand}`}
              {p.origin && ` · ${p.origin}`}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.organic && <Chip tone="green" icon={Leaf}>Organic</Chip>}
              {p.restricted && <Chip tone="orange" icon={ShieldAlert}>License chahiye</Chip>}
              {p.season && <Chip tone="emerald">{SEASONS.find((s) => s.v === p.season)?.e} {SEASONS.find((s) => s.v === p.season)?.l}</Chip>}
              {p.npk && <Chip tone="sky" icon={Beaker}>NPK {p.npk}</Chip>}
              {p.stock <= 0 && <Chip tone="slate">Abhi khatam</Chip>}
            </div>
          </div>

          {p.desc && (
            <p className="text-[13px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed">{p.desc}</p>
          )}

          {/* Kis fasal / keeray ke liye */}
          {(p.crops.length > 0 || p.pests.length > 0 || p.animals.length > 0) && (
            <Box icon={Sprout} title="Kis ke liye" tone="lime">
              {p.crops.length > 0 && <TagRow label="Fasal" items={p.crops} emoji="🌾" />}
              {p.pests.length > 0 && <TagRow label="Keera / beemari" items={p.pests} emoji="🐛" />}
              {p.animals.length > 0 && <TagRow label="Jaanwar" items={p.animals} emoji="🐄" />}
            </Box>
          )}

          {/* Kaise daalna hai */}
          {(p.rate || p.method || p.usage) && (
            <Box icon={Droplets} title="Kaise istemal karein" tone="sky">
              {p.rate && <KV k="Kitni miqdar" v={p.rate} />}
              {p.method && <KV k="Kis tareeqe se" v={p.method} />}
              {p.usage && (
                <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {p.usage}
                </p>
              )}
            </Box>
          )}

          {/* Ehtiyat — zehreeli dawa ke liye */}
          {(p.toxicity || p.reEntry > 0 || p.ppe > 0 || p.care || p.firstAid) && (
            <Box icon={AlertTriangle} title="Ehtiyat" tone="amber">
              {p.toxicity && <KV k="Kitni zehreeli" v={p.toxicity} />}
              {p.reEntry > 0 && <KV k="Chhirkao ke baad khet me" v={`${p.reEntry} din baad jayein`} />}
              {p.ppe > 0 && <KV k="Katai se pehle" v={`${p.ppe} din chhor dein`} />}
              {p.care && (
                <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200 leading-relaxed whitespace-pre-line">
                  {p.care}
                </p>
              )}
              {p.firstAid && (
                <div className="rounded-xl bg-white dark:bg-slate-800 p-2.5">
                  <p className="text-[10px] font-black uppercase tracking-wide text-rose-600 mb-0.5">Agar lag jaye</p>
                  <p className="text-[12px] font-bold text-slate-700 dark:text-slate-300 whitespace-pre-line">{p.firstAid}</p>
                </div>
              )}
              <p className="text-[11px] font-bold text-amber-800/80 dark:text-amber-300/80">
                Dastane aur mask pehan kar chhirkao karein · bachon se door rakhein
              </p>
            </Box>
          )}

          {(p.active || p.storage) && (
            <Box icon={Info} title="Aur tafseel" tone="slate">
              {p.active && <KV k="Asal dawa" v={p.active} />}
              {p.storage && <KV k="Rakhne ka tareeqa" v={p.storage} />}
            </Box>
          )}
        </div>

        {/* Neeche — tadaad aur list */}
        <footer className="shrink-0 border-t-2 border-slate-100 dark:border-slate-800 p-4 space-y-2.5 bg-white dark:bg-slate-900">
          {acres > 0 && perAcre && (
            <div className="rounded-xl bg-lime-50 dark:bg-lime-500/10 border-2 border-lime-200 dark:border-lime-500/30 px-2.5 py-1.5 flex items-center gap-2 flex-wrap">
              <Calculator className="h-3.5 w-3.5 text-lime-600 shrink-0" />
              <span className="text-[11px] font-bold text-lime-900 dark:text-lime-200 flex-1 min-w-0">
                {acres} acre ke liye <strong>{fmtQty(perAcre * acres)} {agriUnitLabel(p.unit)}</strong> chahiye
              </span>
              <button onClick={() => setQty(Number((perAcre * acres).toFixed(2)))}
                className="text-[11px] font-black text-lime-700 dark:text-lime-300 underline shrink-0">
                laga do
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shrink-0">
              <button onClick={() => setQty((q) => Math.max(0.5, q - 1))}
                className="h-11 w-10 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition">
                <Minus className="h-3.5 w-3.5 text-slate-500" />
              </button>
              <input type="number" step="0.5" min={0.5} value={qty}
                onChange={(e) => setQty(Math.max(0.5, Number(e.target.value)))}
                className="h-11 w-16 text-center text-sm font-black text-slate-900 dark:text-white bg-transparent tabular-nums focus:outline-none" />
              <button onClick={() => setQty((q) => q + 1)}
                className="h-11 w-10 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition">
                <Plus className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
                {formatPKR(line)}
              </p>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                {fmtQty(qty)} {agriUnitLabel(p.unit)} × {formatPKR(p.price)}
                {p.packSize > 0 && ` · kul ${fmtQty(totalLoose)} ${p.packUnit}`}
              </p>
            </div>
          </div>

          {bulkOn && (
            <p className="text-[11px] font-black text-amber-700 dark:text-amber-400">
              🎁 {p.bulkMin}+ par {p.bulkPct}% chhoot mil jayegi — dukaan par baat kar lein
            </p>
          )}

          <Button onClick={() => onAdd(qty)} size="lg"
            className="w-full bg-gradient-to-r from-emerald-600 to-lime-700">
            <ShoppingBag className="h-5 w-5" /> Meri list me daalein
          </Button>
        </footer>
      </div>
    </div>
  );
}

const BOX_TONES: Record<string, string> = {
  lime: 'bg-lime-50 dark:bg-lime-500/10 border-lime-200 dark:border-lime-500/30',
  sky: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30',
  amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
  slate: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',
};

function Box({ icon: Icon, title, tone, children }: any) {
  return (
    <div className={`rounded-2xl border-2 p-3 space-y-2 ${BOX_TONES[tone]}`}>
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      {children}
    </div>
  );
}

function KV({ k, v }: any) {
  return (
    <div className="flex gap-2 flex-wrap">
      <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 shrink-0">{k}:</span>
      <span className="text-[12px] font-extrabold text-slate-800 dark:text-slate-100 min-w-0">{v}</span>
    </div>
  );
}

function TagRow({ label, items, emoji }: any) {
  return (
    <div className="flex gap-2 flex-wrap items-baseline">
      <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 shrink-0">{label}:</span>
      <span className="flex flex-wrap gap-1 min-w-0">
        {items.map((x: string) => (
          <span key={x} className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
            {emoji} {x}
          </span>
        ))}
      </span>
    </div>
  );
}

const CHIP_TONES: Record<string, string> = {
  green: 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300',
  orange: 'bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300',
  emerald: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  sky: 'bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300',
  slate: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
};

function Chip({ tone, icon: Icon, children }: any) {
  return (
    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black inline-flex items-center gap-1 ${CHIP_TONES[tone]}`}>
      {Icon && <Icon className="h-2.5 w-2.5" />} {children}
    </span>
  );
}

/* ── Sikhein ── */
function Teacher({ onClose }: any) {
  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[88vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        <header className="p-5 bg-gradient-to-br from-amber-500 to-orange-600 text-white shrink-0 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-black inline-flex items-center gap-2">
              <GraduationCap className="h-5 w-5" /> Catalog kaise kaam karta hai
            </h3>
            <p className="text-xs font-bold text-white/80 mt-0.5">Farmer ko ye safha dikhayein</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {[
            { i: Sprout, t: 'Pehle fasal chunein', d: 'Farmer "gandum" dabaye to sirf gandum ka beej, khaad aur dawa reh jati hai. Baqi sab chhup jata hai — dhoondna nahi parta.' },
            { i: MapPin, t: 'Raqba likhein', d: 'Upar acre ka khana bharein. Har cheez par likh aayega "5 acre ke liye 10 bori" — aur list me bhi utni hi jayegi. Farmer ko khud hisab nahi lagana parta.' },
            { i: Scale, t: 'Bori aur kilo', d: 'Rate bori ka hai, magar neeche kilo ka bhi likha hai. Farmer kilo me sochta hai, dukaan bori me — dono saath dikhte hain.' },
            { i: ShieldAlert, t: 'Jo bik nahi sakta wo dikhta hi nahi', d: 'Jis beej ya dawa ki government registration khatam ho gayi, wo catalog me aati hi nahi. Farmer ko wo cheez dikhani hi nahi chahiye jo bechna ghair-qanooni hai.' },
            { i: Bug, t: 'Keeray se bhi dhoondein', d: 'Farmer keeray ka naam bataye — "sundi", "teela" — to wahi dawa aa jayegi. Search me fasal, keera aur brand sab chalte hain.' },
            { i: Award, t: 'Ehtiyat parh lein', d: 'Kisi cheez par dabayein to poori tafseel khulti hai: kitni miqdar, chhirkao ke baad khet me kab jayein, katai se kitne din pehle chhor dein, aur agar lag jaye to kya karein.' },
            { i: ShoppingBag, t: 'List WhatsApp par', d: 'Farmer apni list banata hai aur WhatsApp par bhej deta hai. Aap ko poora order likha hua mil jata hai — phone par ginwane ki zaroorat nahi.' },
          ].map((s, n) => (
            <div key={n} className="flex gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-lime-700 text-white flex items-center justify-center shrink-0">
                <s.i className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white">{s.t}</p>
                <p className="text-[12px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">{s.d}</p>
              </div>
            </div>
          ))}
          <div className="rounded-2xl bg-slate-900 dark:bg-slate-800 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Tez tareeqa</p>
            <div className="flex flex-wrap gap-2">
              {[['/', 'Dhoondein'], ['C', 'Meri list'], ['G', 'Ye safha'], ['Esc', 'Band']].map(([k, l]) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/80">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/15 font-black">{k}</kbd> {l}
                </span>
              ))}
            </div>
          </div>
        </div>
        <footer className="p-4 border-t-2 border-slate-100 dark:border-slate-800 shrink-0">
          <Button onClick={onClose} className="w-full bg-gradient-to-r from-emerald-600 to-lime-700">
            Samajh gaya
          </Button>
        </footer>
      </div>
    </div>
  );
}
