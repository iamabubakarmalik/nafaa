import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Save, Globe, EyeOff, Package, Star, TrendingUp,
  Eye, MessageCircle, Users, Sparkles, Image as ImageIcon, X,
  AlertCircle, CheckCircle2, DollarSign, Video, ChevronLeft, ChevronRight,
  Play, Tag, Award, Zap, Camera, Info, Link2, Upload,
  ArrowUp, ArrowDown, RefreshCw, Layers2, Palette,
} from 'lucide-react';
import { productPublishingApi } from '../shared/marketplace.api';
import { getIndustryTheme } from '../shared/industry-themes';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import type { MarketplaceProductProfile } from '../shared/types';

const MARKETPLACE_CATEGORIES = [
  'Food & Groceries', 'Electronics', 'Clothing & Fashion',
  'Home & Furniture', 'Health & Beauty', 'Sports & Outdoors',
  'Books & Stationery', 'Baby & Kids', 'Automotive', 'Services',
  'Carpets & Rugs', 'Jewelry', 'Mobile & Accessories',
  'Pharmacy', 'Bakery', 'Restaurant', 'Meat & Poultry',
  'Dairy', 'Agriculture', 'Hardware & Tools',
];

type CarouselStyle = 'default' | 'thumbnails-left' | 'thumbnails-bottom' | 'zoom' | 'stack';

export default function MarketplaceProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const theme = getIndustryTheme(industry?.id);

  const [draft, setDraft] = useState<Partial<MarketplaceProductProfile>>({});
  const [previewCarouselStyle, setPreviewCarouselStyle] = useState<CarouselStyle>('default');
  const [previewImageIdx, setPreviewImageIdx] = useState(0);
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [videoMode, setVideoMode] = useState<'url' | 'upload'>('url');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['marketplace-product', productId],
    queryFn: () => productPublishingApi.getProfile(productId!),
    enabled: !!productId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<MarketplaceProductProfile>) =>
      productPublishingApi.updateProfile(productId!, data),
    onSuccess: () => {
      toast.success('Product profile save ho gayi ✅');
      qc.invalidateQueries({ queryKey: ['marketplace-product', productId] });
      qc.invalidateQueries({ queryKey: ['marketplace-products'] });
      setDraft({});
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save fail'),
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      profile?.isListedOnMarketplace
        ? productPublishingApi.unpublish(productId!)
        : productPublishingApi.publish(productId!),
    onSuccess: () => {
      toast.success(
        profile?.isListedOnMarketplace
          ? 'Product unpublish ho gayi'
          : '🎉 Product marketplace pe live ho gayi!',
      );
      qc.invalidateQueries({ queryKey: ['marketplace-product', productId] });
      qc.invalidateQueries({ queryKey: ['marketplace-products'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  });

  const merged = { ...profile, ...draft } as MarketplaceProductProfile;
  const hasChanges = Object.keys(draft).length > 0;

  const set = <K extends keyof MarketplaceProductProfile>(key: K, value: MarketplaceProductProfile[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const removeImage = (idx: number) => {
    const current = merged.publicImages || [];
    set('publicImages', current.filter((_, i) => i !== idx));
  };

  const moveImage = (from: number, to: number) => {
    const arr = [...(merged.publicImages || [])];
    if (to < 0 || to >= arr.length) return;
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    set('publicImages', arr);
  };

  const addImageFromUrl = () => {
    if (!imageUrlInput.trim()) return;
    set('publicImages', [...(merged.publicImages || []), imageUrlInput.trim()]);
    setImageUrlInput('');
  };

  const addVideoFromUrl = () => {
    if (!videoUrlInput.trim()) return;
    set('publicVideos', [...(merged.publicVideos || []), videoUrlInput.trim()]);
    setVideoUrlInput('');
  };

  const removeVideo = (idx: number) => {
    const current = merged.publicVideos || [];
    set('publicVideos', current.filter((_, i) => i !== idx));
  };

  const addTag = (tag: string) => {
    if (!tag.trim()) return;
    const current = merged.tags || [];
    if (current.includes(tag)) return;
    set('tags', [...current, tag.trim()]);
  };

  const removeTag = (tag: string) => {
    set('tags', (merged.tags || []).filter((t) => t !== tag));
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-10 w-10 text-emerald-600 animate-pulse mx-auto" />
          <p className="mt-3 text-sm font-black text-slate-600">Loading product...</p>
        </div>
      </div>
    );
  }

  const isListed = profile.isListedOnMarketplace;
  const isMissingRequired = !merged.publicName || !merged.publicPrice || merged.publicPrice <= 0;
  const hasImages = merged.publicImages && merged.publicImages.length > 0;

  return (
    <div className="space-y-5 pb-24 min-h-screen">
      {/* Back link */}
      <Link
        to="/marketplace/products"
        className="inline-flex items-center gap-1.5 text-sm font-black text-slate-600 hover:text-slate-900 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace Products
      </Link>

      {/* HERO */}
      <section className={`rounded-3xl bg-gradient-to-br ${theme.gradient} text-white p-6 shadow-2xl relative overflow-hidden`}>
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-20 w-20 rounded-2xl bg-white/15 backdrop-blur p-1 shadow-lg shrink-0">
              {merged.publicImages?.[0] ? (
                <img src={merged.publicImages[0]} alt="" className="w-full h-full rounded-xl object-cover" />
              ) : (
                <div className="w-full h-full rounded-xl flex items-center justify-center text-3xl">
                  {theme.emoji}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-black border border-white/20">
                <span>{theme.emoji}</span> Marketplace Product
                {isListed && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px]">LIVE</span>
                )}
              </div>
              <h1 className="mt-3 text-2xl md:text-3xl font-black leading-tight">
                {merged.publicName || 'Untitled Product'}
              </h1>
              {profile.productSku && (
                <p className="mt-1 text-xs text-white/70 font-mono">SKU: {profile.productSku}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              onClick={() => publishMutation.mutate()}
              loading={publishMutation.isPending}
              disabled={!isListed && isMissingRequired}
              className={isListed ? 'bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl'}
            >
              {isListed ? (
                <><EyeOff className="h-4 w-4" />Unpublish</>
              ) : (
                <><Globe className="h-4 w-4" />Publish</>
              )}
            </Button>
          </div>
        </div>

        {/* Stats row */}
        {isListed && (
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <MiniStat label="Total Sold" value={merged.totalSold || 0} icon={TrendingUp} />
            <MiniStat label="Rating" value={merged.ratingCount ? merged.ratingAverage.toFixed(1) : '—'} icon={Star} />
            <MiniStat label="Views" value={merged.viewCount || 0} icon={Eye} />
            <MiniStat label="Wishlist" value={merged.wishlistCount || 0} icon={Users} />
          </div>
        )}
      </section>

      {/* Not listed banner */}
      {!isListed && (
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-5 shadow-sm">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="h-14 w-14 rounded-2xl bg-amber-500 flex items-center justify-center shadow-md shrink-0">
              <AlertCircle className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-[240px]">
              <div className="font-black text-lg text-amber-900">Ye product marketplace pe list nahi hai</div>
              <p className="text-sm text-amber-800 font-medium mt-1">
                Neeche details fill karein, phir <strong>Publish</strong> button dabayein — customers dekh sakenge.
              </p>
              {isMissingRequired && (
                <div className="mt-2 flex items-center gap-2 text-xs text-rose-700 font-black">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Publish karne se pehle Public Name aur Price zaroori hain
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Two-column: Form + Preview */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-6 items-start">
        {/* Form */}
        <main className="space-y-5 min-w-0">
          {/* Basic Info Card */}
          <Card icon={Package} title="Public Info" subtitle="Customers ko jo dikhega" color="emerald">
            <Field label="Public Product Name" required hint="POS ka name se different bhi ho sakta hai — marketing-friendly rakhein">
              <input
                value={merged.publicName || ''}
                onChange={(e) => set('publicName', e.target.value)}
                placeholder="e.g. Handwoven Persian Rug 5×7"
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
              />
              {profile.productName && profile.productName !== merged.publicName && (
                <p className="text-[10px] text-slate-500 font-medium mt-1">
                  POS name: <span className="font-black">{profile.productName}</span>
                </p>
              )}
            </Field>

            <Field label="Public Description" hint="Marketing copy — features, benefits, quality">
              <textarea
                value={merged.publicDescription || ''}
                onChange={(e) => set('publicDescription', e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="Premium quality handwoven wool carpet, imported from Iran. 100% natural dyes..."
                className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none transition"
              />
              <div className="text-[10px] font-bold text-slate-400 mt-1 text-right">
                {(merged.publicDescription || '').length}/2000
              </div>
            </Field>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Marketplace Category" required>
                <select
                  value={merged.marketplaceCategory || ''}
                  onChange={(e) => set('marketplaceCategory', e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition bg-white cursor-pointer"
                >
                  <option value="">Select category...</option>
                  {MARKETPLACE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>

              <Field label="Sub-category (optional)">
                <input
                  value={merged.marketplaceSubCategory || ''}
                  onChange={(e) => set('marketplaceSubCategory', e.target.value)}
                  placeholder="e.g. Wool Carpets"
                  className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                />
              </Field>
            </div>

            {/* Tags */}
            <Field label="Tags / Keywords" hint="Search mein help karta hai — press Enter to add">
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border-2 border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 min-h-[46px] transition">
                {(merged.tags || []).map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black">
                    #{tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-rose-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="Add tag..."
                  className="flex-1 min-w-[100px] outline-none text-sm font-bold bg-transparent px-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] font-black text-slate-500">Quick add:</span>
                {['premium', 'bestseller', 'new-arrival', 'discount', 'trending', 'handmade', 'imported'].map((t) => (
                  <button
                    key={t}
                    onClick={() => addTag(t)}
                    className="text-[10px] font-black text-emerald-700 hover:bg-emerald-50 px-1.5 py-0.5 rounded disabled:opacity-40"
                    disabled={(merged.tags || []).includes(t)}
                  >
                    +{t}
                  </button>
                ))}
              </div>
            </Field>
          </Card>

          {/* Pricing Card */}
          <Card icon={DollarSign} title="Pricing" subtitle="Marketplace price — POS se different bhi ho sakta hai" color="amber">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Public Price (PKR)" required hint="Marketplace pe dikhne wali price">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={merged.publicPrice ?? 0}
                  onChange={(e) => set('publicPrice', Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
                {profile.productPrice && Number(profile.productPrice) !== merged.publicPrice && (
                  <p className="text-[10px] text-slate-500 font-medium mt-1">
                    POS price: <span className="font-black">Rs {formatPKR(profile.productPrice)}</span>
                    {merged.publicPrice > Number(profile.productPrice) && (
                      <span className="text-emerald-700 ml-1">
                        (+Rs {formatPKR(merged.publicPrice - Number(profile.productPrice))} markup)
                      </span>
                    )}
                  </p>
                )}
              </Field>

              <Field label="Compare-at Price (optional)" hint="Original price — for showing discount">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={merged.compareAtPrice ?? ''}
                  onChange={(e) => set('compareAtPrice', e.target.value ? Number(e.target.value) : null as any)}
                  placeholder="e.g. 6000"
                  className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
                {merged.compareAtPrice && merged.publicPrice && merged.compareAtPrice > merged.publicPrice && (
                  <p className="text-[10px] text-emerald-700 font-black mt-1">
                    🎉 {Math.round(((merged.compareAtPrice - merged.publicPrice) / merged.compareAtPrice) * 100)}% OFF
                  </p>
                )}
              </Field>
            </div>
          </Card>

          {/* IMAGES CARD — Upload + URL */}
          <Card icon={ImageIcon} title="Marketing Images" subtitle="First image marketplace pe main dikhta hai" color="blue">
            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition inline-flex items-center gap-1.5 ${
                    imageMode === 'upload' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Files
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition inline-flex items-center gap-1.5 ${
                    imageMode === 'url' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Paste URLs
                </button>
              </div>

              {imageMode === 'upload' ? (
                <UploadDropzone
                  purpose="product-image"
                  multiple={true}
                  maxFiles={10}
                  maxSizeMB={10}
                  hint="Marketing images upload karein • JPG, PNG, WebP • Max 10 MB each • up to 10 images"
                  onUploaded={(records) => {
                    const newUrls = records.map((r) => r.url).filter(Boolean);
                    if (newUrls.length > 0) {
                      set('publicImages', [...(merged.publicImages || []), ...newUrls]);
                    }
                  }}
                />
              ) : (
                <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImageFromUrl())}
                      placeholder="https://your-cdn.com/image.jpg"
                      className="flex-1 h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                    <button
                      onClick={addImageFromUrl}
                      disabled={!imageUrlInput.trim()}
                      className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-black inline-flex items-center gap-1 transition"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Add Image
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium mt-2">
                    Paste image URL from any hosting (Cloudinary, imgur, Unsplash direct link, etc.)
                  </p>
                </div>
              )}

              {!hasImages ? (
                <div className="text-center py-6 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200">
                  <ImageIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-500">Koi image nahi</p>
                  <p className="text-xs text-slate-400 mt-1">Upload karein ya URL paste karein</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-black text-slate-700">
                      Uploaded Images ({merged.publicImages!.length}/10)
                    </div>
                    <div className="text-[10px] font-bold text-slate-500">
                      Hover mein reorder / remove
                    </div>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {merged.publicImages!.map((url, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-xl bg-slate-100 overflow-hidden border-2 border-slate-200 hover:border-blue-400 transition">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-black shadow">
                            MAIN
                          </div>
                        )}

                        {/* Reorder arrows */}
                        <div className="absolute top-1 right-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition">
                          {idx > 0 && (
                            <button
                              onClick={() => moveImage(idx, idx - 1)}
                              className="h-6 w-6 rounded-md bg-slate-900/80 backdrop-blur text-white flex items-center justify-center hover:bg-slate-900 shadow"
                              title="Move left"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                          )}
                          {idx < merged.publicImages!.length - 1 && (
                            <button
                              onClick={() => moveImage(idx, idx + 1)}
                              className="h-6 w-6 rounded-md bg-slate-900/80 backdrop-blur text-white flex items-center justify-center hover:bg-slate-900 shadow"
                              title="Move right"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute bottom-1 right-1 h-6 w-6 rounded-md bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                        >
                          <X className="h-3 w-3" />
                        </button>

                        {idx > 0 && (
                          <button
                            onClick={() => moveImage(idx, 0)}
                            className="absolute bottom-1 left-1 h-6 px-2 rounded-md bg-emerald-600/95 backdrop-blur text-white text-[9px] font-black opacity-0 group-hover:opacity-100 transition shadow"
                          >
                            Make Main
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* POS IMAGES CARD — Auto-pull from POS */}
          {merged.posImages && merged.posImages.length > 0 && (
            <Card icon={RefreshCw} title="POS Images (Reference)" subtitle="Aap ke POS mein already jo images hain" color="slate">
              <div className="space-y-3">
                <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-black text-blue-900">
                      {merged.usingPosImages
                        ? '✅ Marketplace currently POS images use kar raha hai (auto-synced)'
                        : '🎨 Aap ne marketplace ke liye custom marketing images set ki hain'}
                    </p>
                    <p className="text-blue-700 font-medium mt-1">
                      {merged.usingPosImages
                        ? 'Agar customize karna hai, upar Marketing Images section mein apni images add karein.'
                        : 'POS images sirf reference ke liye dikhayi ja rahi hain. Reset karke wapas POS wali use kar sakte hain.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {merged.posImages.map((url, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg bg-slate-100 overflow-hidden border-2 border-slate-200">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-slate-900/70 text-white text-[8px] font-black">
                        POS
                      </div>
                      {!merged.usingPosImages && (
                        <button
                          onClick={() => {
                            const current = merged.publicImages || [];
                            if (!current.includes(url)) {
                              set('publicImages', [...current, url]);
                              toast.success('POS image added to marketing images');
                            }
                          }}
                          className="absolute inset-0 bg-slate-900/70 text-white text-[10px] font-black opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                        >
                          + Add to Marketing
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {!merged.usingPosImages && (
                  <button
                    onClick={() => {
                      if (confirm('Marketing images clear karke wapas POS images use karein?')) {
                        set('publicImages', []);
                        toast.success('Reset — ab POS images use ho rahi hain');
                      }
                    }}
                    className="w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black inline-flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reset — POS Images Use Karain
                  </button>
                )}
              </div>
            </Card>
          )}

          {/* VARIANTS CARD — Industry-specific */}
          {merged.productVariants && merged.productVariants.length > 0 && (
            <Card icon={Layers2} title="Product Variants" subtitle={`${merged.productVariants.length} variants POS se aayi hain`} color="indigo">
              <div className="space-y-3">
                <div className="rounded-xl bg-indigo-50 border-2 border-indigo-200 p-3 flex items-start gap-2">
                  <Palette className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-black text-indigo-900">
                      Ye variants aap ke POS se auto-sync hain
                    </p>
                    <p className="text-indigo-700 font-medium mt-1">
                      Customers marketplace pe variant choose karke order kar sakenge (jaise size, color, storage, etc.)
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-2 border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b-2 border-slate-100">
                      <tr>
                        <th className="text-left px-3 py-2 text-[10px] font-black uppercase text-slate-600">Variant</th>
                        <th className="text-left px-3 py-2 text-[10px] font-black uppercase text-slate-600">SKU</th>
                        <th className="text-right px-3 py-2 text-[10px] font-black uppercase text-slate-600">Price</th>
                        <th className="text-right px-3 py-2 text-[10px] font-black uppercase text-slate-600">Stock</th>
                        <th className="text-center px-3 py-2 text-[10px] font-black uppercase text-slate-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {merged.productVariants.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              {v.imageUrl && (
                                <img src={v.imageUrl} alt="" className="h-8 w-8 rounded object-cover border border-slate-200" />
                              )}
                              <div>
                                <div className="font-black text-slate-900 text-xs">{v.name}</div>
                                {v.attributes && Object.keys(v.attributes).length > 0 && (
                                  <div className="text-[10px] text-slate-500 font-bold">
                                    {Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(' · ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{v.sku || '—'}</td>
                          <td className="text-right px-3 py-2 font-black text-xs text-emerald-700 tabular-nums">
                            {v.price ? `Rs ${formatPKR(v.price)}` : '—'}
                          </td>
                          <td className="text-right px-3 py-2 font-black text-xs tabular-nums">
                            {v.stock ?? '—'}
                          </td>
                          <td className="text-center px-3 py-2">
                            {v.isAvailable !== false ? (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                AVAILABLE
                              </span>
                            ) : (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                OUT
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="text-[10px] text-slate-500 font-bold text-center">
                  💡 Variants edit karne ke liye POS mein product ki details modify karein — yahan auto-sync ho jayega
                </div>
              </div>
            </Card>
          )}

          {/* VIDEOS CARD — URL + Upload */}
          <Card icon={Video} title="Product Videos" subtitle="Video demo customers ka trust badhata hai" color="purple">
            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
                <button
                  type="button"
                  onClick={() => setVideoMode('url')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition inline-flex items-center gap-1.5 ${
                    videoMode === 'url' ? 'bg-white shadow text-purple-700' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  YouTube / URL
                </button>
                <button
                  type="button"
                  onClick={() => setVideoMode('upload')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition inline-flex items-center gap-1.5 ${
                    videoMode === 'upload' ? 'bg-white shadow text-purple-700' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload MP4
                </button>
              </div>

              {videoMode === 'url' ? (
                <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={videoUrlInput}
                      onChange={(e) => setVideoUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVideoFromUrl())}
                      placeholder="https://youtube.com/watch?v=... or Vimeo/MP4 URL"
                      className="flex-1 h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-mono outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
                    />
                    <button
                      onClick={addVideoFromUrl}
                      disabled={!videoUrlInput.trim()}
                      className="h-11 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white text-xs font-black inline-flex items-center gap-1 transition"
                    >
                      <Video className="h-4 w-4" />
                      Add Video
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium mt-2">
                    <strong>Supported:</strong> YouTube (youtube.com/watch), Vimeo, direct .mp4/.webm URLs
                  </p>
                </div>
              ) : (
                <UploadDropzone
                  purpose={"product-video" as any}
                  multiple={true}
                  maxFiles={3}
                  maxSizeMB={100}
                  hint="Product videos upload karein • MP4, WebM • Max 100 MB each • up to 3 videos"
                  onUploaded={(records) => {
                    const newUrls = records.map((r) => r.url).filter(Boolean);
                    if (newUrls.length > 0) {
                      set('publicVideos', [...(merged.publicVideos || []), ...newUrls]);
                    }
                  }}
                />
              )}

              {(!merged.publicVideos || merged.publicVideos.length === 0) ? (
                <div className="text-center py-6 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200">
                  <Video className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-500">Koi video nahi</p>
                  <p className="text-xs text-slate-400 mt-1">URL paste karein ya file upload karein</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {merged.publicVideos.map((url, idx) => (
                    <div key={idx} className="relative group rounded-xl bg-slate-100 overflow-hidden border-2 border-slate-200 aspect-video">
                      {url.includes('youtube.com') || url.includes('youtu.be') ? (
                        <iframe
                          src={url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      ) : url.includes('vimeo.com') ? (
                        <iframe
                          src={url.replace('vimeo.com/', 'player.vimeo.com/video/')}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      ) : (
                        <video src={url} controls className="w-full h-full" />
                      )}
                      <button
                        onClick={() => removeVideo(idx)}
                        className="absolute top-1 right-1 h-6 w-6 rounded-md bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-10 shadow"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Features Card */}
          <Card icon={Zap} title="Special Features" subtitle="Bargaining, group buy, availability" color="rose">
            <div className="space-y-3">
              <ToggleRow
                icon={CheckCircle2}
                label="Currently Available"
                hint="Off karne se customers add-to-cart nahi kar sakenge"
                checked={merged.isAvailable ?? true}
                onChange={(v: boolean) => set('isAvailable', v)}
                accent="emerald"
              />

              <ToggleRow
                icon={MessageCircle}
                label="Bargain / Mol-Bhaav Enable"
                hint="Customer offer bhej sakenge, aap accept/reject/counter kar sakte hain"
                checked={merged.bargainEnabled || false}
                onChange={(v: boolean) => set('bargainEnabled', v)}
                accent="purple"
              />

              {merged.bargainEnabled && (
                <div className="ml-12 pl-3 border-l-2 border-purple-200">
                  <Field label="Minimum Acceptable Price (PKR)" hint="Is se kam offer auto-reject ho jayega">
                    <input
                      type="number"
                      min={0}
                      value={merged.bargainMinPrice ?? ''}
                      onChange={(e) => set('bargainMinPrice', e.target.value ? Number(e.target.value) : null as any)}
                      placeholder={`e.g. ${Math.floor((merged.publicPrice || 0) * 0.7)}`}
                      className="w-full h-11 px-3 rounded-xl border-2 border-purple-200 text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
                    />
                    {merged.bargainMinPrice && merged.publicPrice && (
                      <p className="text-[10px] text-purple-700 font-black mt-1">
                        Max discount allowed: {Math.round(((merged.publicPrice - merged.bargainMinPrice) / merged.publicPrice) * 100)}%
                      </p>
                    )}
                  </Field>
                </div>
              )}

              <ToggleRow
                icon={Users}
                label="Group Buy Enable"
                hint="Multiple customers ek saath khareedain — discount price sab ko"
                checked={merged.groupBuyEnabled || false}
                onChange={(v: boolean) => set('groupBuyEnabled', v)}
                accent="orange"
              />

              <ToggleRow
                icon={Award}
                label="Auction Enable"
                hint="Ye product auction mein daal sakte hain"
                checked={merged.auctionEnabled || false}
                onChange={(v: boolean) => set('auctionEnabled', v)}
                accent="red"
              />
            </div>
          </Card>

          {/* SEO Card */}
          <Card icon={Tag} title="SEO / Meta" subtitle="Google search mein behtar rank ke liye" color="slate">
            <Field label="Meta Title" hint="60 characters — Google search title mein aayega">
              <input
                value={merged.metaTitle || ''}
                onChange={(e) => set('metaTitle', e.target.value)}
                placeholder="e.g. Buy Handwoven Persian Rug 5×7 in Lahore | Best Price"
                maxLength={60}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-bold outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 transition"
              />
              <div className="text-[10px] font-bold text-slate-400 mt-1 text-right">
                {(merged.metaTitle || '').length}/60
              </div>
            </Field>
            <Field label="Meta Description" hint="160 characters — search snippet mein dikhta hai">
              <textarea
                value={merged.metaDescription || ''}
                onChange={(e) => set('metaDescription', e.target.value)}
                rows={3}
                maxLength={160}
                placeholder="Premium quality handwoven Persian rug with natural wool..."
                className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 resize-none transition"
              />
              <div className="text-[10px] font-bold text-slate-400 mt-1 text-right">
                {(merged.metaDescription || '').length}/160
              </div>
            </Field>
          </Card>
        </main>

        {/* Preview Sidebar */}
        <aside className="lg:sticky lg:top-4 h-fit space-y-3">
          {/* Carousel style selector */}
          <div className="rounded-2xl bg-white border-2 border-slate-200 p-3 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
              Carousel Style
            </div>
            <div className="grid grid-cols-2 gap-1">
              {(['default', 'thumbnails-left', 'thumbnails-bottom', 'zoom', 'stack'] as CarouselStyle[]).map((style) => (
                <button
                  key={style}
                  onClick={() => { setPreviewCarouselStyle(style); setPreviewImageIdx(0); }}
                  className={`text-[10px] font-black px-2 py-1.5 rounded-lg transition capitalize ${
                    previewCarouselStyle === style
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {style.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-3xl bg-white border-2 border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-wider">Live Preview</span>
              <span className="ml-auto text-[9px] font-black bg-emerald-500 px-1.5 py-0.5 rounded">Customer View</span>
            </div>
            <div className="p-4">
              <ProductPreviewCard
                product={merged}
                theme={theme}
                carouselStyle={previewCarouselStyle}
                activeIdx={previewImageIdx}
                onIdxChange={setPreviewImageIdx}
              />
            </div>
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[10px] font-bold text-slate-500 text-center">
              Ye customers ko marketplace pe dikhega
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky save bar */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-5 py-3 shadow-2xl flex items-center gap-3 border-2 border-emerald-500">
          <Sparkles className="h-4 w-4 text-amber-300" />
          <span className="text-sm font-black">
            {Object.keys(draft).length} unsaved change{Object.keys(draft).length > 1 ? 's' : ''}
          </span>
          <div className="w-px h-6 bg-emerald-400" />
          <button onClick={() => setDraft({})} className="text-xs font-black text-emerald-100 hover:text-white transition">
            Discard
          </button>
          <Button size="sm" onClick={() => updateMutation.mutate(draft)} loading={updateMutation.isPending} className="bg-white text-emerald-700 hover:bg-slate-100">
            <Save className="h-4 w-4" />
            Save All
          </Button>
        </div>
      )}
    </div>
  );
}

// ═══════════════ HELPER COMPONENTS ═══════════════

const COLOR_MAP: any = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', iconBg: 'bg-emerald-600' },
  amber:   { bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-500' },
  blue:    { bg: 'bg-blue-50', border: 'border-blue-100', iconBg: 'bg-blue-600' },
  purple:  { bg: 'bg-purple-50', border: 'border-purple-100', iconBg: 'bg-purple-600' },
  rose:    { bg: 'bg-rose-50', border: 'border-rose-100', iconBg: 'bg-rose-600' },
  slate:   { bg: 'bg-slate-50', border: 'border-slate-100', iconBg: 'bg-slate-600' },
  indigo:  { bg: 'bg-indigo-50', border: 'border-indigo-100', iconBg: 'bg-indigo-600' },
  orange:  { bg: 'bg-orange-50', border: 'border-orange-100', iconBg: 'bg-orange-500' },
  red:     { bg: 'bg-red-50', border: 'border-red-100', iconBg: 'bg-red-600' },
  cyan:    { bg: 'bg-cyan-50', border: 'border-cyan-100', iconBg: 'bg-cyan-600' },
};

function Card({ icon: Icon, title, subtitle, color = 'emerald', children }: any) {
  const c = COLOR_MAP[color] || COLOR_MAP.emerald;
  return (
    <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
      <div className={`px-5 py-4 ${c.bg} border-b-2 ${c.border} flex items-center gap-3`}>
        <div className={`h-10 w-10 rounded-xl ${c.iconBg} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-black text-slate-900">{title}</h3>
          <p className="text-xs text-slate-600 font-medium">{subtitle}</p>
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }: any) {
  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-black opacity-90">{label}</div>
      </div>
      <div className="text-xl font-black leading-none tabular-nums">{value}</div>
    </div>
  );
}

function Field({ label, hint, required, children }: any) {
  return (
    <div>
      <label className="text-sm font-black text-slate-700 mb-1.5 block">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-1 font-medium">{hint}</p>}
    </div>
  );
}

function ToggleRow({ icon: Icon, label, hint, checked, onChange, accent }: any) {
  const accents: any = {
    emerald: { on: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' },
    purple:  { on: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-300' },
    orange:  { on: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300' },
    red:     { on: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300' },
  };
  const a = accents[accent];
  return (
    <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
      checked ? `${a.bg} ${a.border}` : 'bg-white border-slate-200 hover:border-slate-300'
    }`}>
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
        checked ? `${a.on} text-white` : 'bg-slate-100 text-slate-500'
      }`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-black ${checked ? a.text : 'text-slate-900'}`}>{label}</div>
        <div className="text-[10px] text-slate-500 font-medium mt-0.5">{hint}</div>
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <div className={`h-6 w-11 rounded-full transition ${checked ? a.on : 'bg-slate-200'} relative shrink-0`}>
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`} />
      </div>
    </label>
  );
}

function ProductPreviewCard({ product: p, theme, carouselStyle, activeIdx, onIdxChange }: any) {
  const images = p.publicImages || [];
  const videos = p.publicVideos || [];
  const allMedia = [
    ...images.map((url: string) => ({ type: 'image', url })),
    ...videos.map((url: string) => ({ type: 'video', url })),
  ];
  const active = allMedia[activeIdx] || allMedia[0];
  const discount = p.compareAtPrice && p.publicPrice && p.compareAtPrice > p.publicPrice
    ? Math.round(((p.compareAtPrice - p.publicPrice) / p.compareAtPrice) * 100)
    : 0;

  const renderMedia = (media: any, className: string = 'w-full h-full object-cover') => {
    if (!media) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <Package className="h-12 w-12 text-slate-400" />
        </div>
      );
    }
    if (media.type === 'video') {
      if (media.url.includes('youtube.com') || media.url.includes('youtu.be')) {
        return (
          <iframe
            src={media.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
            className={className}
            allowFullScreen
          />
        );
      }
      if (media.url.includes('vimeo.com')) {
        return (
          <iframe
            src={media.url.replace('vimeo.com/', 'player.vimeo.com/video/')}
            className={className}
            allowFullScreen
          />
        );
      }
      return <video src={media.url} controls className={className} />;
    }
    return <img src={media.url} alt="" className={className} />;
  };

  const nextImage = () => onIdxChange((activeIdx + 1) % allMedia.length);
  const prevImage = () => onIdxChange((activeIdx - 1 + allMedia.length) % allMedia.length);

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-slate-200 bg-white">
      {carouselStyle === 'default' && (
        <div className="aspect-square bg-slate-100 relative">
          {renderMedia(active)}
          <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-br-lg bg-gradient-to-r ${theme.ribbon} text-white text-[9px] font-black uppercase tracking-wider`}>
            {theme.emoji} {theme.label}
          </div>
          {active?.type === 'video' && (
            <div className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center">
              <Play className="h-4 w-4" />
            </div>
          )}
          {discount > 0 && (
            <div className="absolute bottom-2 right-2 h-10 w-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg">
              <div className="text-[10px] font-black">-{discount}%</div>
            </div>
          )}
          {allMedia.length > 1 && (
            <>
              <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white">
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {allMedia.map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => onIdxChange(i)}
                    className={`h-1.5 rounded-full transition-all ${i === activeIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/60'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {carouselStyle === 'thumbnails-bottom' && (
        <div>
          <div className="aspect-square bg-slate-100 relative">
            {renderMedia(active)}
            {discount > 0 && (
              <div className="absolute top-2 right-2 h-10 w-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg">
                <div className="text-[10px] font-black">-{discount}%</div>
              </div>
            )}
          </div>
          {allMedia.length > 1 && (
            <div className="p-2 bg-slate-50 flex gap-1.5 overflow-x-auto">
              {allMedia.map((m: any, i: number) => (
                <button
                  key={i}
                  onClick={() => onIdxChange(i)}
                  className={`shrink-0 h-14 w-14 rounded-lg overflow-hidden border-2 transition ${
                    i === activeIdx ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200 opacity-60'
                  }`}
                >
                  {renderMedia(m)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {carouselStyle === 'thumbnails-left' && (
        <div className="flex gap-2 p-2 bg-slate-50">
          {allMedia.length > 1 && (
            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-72 py-1">
              {allMedia.map((m: any, i: number) => (
                <button
                  key={i}
                  onClick={() => onIdxChange(i)}
                  className={`shrink-0 h-12 w-12 rounded-lg overflow-hidden border-2 transition ${
                    i === activeIdx ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200 opacity-60'
                  }`}
                >
                  {renderMedia(m)}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 aspect-square bg-slate-100 relative rounded-lg overflow-hidden">
            {renderMedia(active)}
            {discount > 0 && (
              <div className="absolute top-2 right-2 h-10 w-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg">
                <div className="text-[10px] font-black">-{discount}%</div>
              </div>
            )}
          </div>
        </div>
      )}

      {carouselStyle === 'zoom' && (
        <div className="aspect-square bg-slate-100 relative group overflow-hidden">
          {active?.type === 'image' ? (
            <img
              src={active.url}
              alt=""
              className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-500"
            />
          ) : (
            renderMedia(active)
          )}
          {discount > 0 && (
            <div className="absolute top-2 right-2 h-10 w-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg">
              <div className="text-[10px] font-black">-{discount}%</div>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition">
            <span className="text-[10px] font-black text-white">🔍 Hover to zoom</span>
          </div>
        </div>
      )}

      {carouselStyle === 'stack' && (
        <div className="aspect-square bg-slate-100 relative p-3">
          {allMedia.slice(0, 3).map((m: any, i: number) => (
            <div
              key={i}
              className="absolute inset-3 rounded-xl overflow-hidden border-2 border-white shadow-lg transition-all"
              style={{
                transform: `translate(${i * 8}px, ${i * 8}px)`,
                zIndex: 3 - i,
              }}
            >
              {renderMedia(m)}
            </div>
          ))}
        </div>
      )}

      <div className="p-3 space-y-1.5">
        <h3 className="font-black text-slate-900 line-clamp-2 leading-tight text-sm">
          {p.publicName || 'Product Name'}
        </h3>

        {p.marketplaceCategory && (
          <div className="text-[10px] font-bold text-slate-500">{p.marketplaceCategory}</div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <div className="font-black text-lg tabular-nums" style={{ color: theme.accentHex }}>
            Rs {formatPKR(p.publicPrice || 0)}
          </div>
          {p.compareAtPrice && p.compareAtPrice > (p.publicPrice || 0) && (
            <div className="text-xs font-bold text-slate-400 line-through">
              Rs {formatPKR(p.compareAtPrice)}
            </div>
          )}
        </div>

        {p.ratingCount && p.ratingCount > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            <span className="font-black">{p.ratingAverage.toFixed(1)}</span>
            <span className="text-slate-500 font-medium">({p.ratingCount})</span>
          </div>
        )}

        {p.tags && p.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap pt-1">
            {p.tags.slice(0, 4).map((t: string) => (
              <span key={t} className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-1 flex-wrap pt-1">
          {p.bargainEnabled && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">💰 BARGAIN</span>
          )}
          {p.groupBuyEnabled && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">👥 GROUP</span>
          )}
          {p.auctionEnabled && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-100 text-red-700">🔨 AUCTION</span>
          )}
          {!p.isAvailable && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">OUT OF STOCK</span>
          )}
        </div>

        <button
          disabled
          className="w-full mt-2 h-9 rounded-lg text-white text-xs font-black inline-flex items-center justify-center gap-1"
          style={{ backgroundColor: theme.accentHex }}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
