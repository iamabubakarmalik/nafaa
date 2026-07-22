import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, BookOpen, Palette, Sparkles, Package,
  DollarSign, TrendingUp, Star, ChevronRight, ExternalLink,
  Award, Receipt, ShoppingCart, Hash, Tag, Trash2, Eye,
  Image as ImageIcon, User, Calendar, Layers, Info, GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productImagesApi } from '@modules/inventory/products/api/product-images.api';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { bookProfilesApi } from '../api/book-profiles.api';
import { stationeryProfilesApi } from '../api/stationery-profiles.api';
import { artSupplyProfilesApi } from '../api/art-supply-profiles.api';

export default function BookstoreProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: images = [] } = useQuery({
    queryKey: ['product-images', id],
    queryFn: () => productImagesApi.list(id!),
    enabled: !!id,
  });

  const { data: bookProfile } = useQuery({
    queryKey: ['book-profile-by-product', id],
    queryFn: () => bookProfilesApi.byProduct(id!),
    enabled: !!id,
  });

  const { data: stationeryProfile } = useQuery({
    queryKey: ['stationery-profile-by-product', id],
    queryFn: () => stationeryProfilesApi.byProduct(id!),
    enabled: !!id && !bookProfile,
  });

  const { data: artProfile } = useQuery({
    queryKey: ['art-profile-by-product', id],
    queryFn: () => artSupplyProfilesApi.byProduct(id!),
    enabled: !!id && !bookProfile && !stationeryProfile,
  });

  const { data: allSales = [] } = useQuery({
    queryKey: ['sales-list-for-product'],
    queryFn: () => salesApi.list(),
    enabled: !!id,
  });

  const salesForProduct = useMemo(() => {
    if (!id) return [];
    return allSales.filter((s) => s.items.some((it) => it.product?.id === id)).slice(0, 20);
  }, [allSales, id]);

  const removeMutation = useMutation({
    mutationFn: () => productsApi.remove(id!),
    onSuccess: (data: any) => {
      toast.success(data?.softDeleted ? 'Product deactivated' : 'Product deleted');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/bookstore/books');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  const stats = useMemo(() => {
    const soldItems = allSales.flatMap((s) =>
      s.items.filter((it) => it.product?.id === id).map((it) => ({ ...it, sale: s })),
    );
    const totalSold = soldItems.reduce((a, it) => a + Number(it.quantity || 0), 0);
    const totalRevenue = soldItems.reduce((a, it) => a + Number(it.total || 0), 0);
    const totalOrders = new Set(soldItems.map((it) => it.sale.id)).size;
    const stockValue = Number(product?.stock || 0) * Number(product?.price || 0);
    const profit = Number(product?.price || 0) - Number(product?.costPrice || 0);
    return { totalSold, totalRevenue, totalOrders, stockValue, profit };
  }, [allSales, id, product]);

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
      </div>
    );
  }

  // Determine product type + config
  const productType: 'BOOK' | 'STATIONERY' | 'ART_SUPPLY' =
    bookProfile ? 'BOOK' : stationeryProfile ? 'STATIONERY' : artProfile ? 'ART_SUPPLY' : 'BOOK';
  const typeConfig = {
    BOOK: { emoji: '📚', label: 'Book', icon: BookOpen, tone: 'amber' },
    STATIONERY: { emoji: '✏️', label: 'Stationery', icon: Sparkles, tone: 'blue' },
    ART_SUPPLY: { emoji: '🎨', label: 'Art Supply', icon: Palette, tone: 'pink' },
  }[productType];
  const TypeIcon = typeConfig.icon;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => navigate('/bookstore/books')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-amber-600 font-bold transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/bookstore-products/${id}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border-2 border-amber-200 hover:bg-amber-100 text-amber-700 text-sm font-extrabold transition"
          >
            <Edit3 className="h-4 w-4" /> Edit
          </Link>
          <Link
            to="/catalog"
            target="_blank"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-sm font-extrabold transition"
          >
            <ExternalLink className="h-4 w-4" /> Catalog
          </Link>
          <button
            onClick={() => {
              if (confirm(`Delete "${product.name}"?`)) removeMutation.mutate();
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border-2 border-rose-200 hover:bg-rose-100 text-rose-700 text-sm font-extrabold transition"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-orange-400/15 blur-3xl" />

        <div className="relative grid lg:grid-cols-[280px_1fr] gap-6 p-6">
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-white/10 backdrop-blur border-2 border-white/20 shrink-0">
            {images[0]?.url ? (
              <img src={images[0].url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/50">
                <TypeIcon className="h-16 w-16" />
              </div>
            )}
            {product.isFeatured && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-white" /> FEATURED
              </div>
            )}
            {bookProfile?.isBestSeller && (
              <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> BEST SELLER
              </div>
            )}
            {bookProfile?.isAwardWinner && (
              <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-violet-600 text-white text-[10px] font-extrabold shadow-lg inline-flex items-center gap-1">
                <Award className="h-3 w-3" /> AWARD
              </div>
            )}
            {!product.isActive && (
              <div className="absolute inset-x-0 bottom-0 py-1.5 bg-rose-600 text-white text-center text-xs font-extrabold">
                INACTIVE
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <span className="text-base leading-none">{typeConfig.emoji}</span>
              {typeConfig.label}
              {product.category && (
                <>
                  <span className="text-white/40">•</span>
                  <span>{product.category.name}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{product.name}</h1>
            {bookProfile?.subtitle && (
              <p className="mt-1 text-amber-300 font-semibold text-lg">{bookProfile.subtitle}</p>
            )}

            {/* Book: Authors */}
            {bookProfile?.bookAuthors && bookProfile.bookAuthors.length > 0 && (
              <div className="mt-2 flex items-center gap-2 flex-wrap text-sm">
                <User className="h-3.5 w-3.5 text-white/60" />
                <span className="text-white/80 font-semibold">by</span>
                {bookProfile.bookAuthors.map((ba: any, idx: number) => (
                  <span key={ba.author?.id || idx} className="font-extrabold">
                    {ba.author?.name}
                    {idx < (bookProfile.bookAuthors?.length ?? 0) - 1 && ', '}
                  </span>
                ))}
              </div>
            )}

            {product.description && (
              <p className="mt-2 text-sm text-white/85 max-w-2xl">{product.description}</p>
            )}

            <div className="mt-3 flex items-center gap-3 flex-wrap text-xs">
              {product.sku && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 backdrop-blur font-mono">
                  <Hash className="h-3 w-3" /> {product.sku}
                </span>
              )}
              {bookProfile?.isbn13 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 backdrop-blur font-mono">
                  ISBN: {bookProfile.isbn13}
                </span>
              )}
              {bookProfile?.publisher && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/30 border border-blue-300/40 font-bold">
                  <BookOpen className="h-3 w-3" /> {bookProfile.publisher.name}
                </span>
              )}
              {product.brand && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/30 border border-violet-300/40 font-bold">
                  <Tag className="h-3 w-3" /> {product.brand.name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <HeroStat icon={Package} label="Stock" value={product.stock} sub={product.unit} tone="amber" />
              <HeroStat icon={Receipt} label="Sold" value={stats.totalSold} sub={`${stats.totalOrders} orders`} tone="violet" />
              <HeroStat icon={TrendingUp} label="Revenue" value={formatPKR(stats.totalRevenue)} tone="emerald" />
              <HeroStat icon={DollarSign} label="Stock Value" value={formatPKR(stats.stockValue)} tone="blue" />
            </div>

            <div className="mt-5 flex items-center gap-4 flex-wrap">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Sale Price</div>
                <div className="text-3xl font-extrabold tabular-nums leading-none mt-1">
                  {formatPKRFull(product.price)}
                </div>
              </div>
              {bookProfile?.mrp && bookProfile.mrp > product.price && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">MRP</div>
                  <div className="text-xl font-extrabold tabular-nums text-white/60 line-through leading-none mt-1">
                    {formatPKRFull(bookProfile.mrp)}
                  </div>
                </div>
              )}
              {bookProfile?.isRentable && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-violet-300 tracking-wider">Rental/Week</div>
                  <div className="text-xl font-extrabold tabular-nums text-violet-300 leading-none mt-1">
                    {formatPKRFull(bookProfile.rentalPricePerWeek)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Book Details */}
      {bookProfile && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center shadow-md">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Book Details</h3>
              <p className="text-xs text-slate-500 font-semibold">Complete book information</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <DetailCard label="Category" value={bookProfile.category?.replace(/_/g, ' ') || '—'} />
            <DetailCard label="Binding" value={bookProfile.binding || '—'} />
            <DetailCard label="Condition" value={bookProfile.condition?.replace(/_/g, ' ') || '—'} />
            <DetailCard label="Language" value={bookProfile.language} />
            {bookProfile.edition && <DetailCard label="Edition" value={bookProfile.edition} />}
            {bookProfile.publishYear && <DetailCard label="Publish Year" value={bookProfile.publishYear} />}
            {bookProfile.pageCount && <DetailCard label="Pages" value={bookProfile.pageCount} />}
            {bookProfile.dimensions && <DetailCard label="Dimensions" value={bookProfile.dimensions} />}
          </div>

          {bookProfile.isTextbook && (
            <div className="mt-4 rounded-2xl border-2 border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="h-4 w-4 text-blue-700" />
                <div className="font-extrabold text-blue-900 text-sm">Academic Details</div>
              </div>
              <div className="grid sm:grid-cols-4 gap-2 text-xs">
                {bookProfile.board && <div><strong>Board:</strong> {bookProfile.board}</div>}
                {bookProfile.grade && <div><strong>Grade:</strong> {bookProfile.grade}</div>}
                {bookProfile.subject && <div><strong>Subject:</strong> {bookProfile.subject}</div>}
                {bookProfile.curriculum && <div><strong>Curriculum:</strong> {bookProfile.curriculum}</div>}
              </div>
            </div>
          )}

          {bookProfile.synopsis && (
            <div className="mt-4">
              <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-2">Synopsis</div>
              <div className="text-sm text-slate-900 whitespace-pre-line font-semibold">{bookProfile.synopsis}</div>
            </div>
          )}

          {bookProfile.tableOfContents && (
            <div className="mt-4">
              <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-2">Table of Contents</div>
              <div className="text-sm text-slate-900 whitespace-pre-line font-semibold bg-slate-50 rounded-xl p-3">{bookProfile.tableOfContents}</div>
            </div>
          )}
        </section>
      )}

      {/* Stationery Details */}
      {stationeryProfile && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Stationery Details</h3>
              <p className="text-xs text-slate-500 font-semibold">Type-specific info</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <DetailCard label="Category" value={stationeryProfile.category?.replace(/_/g, ' ') || '—'} />
            {stationeryProfile.brand && <DetailCard label="Brand" value={stationeryProfile.brand} />}
            {stationeryProfile.color && <DetailCard label="Color" value={stationeryProfile.color} />}
            {stationeryProfile.size && <DetailCard label="Size" value={stationeryProfile.size} />}
            {stationeryProfile.material && <DetailCard label="Material" value={stationeryProfile.material} />}
            {stationeryProfile.packSize && <DetailCard label="Pack Size" value={stationeryProfile.packSize} />}
            {stationeryProfile.itemsPerPack && <DetailCard label="Items/Pack" value={stationeryProfile.itemsPerPack} />}
            <DetailCard label="Reorder Level" value={stationeryProfile.reorderLevel} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {stationeryProfile.isSchoolItem && <Badge label="School Item" color="blue" />}
            {stationeryProfile.isOfficeItem && <Badge label="Office Item" color="slate" />}
            {stationeryProfile.isFastMoving && <Badge label="Fast Moving" color="amber" />}
          </div>
        </section>
      )}

      {/* Art Supply Details */}
      {artProfile && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-700 text-white flex items-center justify-center shadow-md">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Art Supply Details</h3>
              <p className="text-xs text-slate-500 font-semibold">Type-specific info</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <DetailCard label="Category" value={artProfile.category?.replace(/_/g, ' ') || '—'} />
            {artProfile.brand && <DetailCard label="Brand" value={artProfile.brand} />}
            {artProfile.color && <DetailCard label="Color" value={artProfile.color} />}
            {artProfile.colorCode && <DetailCard label="Color Code" value={artProfile.colorCode} />}
            {artProfile.size && <DetailCard label="Size" value={artProfile.size} />}
            {artProfile.grade && <DetailCard label="Grade" value={artProfile.grade} />}
            {artProfile.volume && <DetailCard label="Volume" value={artProfile.volume} />}
            <DetailCard label="Reorder Level" value={artProfile.reorderLevel} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {artProfile.isBeginner && <Badge label="Beginner Friendly" color="emerald" />}
            {artProfile.isProfessional && <Badge label="Professional Grade" color="violet" />}
          </div>

          {artProfile.suitableFor && artProfile.suitableFor.length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-2">Suitable For</div>
              <div className="flex flex-wrap gap-2">
                {artProfile.suitableFor.map((s: string) => (
                  <span key={s} className="px-2 py-1 rounded-lg bg-pink-100 border border-pink-200 text-pink-800 text-xs font-extrabold">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Sales History */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Sales History</h3>
            <p className="text-xs text-slate-500 font-semibold">
              {salesForProduct.length} recent • {stats.totalSold} sold
            </p>
          </div>
        </div>

        {salesForProduct.length === 0 ? (
          <div className="p-10 text-center">
            <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <div className="font-extrabold text-slate-700">Abhi tak koi sale nahi</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {salesForProduct.map((s) => {
              const productLines = s.items.filter((it) => it.product?.id === id);
              const qty = productLines.reduce((a, it) => a + Number(it.quantity || 0), 0);
              const revenue = productLines.reduce((a, it) => a + Number(it.total || 0), 0);
              return (
                <Link
                  key={s.id}
                  to={`/sales/${s.id}/receipt`}
                  className="block px-5 py-3 hover:bg-slate-50/50 transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-mono font-extrabold text-sm text-slate-900">{s.saleNumber}</div>
                        <span className="text-[10px] text-slate-500 font-bold">
                          {new Date(s.soldAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 font-semibold mt-0.5">
                        {s.customer?.name || 'Walk-in'} • {qty} {product.unit}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(revenue)}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function HeroStat({ icon: Icon, label, value, sub, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">{label}</div>
      </div>
      <div className="text-xl font-extrabold text-white tabular-nums leading-none">{value}</div>
      {sub && <div className="text-[10px] font-bold text-white/70 mt-0.5">{sub}</div>}
    </div>
  );
}

function DetailCard({ label, value }: any) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
      <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className="text-sm font-extrabold text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}

function Badge({ label, color }: any) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    slate: 'bg-slate-100 text-slate-800 border-slate-300',
    amber: 'bg-amber-100 text-amber-800 border-amber-300',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    violet: 'bg-violet-100 text-violet-800 border-violet-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold border-2 ${colors[color]}`}>
      {label}
    </span>
  );
}
